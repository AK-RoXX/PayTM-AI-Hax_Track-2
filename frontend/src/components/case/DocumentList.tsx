import React from "react";
import Link from "next/link";
import { FileText, Image as ImageIcon, Plus, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { CaseDocument, ExtractionStatus } from "@/lib/types";

const EXTRACTION_LABELS: Record<ExtractionStatus, string> = {
  pending: "Reading document…",
  done: "Facts extracted",
  no_facts_found: "No facts found",
  failed: "Extraction failed",
};

function extractionPill(status: ExtractionStatus) {
  switch (status) {
    case "done":
      return "pill pill-green";
    case "failed":
      return "pill pill-red";
    case "pending":
      return "pill pill-blue";
    default:
      return "pill pill-amber";
  }
}

function readableDocumentType(type: string) {
  return type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DocumentList({
  documents,
  caseId,
}: {
  documents: CaseDocument[];
  caseId?: string;
}) {
  return (
    <section className="card" style={{ padding: "26px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="label" style={{ color: "#0066f5" }}>Document Vault</span>
            <span className="pill pill-blue">Encrypted</span>
          </div>
          <h3 className="heading" style={{ fontSize: 20, margin: 0, color: "var(--paytm-navy)" }}>
            Case Documents
          </h3>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
            {documents.length} document{documents.length === 1 ? "" : "s"} uploaded &amp; processed
          </p>
        </div>

        <Link
          href={caseId ? `/upload?caseId=${encodeURIComponent(caseId)}` : "/upload"}
          className="btn btn-outline btn-sm"
          style={{ gap: 6 }}
        >
          <Plus size={15} />
          Add document
        </Link>
      </div>

      {documents.length === 0 ? (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: 14,
            border: "1px dashed #cbd5e1",
          }}
        >
          <FileText size={32} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
          <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            No documents uploaded yet
          </h4>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            Upload your health policy, hospital estimation bill, and admission advice.
          </p>
          <Link
            href={caseId ? `/upload?caseId=${encodeURIComponent(caseId)}` : "/upload"}
            className="btn btn-primary btn-sm"
          >
            Upload your first document
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {documents.map((doc) => {
            const isPdf = doc.file_name.toLowerCase().endsWith(".pdf");

            return (
              <article
                key={doc.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "16px 18px",
                  background: "#ffffff",
                  transition: "all 0.2s ease",
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
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isPdf ? "#fee2e2" : "#e0f2fe",
                        color: isPdf ? "#dc2626" : "#0284c7",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14.5,
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.file_name}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 3,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{readableDocumentType(doc.document_type)}</span>
                        {doc.page_count && <span>· {doc.page_count} pages</span>}
                        {doc.facts_count ? (
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            · {doc.facts_count} facts extracted
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <span className={extractionPill(doc.extraction_status)}>
                    {EXTRACTION_LABELS[doc.extraction_status]}
                  </span>
                </div>

                {doc.facts && doc.facts.length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "1px dashed #f1f5f9",
                      display: "grid",
                      gap: 6,
                      fontSize: 12.5,
                    }}
                  >
                    {doc.facts.map((fact) => (
                      <div
                        key={fact.fact_key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "#334155",
                        }}
                      >
                        <span style={{ color: "#64748b" }}>{fact.label}</span>
                        <strong style={{ color: "#0f172a" }}>{String(fact.value_json)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}