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

# Project Status

### Completed

- [x] Intent Router
- [x] Rule-first intent classification
- [x] Hindi/Devanagari support
- [x] Gemini fallback
- [x] Document Knowledge Base
- [x] Cognee + Supabase pgvector retrieval
- [x] Evidence-based document answers
- [x] Deterministic loan/readiness rules
- [x] Financial gap calculation
- [x] Document readiness checks
- [x] Manager JSON / UI bridge
- [x] Money Map foundation
- [x] Evidence Drawer foundation

### In Progress / Next

- [ ] Canonical Claim Data Contract
- [ ] Claim Status Handler
- [ ] Claim Timeline
- [ ] Action Engine
- [ ] Money Map v2
- [ ] Voice interface
- [ ] Paytm lending handoff
- [ ] n8n reminder/automation workflows
- [ ] Frontend integration
- [ ] Demo hardening

---

# Product Roadmap

## Phase 1 — Hero Journey

Build an exceptional end-to-end insurance claim journey.

## Phase 2 — Multi-Insurance

Add reusable journey adapters for motor, life, travel, home, personal accident and small business insurance.

## Phase 3 — Financial Ecosystem

Connect appropriate journeys to payments, premium renewals, lending, credit and partner services.

## Phase 4 — Proactive Sahayak

Move from reactive assistance to proactive assistance.

Examples:

> "Your motor insurance renewal is due in 12 days."

> "Your claim has been waiting for a document for 3 days."

> "Your policy is expiring soon."

> "The claim has been approved. You may now have ₹X remaining to arrange."

---

# Design Principles

1. **AI for understanding, not truth.** AI interprets customer language and documents; structured systems remain the source of truth for financial state.
2. **One journey, not many disconnected bots.** Customers should not have to figure out which bot to use.
3. **Evidence over confidence.** A confident answer without evidence is not useful in a financial workflow.
4. **Action over conversation.** The purpose of every interaction is to help the customer make progress.
5. **Don't push financial products prematurely.** Financing should be offered when it is relevant to the customer's verified situation.
6. **Human control.** Customers remain responsible for consequential financial decisions.
7. **Build deep, then expand.** For the hackathon, one excellent end-to-end journey is more valuable than ten shallow integrations.

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

The long-term opportunity is therefore larger than insurance claims: it is an **AI layer for navigating Paytm's financial ecosystem.**

---

# Hackathon Positioning

**Track:** AI-Powered Financial Journeys

**One-line pitch:**

> **Paytm Sahayak is an AI-powered financial journey assistant that turns complex insurance and financial processes into simple, evidence-backed, actionable journeys.**

**Core insight:**

> **Customers don't need another chatbot. They need someone to take them from "I don't understand what's happening" to "I know what to do next."**

---

# Disclaimer

This project is a hackathon/prototype application.

Any insurer, TPA, lending provider, payment service or other external integration shown in a demonstration should be clearly identified as live, officially partnered, or mock/simulated.

The application should not represent simulated claim statuses, financial offers, insurance decisions or partner actions as real-world transactions.

Actual insurance distribution, lending, payment and partner economics are subject to applicable regulations, licenses, agreements and platform capabilities.

---

# Project

**Project:** Paytm Sahayak  
**Category:** AI-Powered Financial Journeys  
**Focus:** Insurance + Financial Services  
**Core Concept:** AI-powered journey orchestration

## Vision

> **Make financial services as simple as telling someone what happened — and let Sahayak figure out what needs to happen next.**
