import React from "react";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import type { CaseData } from "@/lib/types";

export function ClaimReadinessCard({ data }: { data: CaseData }) {
  const complete = data.missing_requirements.length === 0;
  const score = data.readiness_score || (complete ? 100 : 75);

  return (
    <section className="card" style={{ padding: "26px" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="label" style={{ color: "#0066f5" }}>Claim Readiness</span>
            <span className={complete ? "pill pill-green" : "pill pill-amber"}>
              {complete ? "Ready to Settle" : "Documents Needed"}
            </span>
          </div>
          <h3 className="heading" style={{ fontSize: 20, margin: 0, color: "var(--paytm-navy)" }}>
            Readiness Score
          </h3>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 32,
              fontWeight: 800,
              color: score >= 80 ? "#059669" : "#d97706",
              lineHeight: 1,
            }}
          >
            {score}%
          </div>
          <span style={{ fontSize: 11.5, color: "#64748b" }}>Readiness Level</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: 8,
          borderRadius: 6,
          background: "#e2e8f0",
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(5, score))}%`,
            background: score >= 80 ? "#10b981" : "#f59e0b",
            borderRadius: 6,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Verified Items */}
      <div style={{ marginBottom: 18 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#059669",
            display: "block",
            marginBottom: 8,
          }}
        >
          ✓ Verified by AI ({data.verified_items.length})
        </span>

        {data.verified_items.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Upload documents to verify policy number, cashless eligibility, and billing lines.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {data.verified_items.map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13.5,
                  color: "#1e293b",
                }}
              >
                <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing Requirements */}
      {data.missing_requirements.length > 0 && (
        <div style={{ paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#b45309",
              display: "block",
              marginBottom: 10,
            }}
          >
            Action Required ({data.missing_requirements.length})
          </span>

          <div style={{ display: "grid", gap: 10 }}>
            {data.missing_requirements.map((req) => (
              <div
                key={req.name}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: "#92400e" }}>
                    → {req.name}
                  </span>
                  <span
                    className={
                      req.priority === "high"
                        ? "pill pill-red"
                        : "pill pill-amber"
                    }
                    style={{ fontSize: 10.5, padding: "2px 8px" }}
                  >
                    {req.priority} priority
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>
                  {req.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}