from io import BytesIO
import json
from zipfile import ZipFile
import unittest
from unittest.mock import MagicMock, Mock, patch

from app.api.cases import _fetch_case_for_user
from app.services.document_pipeline import (
    _collect_text,
    _gemini_digitise,
    _ocr_with_fallback,
    _sarvam_digitise,
    process_document_upload,
)
from app.services.document_service import (
    MAX_DOCUMENT_BYTES,
    split_pages_into_chunks,
    validate_document,
)


class DocumentUploadTests(unittest.TestCase):
    def test_validates_supported_file_signatures(self):
        self.assertEqual(validate_document("bill.pdf", b"%PDF-1.7"), "application/pdf")
        self.assertEqual(
            validate_document("scan.png", b"\x89PNG\r\n\x1a\nrest"),
            "image/png",
        )

    def test_rejects_unsupported_and_mismatched_files(self):
        with self.assertRaisesRegex(ValueError, "Unsupported file type"):
            validate_document("legacy.doc", b"not a word document")
        with self.assertRaisesRegex(ValueError, "valid PDF signature"):
            validate_document("fake.pdf", b"not a pdf")

    def test_rejects_oversized_uploads(self):
        with self.assertRaisesRegex(ValueError, "20 MB or smaller"):
            validate_document("large.pdf", b"%PDF-" + b"x" * MAX_DOCUMENT_BYTES)

    def test_validates_docx_archive_contents(self):
        output = BytesIO()
        with ZipFile(output, "w") as archive:
            archive.writestr("word/document.xml", "<document/>")
        self.assertEqual(
            validate_document("policy.docx", output.getvalue()),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        with self.assertRaisesRegex(ValueError, "valid DOCX"):
            validate_document("policy.docx", b"not a zip")

    def test_chunks_keep_page_provenance_and_overlap(self):
        text = "word " * 80
        chunks = split_pages_into_chunks(
            [{"page_number": 4, "text": text}],
            max_chars=100,
            overlap=20,
        )
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(chunk["page_number"] == 4 for chunk in chunks))
        self.assertTrue(set(chunks[0]["text"].split()) & set(chunks[1]["text"].split()))

    def test_chunks_accept_unknown_page_for_word_documents(self):
        self.assertEqual(
            split_pages_into_chunks([{"page_number": None, "text": "Policy terms"}]),
            [{"page_number": None, "text": "Policy terms"}],
        )

    def test_extracts_page_text_without_bounding_box_data(self):
        result = _collect_text({
            "blocks": [
                {"text": "Policy schedule", "bbox": [0, 0, 1, 1]},
                {"text": "Sum insured: INR 5,00,000"},
            ]
        })
        self.assertEqual(result, "Policy schedule\nSum insured: INR 5,00,000")

    @patch("app.services.document_pipeline.httpx.Client")
    @patch("app.services.document_pipeline.settings.sarvam_api_key", "test-key")
    def test_reads_page_metadata_from_sarvam_job_result(self, client_factory):
        output = BytesIO()
        with ZipFile(output, "w") as archive:
            archive.writestr(
                "metadata/page_001.json",
                json.dumps({"blocks": [{"text": "Policy schedule"}]}),
            )

        created = Mock()
        created.json.return_value = {"job_id": "job-1"}
        status = Mock()
        status.json.return_value = {"status": "completed"}
        download = Mock()
        download.json.return_value = {"url": "https://storage.example/result.zip"}
        result = Mock()
        result.content = output.getvalue()
        client = MagicMock()
        client.__enter__.return_value = client
        client.post.return_value = created
        client.get.side_effect = [status, download, result]
        client_factory.return_value = client

        pages = _sarvam_digitise("scan.png", b"image", "image/png", "en-IN", 5)

        self.assertEqual(pages, [{"page_number": 6, "text": "Policy schedule"}])
        client.post.assert_called_once()
        self.assertEqual(client.get.call_count, 3)

    @patch("google.genai.Client")
    @patch("app.services.document_pipeline.settings.gemini_api_key", "test-key")
    def test_gemini_requests_page_text_without_storing_interactions(self, client_factory):
        client = MagicMock()
        client.interactions.create.return_value.output_text = json.dumps({
            "pages": [{"page_number": 2, "text": "Room rent limit: INR 5,000"}]
        })
        client_factory.return_value = client

        pages = _gemini_digitise("policy.pdf", b"%PDF-1.7", "application/pdf", "en-IN")

        self.assertEqual(pages, [{"page_number": 2, "text": "Room rent limit: INR 5,000"}])
        self.assertFalse(client.interactions.create.call_args.kwargs["store"])
        client.close.assert_called_once()

    @patch("app.services.document_pipeline._sarvam_digitise")
    @patch("app.services.document_pipeline._gemini_digitise", side_effect=RuntimeError("provider unavailable"))
    @patch("app.services.document_pipeline.settings.sarvam_api_key", "sarvam-key")
    @patch("app.services.document_pipeline.settings.gemini_api_key", "gemini-key")
    @patch("app.services.document_pipeline.settings.ocr_provider_order", "gemini,sarvam")
    def test_falls_back_to_next_configured_ocr_provider(
        self,
        gemini_digitise,
        sarvam_digitise,
    ):
        sarvam_digitise.return_value = [{"page_number": 1, "text": "OCR text"}]

        pages, provider = _ocr_with_fallback("scan.png", b"image", "image/png", "en-IN")

        self.assertEqual(provider, "sarvam")
        self.assertEqual(pages[0]["text"], "OCR text")
        gemini_digitise.assert_called_once()
        sarvam_digitise.assert_called_once()

    @patch("app.services.document_pipeline._supabase_request")
    @patch("app.services.document_pipeline._owned_case")
    @patch("app.services.document_pipeline.extract_document_pages")
    @patch("app.services.document_pipeline.embed_texts")
    def test_persists_vector_chunks_before_marking_document_done(
        self,
        embed_texts,
        extract_document_pages,
        owned_case,
        supabase_request,
    ):
        owned_case.return_value = {"language_pref": "en-IN"}
        extract_document_pages.return_value = (
            [{"page_number": 3, "text": "Policy terms and hospitalization coverage."}],
            3,
            "pymupdf",
        )
        embed_texts.return_value = [[0.01] * 384]

        def supabase_response(method, path, **kwargs):
            if method == "POST" and path == "/rest/v1/documents":
                return Mock(json=lambda: [{"id": "document-1"}])
            if method == "PATCH":
                return Mock(json=lambda: [{"id": "document-1"}])
            return Mock(json=lambda: [])

        supabase_request.side_effect = supabase_response
        result = process_document_upload("case-1", "user-1", "policy.pdf", b"%PDF-1.7")

        self.assertEqual(result["status"], "done")
        chunk_call = next(
            call for call in supabase_request.call_args_list
            if call.args[1] == "/rest/v1/chunks"
        )
        self.assertEqual(chunk_call.kwargs["json"][0]["page_number"], 3)
        self.assertEqual(len(chunk_call.kwargs["json"][0]["embedding_384"]), 384)

    @patch("app.services.document_pipeline._supabase_request")
    @patch("app.services.document_pipeline._owned_case")
    @patch("app.services.document_pipeline.extract_document_pages")
    @patch("app.services.document_pipeline.embed_texts")
    def test_persists_structured_claim_facts_with_source_metadata(
        self,
        embed_texts,
        extract_document_pages,
        owned_case,
        supabase_request,
    ):
        owned_case.return_value = {"language_pref": "en-IN"}
        extract_document_pages.return_value = (
            [{
                "page_number": 6,
                "text": "Policy number POL-2231. Sum insured INR 5,00,000. Room rent limit is INR 5,000 per day.",
            }],
            1,
            "pymupdf",
        )
        embed_texts.return_value = [[0.01] * 384]

        def supabase_response(method, path, **kwargs):
            if method == "POST" and path == "/rest/v1/documents":
                return Mock(json=lambda: [{"id": "document-1"}])
            if method == "POST" and path == "/rest/v1/case_facts":
                return Mock(json=lambda: [])
            if method == "PATCH":
                return Mock(json=lambda: [{"id": "document-1"}])
            return Mock(json=lambda: [])

        supabase_request.side_effect = supabase_response

        result = process_document_upload("case-1", "user-1", "policy.pdf", b"%PDF-1.7")

        self.assertEqual(result["status"], "done")
        facts_call = next(
            call for call in supabase_request.call_args_list
            if call.args[1] == "/rest/v1/case_facts"
        )
        self.assertIn("sum_insured", [record["fact_key"] for record in facts_call.kwargs["json"]])
        self.assertEqual(facts_call.kwargs["json"][0]["source_page"], 6)
        self.assertGreaterEqual(facts_call.kwargs["json"][0]["confidence"], 0.5)

    @patch("app.api.cases._supabase_request")
    @patch("app.api.cases.authenticate_user")
    def test_fetch_case_for_user_scopes_to_signed_in_owner(
        self,
        authenticate_user,
        supabase_request,
    ):
        authenticate_user.return_value = "user-1"
        supabase_request.return_value = Mock(json=lambda: [{
            "id": "case-1",
            "case_type": "medical_claim",
            "status": "docs_pending",
            "readiness_score": 70,
            "next_action": "Upload discharge summary",
            "hospital_name": "DemoCare Hospital",
            "user_id": "user-1",
        }])

        case = _fetch_case_for_user("case-1", "user-1")

        self.assertEqual(case["id"], "case-1")
        self.assertEqual(case["readiness_score"], 70)
        self.assertEqual(supabase_request.call_args.kwargs["params"]["user_id"], "eq.user-1")


if __name__ == "__main__":
    unittest.main()