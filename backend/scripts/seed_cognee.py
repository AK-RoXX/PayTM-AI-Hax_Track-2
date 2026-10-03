"""
One-time seed script. Run once before the demo.

Usage (from backend/):
  py -m scripts.seed_cognee
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

COGNEE_URL = os.environ.get("COGNEE_URL", "")
COGNEE_API_KEY = os.environ.get("COGNEE_API_KEY", "")
COGNEE_TENANT_ID = os.environ.get("COGNEE_TENANT_ID", "")

HEADERS = {
    "X-Api-Key": COGNEE_API_KEY,
    "X-Tenant-Id": COGNEE_TENANT_ID
}

FINANCIAL_KNOWLEDGE = [
    # Insurance glossary
    ("sum_insured", "Sum insured is the maximum amount the insurer will pay for all claims in a policy year. Also called coverage limit."),
    ("co_pay", "Co-pay or co-payment is the percentage of the claim amount the policyholder must pay out-of-pocket. Example: 20% co-pay means insurer pays 80%, you pay 20%."),
    ("room_rent_cap", "Room rent cap or room rent limit is the maximum daily amount the insurer pays for hospital room charges. If you choose a room above this limit, proportionate deductions apply to all related charges."),
    ("waiting_period", "Waiting period is the time after buying a policy during which certain treatments are not covered. Usually 30 days for general illness, 2 years for pre-existing diseases."),
    ("tpa", "TPA (Third Party Administrator) is the company that handles insurance claims on behalf of the insurer. They verify documents and process cashless requests."),
    ("cashless_claim", "Cashless claim: the insurer pays the hospital directly. Requires a cashless authorization letter from the TPA before or during hospitalization."),
    ("reimbursement_claim", "Reimbursement claim: you pay the hospital first, then submit bills to the insurer and get reimbursed. Takes 2-4 weeks typically."),
    # Document checklist
    ("claim_documents", """Required documents for a health insurance claim:
1. Duly filled claim form (signed by doctor and patient)
2. Original hospital discharge summary with doctor signature
3. Original hospital bills and receipts
4. Diagnostic test reports
5. Doctor's prescription for medicines
6. Health insurance policy copy
7. ID proof (Aadhaar card, PAN card)
8. Cancelled cheque (for reimbursement)
9. Indoor case papers / treatment record"""),
    # Loan basics
    ("loan_apr", "APR (Annual Percentage Rate) is the total annual cost of a loan including interest and fees. A personal loan APR of 16-24% means you pay ₹16,000-24,000 per year per ₹1 lakh borrowed."),
    ("emi_formula", "EMI = P × r × (1+r)^n / ((1+r)^n - 1) where P = loan amount, r = monthly interest rate, n = number of months."),
    ("overborrowing_warning", "Warning: Do not borrow before exhausting insurance coverage. Your estimated policy gap may be much lower than the total hospital bill. Complete insurance verification first."),
    # Disclaimer
    ("disclaimer", "All coverage estimates are based on documents you have uploaded. Final coverage is determined by the insurer after claim assessment. This information is not legal or financial advice."),
]

DEMO_POLICY_CHUNKS = [
    # Page 1
    ("policy_summary", 1, "health_policy", "Policy Number: POL-889923. Insured: Ramesh Kumar. Sum Insured: Rs 5,00,000. Policy Period: 1 April 2025 to 31 March 2026. Premium Paid: Rs 12,500."),
    # Page 2
    ("coverage_intro", 2, "health_policy", "Section 2 — Coverage. This policy covers inpatient hospitalization expenses incurred at a registered hospital for a minimum of 24 continuous hours."),
    # Page 4 — Clause 4.2
    ("inpatient_hospitalization", 6, "health_policy", "Clause 4.2 — In-patient Hospitalization: In-patient hospitalization expenses are covered, subject to the terms, exclusions and waiting periods of this policy. Covered expenses include: room rent (subject to daily limit), ICU charges, surgeon fees, anaesthetist fees, OT charges, medicines, diagnostic tests."),
    # Page 9 — Schedule of Benefits
    ("room_rent_limit", 9, "health_policy", "Schedule of Benefits — Room Rent: Room rent expenses are payable up to Rs 5,000 per day. For ICU: payable up to Rs 7,500 per day. If the actual room rent exceeds these limits, all associated charges (surgeon, doctor visits, etc.) will be reduced in the same proportion."),
    # Page 11 — Waiting period
    ("waiting_period_clause", 11, "health_policy", "Clause 6 — Waiting Period: (a) Initial waiting period of 30 days from policy commencement for all illnesses except accidents. (b) Pre-existing disease waiting period: 2 years from first policy inception. (c) Specific disease waiting period: 1 year for hernia, hydrocele, piles, tonsillitis, sinusitis, and related conditions."),
    # Page 13 — Exclusions
    ("exclusions", 13, "health_policy", "Clause 8 — Exclusions: The following are not covered: (a) Dental treatment unless due to accident. (b) Cosmetic surgery unless for reconstruction after accident. (c) Infertility treatment. (d) Self-inflicted injury. (e) Alcohol or drug-related treatment. (f) Experimental or investigational treatments."),
    # Page 15 — Claim process
    ("claim_process", 15, "health_policy", "Clause 10 — Claim Process: (a) Cashless: Notify TPA at least 48 hours before planned hospitalization or within 6 hours of emergency admission. TPA will issue authorization letter to hospital. (b) Reimbursement: Submit all original documents within 30 days of discharge. (c) Required documents: discharge summary, hospital bills, doctor prescription, claim form, ID proof."),
]

async def seed():
    async with httpx.AsyncClient(
        base_url=COGNEE_URL,
        headers=HEADERS,
        timeout=60,
    ) as client:
        
        # ─── 1. Financial knowledge ───
        print("Seeding financial_knowledge dataset...")
        multipart = [("datasetName", (None, "financial_knowledge")), ("run_in_background", (None, "true"))]
        for key, text in FINANCIAL_KNOWLEDGE:
            multipart.append(("raw_data", (None, f"[topic={key}]\n{text}")))
        
        resp = await client.post("/api/v1/remember", files=multipart)
        print(f"  remember status: {resp.status_code}")
        
        # ─── 2. Demo policy ───
        print("Seeding policy_POL_889923 dataset...")
        await asyncio.sleep(2)
        
        multipart2 = [("datasetName", (None, "policy_POL_889923")), ("run_in_background", (None, "true"))]
        for key, page, doc_type, text in DEMO_POLICY_CHUNKS:
            chunk_text = (
                f"[chunk_id=policy-{key} | doc={doc_type} | page={page} | clause={key}]\n"
                f"{text}"
            )
            multipart2.append(("raw_data", (None, chunk_text)))
        
        resp2 = await client.post("/api/v1/remember", files=multipart2)
        print(f"  remember status: {resp2.status_code}")
        
        print("Done. Wait 30-60 seconds for graph build before testing.")

if __name__ == "__main__":
    asyncio.run(seed())
