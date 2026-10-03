"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, ArrowRight, ShieldCheck, AlertCircle, Clock, PieChart } from "lucide-react";
import type { CaseData } from "@/lib/types";

const money = (x: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(x);

export function FinancialMap({ data }: { data: CaseData }) {
  const [accordionOpen, setAccordionOpen] = useState(true);
  const f = data.financial_map;

  // Use only real data from case state — no hardcoded fallbacks
  const totalBill = f.hospital_estimate || 0;
  const approved = f.possible_coverage || 0;
  const outOfPocket = f.estimated_gap || 0;
  const underAssessment = Math.max(0, totalBill - approved - outOfPocket);

  // If no financial data exists, show empty state
  if (totalBill === 0) {
    return (
      <section className="card" id="money-map" style={{ padding: "26px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="label" style={{ color: "#0066f5" }}>Paytm Money Map</span>
          </div>
          <h2 className="heading" style={{ fontSize: 22, margin: "2px 0 4px", color: "var(--paytm-navy)" }}>
            Money Map
          </h2>
        </div>
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: 14,
            border: "1px dashed #cbd5e1",
          }}
        >
          <PieChart size={28} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
            No financial data yet
          </p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Upload your hospital bill and insurance policy to see your coverage breakdown.
          </p>
        </div>
      </section>
    );
  }

  // Percentages for the Donut / Progress Bar
  const pctApproved = totalBill > 0 ? Math.round((approved / totalBill) * 100) : 0;
  const pctOutOfPocket = totalBill > 0 ? Math.round((outOfPocket / totalBill) * 100) : 0;
  const pctUnderAssessment = totalBill > 0 ? Math.round((underAssessment / totalBill) * 100) : 0;

  // SVG Donut calculations (radius 60, circumference ~377)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeApproved = (pctApproved / 100) * circumference;
  const strokeOutOfPocket = (pctOutOfPocket / 100) * circumference;
  const strokeUnderAssessment = (pctUnderAssessment / 100) * circumference;

  const offsetApproved = 0;
  const offsetOutOfPocket = -strokeApproved;
  const offsetUnderAssessment = -(strokeApproved + strokeOutOfPocket);

  // Build breakdown from real extracted facts with money values
  const breakdownItems = (data.facts || [])
    .filter((fact) => fact.value_type === "money" && fact.value_json !== null && fact.source_quote)
    .map((fact) => ({
      title: fact.label || fact.fact_key.replaceAll("_", " "),
      amount: Number(fact.value_json) || 0,
      source: `${fact.document_name || "Document"}${fact.source_page ? " · Page " + fact.source_page : ""}`,
      quote: fact.source_quote,
    }));

  return (
    <section className="card" id="money-map" style={{ padding: "26px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="label" style={{ color: "#0066f5" }}>Paytm Money Map</span>
          <span className="pill pill-green" style={{ fontSize: 11 }}>AI Analyzed</span>
        </div>
        <h2 className="heading" style={{ fontSize: 22, margin: "2px 0 4px", color: "var(--paytm-navy)" }}>
          Money Map
        </h2>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          Your bill, coverage and financial position at a glance
        </p>
      </div>

      {/* Main Breakdown Section (Donut + Legend) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 28,
          alignItems: "center",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          padding: "24px 20px",
          marginBottom: 24,
        }}
      >
        {/* Donut Chart Visual */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 170, height: 170 }}>
            <svg viewBox="0 0 140 140" width="170" height="170" style={{ transform: "rotate(-90deg)" }}>
              {/* Background ring */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="16"
              />
              {/* Insurance Approved (Green) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth="16"
                strokeDasharray={`${strokeApproved} ${circumference}`}
                strokeDashoffset={offsetApproved}
                strokeLinecap="round"
              />
              {/* Confirmed Out of pocket (Orange) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="16"
                strokeDasharray={`${strokeOutOfPocket} ${circumference}`}
                strokeDashoffset={offsetOutOfPocket}
              />
              {/* Under Assessment (Purple) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="16"
                strokeDasharray={`${strokeUnderAssessment} ${circumference}`}
                strokeDashoffset={offsetUnderAssessment}
              />
            </svg>

            {/* Inner Center Label */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Total Bill
              </span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#0f172a",
                  lineHeight: 1.15,
                  marginTop: 2,
                }}
              >
                {money(totalBill)}
              </span>
            </div>
          </div>
        </div>

        {/* Legend List (Matching Application UI.png) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Approved Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#ffffff",
              border: "1px solid #d1fae5",
              borderRadius: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#10b981",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>
                  Insurance Approved
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  Cashless + pre-approved
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>
                {money(approved)}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                {pctApproved}%
              </div>
            </div>
          </div>

          {/* Confirmed Out of pocket */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#ffffff",
              border: "1px solid #fef3c7",
              borderRadius: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#f59e0b",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>
                  Confirmed Out-of-Pocket
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  Need to arrange by patient
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#d97706" }}>
                {money(outOfPocket)}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                {pctOutOfPocket}%
              </div>
            </div>
          </div>

          {/* Under Assessment */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#ffffff",
              border: "1px solid #ede9fe",
              borderRadius: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#8b5cf6",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>
                  Under Assessment
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  Awaiting final discharge summary
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#7c3aed" }}>
                {money(underAssessment)}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                {pctUnderAssessment}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion "Why ₹X?" — only shown when we have real breakdown facts */}
      {outOfPocket > 0 && breakdownItems.length > 0 && (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <button
          type="button"
          onClick={() => setAccordionOpen(!accordionOpen)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "#ffffff",
            border: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} style={{ color: "#f59e0b" }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
              Why {money(outOfPocket)}?
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13 }}>
            <span>{accordionOpen ? "Collapse" : "View breakdown"}</span>
            {accordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {accordionOpen && (
          <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {breakdownItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    paddingBottom: idx < breakdownItems.length - 1 ? 14 : 0,
                    borderBottom:
                      idx < breakdownItems.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 10 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#f59e0b",
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {item.source}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          fontStyle: "italic",
                          marginTop: 4,
                          background: "#fffbeb",
                          padding: "4px 8px",
                          borderRadius: 6,
                          borderLeft: "2px solid #f59e0b",
                        }}
                      >
                        &ldquo;{item.quote}&rdquo;
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                    {money(item.amount)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px dashed #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Verified via Policy & Hospital Estimate
              </span>
              <a
                href="#evidence-drawer"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0066f5",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                View full evidence <ArrowRight size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
      )}

      <p className="muted" style={{ fontSize: 12, margin: "14px 0 0", textAlign: "center" }}>
        {f.disclaimer ||
          "Estimates generated by Paytm Sahayak AI from your submitted hospital bills and policy clauses. Final settlement subject to insurer terms."}
      </p>
    </section>
  );
}
