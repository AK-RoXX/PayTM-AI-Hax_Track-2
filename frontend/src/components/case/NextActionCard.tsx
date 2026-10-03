"use client";

import { useState } from "react";
import Link from "next/link";
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
      setMessage("Reminder scheduled. It will appear on your case timeline.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not schedule a reminder.",
      );
    } finally {
      setPending(false);
    }
  };

  const nothingMissing = missingCount === 0;
  const hasGap = financialMap.hospital_estimate > 0;

  return (
    <section className="card" style={{ border: "2px solid #bcecff" }}>
      <div className="label">Next best action</div>
      <h3 style={{ margin: "8px 0" }}>{action}</h3>

      {nothingMissing ? (
        <p className="muted" style={{ marginTop: 0 }}>
          Every document we need is uploaded and read. Nothing is blocking you.
        </p>
      ) : (
        <p className="muted">
          {missingCount} requirement{missingCount === 1 ? "" : "s"} still
          outstanding. Your claim stays open until they are in.
        </p>
      )}

      <div className="grid two">
        {nothingMissing ? (
          <a className="btn btn-primary" href={`/track?caseId=${encodeURIComponent(caseId)}`}>
            Track submission
          </a>
        ) : (
          <Link
            className="btn btn-primary"
            href={`/upload?caseId=${encodeURIComponent(caseId)}`}
          >
            Upload document
          </Link>
        )}
        <button className="btn btn-soft" onClick={remind} disabled={pending}>
          {pending ? "Scheduling…" : "Set reminder"}
        </button>
      </div>

      {message && (
        <p className="pill pill-green" style={{ marginTop: 12, padding: "6px 10px" }}>
          {message}
        </p>
      )}

      {hasGap && (
        <div className="evidence" style={{ marginTop: 16 }}>
          <b>
            Planning gap of {money(financialMap.estimated_gap)} on an estimate of{" "}
            {money(financialMap.hospital_estimate)}
          </b>
          <br />
          Based on the policy and bills you uploaded. Complete insurance
          verification before arranging any borrowing.
        </div>
      )}
    </section>
  );
}