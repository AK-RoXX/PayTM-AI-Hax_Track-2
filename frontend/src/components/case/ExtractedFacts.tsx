import React from "react";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import type { ExtractedFact } from "@/lib/types";

function renderValue(fact: ExtractedFact): string {
  const value = fact.value_json;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "Not found";
  if (fact.value_type === "money") {
    return `₹${Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  }
  return String(value);
}

const STATUS_LABELS: Record<string, string> = {
  extracted: "Extracted",
  verified: "Verified",
  needs_review: "Check this",
  conflict: "Conflict",
};

function statusPill(status: string) {
  if (status === "verified") return "pill pill-green";
  if (status === "conflict") return "pill pill-red";
  if (status === "needs_review") return "pill pill-amber";
  return "pill pill-blue";
}

export function ExtractedFacts({ facts }: { facts: ExtractedFact[] }) {
  if (facts.length === 0) {
    return null;
  }

  return (
    <section className="card" style={{ padding: "26px" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="label" style={{ color: "#0066f5" }}>AI Extraction</span>
          <span className="pill pill-green">Gemini Verified</span>
        </div>
        <h3 className="heading" style={{ fontSize: 20, margin: 0, color: "var(--paytm-navy)" }}>
          Extracted Case Facts
        </h3>
        <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
          Verified details extracted directly from hospital bills and policy clauses
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {facts.map((fact) => (
          <article
            key={`${fact.document_id ?? "case"}-${fact.fact_key}`}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "16px 18px",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                  {fact.label}
                </span>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--paytm-navy)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    marginTop: 2,
                  }}
                >
                  {renderValue(fact)}
                </div>
              </div>

              <span className={statusPill(fact.verification_status)}>
                {STATUS_LABELS[fact.verification_status] ?? fact.verification_status}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: "#64748b",
                marginTop: 8,
              }}
            >
              <span>{fact.document_name || "Uploaded document"}</span>
              {fact.source_page && <span>· Page {fact.source_page}</span>}
              <span>· {Math.round(fact.confidence * 100)}% confidence</span>
            </div>

            {fact.source_quote && (
              <blockquote
                className="evidence"
                style={{
                  margin: "10px 0 0",
                  fontSize: 12.5,
                  padding: "8px 12px",
                }}
              >
                &ldquo;{fact.source_quote}&rdquo;
              </blockquote>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}