"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Upload,
  UserCheck,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Sparkles,
  Receipt,
  Scale,
  Send,
  Building2,
  ExternalLink,
} from "lucide-react";
import { escalateCase } from "@/lib/api";
import type {
  DecisionFlowResponse,
  PolicyTermCitation,
  UserNextStep,
} from "@/lib/types";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function DecisionFlowCard({
  initialData,
  caseId,
}: {
  initialData: DecisionFlowResponse;
  caseId: string;
}) {
  const [data] = useState<DecisionFlowResponse>(initialData);
  const [showDossier, setShowDossier] = useState(false);
  const [activeProofIndex, setActiveProofIndex] = useState<number | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [escalationMsg, setEscalationMsg] = useState("");

  const {
    policy_claims,
    financial_summary,
    claim_verification,
    decision,
    escalation,
    next_steps,
  } = data;

  const handleEscalate = async () => {
    setEscalating(true);
    setEscalationMsg("");
    try {
      const res = await escalateCase(caseId, {
        reason: escalation.reason || "User requested specialist dispute review",
        note: "Triggered from Decision Making Flow Gateway",
      });
      setEscalated(true);
      setEscalationMsg(res.message);
    } catch (err) {
      setEscalationMsg(
        err instanceof Error ? err.message : "Could not submit escalation request."
      );
    } finally {
      setEscalating(false);
    }
  };

  const isProceed = decision.branch === "proceed";
  const isAbstain = decision.branch === "abstain";

  return (
    <div
      id="decision-flow-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        marginBottom: 24,
      }}
    >
      {/* ── STEP 1: Decision Banner (Proceed vs Abstain vs Escalate) ── */}
      <section
        className="card"
        style={{
          border: isProceed
            ? "2px solid #86efac"
            : isAbstain
            ? "2px solid #fde047"
            : "2px solid #93c5fd",
          background: isProceed
            ? "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)"
            : isAbstain
            ? "linear-gradient(135deg, #ffffff 0%, #fefce8 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)",
          padding: "24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative glow */}
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: isProceed
              ? "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)"
              : isAbstain
              ? "radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: isProceed
                ? "#dcfce7"
                : isAbstain
                ? "#fef9c3"
                : "#dbeafe",
              color: isProceed
                ? "#15803d"
                : isAbstain
                ? "#a16207"
                : "#1d4ed8",
            }}
          >
            {isProceed ? (
              <CheckCircle2 size={14} />
            ) : isAbstain ? (
              <AlertTriangle size={14} />
            ) : (
              <BrainCircuit size={14} />
            )}
            {decision.status_label}
          </div>
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: isProceed
              ? "#14532d"
              : isAbstain
              ? "#713f12"
              : "#1e3a8a",
            margin: "0 0 8px",
          }}
        >
          {decision.headline}
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "#334155",
            lineHeight: 1.6,
            margin: "0 0 16px",
            maxWidth: "92%",
          }}
        >
          {decision.detailed_rationale}
        </p>

        {/* Abstain reasons list if present */}
        {decision.abstain_or_rejection_reasons.length > 0 && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fef08a",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#92400e",
                marginBottom: 6,
              }}
            >
              Missing or Ineligible Factors:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#78350f" }}>
              {decision.abstain_or_rejection_reasons.map((r, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Grounded proofs & citations dropdown accordion */}
        {decision.proofs.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Verified Citations & Proofs ({decision.proofs.length})
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {decision.proofs.map((proof, idx) => {
                const isOpen = activeProofIndex === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveProofIndex(isOpen ? null : idx)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ShieldCheck size={15} color="#0066f5" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          {proof.title}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "#f1f5f9",
                            color: "#64748b",
                          }}
                        >
                          {proof.document_name}
                          {proof.page_number ? ` (p. ${proof.page_number})` : ""}
                        </span>
                      </div>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderTop: "1px solid #f1f5f9",
                          background: "#f8fafc",
                          fontSize: 12,
                          color: "#334155",
                          fontStyle: "italic",
                          lineHeight: 1.5,
                        }}
                      >
                        “{proof.quote}”
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── STEP 2: Existing Policy Claims with Citations & Values ── */}
      <section
        className="card"
        style={{
          background: "#ffffff",
          border: "1px solid var(--border)",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#eff6ff",
              color: "#0066f5",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Existing Policy Claims & Sub-limits
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              Extracted with document provenance and page citations
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {policy_claims.map((claim, idx) => (
            <div
              key={idx}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                {claim.label}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                {claim.value_rendered}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "#0284c7",
                  marginTop: 2,
                }}
              >
                <FileText size={12} />
                <span>
                  {claim.document_name}
                  {claim.page_number ? ` • Pg ${claim.page_number}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── STEP 3: Logical Breakdown of Financial Summary ── */}
      <section
        className="card"
        style={{
          background: "#ffffff",
          border: "1px solid var(--border)",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#f0fdf4",
              color: "#16a34a",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Receipt size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Logical Financial Summary Breakdown
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              Reconciliation of hospital bill against policy deductions & copay
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>GROSS BILL</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
              {money(financial_summary.gross_bill)}
            </div>
          </div>

          <div style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
            <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 600 }}>DEDUCTIONS / EXCLUSIONS</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
              - {money(financial_summary.total_deductions)}
            </div>
          </div>

          <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>ESTIMATED PAYOUT</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
              {money(financial_summary.estimated_net_payout)}
            </div>
          </div>

          <div style={{ padding: 12, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 600 }}>PATIENT OUT-OF-POCKET</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
              {money(financial_summary.estimated_out_of_pocket)}
            </div>
          </div>
        </div>

        {financial_summary.non_medical_deductions > 0 || financial_summary.copay_percentage > 0 ? (
          <div
            style={{
              padding: "10px 14px",
              background: "#f8fafc",
              borderRadius: 8,
              fontSize: 12,
              color: "#475569",
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            {financial_summary.non_medical_deductions > 0 && (
              <span>• Non-Medical Items: <strong>{money(financial_summary.non_medical_deductions)}</strong></span>
            )}
            {financial_summary.proportionate_deductions > 0 && (
              <span>• Room Rent Proportionate Cut: <strong>{money(financial_summary.proportionate_deductions)}</strong></span>
            )}
            {financial_summary.copay_percentage > 0 && (
              <span>• Copay ({financial_summary.copay_percentage}%): <strong>{money(financial_summary.copay_amount)}</strong></span>
            )}
          </div>
        ) : null}
      </section>

      {/* ── STEP 4: Claim Verification & Completion Status ── */}
      <section
        className="card"
        style={{
          background: "#ffffff",
          border: "1px solid var(--border)",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#eff6ff",
                color: "#0066f5",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Scale size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Claim Verification & Completion
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                {claim_verification.verified_count} of {claim_verification.total_requirements} mandatory criteria verified
              </p>
            </div>
          </div>
          <div
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              background: claim_verification.readiness_score >= 80 ? "#dcfce7" : "#fef3c7",
              color: claim_verification.readiness_score >= 80 ? "#166534" : "#92400e",
            }}
          >
            {claim_verification.readiness_score}% Complete
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 8,
            background: "#e2e8f0",
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${claim_verification.readiness_score}%`,
              background:
                claim_verification.readiness_score >= 80
                  ? "linear-gradient(90deg, #22c55e, #16a34a)"
                  : "linear-gradient(90deg, #eab308, #ca8a04)",
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {/* Requirements Checklist */}
        <div style={{ display: "grid", gap: 8 }}>
          {claim_verification.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 8,
                background:
                  item.status === "verified"
                    ? "#f8fafc"
                    : item.status === "conflict"
                    ? "#fef2f2"
                    : "#fffbeb",
                border: `1px solid ${
                  item.status === "verified"
                    ? "#e2e8f0"
                    : item.status === "conflict"
                    ? "#fecaca"
                    : "#fef08a"
                }`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {item.status === "verified" ? (
                  <CheckCircle2 size={16} color="#16a34a" />
                ) : item.status === "conflict" ? (
                  <XCircle size={16} color="#dc2626" />
                ) : (
                  <HelpCircle size={16} color="#d97706" />
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                  {item.label}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {item.reason}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── STEP 5: Human Escalation Gateway with Context of All Data ── */}
      <section
        id="escalation"
        className="card"
        style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#f1f5f9",
                color: "#475569",
                display: "grid",
                placeItems: "center",
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Human Escalation & Expert Review Gateway
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                Multi-agent context synthesis from Supabase & Cognee graph memory
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowDossier(!showDossier)}
            style={{ fontSize: 12, padding: "6px 12px", gap: 6 }}
          >
            <BrainCircuit size={14} />
            {showDossier ? "Hide Dossier" : "View Escalation Dossier"}
            {showDossier ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
          {escalation.dossier_summary}
        </p>

        {showDossier && (
          <div
            style={{
              padding: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              Comprehensive Case Facts Dossier
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 8,
              }}
            >
              {escalation.source_facts.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 10px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <div style={{ color: "#64748b", fontWeight: 600 }}>{String(f.key ?? "")}</div>
                  <div style={{ color: "#0f172a", fontWeight: 700, marginTop: 2 }}>
                    {String(f.value ?? "")}
                  </div>
                  {Boolean(f.quote) && (
                    <div style={{ color: "#94a3b8", fontSize: 11, fontStyle: "italic", marginTop: 4 }}>
                      “{String(f.quote).slice(0, 80)}…”
                    </div>
                  )}
                </div>
              ))}
            </div>

            {escalation.cognee_context_snippets.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Cognee Semantic Memory Chunks
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {escalation.cognee_context_snippets.map((snip, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "6px 10px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "#475569",
                      }}
                    >
                      {snip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleEscalate}
            disabled={escalating || escalated}
            style={{
              borderColor: "#0066f5",
              color: "#0066f5",
              gap: 8,
              fontWeight: 600,
            }}
          >
            <Send size={15} />
            {escalating
              ? "Submitting Escalation…"
              : escalated
              ? "Escalation Sent to Specialist"
              : "Request Human Specialist Escalation"}
          </button>

          {escalationMsg && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: escalated ? "#16a34a" : "#dc2626",
                fontWeight: 600,
              }}
            >
              {escalated ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              {escalationMsg}
            </div>
          )}
        </div>
      </section>

      {/* ── STEP 6: Actionable Next Steps to be Taken by the User ── */}
      <section
        className="card"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
          border: "2px solid #bfdbfe",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Sparkles size={18} color="#0066f5" />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f2e59" }}>
            Actionable Next Steps For You
          </h3>
          <span className="pill pill-blue">User Actions</span>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#475569" }}>
          Execute these guided steps to finalize and submit your health insurance claim:
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          {next_steps.map((step) => {
            const isCritical = step.priority === "critical";
            const isHigh = step.priority === "high";

            return (
              <div
                key={step.step_id}
                style={{
                  background: "#ffffff",
                  border: isCritical
                    ? "1px solid #fecaca"
                    : isHigh
                    ? "1px solid #fed7aa"
                    : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: isCritical
                          ? "#fee2e2"
                          : isHigh
                          ? "#ffedd5"
                          : "#f1f5f9",
                        color: isCritical
                          ? "#991b1b"
                          : isHigh
                          ? "#9a3412"
                          : "#475569",
                      }}
                    >
                      {step.priority}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                      {step.title}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.4 }}>
                    {step.description}
                  </span>
                </div>

                <div>
                  <Link
                    href={step.target_route}
                    className="btn btn-primary"
                    style={{
                      gap: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.action_type === "upload_document" ? (
                      <Upload size={14} />
                    ) : (
                      <ArrowRight size={14} />
                    )}
                    {step.action_label}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
