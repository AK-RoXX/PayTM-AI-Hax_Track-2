"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Upload,
  CheckCircle2,
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
            All documents we currently request are on file. Your insurer may still ask for more information or make its own coverage decision.
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

      {/* Planning amounts are not loan recommendations or insurer decisions. */}
      {gap > 0 && (
        <section
          className="card"
          style={{
            border: "1px solid #bfdbfe",
            background: "#f8fbff",
            padding: "20px 22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#dbeafe", color: "#0369a1", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <ArrowRight size={17} />
            </div>
            <div>
              <div className="label" style={{ color: "#0369a1" }}>Plan the next step</div>
              <h4 style={{ margin: "4px 0", fontSize: 16, fontWeight: 750, color: "#0f2e59" }}>
                Current minimum planning gap: {money(gap)}
              </h4>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                This is based on a {money(estimate)} bill and the sum-insured ceiling only. It is not a confirmed patient liability or loan recommendation. Review the policy scenario in the Money Map before making a financial decision.
              </p>
              <a href="#money-map" style={{ display: "inline-block", marginTop: 9, fontSize: 12, fontWeight: 700, color: "#0066f5" }}>Review Money Map →</a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
