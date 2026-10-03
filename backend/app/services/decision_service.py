"""
decision_service.py — multi-source decision pipeline integrating Supabase & Cognee.

Flow:
1. Show existing policy claims with citations and values.
2. Logical breakdown of financial summary.
3. Claim verification and completion status.
4. Decision outcome:
   - Abstain with Proof and Citation
   - Proceed with Citation and Proof
5. Human escalation with context of all data (Supabase facts + Cognee memory).
6. Actionable Next Steps to be taken by users.
"""
from __future__ import annotations

import logging
from typing import Any
from starlette.concurrency import run_in_threadpool

from app.engines.policy_engine import (
    find_policy_terms,
    normalise_uin,
)
from app.schemas.decision import (
    ClaimVerificationItem,
    ClaimVerificationStatus,
    DecisionFlowResponse,
    DecisionOutcome,
    DecisionProofCitation,
    FinancialSummaryBreakdown,
    HumanEscalationDossier,
    PolicyTermCitation,
    UserNextStep,
)
from app.services import case_state, cognee_service
from app.services.document_pipeline import _supabase_request
from app.services.policy_assessment import (
    get_policy_assessment,
    get_policy_terms_for_case,
)

logger = logging.getLogger(__name__)


async def build_decision_flow(state: dict) -> DecisionFlowResponse:
    """Evaluate and synthesize full decision flow for a given case."""
    case_id = state["case"]["id"]
    case_code = state["case"].get("case_code") or f"MED-{case_id[:8].upper()}"
    view = state.get("view", {})
    facts = state.get("facts", [])
    documents = state.get("documents", [])

    # 1. Retrieve Policy Claims & Terms with Citations
    policy_citations = _extract_policy_citations(state, facts, documents)

    # 2. Retrieve Policy Assessment & Financial Breakdown
    financial_summary, scenario_raw = await _build_financial_summary(state, view)

    # 3. Claim Verification & Completion Status
    verification_status = _evaluate_claim_verification(view, state)

    # 4. Cognee memory context enrichment
    cognee_context = await _retrieve_cognee_insights(case_code, view)

    # 5. Dual Branch Decision Making: Proceed vs. Abstain vs. Escalate
    decision = _derive_decision_outcome(
        verification_status=verification_status,
        financial_summary=financial_summary,
        policy_citations=policy_citations,
        scenario_raw=scenario_raw,
        cognee_context=cognee_context,
        documents=documents,
    )

    # 6. Human Escalation Dossier
    escalation = _build_escalation_dossier(
        decision=decision,
        state=state,
        verification_status=verification_status,
        financial_summary=financial_summary,
        cognee_context=cognee_context,
    )

    # 7. Actionable Next Steps for User
    next_steps = _generate_user_next_steps(
        case_id=case_id,
        verification_status=verification_status,
        decision=decision,
        documents=documents,
        financial_summary=financial_summary,
    )

    return DecisionFlowResponse(
        case_id=case_id,
        case_code=case_code,
        policy_claims=policy_citations,
        financial_summary=financial_summary,
        claim_verification=verification_status,
        decision=decision,
        escalation=escalation,
        next_steps=next_steps,
    )


def _extract_policy_citations(state: dict, facts: list[dict], documents: list[dict]) -> list[PolicyTermCitation]:
    """Extract policy terms and exact document citations from Supabase & terms catalog."""
    citations: list[PolicyTermCitation] = []
    
    # Check terms extracted by policy assessment helper
    try:
        candidates_obj = get_policy_terms_for_case(state)
        candidates = candidates_obj.get("candidates", [])
        
        for cand in candidates:
            if cand.get("policy_uin"):
                uin = cand.get("policy_uin", "")
                terms = find_policy_terms(uin)
                ev_uin = cand.get("policy_uin_evidence") or {}
                ev_si = cand.get("sum_insured_evidence") or {}
                
                citations.append(
                    PolicyTermCitation(
                        term_key="policy_uin",
                        label="Policy Product (UIN)",
                        value_rendered=f"{terms.product_name if terms else 'Health Policy'} ({uin})",
                        document_name=ev_uin.get("document_name") or cand.get("document_name") or "Policy Document",
                        page_number=ev_uin.get("page_number"),
                        clause_quote=ev_uin.get("quote") or f"UIN: {uin}",
                        confidence=ev_uin.get("confidence", 0.95),
                    )
                )

                rule_summary = cand.get("rule_summary")
                if rule_summary:
                    citations.append(
                        PolicyTermCitation(
                            term_key="sum_insured",
                            label="Sum Insured Ceiling",
                            value_rendered=f"₹{rule_summary.sum_insured:,.0f}",
                            numeric_value=float(rule_summary.sum_insured),
                            document_name=ev_si.get("document_name") or "Policy Schedule",
                            page_number=ev_si.get("page_number"),
                            clause_quote=ev_si.get("quote") or f"Sum Insured: INR {rule_summary.sum_insured:,.0f}",
                            confidence=ev_si.get("confidence", 0.95),
                        )
                    )

                    if rule_summary.room_rent_rule_explanation:
                        citations.append(
                            PolicyTermCitation(
                                term_key="room_rent_limit",
                                label="Room Rent Sub-limit",
                                value_rendered=rule_summary.room_rent_rule_explanation,
                                document_name=rule_summary.source_title or "Policy Terms",
                                page_number=rule_summary.room_rent_source_pages[0] if rule_summary.room_rent_source_pages else 1,
                                clause_quote=rule_summary.room_rent_source_quote or rule_summary.room_rent_rule_explanation,
                                confidence=0.98,
                            )
                        )

                    if rule_summary.icu_rule_explanation:
                        citations.append(
                            PolicyTermCitation(
                                term_key="icu_limit",
                                label="ICU Daily Limit",
                                value_rendered=rule_summary.icu_rule_explanation,
                                document_name=rule_summary.source_title or "Policy Terms",
                                page_number=rule_summary.icu_source_pages[0] if rule_summary.icu_source_pages else 1,
                                clause_quote=rule_summary.icu_source_quote or rule_summary.icu_rule_explanation,
                                confidence=0.98,
                            )
                        )
                break
    except Exception as exc:
        logger.warning("Could not extract catalog policy terms: %s", exc)

    # Fallback to direct facts if citations still empty
    if not citations:
        for fact in facts:
            key = fact.get("fact_key", "")
            if key in {"policy_number", "sum_insured", "room_rent_limit", "copay_percentage"}:
                doc_name = (fact.get("documents") or {}).get("file_name") or "Uploaded document"
                val = fact.get("value_json")
                rendered = f"₹{float(val):,.0f}" if fact.get("value_type") == "money" else str(val)
                citations.append(
                    PolicyTermCitation(
                        term_key=key,
                        label=key.replace("_", " ").title(),
                        value_rendered=rendered,
                        document_name=doc_name,
                        page_number=fact.get("source_page"),
                        clause_quote=fact.get("source_quote") or "",
                        confidence=float(fact.get("confidence") or 0.9),
                    )
                )

    return citations


async def _build_financial_summary(state: dict, view: dict) -> tuple[FinancialSummaryBreakdown, dict | None]:
    """Retrieve saved policy scenario or calculate from state."""
    f_map = view.get("financial_map", {})
    gross_bill = float(f_map.get("hospital_estimate") or 0.0)

    try:
        assessment_record = await run_in_threadpool(get_policy_assessment, state)
        if assessment_record.get("status") in {"current", "available"} and assessment_record.get("result"):
            res = assessment_record["result"]
            summary = res.get("summary", {})
            return FinancialSummaryBreakdown(
                gross_bill=float(summary.get("total_bill_amount", gross_bill)),
                admissible_charges=float(summary.get("total_admissible_amount", 0.0)),
                room_icu_charges=float(summary.get("room_and_icu_charges", 0.0)),
                pharmacy_diagnostics=float(summary.get("pharmacy_and_diagnostics", 0.0)),
                non_medical_deductions=float(summary.get("total_non_medical_deductions", 0.0)),
                proportionate_deductions=float(summary.get("proportionate_deduction_amount", 0.0)),
                total_deductions=float(summary.get("total_deductions", 0.0)),
                copay_percentage=float(summary.get("copay_percentage", 0.0)),
                copay_amount=float(summary.get("copay_amount", 0.0)),
                estimated_net_payout=float(summary.get("estimated_insurer_payout", 0.0)),
                estimated_out_of_pocket=float(summary.get("estimated_patient_out_of_pocket", 0.0)),
                calculation_basis="deterministic_policy_engine_v1",
            ), res
    except Exception as exc:
        logger.debug("Policy assessment snapshot not ready: %s", exc)

    # Fallback to general financial map
    possible_coverage = float(f_map.get("possible_coverage") or 0.0)
    estimated_gap = float(f_map.get("estimated_gap") or 0.0)

    return FinancialSummaryBreakdown(
        gross_bill=gross_bill,
        admissible_charges=possible_coverage,
        room_icu_charges=0.0,
        pharmacy_diagnostics=0.0,
        non_medical_deductions=0.0,
        proportionate_deductions=0.0,
        total_deductions=estimated_gap,
        copay_percentage=0.0,
        copay_amount=0.0,
        estimated_net_payout=possible_coverage,
        estimated_out_of_pocket=estimated_gap,
        calculation_basis="sum_insured_ceiling_estimate",
    ), None


def _evaluate_claim_verification(view: dict, state: dict) -> ClaimVerificationStatus:
    """Synthesize completeness, verified requirements and missing mandates."""
    readiness_score = int(view.get("readiness_score", 0))
    missing_reqs = view.get("missing_requirements", [])
    verified_items = view.get("verified_items", [])
    facts = state.get("facts", [])

    items: list[ClaimVerificationItem] = []
    for v in verified_items:
        items.append(
            ClaimVerificationItem(
                key=v.lower().replace(" ", "_"),
                label=v,
                status="verified",
                reason="Document verified and key facts anchored.",
            )
        )

    for m in missing_reqs:
        items.append(
            ClaimVerificationItem(
                key=m.get("name", "").lower().replace(" ", "_"),
                label=m.get("name", ""),
                status="missing",
                reason=m.get("reason", "Required document not provided"),
            )
        )

    # Check for conflicts
    has_conflicts = False
    for fact in facts:
        if fact.get("verification_status") == "conflict":
            has_conflicts = True
            items.append(
                ClaimVerificationItem(
                    key=fact.get("fact_key", "conflict"),
                    label=fact.get("fact_key", "").replace("_", " ").title(),
                    status="conflict",
                    reason="Conflicting values detected across uploaded documents.",
                )
            )

    completion_state = "complete" if readiness_score >= 95 and not has_conflicts else "incomplete" if readiness_score > 0 else "blocked"

    return ClaimVerificationStatus(
        readiness_score=readiness_score,
        completion_state=completion_state,
        verified_count=len(verified_items),
        total_requirements=len(verified_items) + len(missing_reqs),
        items=items,
        has_conflicts=has_conflicts,
    )


async def _retrieve_cognee_insights(case_code: str, view: dict) -> dict[str, Any]:
    """Retrieve semantic memory and policy grounding chunks from Cognee."""
    dataset_name = cognee_service.case_dataset_name(case_code)
    try:
        chunks = await cognee_service.search_chunks(
            question="coverage limits room rent copay exclusions claim criteria",
            dataset_names=[dataset_name, cognee_service.POLICY_DEMO_DATASET],
            top_k=3,
        )
        return {"chunks": chunks}
    except Exception as exc:
        logger.debug("Cognee search skipped: %s", exc)
        return {"chunks": []}


def _derive_decision_outcome(
    verification_status: ClaimVerificationStatus,
    financial_summary: FinancialSummaryBreakdown,
    policy_citations: list[PolicyTermCitation],
    scenario_raw: dict | None,
    cognee_context: dict,
    documents: list[dict],
) -> DecisionOutcome:
    """Determine whether to Proceed, Abstain, or Escalate."""
    proofs: list[DecisionProofCitation] = []
    abstain_reasons: list[str] = []

    for cit in policy_citations:
        if cit.clause_quote:
            proofs.append(
                DecisionProofCitation(
                    title=cit.label,
                    document_name=cit.document_name,
                    page_number=cit.page_number,
                    quote=cit.clause_quote,
                    confidence=cit.confidence,
                    category="policy",
                )
            )

    # If critical documents are missing (readiness < 70%)
    if verification_status.readiness_score < 70 or verification_status.completion_state == "blocked":
        for item in verification_status.items:
            if item.status == "missing":
                abstain_reasons.append(f"Missing mandatory document: {item.label} ({item.reason})")

        return DecisionOutcome(
            branch="abstain",
            status_label="ABSTAIN WITH PROOF AND CITATION",
            badge_variant="amber",
            headline="Claim Incomplete — Action Required Before Submission",
            detailed_rationale="The claim cannot be submitted to the insurer yet because critical mandatory documents and verification anchors are missing.",
            proofs=proofs,
            abstain_or_rejection_reasons=abstain_reasons,
            estimated_approval_amount=None,
        )

    # If conflicts or ambiguous medical exclusions exist -> Escalate
    if verification_status.has_conflicts:
        return DecisionOutcome(
            branch="escalate",
            status_label="HUMAN ESCALATION WITH CONTEXT",
            badge_variant="blue",
            headline="Discrepancies Detected — Senior Review Recommended",
            detailed_rationale="Conflicting dates or billing figures were found across uploaded records. A human claims specialist should review the file.",
            proofs=proofs,
            abstain_or_rejection_reasons=["Data conflict in uploaded documents."],
            estimated_approval_amount=financial_summary.estimated_net_payout,
        )

    # Proceed Branch
    payout = financial_summary.estimated_net_payout or financial_summary.admissible_charges
    return DecisionOutcome(
        branch="proceed",
        status_label="PROCEED WITH CITATION AND PROOF",
        badge_variant="green",
        headline=f"Claim Verified — Estimated Payout ₹{payout:,.0f}",
        detailed_rationale=f"All essential documents are authenticated. Based on verified policy clauses and reconciled bill lines, estimated insurer settlement is ₹{payout:,.0f} with an out-of-pocket gap of ₹{financial_summary.estimated_out_of_pocket:,.0f}.",
        proofs=proofs,
        abstain_or_rejection_reasons=[],
        estimated_approval_amount=payout,
    )


def _build_escalation_dossier(
    decision: DecisionOutcome,
    state: dict,
    verification_status: ClaimVerificationStatus,
    financial_summary: FinancialSummaryBreakdown,
    cognee_context: dict,
) -> HumanEscalationDossier:
    """Build full context packet for human reviewer."""
    facts = state.get("facts", [])
    discrepancies: list[str] = []
    if verification_status.has_conflicts:
        discrepancies.append("Conflicting fact entries detected in database.")
    if financial_summary.estimated_out_of_pocket > 50000:
        discrepancies.append(f"High out-of-pocket patient liability of ₹{financial_summary.estimated_out_of_pocket:,.0f}.")

    cognee_snippets = [
        c.get("text", "")[:200] for c in cognee_context.get("chunks", []) if c.get("text")
    ]

    is_rec = decision.branch in {"escalate", "abstain"} or len(discrepancies) > 0

    return HumanEscalationDossier(
        is_recommended=is_rec,
        reason="Discrepancy or high deductible review" if is_rec else "Standard human audit gateway",
        dossier_summary=(
            f"Case {state['case'].get('case_code')}: Hospital '{state['case'].get('hospital_name') or 'N/A'}' "
            f"— Total Bill ₹{financial_summary.gross_bill:,.0f}, Estimated Payout ₹{financial_summary.estimated_net_payout:,.0f}, "
            f"Readiness {verification_status.readiness_score}%."
        ),
        discrepancies=discrepancies,
        source_facts=[
            {
                "key": f.get("fact_key"),
                "value": f.get("value_json"),
                "status": f.get("verification_status"),
                "page": f.get("source_page"),
                "quote": f.get("source_quote"),
            }
            for f in facts[:10]
        ],
        cognee_context_snippets=cognee_snippets,
    )


def _generate_user_next_steps(
    case_id: str,
    verification_status: ClaimVerificationStatus,
    decision: DecisionOutcome,
    documents: list[dict],
    financial_summary: FinancialSummaryBreakdown,
) -> list[UserNextStep]:
    """Generate prioritized next actions for the user."""
    steps: list[UserNextStep] = []

    # 1. Missing docs step
    missing = [item for item in verification_status.items if item.status == "missing"]
    if missing:
        top_missing = missing[0]
        steps.append(
            UserNextStep(
                step_id="upload_missing",
                priority="critical",
                title=f"Upload {top_missing.label}",
                description=f"Your claim is held because {top_missing.reason.lower()}",
                action_type="upload_document",
                target_route=f"/upload?caseId={case_id}",
                action_label="Upload Now",
            )
        )

    # 2. Bill Lines or Deductions Review
    bill_docs = [d for d in documents if d.get("document_type") == "hospital_estimate"]
    if bill_docs and not bill_docs[0].get("bill_items_confirmed"):
        steps.append(
            UserNextStep(
                step_id="review_bill",
                priority="high",
                title="Confirm Itemized Hospital Charges",
                description="Review line items to ensure room rent, pharmacy and consumable deductions are accurately categorized.",
                action_type="review_bill_lines",
                target_route=f"/case/{case_id}#financial-map",
                action_label="Review Line Items",
            )
        )

    # 3. Ready to Submit
    if decision.branch == "proceed":
        steps.append(
            UserNextStep(
                step_id="submit_claim",
                priority="critical",
                title="Submit Claim to Insurer / TPA",
                description="All documents verified. Transmit the 1-click grounded claim dossier directly for cashless / reimbursement processing.",
                action_type="submit_claim",
                target_route=f"/track?caseId={case_id}",
                action_label="Submit Claim Package",
            )
        )

    # 4. Human Escalation / Appeal
    steps.append(
        UserNextStep(
            step_id="escalate_advisor",
            priority="medium",
            title="Connect with Human Claim Specialist",
            description="Request a licensed TPA specialist to review policy deductions, dispute exclusions, or expedite settlement.",
            action_type="request_human_escalation",
            target_route=f"/case/{case_id}#escalation",
            action_label="Request Specialist Review",
        )
    )

    return steps
