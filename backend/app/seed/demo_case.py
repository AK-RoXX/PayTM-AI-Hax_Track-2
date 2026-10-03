DEMO_CASE_ID = "MED-82031"
DEMO_CASE = {
    "id": DEMO_CASE_ID,
    "case_type": "medical_claim",
    "status": "ACTION_REQUIRED",
    "urgency": "high",
    "patient_relation": "Mother",
    "hospital_name": "DemoCare Hospital",
    "readiness_score": 78,
    "next_best_action": "Upload a signed discharge summary",
    "financial_map": {
        "hospital_estimate": 300000,
        "possible_coverage": 220000,
        "estimated_gap": 80000,
        "status": "planning_estimate",
        "disclaimer": "Planning estimate based on uploaded documents. Final coverage is determined by the insurer."
    },
    "missing_requirements": [{
        "name": "Signed discharge summary",
        "reason": "The discharge summary is required but the uploaded copy does not contain a detectable doctor signature.",
        "priority": "high"
    }],
    "verified_items": ["Health policy", "Hospital estimate", "Admission record", "Patient details"],
    "timeline": [
        {"id":"evt-1","title":"Case created","detail":"Medical emergency case created from user intake.","occurred_at":"Today, 09:50 AM","status":"complete"},
        {"id":"evt-2","title":"Policy analyzed","detail":"Coverage terms and room-rent condition extracted.","occurred_at":"Today, 09:55 AM","status":"complete"},
        {"id":"evt-3","title":"Document action required","detail":"Signed discharge summary is missing.","occurred_at":"Today, 10:01 AM","status":"attention"},
        {"id":"evt-4","title":"Claim draft","detail":"Available after the required document is added.","occurred_at":"Next","status":"pending"}
    ]
}
DEMO_EVIDENCE = [{
    "claim": "Your policy includes inpatient hospitalization coverage.",
    "document_name": "Health_Policy_Demo.pdf",
    "page_number": 6,
    "section": "Clause 4.2 — In-patient Hospitalization",
    "quote": "In-patient hospitalization expenses are covered, subject to the terms, exclusions and waiting periods of this policy.",
    "confidence": 0.96
}, {
    "claim": "Your policy lists a room-rent limit of ₹5,000 per day.",
    "document_name": "Health_Policy_Demo.pdf",
    "page_number": 9,
    "section": "Schedule of Benefits",
    "quote": "Room rent expenses are payable up to ₹5,000 per day.",
    "confidence": 0.94
}]
DEMO_DOCUMENTS = [
 {"id":"doc-policy","case_id":DEMO_CASE_ID,"document_type":"health_policy","filename":"Health_Policy_Demo.pdf","status":"extracted","extracted_facts":{"policy_number":"POL-****-9932","sum_insured":500000,"room_rent_limit_per_day":5000},"evidence":[]},
 {"id":"doc-bill","case_id":DEMO_CASE_ID,"document_type":"hospital_estimate","filename":"DemoCare_Hospital_Estimate.pdf","status":"extracted","extracted_facts":{"hospital_name":"DemoCare Hospital","estimated_total_amount":300000},"evidence":[]},
 {"id":"doc-discharge","case_id":DEMO_CASE_ID,"document_type":"discharge_summary","filename":"Discharge_Summary.pdf","status":"needs_review","extracted_facts":{"doctor_signature_present":False},"evidence":[]}
]
