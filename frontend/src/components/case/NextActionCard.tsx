"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Upload,
  CheckCircle2,
  Landmark,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { setReminder } from "@/lib/api";
import type { FinancialMap } from "@/lib/types";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function NextActionCard({
  caseId,
  action,
  missingCount,
  financialMap,
}: {
  caseId: string;
  action: string;
  missingCount: number;
  financialMap: FinancialMap;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);

  const remind = async () => {
    setPending(true);
    setMessage("");
    try {
      await setReminder(caseId);
      setMessage("Reminder scheduled via SMS/WhatsApp.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not schedule a reminder.",
      );
    } finally {
      setPending(false);
    }
  };

  const gap = financialMap.estimated_gap || 0;
  const estimate = financialMap.hospital_estimate || 0;
  const nothingMissing = missingCount === 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Primary Next Action Card */}
      <section
        className="card"
        style={{
          border: "2px solid #bfdbfe",
          background: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="label" style={{ color: "#0066f5" }}>One Clear Next Step</span>
          <span className="pill pill-blue">Priority Action</span>
        </div>

        <h3
          className="heading"
          style={{ fontSize: 20, margin: "4px 0 8px", color: "var(--paytm-navy)" }}
        >
          {action || "Upload documents to get started"}
        </h3>

        {nothingMissing ? (
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
            Every required document is verified by AI. Nothing is blocking your cashless settlement.
          </p>
        ) : (
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
            {missingCount} requirement{missingCount === 1 ? "" : "s"} needed to unlock final claim settlement.
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {nothingMissing ? (
            <Link
              href={`/track?caseId=${encodeURIComponent(caseId)}`}
              className="btn btn-primary"
              style={{ gap: 8 }}
            >
              Track submission <ArrowRight size={15} />
            </Link>
          ) : (
            <Link
              href={`/upload?caseId=${encodeURIComponent(caseId)}`}
              className="btn btn-primary"
              style={{ gap: 8 }}
            >
              <Upload size={16} />
              Upload missing document
            </Link>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={remind}
            disabled={pending}
            style={{ gap: 8 }}
          >
            <Bell size={15} />
            {pending ? "Scheduling…" : "Set smart reminder"}
          </button>
        </div>

        {message && (
          <div
            className="pill pill-green"
            style={{ marginTop: 14, padding: "8px 12px", width: "fit-content" }}
          >
            <CheckCircle2 size={14} />
            {message}
          </div>
        )}
      </section>

      {/* Screen 7: Explore Financing / Paytm Personal Loan for Confirmed Gap */}
      {gap > 0 && (
        <section
          className="card"
          style={{
            border: "1px solid #fed7aa",
            background: "#fffaf5",
            padding: "20px 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div style={{ maxWidth: 520 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="label" style={{ color: "#c2410c" }}>Explore Financing</span>
                <span className="pill pill-orange">Gap Coverage</span>
              </div>
              <h4 style={{ margin: "4px 0", fontSize: 17, fontWeight: 700, color: "#9a3412" }}>
                You have a confirmed gap of {money(gap)}
              </h4>
              <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#78350f" }}>
                Hospital bill estimate is {money(estimate)}. You can explore Paytm instant financing options to cover the out-of-pocket remaining amount with 0 pre-closure charges.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "#92400e" }}>
                <span>✓ Instant fund release</span>
                <span>✓ No impact on insurance claim</span>
                <span>✓ 100% paperless &amp; online</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowLoanModal(true)}
                className="btn btn-paytm"
                style={{ gap: 6, borderRadius: 12 }}
              >
                <Landmark size={15} />
                Check Loan Eligibility
              </button>
              <span style={{ fontSize: 11, color: "#a16207" }}>
                Recommended: Paytm Personal Loan
              </span>
            </div>
          </div>

          {/* Simple Loan Modal */}
          {showLoanModal && (
            <div
              style={{
                marginTop: 16,
                padding: "16px",
                background: "#ffffff",
                border: "1px solid #f97316",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>Paytm Instant Personal Loan</div>
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  style={{ background: "none", border: 0, color: "#64748b", cursor: "pointer", fontSize: 16 }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#475569", margin: "6px 0 12px" }}>
                Pre-approved medical assistance credit up to ₹1,50,000 at competitive interest rates for hospital emergencies.
              </p>
              <a
                href="https://paytm.com/loans"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: "inline-flex", gap: 6 }}
              >
                Apply via Paytm App <ChevronRight size={14} />
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}