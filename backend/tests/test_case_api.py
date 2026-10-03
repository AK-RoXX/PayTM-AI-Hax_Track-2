"""Endpoint tests: bearer auth, cross-user isolation, fact-backed citations."""
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from app.main import app

CASE_ID = "case-1"
OWNER = "user-1"
INTRUDER = "user-2"

CASE_ROW = {
    "id": CASE_ID,
    "case_code": "MED-TEST01",
    "case_type": "medical_claim",
    "status": "intake",
    "patient_relation": "self",
    "hospital_name": "Sunrise Hospital",
    "language_pref": "hinglish",
    "readiness_score": None,
    "next_action": None,
    "estimated_bill": 240000.0,
    "estimated_coverage": None,
    "estimated_gap": None,
    "created_at": "2026-10-02T09:00:00Z",
    "updated_at": "2026-10-02T10:00:00Z",
}

DOCUMENTS = [
    {
        "id": "doc-1",
        "case_id": CASE_ID,
        "document_type": "health_policy",
        "file_name": "Policy.pdf",
        "processing_status": "done",
        "error_message": None,
        "page_count": 4,
        "processing_provider": "sarvam",
        "uploaded_at": "2026-10-02T09:30:00Z",
    }
]

FACTS = [
    {
        "id": "fact-1",
        "case_id": CASE_ID,
        "document_id": "doc-1",
        "fact_key": "sum_insured",
        "value_json": 500000,
        "value_type": "number",
        "verification_status": "extracted",
        "source_page": 2,
        "source_quote": "Sum Insured: Rs. 5,00,000",
        "confidence": 0.93,
        "documents": {"file_name": "Policy.pdf", "document_type": "health_policy"},
    }
]


def fake_supabase(method, path, **kwargs):
    params = kwargs.get("params") or {}
    if path == "/rest/v1/cases":
        owner = params.get("user_id")
        if owner == f"eq.{OWNER}":
            return Mock(json=lambda: [CASE_ROW])
        return Mock(json=lambda: [])
    if path == "/rest/v1/documents":
        return Mock(json=lambda: DOCUMENTS)
    if path == "/rest/v1/case_facts":
        return Mock(json=lambda: FACTS)
    if path == "/rest/v1/case_events":
        return Mock(json=lambda: [])
    if path == "/rest/v1/evidence_items":
        if method == "DELETE":
            return Mock(json=lambda: [])
        return Mock(json=lambda: [])
    return Mock(json=lambda: [])


class CaseEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.cases._supabase_request", side_effect=fake_supabase)
    @patch("app.services.case_state._supabase_request", side_effect=fake_supabase)
    @patch("app.api.cases.authenticate_user", return_value=OWNER)
    def test_case_detail_requires_a_bearer_token(self, authenticate, state_request, request):
        response = self.client.get(f"/api/v1/cases/{CASE_ID}")

        self.assertEqual(response.status_code, 401)
        authenticate.assert_not_called()

    @patch("app.api.cases._supabase_request", side_effect=fake_supabase)
    @patch("app.services.case_state._supabase_request", side_effect=fake_supabase)
    @patch("app.api.cases.authenticate_user", return_value=OWNER)
    def test_owner_reads_their_case_with_provenance(self, authenticate, state_request, request):
        response = self.client.get(
            f"/api/v1/cases/{CASE_ID}", headers={"Authorization": "Bearer token"}
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["case_code"], "MED-TEST01")
        self.assertEqual(body["documents"][0]["file_name"], "Policy.pdf")
        self.assertEqual(body["documents"][0]["facts_count"], 1)
        self.assertEqual(body["documents"][0]["facts"][0]["source_page"], 2)
        self.assertEqual(body["facts"][0]["source_page"], 2)
        self.assertEqual(body["facts"][0]["document_name"], "Policy.pdf")
        self.assertEqual(body["financial_map"]["hospital_estimate"], 240000.0)
        # A policy document without a readable policy number is not "verified".
        self.assertEqual(body["verified_items"], [])
        policy = next(
            item
            for item in body["missing_requirements"]
            if item["name"] == "Health insurance policy"
        )
        self.assertIn("policy number", policy["reason"].lower())

    @patch("app.api.cases._supabase_request", side_effect=fake_supabase)
    @patch("app.services.case_state._supabase_request", side_effect=fake_supabase)
    @patch("app.api.cases.authenticate_user", return_value=INTRUDER)
    def test_another_users_case_is_not_found(self, authenticate, state_request, request):
        response = self.client.get(
            f"/api/v1/cases/{CASE_ID}", headers={"Authorization": "Bearer token"}
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Case not found.")

    @patch("app.api.cases._supabase_request", side_effect=fake_supabase)
    @patch("app.services.case_state._supabase_request", side_effect=fake_supabase)
    @patch("app.api.cases.authenticate_user", return_value=INTRUDER)
    def test_another_user_cannot_read_facts_or_evidence(self, authenticate, state_request, request):
        for suffix in ("facts", "evidence", "readiness"):
            with self.subTest(suffix=suffix):
                response = self.client.get(
                    f"/api/v1/cases/{CASE_ID}/{suffix}",
                    headers={"Authorization": "Bearer token"},
                )
                self.assertEqual(response.status_code, 404)

    @patch("app.api.cases._supabase_request", side_effect=fake_supabase)
    @patch("app.services.case_state._supabase_request", side_effect=fake_supabase)
    @patch("app.api.cases.authenticate_user", return_value=OWNER)
    def test_evidence_items_cite_the_document_and_page(self, authenticate, state_request, request):
        response = self.client.get(
            f"/api/v1/cases/{CASE_ID}/evidence", headers={"Authorization": "Bearer token"}
        )

        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertIn("Sum insured", items[0]["claim"])
        self.assertEqual(items[0]["document_name"], "Policy.pdf")
        self.assertEqual(items[0]["page_number"], 2)
        self.assertEqual(items[0]["quote"], "Sum Insured: Rs. 5,00,000")


if __name__ == "__main__":
    unittest.main()