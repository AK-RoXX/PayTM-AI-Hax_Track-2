# Paytm Sahayak

## AI-Powered Insurance & Financial Journey Assistant

> **From financial confusion to confident action.**

Paytm Sahayak is an AI-powered financial journey assistant designed to simplify complex insurance and related financial processes.

Insurance customers often deal with lengthy policy documents, confusing terminology, fragmented claim processes, missing documents, unclear claim statuses, unexpected out-of-pocket expenses, and difficult financial decisions.

Sahayak brings these pieces together into one guided journey:

**Understand → Verify → Calculate → Act → Track**

Instead of functioning as a generic chatbot that only answers questions, Sahayak understands the customer's situation, works with their documents and structured financial data, determines the current journey state, explains what is happening, and guides the customer toward the next useful action.

---

# The Problem

Insurance is rarely difficult because customers do not have information. It is difficult because the information is scattered across policy documents, bills, forms and status systems; written in complicated language; dependent on the customer's situation; and difficult to translate into a simple next step.

A customer may ask:

> "My car was damaged in an accident. Is it covered?"

But the real journey may involve understanding the policy, checking coverage, identifying documents, submitting evidence, tracking the claim, understanding the approved amount, calculating the remaining expense, and deciding what to do next.

Sahayak is designed to handle this **entire journey**, rather than answering only the first question.

---

# Our Solution

Sahayak acts as an intelligent orchestration layer between the customer and financial services.

### Customer

The customer can interact using:

- Chat
- Voice
- PDFs
- Images
- Bills
- Policy documents
- Claim documents
- Financial documents
- Existing claim/status information

### Sahayak

The system:

1. Understands the customer's intent and context
2. Identifies the relevant financial journey
3. Searches the customer's documents when required
4. Extracts and verifies relevant information
5. Applies deterministic financial/business rules
6. Retrieves structured claim or service status
7. Calculates financial gaps where applicable
8. Identifies the next best action
9. Explains the result with supporting evidence
10. Tracks the journey until completion

### Paytm ecosystem

Where appropriate and with customer consent, the journey can connect to insurance products, insurance partners, payments, premium renewals, lending journeys, financial services, and partner APIs/workflows.

---

# Key Product Principle

## Sahayak does not monetize the conversation. It helps complete the financial journey.

The primary business opportunity is not to charge customers simply for asking questions. Instead, Sahayak can create value for Paytm by increasing successful completion of financial journeys.

Potential revenue opportunities include:

### Insurance distribution

When a customer purchases or renews an eligible insurance product through Paytm or an insurance partner, Paytm can earn applicable distribution economics.

### Lending

When an insurance or financial journey creates a genuine funding requirement, Sahayak can provide an optional handoff to an eligible lending journey.

### Payments

Insurance premiums, hospital bills, EMIs and other relevant payments can potentially flow through Paytm's payment ecosystem.

### Partner services

Insurers and other financial partners can benefit from improved customer journeys, reduced repetitive support requirements and better completion rates.

### Optional premium assistance

Advanced concierge-style services can potentially be offered as paid services where there is genuine customer value.

> Actual revenue, commission and partner economics depend on the applicable product, regulatory framework, commercial agreements and Paytm/partner capabilities.

---

# Supported Insurance Journeys

Sahayak is intentionally not limited to health insurance. The architecture is designed around the concept of a **Financial Journey**, allowing multiple insurance categories to use the same core intelligence.

## Health Insurance

Sahayak can help customers understand coverage, explain exclusions and limits, check required claim documents, organize claim evidence, track claim status, explain pending claims, explain approved vs claimed amounts, calculate confirmed and potential out-of-pocket expenses, identify missing documents, understand the next action, and explore financing when a genuine financial gap remains.

Example:

> "Hospital ka bill ₹3 lakh hai. Insurance kitna pay karega aur mujhe kitna arrange karna padega?"

Possible Money Map:

```text
Hospital Bill                 ₹3,00,000
Insurance Approved            ₹2,10,000
Under Assessment                ₹50,000
Confirmed Customer Gap          ₹40,000
```

Every important figure can be linked back to relevant evidence.

## Motor Insurance

Help with policy coverage, own-damage vs third-party coverage, accident documentation, required evidence, claim requirements, claim status, survey/inspection stages, approved amounts, customer liability and renewal.

## Life & Term Insurance

Help customers understand policy terms, beneficiaries/nominees, premiums, exclusions, claim requirements, supporting documents, claim progress and maturity-related information.

## Travel Insurance

Help with medical coverage, baggage claims, flight delay/cancellation coverage, evidence, documentation and claim tracking.

## Home & Property Insurance

Help customers understand covered risks, exclusions, documentation requirements, damage evidence, claims, status and settlement amounts.

## Personal Accident & Small Business Insurance

Support accident-related claims, shop/property protection, business asset claims, documentation requirements, claim status, policy interpretation and next-step guidance.

---

# What Makes Sahayak Different?

A traditional chatbot answers:

> "What does my insurance policy say?"

Sahayak aims to answer:

> "Given my situation, what does my policy mean, what is happening right now, how much do I need to arrange, and what should I do next?"

That distinction is central to the product.

---

# Core User Experience

## 1. Money Map

A structured view of the customer's financial situation.

```text
┌─────────────────────────────────────┐
│             MONEY MAP               │
├─────────────────────────────────────┤
│ Total Bill              ₹3,00,000   │
│ Approved by Insurance   ₹2,10,000   │
│ Under Assessment          ₹50,000   │
│ Confirmed Gap             ₹40,000   │
│                                     │
│ Potential Maximum Gap     ₹90,000   │
└─────────────────────────────────────┘
```

The system distinguishes confirmed, estimated, under-assessment and potential maximum amounts.

## 2. Evidence Drawer

Important answers should be traceable to their source.

```text
Why is ₹40,000 payable by me?

Policy Document
→ Page 12
→ Co-pay clause

Hospital Bill
→ Page 2
→ Non-covered item

Claim Status
→ Claim API
→ Approved amount: ₹2,10,000
```

## 3. Claim Timeline

Instead of showing only `Claim: Pending`, Sahayak explains the journey.

```text
Claim Registered
      ↓
Cashless Approved
      ↓
Final Bill Submitted
      ↓
Additional Document Requested
      ↓
Waiting for Customer
      ↓
Document Submitted
      ↓
Under Review
      ↓
Settlement
```

The customer can see the current stage, what happened, who is responsible, why the claim is waiting, and what action is required.

## 4. Next Best Action

Every journey should end with an actionable next step, such as uploading a missing document, submitting a claim, checking coverage, paying a premium, tracking a claim, contacting an insurer, requesting clarification, escalating an issue, or exploring financing.

---

# Architecture

```text
                         PAYTM SAHAYAK
                AI FINANCIAL JOURNEY ASSISTANT

                              USER
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
            CHAT              VOICE          DOCUMENTS
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                     ┌───────────────────┐
                     │  CONTEXT ENGINE   │
                     │ • Intent          │
                     │ • Documents       │
                     │ • Conversation    │
                     │ • Financial Data  │
                     └─────────┬─────────┘
                               ▼
                     ┌───────────────────┐
                     │  JOURNEY ENGINE   │
                     │ • Insurance       │
                     │ • Lending         │
                     │ • Payments        │
                     │ • Credit          │
                     └─────────┬─────────┘
                               ▼
                     ┌───────────────────┐
                     │   ACTION ENGINE   │
                     │ • Calculate       │
                     │ • Submit          │
                     │ • Track           │
                     │ • Notify          │
                     │ • Escalate        │
                     └─────────┬─────────┘
                               ▼
                ┌────────────────────────────┐
                │      PAYTM ECOSYSTEM      │
                │ Insurance | Lending | Pay │
                └─────────────┬──────────────┘
                              │
                              ▼
                     ┌───────────────────┐
                     │    JOURNEY UI     │
                     │ • Money Map       │
                     │ • Evidence        │
                     │ • Timeline        │
                     │ • Next Action     │
                     └───────────────────┘
```

## Architecture Philosophy

### AI Layer

Used for natural language understanding, intent classification, document understanding, extraction, summarization and explanation.

### Deterministic Business Logic

Used for financial calculations, readiness checks, state transitions, validation and safety constraints. The LLM is not the source of truth for financial calculations.

### Data & APIs

Used for claim status, policy information, transaction information and partner services.

### Human-in-the-loop

Customers remain in control of consequential actions. Sahayak should not silently apply for a loan, submit a claim, accept a financial offer, make a financial commitment, or alter important customer information.

---

# Current Technical Components

## Intent Router

The Intent Router acts as the traffic controller for customer requests.

It:

1. Checks deterministic rules/regex first
2. Supports English and Hindi/Devanagari input
3. Uses Gemini fallback for more complex intent classification
4. Uses a safe fallback when the model is unavailable

## Document Knowledge Base

Sahayak uses customer-provided documents as the source for document-based answers.

Current architecture uses:

- Cognee
- Supabase pgvector
- Retrieval-augmented generation (RAG)

The document handler searches uploaded documents, retrieves relevant paragraphs, produces evidence-grounded answers, returns supporting quotes/page information, and refuses to invent information when evidence is insufficient.

## Loan & Financial Readiness Engine

The financial readiness layer is deterministic and can calculate current financial gap, confirmed vs uncertain gap, document readiness, and whether financing should be considered yet.

Example:

```text
Bill                    ₹3,00,000
Approved                ₹2,10,000
Under assessment          ₹50,000
Confirmed gap             ₹40,000
```

If critical documents are still missing, the system can avoid prematurely pushing the customer toward borrowing.

## Claim Status Handler

The Claim Status Handler converts structured claim information into a customer-friendly explanation.

Example normalized claim:

```json
{
  "claim_id": "CLM001",
  "policy_id": "POL001",
  "insurer": "example",
  "tpa": "example",
  "hospital": "example",
  "claim_type": "CASHLESS",
  "status": "ACTION_REQUIRED",
  "stage": "DOCUMENT_REVIEW",
  "pending_with": "CUSTOMER",
  "reason": "Discharge summary required",
  "requested_documents": ["Discharge Summary"],
  "submitted_documents": [],
  "claimed_amount": 300000,
  "approved_amount": 180000,
  "settled_amount": null,
  "last_updated": "2026-10-02T15:30:00",
  "next_action": "SUBMIT_DOCUMENT"
}
```

Possible internal normalized states include:

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

Additional states can represent query raised, waiting for customer, additional documents requested, enhancement requested, under review, rejected, and escalation required. These are internal normalized states and should not be interpreted as claiming that every insurer uses the exact same terminology or workflow.

---

# Example End-to-End Journey

Customer:

> "Meri mummy hospital mein admit hain. Insurance hai but mujhe samajh nahi aa raha kitna cover hoga. Yeh documents hain. Hospital ₹80,000 maang raha hai. Mere paas abhi ₹30,000 hain. Kya karu?"

Sahayak:

1. Identifies the health-insurance journey
2. Reads the policy and hospital documents
3. Builds a Money Map
4. Explains coverage with evidence
5. Checks claim state
6. Identifies missing documents/actions
7. Calculates the confirmed financial gap
8. Offers the next appropriate action
9. Optionally hands the customer into an eligible Paytm/partner financing journey

This demonstrates that Sahayak is not merely answering questions about a PDF. It is helping complete a financial journey.

---

# Example Across Other Insurance Types

```text
Customer Situation
       │
       ▼
Identify Financial Journey
       │
       ├── Health Insurance
       ├── Motor Insurance
       ├── Life Insurance
       ├── Travel Insurance
       ├── Home Insurance
       ├── Personal Accident
       └── Small Business Insurance
       │
       ▼
Understand Policy
       │
       ▼
Verify Documents
       │
       ▼
Determine Current State
       │
       ▼
Calculate / Explain
       │
       ▼
Recommend Next Action
       │
       ▼
Track to Completion
```

The core system remains reusable while each insurance category can provide its own policy rules, document types, claim states, required fields, partner integrations and business actions.

---

# Trust & Safety

Financial assistance requires a higher standard than a normal conversational assistant.

- **Never hallucinate:** if evidence is unavailable, say so.
- **Never fabricate claim status:** status should come from structured data or an explicitly identified demo/mock source.
- **Never confuse estimates with confirmed amounts.**
- **Keep calculations deterministic.**
- **Explain important conclusions with evidence.**
- **Keep customers in control of consequential actions.**
- **Protect customer data** through appropriate access controls and data minimization.

---

# Demo Experience

The ideal demo focuses on one complete end-to-end insurance journey while demonstrating that the architecture generalizes to other insurance categories.

### Demo Scenario

1. Customer starts with voice or text.
2. Customer uploads a policy PDF, hospital bill and claim document.
3. Sahayak identifies the journey.
4. Money Map shows bill, approved amount, under-assessment amount and confirmed gap.
5. Customer asks why the gap exists; Evidence Drawer shows the source.
6. Customer asks why the claim is pending; Claim Timeline explains the state.
7. A missing document is identified.
8. Customer uploads it.
9. Sahayak recalculates the financial picture.
10. Customer can choose to explore financing if a genuine confirmed gap remains.

---

# Why This Can Scale

The product is built around the concept of a **Financial Journey**, rather than a specific insurance product.

```text
Insurance
   │
   ├── Health
   ├── Motor
   ├── Life
   ├── Travel
   ├── Home
   └── Business

Financial Services
   │
   ├── Payments
   ├── Lending
   ├── Credit
   ├── Premium Renewals
   └── Bill Payments
```

The customer does not need to understand which backend system handles their problem. They simply explain what they are trying to accomplish; Sahayak determines the relevant journey.

---

# Technology Direction

| Layer | Responsibility |
|---|---|
| User Interface | Chat, voice, documents and journey visualization |
| Context Engine | Conversation, intent, documents and financial context |
| Journey Engine | Determines the active financial journey |
| AI Layer | Understanding, extraction and explanation |
| RAG | Grounded document retrieval |
| Business Rules | Deterministic calculations and validation |
| Action Engine | Next actions, submissions and workflow orchestration |
| Status Adapters | Normalize insurer/partner status |
| Data Layer | Structured financial and journey state |
| Partner APIs | Insurance, payments, lending and other services |

Exact partner integrations depend on available APIs, credentials, agreements and the hackathon environment.

---

# Business Opportunity

Sahayak can become a strategic customer-engagement layer for Paytm.

```text
"I have a problem."
        ↓
     Sahayak
        ↓
Understand my situation
        ↓
Find the relevant financial journey
        ↓
Verify the information
        ↓
Calculate what matters
        ↓
Tell me what to do
        ↓
Help me complete it
        ↓
Connect me to the right Paytm/partner service
```

This creates a flywheel:

```text
Better Assistance
       ↓
Higher Trust
       ↓
Higher Journey Completion
       ↓
More Transactions / Product Conversions
       ↓
More Customer Engagement
       ↓
More Context for Better Assistance
```

