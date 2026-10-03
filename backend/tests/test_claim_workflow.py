"""Claim workflow tests: extraction provenance, readiness, ownership, citations."""
import unittest
from unittest.mock import AsyncMock, Mock, patch

from app.services import case_state
from app.services.case_state import CaseAccessError, build_case_view, resolve_facts
from app.services.claim_facts import extract_claim_facts
from app.services import evidence_service


CASE = {
    "id": "case-1",
    "case_code": "MED-TEST01",
    "case_type": "medical_claim",
    "status": "intake",
    "patient_relation": "self",
    "hospital_name": "Sunrise Hospital",
    "estimated_bill": 240000.0,
    "language_pref": "hinglish",
}


def fact(fact_key, value, document_id="doc-1", page=3, quote="q", document_type="health_policy"):
    return {
        "id": f"fact-{fact_key}",
        "case_id": "case-1",
        "document_id": document_id,
        "fact_key": fact_key,
        "value_json": value,
        "value_type": "number",
        "verification_status": "extracted",
        "source_page": page,
        "source_quote": quote,
        "confidence": 0.9,
        "documents": {"file_name": f"{document_type}.pdf", "document_type": document_type},
    }


def document(document_type, status="done", document_id="doc-1", name="a.pdf"):
    return {
        "id": document_id,
        "case_id": "case-1",
        "document_type": document_type,
        "file_name": name,
        "processing_status": status,
        "error_message": None,
        "page_count": 4,
        "processing_provider": "sarvam",
        "uploaded_at": "2026-10-02T10:00:00Z",
    }


class FactExtractionTests(unittest.TestCase):
    def test_extraction_carries_document_page_and_quote(self):
        pages = [{"page_number": 4, "text": "Sum Insured: Rs. 5,00,000\nPolicy No: SB-1234"}]

        results = extract_claim_facts("health_policy", pages)

        keys = {item["fact_key"] for item in results}
        self.assertIn("sum_insured", keys)
        self.assertIn("policy_number", keys)
        for item in results:
            self.assertEqual(item["source_page"], 4)
            self.assertTrue(item["source_quote"])
            self.assertGreaterEqual(item["confidence"], 0.5)
            self.assertEqual(item["verification_status"], "extracted")

    def test_label_does_not_swallow_the_next_field(self):
        pages = [{"page_number": 1, "text": "Total Amount: Rs. 1,80,000\nDate of Admission: 12 Aug"}]

        results = extract_claim_facts("hospital_estimate", pages)
        amount = next(item for item in results if item["fact_key"] == "estimated_total_amount")

        self.assertEqual(amount["value_json"], 180000.0)
        self.assertNotIn("Date of Admission", str(amount["value_json"]))


class ReadinessTests(unittest.TestCase):
    def test_missing_documents_drive_readiness_and_next_action(self):
        view = build_case_view(CASE, [document("health_policy", document_id="doc-1")], [])

        self.assertEqual(view["readiness_score"], 8)
        self.assertEqual(view["verified_items"], [])
        self.assertTrue(any(item["name"] == "Hospital estimate or final bill" for item in view["missing_requirements"]))
        self.assertIn("upload the", view["next_best_action"].lower())
        self.assertEqual(view["status"], "docs_pending")

    def test_anchor_fact_gates_the_requirement(self):
        documents = [document("health_policy", document_id="doc-1")]

        without_anchor = build_case_view(CASE, documents, [])
        with_anchor = build_case_view(
            CASE,
            documents,
            [fact("policy_number", "SB-1234", page=1, quote="Policy No: SB-1234")],
        )

        self.assertLess(without_anchor["readiness_score"], with_anchor["readiness_score"])
        self.assertEqual(without_anchor["verified_items"], [])
        gated = next(
            item
            for item in without_anchor["missing_requirements"]
            if item["name"] == "Health insurance policy"
        )
        self.assertIn("policy", gated["reason"].lower())
        self.assertEqual(with_anchor["verified_items"], ["Health insurance policy"])
        self.assertEqual(with_anchor["urgency"], "normal")

    def test_failed_document_raises_urgency_and_blocks_completion(self):
        failed = document("health_policy", status="failed", document_id="doc-2")
        failed["error_message"] = "No module named 'fastembed'"

        view = build_case_view(CASE, [failed], [])

        self.assertEqual(view["urgency"], "high")
        self.assertEqual(view["status"], "docs_pending")
        entry = next(item for item in view["documents"] if item["id"] == "doc-2")
        self.assertEqual(entry["processing_status"], "failed")
        self.assertEqual(entry["extraction_status"], "failed")
        self.assertIn("fastembed", entry["error_message"])
        self.assertTrue(view["missing_requirements"])

    def test_retry_after_failure_reaches_full_readiness(self):
        failed = document("health_policy", status="failed", document_id="doc-2")
        retried = document("health_policy", document_id="doc-3", name="policy.pdf")

        view = build_case_view(
            CASE,
            [failed, retried],
            [
                fact(
                    "policy_number",
                    "SB-1234",
                    document_id="doc-3",
                    page=1,
                    quote="Policy No: SB-1234",
                    document_type="health_policy",
                )
            ],
        )

        self.assertIn("Health insurance policy", view["verified_items"])
        retried_entry = next(item for item in view["documents"] if item["id"] == "doc-3")
        self.assertEqual(retried_entry["processing_status"], "done")
        self.assertEqual(retried_entry["extraction_status"], "done")

    def test_facts_expose_provenance_for_review(self):
        view = build_case_view(
            CASE,
            [document("health_policy", document_id="doc-1")],
            [fact("sum_insured", 500000.0, page=2, quote="Sum Insured: Rs. 5,00,000")],
        )

        item = view["facts"][0]
        self.assertEqual(item["document_id"], "doc-1")
        self.assertEqual(item["source_page"], 2)
        self.assertEqual(item["document_name"], "health_policy.pdf")
        self.assertEqual(item["source_quote"], "Sum Insured: Rs. 5,00,000")

    def test_conflicting_values_are_flagged_not_silently_chosen(self):
        resolved = resolve_facts(
            [
                fact("sum_insured", 500000.0, document_id="doc-1"),
                fact("sum_insured", 700000.0, document_id="doc-2"),
            ]
        )

        self.assertEqual(resolved["sum_insured"]["verification_status"], "conflict")
        self.assertEqual(len(resolved["sum_insured"]["sources"]), 2)

    def test_status_answer_reads_from_case_state(self):
        view = build_case_view(CASE, [], [])

        answer = evidence_service.build_status_answer(view)

        self.assertIn(f"{view['readiness_score']}% ready", answer.answer)
        self.assertEqual(answer.source, "case_state")
        self.assertEqual(answer.case_id, "case-1")


class OwnershipTests(unittest.TestCase):
    @patch("app.services.case_state._supabase_request")
    def test_case_of_another_user_is_not_readable(self, request):
        request.return_value = Mock(json=lambda: [])

        with self.assertRaises(CaseAccessError):
            case_state.load_case_state("case-1", "user-2")

        cases_call = next(
            call for call in request.call_args_list if call.args[1] == "/rest/v1/cases"
        )
        self.assertEqual(cases_call.kwargs["params"]["user_id"], "eq.user-2")
        self.assertEqual(cases_call.kwargs["params"]["id"], "eq.case-1")

    @patch("app.services.case_state._supabase_request")
    def test_documents_and_facts_are_scoped_to_the_case(self, request):
        request.return_value = Mock(json=lambda: [])

        with self.assertRaises(CaseAccessError):
            case_state.load_case_state("case-1", "user-1")

        for call in request.call_args_list:
            params = call.kwargs["params"]
            if call.args[1] in {"/rest/v1/documents", "/rest/v1/case_facts"}:
                self.assertEqual(params["case_id"], "eq.case-1")


class CitationTests(unittest.IsolatedAsyncioTestCase):
    CHUNKS = [
        {
            "id": "chunk-1",
            "document_id": "doc-1",
            "text": "Room rent is covered up to Rs. 5,000 per day for a room.",
            "page_number": 6,
            "clause_label": "Room rent",
            "document_name": "Policy.pdf",
            "document_type": "health_policy",
            "confidence": 0.8,
        }
    ]

    async def test_answer_cites_the_document_and_page(self):
        with patch.object(evidence_service, "_cognee_chunks", AsyncMock(return_value=self.CHUNKS)):
            with patch.object(
                evidence_service,
                "_generate_answer",
                AsyncMock(
                    return_value={
                        "answer": "Yes, room rent is covered.",
                        "quote": "Room rent is covered up to Rs. 5,000 per day for a room.",
                        "chunk_id": "chunk-1",
                    }
                ),
            ):
                result = await evidence_service.find_evidence(
                    "is room rent covered", "case-1", "MED-TEST01"
                )

        self.assertIsNotNone(result)
        self.assertEqual(result.document_name, "Policy.pdf")
        self.assertEqual(result.page_number, 6)
        self.assertEqual(result.case_id, "case-1")

    async def test_answer_is_discarded_when_the_quote_is_invented(self):
        with patch.object(evidence_service, "_cognee_chunks", AsyncMock(return_value=self.CHUNKS)):
            with patch.object(
                evidence_service,
                "_generate_answer",
                AsyncMock(
                    return_value={
                        "answer": "Your claim is approved for 90%.",
                        "quote": "Claim approved for 90% of the total.",
                        "chunk_id": "chunk-1",
                    }
                ),
            ):
                result = await evidence_service.find_evidence(
                    "is my claim approved", "case-1", "MED-TEST01"
                )

        self.assertIsNone(result)

    async def test_no_documents_means_abstain(self):
        with patch.object(evidence_service, "_cognee_chunks", AsyncMock(return_value=[])):
            with patch.object(evidence_service, "_run_in_threadpool", AsyncMock(return_value=[])):
                result = await evidence_service.find_evidence(
                    "is room rent covered", "case-1", "MED-TEST01"
                )

        self.assertIsNone(result)


class CaseScopeHydrationTests(unittest.IsolatedAsyncioTestCase):
    @patch("app.services.evidence_service._supabase_request")
    def test_chunks_from_another_case_are_dropped(self, request):
        request.return_value = Mock(
            json=lambda: [
                {
                    "id": "chunk-9",
                    "case_id": "case-other",
                    "document_id": "doc-other",
                    "text": "Another patient's policy",
                    "page_number": 1,
                    "clause_label": "",
                    "documents": {"file_name": "Other.pdf", "document_type": "health_policy"},
                }
            ]
        )

        import asyncio

        chunks = asyncio.run(evidence_service._fetch_chunks_by_ids(["chunk-9"], "case-1"))

        self.assertEqual(chunks, [])
        self.assertEqual(
            request.call_args.kwargs["params"]["case_id"], "eq.case-1"
        )

    def test_demo_dataset_is_not_searched_for_real_claims(self):
        datasets = evidence_service._datasets("MED-82031")

        self.assertNotIn(evidence_service.cognee_service.POLICY_DEMO_DATASET, datasets)


class PipelineFailureTests(unittest.TestCase):
    @patch("app.services.document_pipeline._supabase_request")
    @patch("app.services.document_pipeline._owned_case")
    @patch("app.services.document_pipeline.extract_document_pages")
    @patch("app.services.document_pipeline.embed_texts")
    def test_failed_processing_marks_the_document_and_leaves_nothing_searchable(
        self,
        embed_texts,
        extract_document_pages,
        owned_case,
        request,
    ):
        from app.services.document_pipeline import process_document_upload

        owned_case.return_value = {"language_pref": "en-IN"}
        extract_document_pages.return_value = (
            [{"page_number": 1, "text": "Policy terms."}],
            1,
            "pymupdf",
        )
        embed_texts.side_effect = RuntimeError("No module named 'fastembed'")

        def supabase_response(method, path, **kwargs):
            if method == "POST" and path == "/rest/v1/documents":
                return Mock(json=lambda: [{"id": "document-1"}])
            if method == "PATCH":
                return Mock(json=lambda: [{"id": "document-1"}])
            return Mock(json=lambda: [])

        request.side_effect = supabase_response
        result = process_document_upload("case-1", "user-1", "policy.pdf", b"%PDF-1.7")

        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["facts_count"], 0)
        self.assertIn("fastembed", result["error_message"])

        patch_call = next(
            call
            for call in request.call_args_list
            if call.args[0] == "PATCH" and call.args[1].startswith("/rest/v1/documents")
        )
        self.assertEqual(patch_call.kwargs["json"]["processing_status"], "failed")

        cleared = {
            call.args[1]
            for call in request.call_args_list
            if call.args[0] == "DELETE" and call.args[1].startswith("/rest/v1/")
        }
        self.assertIn("/rest/v1/chunks?document_id=eq.document-1", cleared)
        self.assertIn("/rest/v1/case_facts?document_id=eq.document-1", cleared)

        self.assertFalse(
            any(
                call.args[0] == "POST" and call.args[1] == "/rest/v1/chunks"
                for call in request.call_args_list
            )
        )


if __name__ == "__main__":
    unittest.main()