# Paytm Sahayak — Product, Architecture & Engineering Context

> **Purpose:** This document is the single source of truth for an agentic IDE/Coding Agent working on the Paytm Sahayak hackathon project.
>
> **Hackathon Track:** AI-Powered Financial Journeys
> **Core theme:** Make Insurance, Lending and Fintech simpler, faster and more human using AI.
>
> **Primary demo journey:** Health Insurance → Claim Understanding → Financial Gap → Action → Financing
>
> **Product vision:** Paytm Sahayak is an AI financial-journey agent that understands messy human requests, documents, voice conversations and financial context, then guides and executes the appropriate insurance, lending or fintech journey.

---

# 1. Executive Summary

We are building **Paytm Sahayak**, an AI-powered financial journey agent for the Paytm ecosystem.

The central insight is:

> Customers do not think in terms of financial products. They think in terms of problems.

A customer does not normally say:

* "I need an insurance claim API."
* "I need a personal loan."
* "I need a reimbursement workflow."
* "I need a policy-document retrieval system."

They say:

> "My father is in the hospital. I have insurance but I don't understand what it covers, the hospital is asking me for ₹80,000, and I don't know what to do."

Sahayak converts this messy real-world problem into a structured financial journey:

```text
Human Problem
      ↓
Conversation / Voice / Documents
      ↓
Understand Context
      ↓
Identify Financial Journey
      ↓
Retrieve Verified Information
      ↓
Calculate Financial Impact
      ↓
Explain Evidence
      ↓
Recommend/Present Next Actions
      ↓
Execute Supported Actions
      ↓
Track Progress
      ↓
Connect Relevant Paytm Product
```

The initial flagship journey is:

```text
Health Insurance
      ↓
Policy Understanding
      ↓
Hospital / Claim Documents
      ↓
Claim Status
      ↓
Claim Explanation
      ↓
Financial Gap
      ↓
Evidence
      ↓
Next Action
      ↓
Optional Financing Journey
```

The architecture must remain extensible to:

* Personal loans
* Other lending journeys
* Credit products
* Payments
* Insurance beyond health insurance
* Other Paytm financial services

However, **the hackathon demo should focus deeply on one coherent end-to-end journey rather than superficially implementing many products.**

---

# 2. Hackathon Problem Statement

## Track

### AI-Powered Financial Journeys

The challenge is to:

> Make Insurance, Lending and Fintech simpler, faster and more human.

The solution should:

* Reimagine customer-facing financial journeys using AI.
* Remove friction.
* Reduce complexity.
* Help customers complete important financial journeys faster.
* Increase customer confidence.
* Support Insurance, Lending and Fintech use cases.

Example direction:

> Simplify the Health Insurance claims journey using AI — from understanding policy coverage and submitting documents to tracking claims and resolving customer queries.

---

# 3. Product Positioning

## Do NOT position Sahayak as:

> "An AI health insurance chatbot."

That is too narrow.

## Position Sahayak as:

> **An AI financial journey agent that turns messy real-world financial problems into guided, verifiable and actionable Paytm journeys.**

Health insurance is the **hero journey / flagship proof-of-concept**.

The broader platform is:

```text
                    PAYTM SAHAYAK

             AI FINANCIAL JOURNEY AGENT

                         USER
                           │
            ┌──────────────┼──────────────┐
            │              │              │
           CHAT           VOICE        DOCUMENTS
            │              │              │
            └──────────────┼──────────────┘
                           │
                           ▼
                 CONTEXT UNDERSTANDING
                           │
                           ▼
                    JOURNEY ENGINE
                           │
              ┌────────────┼────────────┐
              │            │            │
          INSURANCE      LENDING      FINTECH
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                     ACTION ENGINE
                           │
                           ▼
                   PAYTM ECOSYSTEM
                           │
                           ▼
                   JOURNEY EXPERIENCE
```

---

# 4. Core Product Principle

The user should not need to understand Paytm's internal product structure.

The user can simply:

* Type a message.
* Speak naturally.
* Upload a PDF.
* Upload an image.
* Upload a screenshot.
* Share a bill.
* Share a policy.
* Share a loan document.
* Explain their situation in their own words.

Sahayak determines:

1. What is happening?
2. What financial journey is involved?
3. What information is available?
4. What information is missing?
5. What can be verified?
6. What calculations are required?
7. What is the current state?
8. What is the next useful action?
9. Which Paytm capability can help?

---

# 5. The Flagship Journey

## Medical Emergency → Insurance → Financial Gap → Financing

Example:

```text
Hospital admission
        ↓
Customer asks:
"Will insurance cover this?"
        ↓
Upload policy
        ↓
Sahayak explains coverage
        ↓
Upload hospital bill
        ↓
Sahayak analyzes bill
        ↓
Claim status retrieved
        ↓
Sahayak explains claim state
        ↓
Insurance approves part of claim
        ↓
Money Map calculates gap
        ↓
Evidence Drawer explains deductions
        ↓
Sahayak identifies confirmed vs uncertain gap
        ↓
User chooses next action
        ↓
Paytm financing journey can be explored
```

This is the core demo.

---

# 6. Current Implementation Status

The backend already contains several important components.

## Completed

### 6.1 Intent Router

The system has a fast and defensive intent-routing layer.

Current approach:

```text
User message
      ↓
Regex / deterministic rules
      ↓
If unresolved:
Gemini classification
      ↓
If Gemini unavailable:
Safe fallback
```

The router already handles examples such as:

```text
"What is copay?"

"Is ICU covered?"

"Can I get a loan?"

"लोन लेना सही रहेगा?"

"मेरा claim pending क्यों है?"
```

The router should remain lightweight and deterministic where possible.

Do NOT replace the existing routing system with an unnecessary large agentic framework unless there is a concrete requirement.

---

# 7. Knowledge Base / Document Handler

The existing system uses:

* Cognee
* Supabase
* pgvector
* Retrieval over uploaded user documents

Current behavior:

```text
User question
      ↓
Search user's uploaded documents
      ↓
Retrieve top relevant passages
      ↓
Generate grounded response
      ↓
Return evidence
```

The handler should:

* Search only relevant user-provided documents.
* Retrieve relevant chunks.
* Return source/page information.
* Include exact supporting quotes when available.
* Refuse to invent an answer when evidence is unavailable.

Example:

User:

> "Is ICU covered?"

System should return something like:

```text
Answer:
ICU treatment is covered subject to the policy's applicable limits.

Evidence:
Policy.pdf
Page 18

Quote:
"..."
```

If the policy does not contain enough evidence:

```text
I couldn't verify this from the documents you've provided.
```

Never hallucinate policy coverage.

---

# 8. Loan / Financial Rules Engine

A deterministic rules engine already exists for financial calculations.

The engine is responsible for:

* Bill amount
* Coverage
* Financial gap
* Readiness
* Document completeness
* Confirmed vs uncertain amounts

Important principle:

> Financial calculations must not be delegated entirely to an LLM.

Use deterministic Python logic for calculations.

The LLM can explain the result.

---

# 9. Current Money Map

The Money Map is one of the most important UI concepts.

Do NOT reduce the map to:

```text
Bill - Insurance = Gap
```

Instead distinguish:

```text
Hospital Bill
Insurance Approved
Confirmed Out-of-Pocket
Under Assessment
Potential Maximum Gap
```

Example:

```text
                 YOUR MONEY MAP

Hospital Bill
₹3,00,000
────────────────────────

Insurance Approved
₹2,00,000

Confirmed Out-of-Pocket
₹40,000

Still Under Assessment
₹60,000

────────────────────────

Potential Maximum Gap
₹1,00,000
```

The distinction between **confirmed**, **pending**, and **potential** amounts is essential.

Sahayak must not present an uncertain insurance amount as a confirmed liability.

---

# 10. Evidence Drawer

The Evidence Drawer is a core product differentiator.

Every important financial or insurance conclusion should be traceable to evidence.

Example:

```text
₹20,000 Room Adjustment

Policy
Page 18

"Room rent shall be restricted to..."

Hospital Bill
Page 3

Room charge:
₹20,000/day

Policy limit:
₹10,000/day
```

The user should be able to understand:

* Where the information came from.
* Which document.
* Which page.
* What exact text supports the conclusion.
* Which calculation produced the number.

This is especially important for insurance and financial journeys.

---

# 11. Manager JSON / UI Contract

The backend currently produces structured JSON for the frontend.

The payload conceptually contains:

```json
{
  "headline": "...",
  "financial_map": {},
  "readiness": {},
  "evidence_drawer": [],
  "next_action": {},
  "claim": {},
  "metadata": {}
}
```

The frontend should use this structured response rather than parsing natural-language AI output.

The AI should generate structured information first.

The UI should render the structured state.

---

# 12. Current Architecture

The existing architecture is approximately:

```text
                    USER
                      │
                      ▼
               INTENT ROUTER
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       POLICY       CLAIM       LOAN
       HANDLER      HANDLER     HANDLER
          │           │           │
          ▼           ▼           ▼
       DOCUMENT     CLAIM       RULES
       SEARCH       DATA        ENGINE
          │           │           │
          └───────────┼───────────┘
                      ▼
                 MANAGER JSON
                      │
                      ▼
                   FRONTEND
```

This is a good starting architecture.

However, it needs to evolve into a more complete **journey-oriented architecture**.

---

# 13. Target Architecture

The target architecture should be:

```text
                         PAYTM SAHAYAK
                  AI FINANCIAL JOURNEY AGENT

                              USER
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
            CHAT              VOICE          DOCUMENTS
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                     ┌───────────────────┐
                     │ CONTEXT ENGINE    │
                     │                   │
                     │ Intent            │
                     │ Conversation      │
                     │ Documents        │
                     │ Financial State   │
                     │ Journey State     │
                     └─────────┬─────────┘
                               ▼
                     ┌───────────────────┐
                     │ JOURNEY ROUTER    │
                     │                   │
                     │ Insurance         │
                     │ Lending           │
                     │ Fintech           │
                     └─────────┬─────────┘
                               ▼
                     ┌───────────────────┐
                     │ SPECIALIZED       │
                     │ HANDLERS          │
                     │                   │
                     │ Policy            │
                     │ Claim             │
                     │ Document          │
                     │ Financial         │
                     │ Lending           │
                     └─────────┬─────────┘
                               ▼
                     ┌───────────────────┐
                     │ ACTION ENGINE     │
                     │                   │
                     │ Calculate         │
                     │ Upload            │
                     │ Submit            │
                     │ Track             │
                     │ Notify            │
                     │ Escalate          │
                     └─────────┬─────────┘
                               ▼
                 ┌────────────────────────────┐
                 │       PAYTM ECOSYSTEM     │
                 │                            │
                 │ Insurance | Lending | Pay  │
                 └────────────────────────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │ JOURNEY UI       │
                     │                   │
                     │ Money Map         │
                     │ Evidence Drawer   │
                     │ Claim Timeline    │
                     │ Next Action       │
                     └───────────────────┘
```

---

# 14. Add a Data / Integration Layer

The architecture must distinguish AI from external truth.

Add:

```text
                         DATA / INTEGRATION
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
             Documents        Claim APIs       Paytm APIs
                 │                │                │
                 ▼                ▼                ▼
             Supabase         Insurer/TPA       Lending
             pgvector          /NHCX            /Fintech
```

The LLM should never be treated as the source of truth for:

* Claim status
* Approved amount
* Policy amount
* Loan eligibility
* Transaction status
* Payment status
* Financial calculations

Use APIs and deterministic logic for these.

Use AI for:

* Understanding
* Extraction
* Classification
* Summarization
* Explanation
* Natural-language interaction

---

# 15. Important Architectural Principle

The correct pattern is:

```text
User
 ↓
AI
 ↓
Understand
 ↓
Structured request
 ↓
Rules / API / Database
 ↓
Verified state
 ↓
AI
 ↓
Explain
 ↓
Action
```

NOT:

```text
User
 ↓
LLM
 ↓
Guess
 ↓
Answer
```

---

# 16. Claim Status Handler — NEXT PRIORITY

The Claim Status Handler is the most important missing backend component.

It should NOT simply return:

```text
"Pending"
```

It should answer:

* What is the current status?
* What stage is the claim in?
* Why is it pending?
* Who is currently responsible?
* Which documents are missing?
* What amount has been approved?
* What amount is still under assessment?
* When was it last updated?
* What is the next action?

---

# 17. Canonical Claim Object

Create a normalized internal claim model.

Suggested structure:

```json
{
  "claim_id": "CLM001",
  "policy_id": "POL001",
  "insurer": "Example Insurer",
  "tpa": "Example TPA",
  "hospital": "Example Hospital",

  "claim_type": "CASHLESS",

  "status": "QUERY_RAISED",
  "stage": "DOCUMENT_VERIFICATION",

  "pending_with": "CUSTOMER",

  "reason": "Discharge summary required",

  "requested_documents": [
    "Discharge Summary"
  ],

  "submitted_documents": [
    "Hospital Bill"
  ],

  "claimed_amount": 300000,
  "approved_amount": 200000,
  "settled_amount": null,

  "last_updated": "2026-10-02T15:30:00",

  "next_action": {
    "type": "UPLOAD_DOCUMENT",
    "label": "Upload Discharge Summary"
  }
}
```

---

# 18. Claim State Machine

Support states such as:

```text
INTIMATED
    ↓
REGISTERED
    ↓
PRE_AUTH_PENDING
    ↓
PRE_AUTH_APPROVED
    ↓
TREATMENT
    ↓
FINAL_BILL_PENDING
    ↓
FINAL_AUTH_PENDING
    ↓
SETTLED
```

Additional branches:

```text
QUERY_RAISED
      ↓
WAITING_CUSTOMER
      ↓
DOCUMENT_SUBMITTED
      ↓
REVIEW
```

and:

```text
REJECTED
      ↓
REVIEW
      ↓
GRIEVANCE
      ↓
ESCALATED
```

---

# 19. Mock Claim API

For the hackathon, a realistic mock API is acceptable.

Suggested endpoints:

```text
GET /claims/{claim_id}

GET /claims/{claim_id}/timeline

GET /claims/{claim_id}/financials

GET /claims/{claim_id}/documents

POST /claims/{claim_id}/documents

POST /claims/{claim_id}/actions
```

Example:

```json
{
  "claim_id": "CLM001",
  "status": "QUERY_RAISED",
  "pending_with": "CUSTOMER",
  "reason": "Discharge summary required",
  "approved_amount": 180000
}
```

The frontend must behave as if this is a real external claims system.

---

# 20. Claim Adapters

Do not hardcode the system around one insurer.

Use adapters:

```text
ClaimStatusService
        │
        ├── PaytmClaimAdapter
        ├── InsurerAdapter
        ├── TPAAdapter
        └── NHCXAdapter
```

All adapters should normalize their source into the canonical claim object.

For example:

```text
Insurer A:
status = QRY

TPA B:
status = DOC_PENDING

Insurer C:
claimStage = Under Process
queryFlag = true
```

All become:

```json
{
  "state": "ACTION_REQUIRED",
  "pending_with": "CUSTOMER"
}
```

---

# 21. Real-World Claims Model

The real insurance ecosystem may involve:

```text
CUSTOMER
    │
    ▼
HOSPITAL
    │
    ▼
TPA / INSURER
    │
    ├── Preauthorization
    ├── Claim processing
    ├── Medical review
    ├── Document verification
    ├── Query
    ├── Settlement
    └── Rejection
```

A broker/intermediary such as Paytm can sit on the customer-facing side while the actual insurer remains responsible for underwriting and claim decisions.

Do not pretend Paytm itself directly decides insurance claims.

---

# 22. NHCX / Interoperability Direction

The architecture should be compatible with India's broader health-claims interoperability direction.

NHCX is intended to standardize exchange of health-claim information between insurers, TPAs, hospitals and other ecosystem participants.

Therefore:

**Do not build Sahayak around one insurer's proprietary response format.**

Build:

```text
Partner APIs
      │
      ▼
Claim Gateway
      │
      ▼
Canonical Claim Model
      │
      ▼
Sahayak
```

NHCX compatibility can be a future integration path.

For the hackathon, use mock adapters where production partner APIs are unavailable.

Never claim that a mock adapter is a live insurer integration.

---

# 23. Money Map v2

The Money Map should distinguish:

```text
Hospital Bill
Insurance Approved
Confirmed Out-of-Pocket
Under Assessment
Potential Maximum Gap
```

Example:

```text
Hospital Bill               ₹3,00,000
Insurance Approved          ₹2,00,000

Confirmed Out-of-Pocket       ₹40,000

Under Assessment              ₹60,000

Potential Maximum Gap       ₹1,00,000
```

The UI should visually communicate uncertainty.

Never tell the user:

> "You need a ₹1 lakh loan"

when ₹60,000 is still under insurance assessment.

Instead:

> "₹40,000 is currently confirmed. Another ₹60,000 remains under assessment."

---

# 24. Financial Gap Logic

The financial engine should produce something similar to:

```json
{
  "hospital_bill": 300000,
  "insurance_approved": 200000,
  "confirmed_gap": 40000,
  "under_assessment": 60000,
  "potential_gap": 100000
}
```

Possible breakdown:

```text
₹15,000 deductible
₹10,000 non-payable items
₹15,000 co-pay
₹60,000 pending assessment
```

Every number should ideally have a source.

---

# 25. Readiness Engine

The readiness engine should not only ask:

> "Are documents uploaded?"

It should understand:

```text
Policy available?
Claim registered?
Required documents available?
Documents submitted?
Claim state known?
Final amount known?
Financial gap confirmed?
```

Example:

```json
{
  "policy_ready": true,
  "documents_ready": true,
  "claim_status_known": true,
  "final_claim_decision": false,
  "financial_gap_confirmed": false,
  "readiness": 75
}
```

Do not treat "100% documents uploaded" as equivalent to "financial journey completed."

---

# 26. Action Engine

This is what turns Sahayak from an assistant into an agent.

Possible actions:

```text
UPLOAD_DOCUMENT
SUBMIT_DOCUMENT
TRACK_CLAIM
VIEW_CLAIM
VIEW_EVIDENCE
REQUEST_MISSING_DOCUMENT
PREPARE_ESCALATION
CALCULATE_GAP
EXPLORE_FINANCING
OPEN_PAYTM_FINANCING
```

The system should expose actions as structured UI commands.

Example:

```json
{
  "next_action": {
    "type": "UPLOAD_DOCUMENT",
    "label": "Upload Discharge Summary",
    "enabled": true
  }
}
```

---

# 27. Next Best Action

Every important user interaction should try to produce:

```text
Current state
      ↓
What is missing?
      ↓
What can be done now?
```

Example:

```text
CURRENT:
Claim is pending.

REASON:
Discharge summary missing.

ACTION:
Upload discharge summary.

[Upload Document]
```

Another example:

```text
CURRENT:
₹40,000 confirmed gap.

₹60,000 still under insurance assessment.

ACTION:
Wait for final decision OR explore financing options.

[Track Claim]
[Explore Financing]
```

Do not force a financial product recommendation.

The user should choose whether to explore financing.

---

# 28. Lending Integration

The insurance engine should NOT become the loan underwriting engine.

Correct separation:

```text
Sahayak
   │
   ▼
Medical / Insurance Financial Gap
   │
   ▼
User chooses to explore financing
   │
   ▼
Paytm Lending
   │
   ▼
Actual lender eligibility
   │
   ▼
KYC / Offer / Application
```

Sahayak may calculate:

```text
confirmed_gap = ₹40,000
```

but should not claim:

```text
"You're eligible for ₹40,000 loan."
```

Eligibility belongs to the lending system.

---

# 29. Broader Lending Support

The platform should be architecturally capable of supporting:

```text
Personal Loan
Medical Financing
Education Financing
Vehicle Financing
Emergency Financial Need
Other Paytm lending journeys
```

However, do not implement all of these for the hackathon.

Use a generic:

```text
Lending Journey Handler
```

with the ability to hand off to Paytm's appropriate lending flow.

---

# 30. Beyond Insurance

The same Sahayak architecture can eventually support:

## Personal Loan

User:

> "I need ₹2 lakh."

Sahayak:

```text
Understand requirement
↓
Request relevant documents
↓
Extract information
↓
Check readiness
↓
Hand off to Paytm lending
```

## Credit

User:

> "Can I get this credit product?"

Sahayak:

```text
Understand request
↓
Collect required information
↓
Check available eligibility information
↓
Present next step
```

## Payments

User:

> "This bill is due tomorrow."

Sahayak:

```text
Read bill
↓
Extract amount
↓
Extract due date
↓
Offer payment action
```

These should be presented as future extensibility, not separate hackathon projects.

---

# 31. Voice Interface

Voice should be treated as another input channel.

Example:

User says:

> "Hospital wale bol rahe hain cashless approve nahi hua aur kal discharge hai. Policy mere phone mein hai."

Pipeline:

```text
Voice
 ↓
Speech-to-text
 ↓
Context extraction
 ↓
Journey identification
 ↓
Claim lookup
 ↓
Document lookup
 ↓
Financial state
 ↓
Response
```

Structured result:

```json
{
  "journey": "HEALTH_INSURANCE",
  "event": "DISCHARGE_PENDING",
  "claim_status": "CASHLESS_PENDING",
  "urgency": "HIGH",
  "document_available": true
}
```

Voice is particularly valuable because users often describe financial/medical situations conversationally rather than using formal insurance terminology.

---

# 32. Multilingual Interaction

Support natural language.

Examples:

```text
"Is ICU covered?"

"Why is my claim pending?"

"लोन लेना सही रहेगा?"

"Hospital wale kitna paisa lenge?"

"Insurance ne sirf 2 lakh approve kiya, kyun?"

"Claim kab settle hoga?"
```

The internal representation should be language-independent.

Do not create separate business logic for each language.

---

# 33. Demo Scenario

The primary demo should follow this sequence.

## Step 1 — Medical situation

User uploads:

```text
Policy.pdf
HospitalBill.pdf
DischargeSummary.pdf
```

User says:

> "Mujhe samajh nahi aa raha insurance kitna pay karega aur mujhe kitna dena padega."

---

## Step 2 — Policy understanding

Sahayak extracts:

```text
Sum insured
Room limit
Co-pay
Deductible
Relevant coverage
Relevant exclusions
```

---

## Step 3 — Claim state

Sahayak retrieves mock claim data:

```text
Claim registered
Cashless approved
Final bill submitted
Additional document requested
```

---

## Step 4 — Evidence

Sahayak shows:

```text
Policy page
Hospital bill page
Claim timeline
```

---

## Step 5 — Money Map

Example:

```text
Hospital bill       ₹3,00,000
Approved            ₹2,10,000
Confirmed gap         ₹40,000
Under assessment      ₹50,000
```

---

## Step 6 — User asks why

Sahayak opens Evidence Drawer:

```text
₹15,000 deductible
→ Policy Page 18

₹10,000 non-payable
→ Bill Page 4

₹15,000 co-pay
→ Policy Page 21
```

---

## Step 7 — Missing document problem

Sahayak detects:

```text
Local document:
DischargeSummary.pdf FOUND

Claim system:
NOT RECEIVED
```

Response:

> "Your discharge summary is available in your documents, but the claim system still shows it as missing."

Action:

```text
[Submit Document]
```

---

## Step 8 — Financing

User:

> "I still need ₹40,000."

Sahayak:

```text
Confirmed out-of-pocket:
₹40,000

Another ₹50,000 remains under assessment.

You can:
[Track Claim]
[View Evidence]
[Explore Financing]
```

User chooses financing.

Sahayak hands off to the Paytm lending journey.

---

# 34. Why This Is Better Than a Generic AI Chatbot

A generic chatbot:

```text
User
 ↓
Question
 ↓
LLM
 ↓
Answer
```

Sahayak:

```text
User
 ↓
Messy real-world problem
 ↓
AI context understanding
 ↓
Documents + APIs + deterministic rules
 ↓
Verified financial state
 ↓
Explanation + evidence
 ↓
Action
 ↓
Tracking
 ↓
Paytm journey
```

The product is therefore not "chat."

The product is **journey completion**.

---

# 35. UI Requirements

The frontend should focus on a small number of high-value components.

## 35.1 Chat / Voice

Primary interaction.

---

## 35.2 Money Map

Shows:

* Bill
* Approved
* Confirmed gap
* Pending
* Potential gap

---

## 35.3 Evidence Drawer

Shows:

* Document
* Page
* Quote
* Source
* Calculation

---

## 35.4 Claim Timeline

Example:

```text
✓ Claim registered
✓ Cashless approved
✓ Treatment completed
✓ Final bill submitted
⚠ Additional document requested
○ Settlement pending
```

---

## 35.5 Next Action

Example:

```text
Discharge summary required.

[Upload Document]
```

---

## 35.6 Financing Card

Only when relevant:

```text
Current confirmed gap:
₹40,000

[Explore Financing Options]
```

---

# 36. What NOT to Build

Avoid unnecessary scope.

Do NOT spend significant time on:

* A huge number of intents.
* Dozens of insurers.
* Dozens of loan products.
* Complex ML models.
* Blockchain.
* Generic conversational personality.
* Massive microservice infrastructure.
* Over-engineered RAG.
* Building your own loan underwriting system.
* Pretending to have live insurer APIs.
* Fake production integrations presented as real.
* Automatic loan applications without user consent.

The existing backend is already sufficient for the intelligence layer.

Focus on **end-to-end journey completion**.

---

# 37. Remaining Engineering Priorities

## Priority 1 — Claim Data Contract

Define:

```text
claim_id
policy_id
insurer
TPA
hospital
claim_type
status
stage
pending_with
reason
requested_documents
submitted_documents
claimed_amount
approved_amount
settled_amount
timestamps
next_action
```

---

## Priority 2 — Mock Claim API

Implement:

```text
GET /claims/{id}
GET /claims/{id}/timeline
GET /claims/{id}/financials
GET /claims/{id}/documents
POST /claims/{id}/documents
POST /claims/{id}/actions
```

---

## Priority 3 — Claim Status Handler

Normalize claim data and expose it to the manager.

---

## Priority 4 — Claim Timeline

Make claim progress understandable.

---

## Priority 5 — Money Map v2

Support:

```text
Confirmed
Pending
Potential
Non-payable
```

---

## Priority 6 — Action Engine

At minimum:

```text
Upload Document
Submit Document
Track Claim
View Evidence
Explore Financing
```

---

## Priority 7 — Voice

Add voice input if the existing frontend/backend stack permits it without destabilizing the project.

---

## Priority 8 — Paytm Lending Handoff

Build a clean demo handoff.

Do not build lending underwriting.

---

## Priority 9 — n8n

Use n8n for:

```text
Readiness < threshold
        ↓
Reminder
        ↓
User notification
```

Example:

```text
Claim pending document
        ↓
24 hours
        ↓
Reminder
```

---

## Priority 10 — Demo Hardening

Add:

* Seeded demo data
* Error handling
* Loading states
* API timeouts
* Caching
* Deterministic demo scenarios
* Fallback responses
* Clear source attribution

---

# 38. Safety / Trust Principles

Because this system touches insurance, healthcare and lending, trust is a first-class requirement.

Sahayak must distinguish:

```text
VERIFIED
ESTIMATED
PENDING
UNKNOWN
```

Example:

```text
VERIFIED:
₹40,000 confirmed gap

PENDING:
₹50,000 still under assessment

ESTIMATED:
Potential maximum gap ₹90,000

UNKNOWN:
Final settlement date
```

Never turn an estimate into a fact.

Never fabricate:

* Claim status
* Insurance approval
* Policy coverage
* Loan eligibility
* Loan approval
* Settlement date
* Financial product offer

---

# 39. LLM Rules

The LLM may:

* Classify natural-language requests.
* Extract entities.
* Summarize.
* Explain.
* Translate.
* Generate conversational responses.

The LLM must NOT independently invent:

* Financial calculations.
* Claim status.
* Coverage.
* Loan eligibility.
* Transaction status.

When structured data is available, use it.

---

# 40. Error / Fallback Behavior

If a real or mock claim API is unavailable:

Do NOT say:

> "Your claim is pending."

Say:

> "I couldn't retrieve the latest claim status right now."

If policy evidence is missing:

> "I couldn't verify this from your uploaded policy."

If a financial amount is uncertain:

> "This amount is still under assessment."

If lending eligibility is unknown:

> "I can take you to the financing flow, but eligibility will be determined by the lending system."

---

# 41. Design Philosophy

The UI should feel:

* Calm
* Trustworthy
* Financially clear
* Human
* Modern
* Fast
* Evidence-driven

Avoid making it look like:

* A generic ChatGPT clone.
* A banking dashboard overloaded with tables.
* An insurance company's old portal.

The primary experience should feel like:

> **"I have a complicated financial problem, and Sahayak is helping me figure it out."**

---

# 42. Core Product Differentiators

The project should emphasize these five capabilities.

## 1. Natural interaction

The user can speak normally.

```text
"Hospital wale kya bol rahe hain mujhe samajh nahi aa raha."
```

---

## 2. Document intelligence

Sahayak understands:

* Policy PDFs
* Bills
* Discharge summaries
* Claim letters
* Screenshots
* Other financial documents

---

## 3. Verified financial reasoning

Sahayak calculates:

```text
Bill
Coverage
Gap
Pending amount
Readiness
```

using deterministic logic.

---

## 4. Explainability

Every important answer can show:

```text
Evidence
Source
Page
Quote
Calculation
```

---

## 5. Action

Sahayak doesn't stop at answering.

It enables:

```text
Upload
Submit
Track
Notify
Escalate
Explore financing
```

---

# 43. The Core Product Loop

Everything should ultimately fit into:

```text
                UNDERSTAND
                     ↓
                  VERIFY
                     ↓
                CALCULATE
                     ↓
                 EXPLAIN
                     ↓
                   ACT
                     ↓
                  TRACK
                     ↓
               REASSESS
                     │
                     └──────────→ ACT
```

This is the core agentic loop.

---

# 44. Agentic Behavior

The system should be described as agentic because it can:

1. Understand a goal.
2. Inspect available context.
3. Identify missing information.
4. Call specialized tools.
5. Perform deterministic calculations.
6. Decide what step is possible next.
7. Ask the user for required information.
8. Execute supported actions.
9. Track the resulting state.
10. Continue the journey.

Example:

```text
Goal:
Understand my hospital bill.

Agent:
→ Reads policy
→ Reads bill
→ Checks claim
→ Calculates gap
→ Finds missing discharge summary
→ Presents evidence
→ Requests document
→ Updates claim
→ Recalculates financial state
→ Presents next action
```

---

# 45. Important Scope Boundary

The hackathon prototype may use mock integrations for:

* Insurer claim APIs
* TPA APIs
* Paytm lending APIs
* NHCX-like interfaces

These must be clearly separated behind adapters.

Use interfaces such as:

```text
ClaimProvider
LendingProvider
DocumentProvider
PaymentProvider
```

This makes the architecture production-oriented without pretending unavailable APIs are live.

---

# 46. Recommended Internal Interfaces

Conceptually:

```python
class ClaimProvider:
    def get_claim(self, claim_id):
        ...

    def get_timeline(self, claim_id):
        ...

    def get_documents(self, claim_id):
        ...

    def submit_document(self, claim_id, document):
        ...
```

```python
class LendingProvider:
    def get_available_options(self, user_context):
        ...

    def start_application(self, user_context):
        ...
```

```python
class DocumentProvider:
    def search(self, user_id, query):
        ...

    def get_evidence(self, document_id, page):
        ...
```

The exact implementation can vary according to the existing codebase.

---

# 47. Development Rules for the Agentic IDE

When modifying the existing project:

### Rule 1

Do not rewrite working components unnecessarily.

### Rule 2

Preserve the existing:

* Intent Router
* Knowledge Base Handler
* Supabase integration
* Cognee integration
* Rules Engine
* Manager JSON contract

unless there is a demonstrated technical reason to change them.

### Rule 3

Prefer adding adapters/services over tightly coupling handlers to specific APIs.

### Rule 4

Do not introduce unnecessary frameworks.

### Rule 5

Keep deterministic business logic outside the LLM.

### Rule 6

Every new feature must have a clear demo use case.

### Rule 7

Do not replace working implementation just for architectural aesthetics.

### Rule 8

Before major refactoring, inspect the existing codebase and understand current interfaces.

### Rule 9

Prefer incremental changes.

### Rule 10

Every major feature should have a fallback/mock mode so the demo works reliably.

---

# 48. Current Project Status

## Completed

* [x] Intent Router
* [x] Regex classification
* [x] Gemini fallback
* [x] Multilingual intent examples
* [x] Document retrieval
* [x] Cognee integration
* [x] Supabase pgvector
* [x] Evidence extraction
* [x] Policy Q&A
* [x] Deterministic financial rules
* [x] Financial gap calculation
* [x] Readiness logic
* [x] Manager JSON
* [x] Frontend data contract

## In progress / next

* [ ] Claim Status Handler
* [ ] Claim state machine
* [ ] Claim timeline
* [ ] Mock Claim API
* [ ] Action Engine
* [ ] Money Map v2
* [ ] Next Best Action
* [ ] n8n reminders
* [ ] Voice input
* [ ] Paytm lending handoff
* [ ] Frontend integration
* [ ] Demo hardening

---

# 49. Ideal Final Demo

The final demo should tell one coherent story.

### Opening

> "Financial products are complicated. Real people don't think in product categories. They describe problems."

### User

> "My father is hospitalized. I have insurance but I don't know what it covers."

### Sahayak

Reads policy.

Shows coverage.

### User

Uploads bill.

### Sahayak

Calculates:

```text
Bill: ₹3,00,000
Approved: ₹2,10,000
Confirmed gap: ₹40,000
Under assessment: ₹50,000
```

### User

> "Why do I have to pay ₹40,000?"

Evidence Drawer opens.

### User

> "When will the claim finish?"

Claim Timeline opens.

### Sahayak

Explains:

> "The claim is waiting for your discharge summary."

### User

> "But I uploaded it."

Sahayak compares:

```text
Your documents:
✓ Discharge Summary found

Claim system:
✗ Not received
```

### Sahayak

Offers:

```text
[Submit Document]
```

### User

> "I still need ₹40,000."

Sahayak shows:

```text
Confirmed gap:
₹40,000

Another ₹50,000:
Still under assessment
```

Then:

```text
[Explore Financing]
```

User enters Paytm lending journey.

### Closing statement

> **"Sahayak doesn't just answer financial questions. It understands where the customer is in their journey, verifies the facts, explains the money, takes the next action, and connects them to the right Paytm service."**

---

# 50. One-Sentence Product Definition

Use this internally:

> **Paytm Sahayak is an AI financial journey agent that turns messy customer conversations and documents into verified, explainable and actionable Insurance, Lending and Fintech journeys.**

---

# 51. One-Sentence Hackathon Pitch

> **Sahayak is the AI layer between a customer's real-life financial problem and the Paytm ecosystem — understanding what they need, proving what is true, calculating the financial impact, and helping them complete the next step.**

---

# 52. Final Engineering Direction

The team should now prioritize:

```text
                    EXISTING
                       │
                       ▼
               Document Intelligence
                       │
                       ▼
               Financial Rules
                       │
                       ▼
                Manager JSON
                       │
                       ▼
             ┌──────────────────┐
             │ BUILD NEXT       │
             │                  │
             │ Claim Gateway    │
             │ Claim Timeline   │
             │ Action Engine    │
             │ Money Map v2     │
             │ Voice            │
             │ Lending Handoff  │
             └──────────────────┘
                       │
                       ▼
                END-TO-END DEMO
                       │
                       ▼
                PAYTM SAHAYAK
```

The objective is NOT to build more AI.

The objective is to make the existing AI **complete a real financial journey**.

---

# 53. Agent Instruction — Highest Priority

When working on this repository, always ask:

> **"Does this change help Sahayak understand, verify, calculate, explain, act or track a customer's financial journey?"**

If yes, prioritize it.

If it only adds complexity without improving the end-to-end journey, avoid it.

The strongest implementation is not the one with the most agents.

The strongest implementation is the one where a customer can enter with:

> **"I don't know what to do."**

and Sahayak can reliably take them to:

> **"I understand my situation, I know what is verified, I know what is pending, I know what I can do next, and I can complete that action."**

---

# END OF SAHAYAK CONTEXT
