# Paytm Sahaayak — Overview

## Project
Paytm Sahaayak is an evidence-first AI financial case manager for medical emergencies. It helps a user understand health-insurance coverage, collect missing claim documents, estimate a possible uncovered expense, track claim status, and request safe next actions.

## Core demo
A user says: “My mother was admitted yesterday. The hospital estimate is ₹3,00,000. I have insurance. Can I claim it?”

The system creates case `MED-82031`, analyzes a fictional policy and hospital documents, reports claim readiness, identifies the missing signed discharge summary, calculates a planning gap of ₹80,000 from ₹3,00,000 minus ₹2,20,000 possible coverage, and explains a pending claim.

## Product principle
**Explain → Show evidence → Take action.**

## Safety principle
The LLM understands, extracts, retrieves, and explains. Deterministic backend code calculates, validates, controls workflow state, and protects irreversible actions. The user confirms high-impact actions.

## Sponsor roles
- Sarvam AI: voice/STT, multilingual responses, document digitization and structured extraction where available.
- Cognee: case memory, policy/document knowledge, entity relationships and evidence retrieval.
- LangGraph: typed stateful multi-agent orchestration.
- n8n: reminders, delayed workflows, notifications and escalation automation.

## Scope
Build one polished hospitalization-claim journey. Do not build real insurer underwriting, real loan approval, production Paytm account access, or automatic claim submission. Use sandbox/mock connectors.
