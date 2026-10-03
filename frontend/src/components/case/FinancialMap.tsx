"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, AlertCircle, PieChart, Edit3, X, Check, Plus } from "lucide-react";
import type { CaseData } from "@/lib/types";
import { updateCase } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const money = (x: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(x);

export function FinancialMap({ data }: { data: CaseData }) {
  const router = useRouter();
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [billAmount, setBillAmount] = useState(
    data.financial_map?.hospital_estimate ? String(data.financial_map.hospital_estimate) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const f = data.financial_map;

  // Use only real data from case state — no hardcoded fallbacks
  const totalBill = f.hospital_estimate || 0;
  const approved = f.possible_coverage || 0;
  const outOfPocket = f.estimated_gap || 0;
  const underAssessment = Math.max(0, totalBill - approved - outOfPocket);

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const parsed = billAmount.trim() ? Number(billAmount) : null;
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
        setError("Please enter a valid positive number.");
        setSaving(false);
        return;
      }

      await updateCase(
        data.id,
        { estimated_bill: parsed },
        session?.access_token
      );

      setSuccess(true);
      setTimeout(() => {
        setIsEditingBill(false);
        setSuccess(false);
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update total bill.");
    } finally {
      setSaving(false);
    }
  };

  // If no financial data exists, show empty state with add button
  if (totalBill === 0 && !isEditingBill) {
    return (
      <section className="card" id="money-map" style={{ padding: "26px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="label" style={{ color: "#0066f5" }}>Paytm Money Map</span>
            </div>
            <h2 className="heading" style={{ fontSize: 22, margin: "2px 0 4px", color: "var(--paytm-navy)" }}>
              Money Map
            </h2>
          </div>

          <button
            type="button"
            id="add-bill-btn"
            onClick={() => {
              setBillAmount("");
              setError("");
              setIsEditingBill(true);
            }}
            className="btn btn-primary btn-sm"
            style={{ borderRadius: 12, gap: 6 }}
          >
            <Plus size={14} />
            Set Total Bill
          </button>
        </div>

        <div
          style={{
            padding: "28px 24px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: 14,
            border: "1px dashed #cbd5e1",
          }}
        >
          <PieChart size={32} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            No financial bill entered yet
          </p>
          <p className="muted" style={{ margin: "6px 0 16px", fontSize: 13.5 }}>
            Set your estimated hospital bill or upload an estimate to generate your money map.
          </p>
          <button
            type="button"
            onClick={() => {
              setBillAmount("");
              setError("");
              setIsEditingBill(true);
            }}
            className="btn btn-outline btn-sm"
            style={{ borderRadius: 10, gap: 6 }}
          >
            <Plus size={14} />
            Enter Estimated Bill
          </button>
        </div>
      </section>
    );
  }

  // Percentages for the Donut / Progress Bar
  const pctApproved = totalBill > 0 ? Math.round((approved / totalBill) * 100) : 0;
  const pctOutOfPocket = totalBill > 0 ? Math.round((outOfPocket / totalBill) * 100) : 0;
  const pctUnderAssessment = totalBill > 0 ? Math.round((underAssessment / totalBill) * 100) : 0;

  // SVG Donut calculations (radius 54, circumference ~339.29)
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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
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

        <button
          type="button"
          id="edit-bill-amount-btn"
          onClick={() => {
            setBillAmount(totalBill ? String(totalBill) : "");
            setError("");
            setIsEditingBill(true);
          }}
          className="btn btn-outline btn-sm"
          style={{
            borderRadius: 10,
            gap: 6,
            fontSize: 12.5,
            borderColor: "#0066f5",
            color: "#0066f5",
            background: "#eff6ff",
            fontWeight: 600,
          }}
        >
          <Edit3 size={13} />
          Edit Total Bill
        </button>
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
              <button
                type="button"
                onClick={() => {
                  setBillAmount(totalBill ? String(totalBill) : "");
                  setIsEditingBill(true);
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#0066f5",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 3,
                  textDecoration: "underline",
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Legend List */}
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
                      <div style={{ fontSize: 12, color: "#64748b" }}>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0066f5" }}>
                ✓ Paytm Sahayak Verified
              </span>
            </div>
          </div>
        )}
      </div>
      )}

      <p className="muted" style={{ fontSize: 12, margin: "14px 0 0", textAlign: "center" }}>
        {f.disclaimer ||
          "Estimates generated by Paytm Sahayak AI from your submitted hospital bills and policy clauses. Final settlement subject to insurer terms."}
      </p>

      {/* Edit Bill Modal */}
      {isEditingBill && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditingBill(false);
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 460,
              width: "100%",
              padding: "26px 24px",
              boxShadow: "0 20px 45px rgba(0,0,0,0.2)",
              borderRadius: 20,
              background: "#ffffff",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <span className="label" style={{ color: "#0066f5" }}>
                  Paytm Money Map
                </span>
                <h3
                  className="heading"
                  style={{
                    fontSize: 20,
                    margin: "2px 0 0",
                    color: "var(--paytm-navy)",
                  }}
                >
                  Update Total Hospital Bill
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBill(false)}
                style={{
                  border: 0,
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBill} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  htmlFor="quick-bill-amount"
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 6,
                  }}
                >
                  Total Bill Amount (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    id="quick-bill-amount"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="e.g. 350000"
                    style={{
                      width: "100%",
                      padding: "11px 14px 11px 32px",
                      borderRadius: 12,
                      border: "1.5px solid #cbd5e1",
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  />
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
                  Your out-of-pocket gap and insurance coverage breakdown will be recalculated instantly.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#ecfdf5",
                    color: "#059669",
                    borderRadius: 10,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  <Check size={16} />
                  Bill updated successfully!
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12,
                  marginTop: 6,
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditingBill(false)}
                  disabled={saving}
                  style={{ borderRadius: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-bill-amount-btn"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ borderRadius: 12, minWidth: 120 }}
                >
                  {saving ? "Saving…" : "Save & Recalculate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
