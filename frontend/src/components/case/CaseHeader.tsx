import React from "react";
import Link from "next/link";
import { ShieldCheck, Hospital, User, FileText, ArrowRight } from "lucide-react";
import type { CaseData } from "@/lib/types";

function readableStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const RELATION_LABELS: Record<string, string> = {
  self: "Self (You)",
  mother: "Mother",
  father: "Father",
  spouse: "Spouse",
  child: "Child",
  other: "Family Member",
};

export function CaseHeader({ data }: { data: CaseData }) {
  const relation = RELATION_LABELS[data.patient_relation] ?? data.patient_relation;
  const failedDocuments = data.documents.filter(
    (document) => document.processing_status === "failed",
  ).length;

  return (
    <section className="card" style={{ padding: "24px 26px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="label" style={{ color: "#0066f5" }}>Health Insurance Case</span>
            <span className="pill pill-blue">Active Case</span>
          </div>

          <h1
            className="heading"
            style={{
              fontSize: 26,
              margin: "2px 0 8px",
              color: "var(--paytm-navy)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>{data.case_code || data.id}</span>
          </h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 16,
              color: "#475569",
              fontSize: 13.5,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <User size={15} style={{ color: "#64748b" }} />
              Patient: <strong>{relation}</strong>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Hospital size={15} style={{ color: "#64748b" }} />
              Hospital: <strong>{data.hospital_name || "Apollo Hospital"}</strong>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FileText size={15} style={{ color: "#64748b" }} />
              Documents: <strong>{data.documents.length} uploaded</strong>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {failedDocuments > 0 && (
            <span className="pill pill-red">
              {failedDocuments} document failed
            </span>
          )}
          <span className="pill pill-green" style={{ fontSize: 13, padding: "6px 12px" }}>
            <ShieldCheck size={14} />
            {readableStatus(data.status)}
          </span>
        </div>
      </div>
    </section>
  );
}