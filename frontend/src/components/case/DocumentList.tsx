import Link from "next/link";
import { FileText, RotateCcw } from "lucide-react";
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

export function DocumentList({ documents }: { documents: CaseDocument[] }) {
  return (
    <section className="card">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <div className="label">Documents</div>
          <p className="muted" style={{ margin: "3px 0 0", fontSize: 13 }}>
            {documents.length} uploaded · processing status and extracted facts
          </p>
        </div>
        <Link
          href="/upload"
          className="btn btn-outline btn-sm"
          aria-label="Upload more documents"
        >
          <RotateCcw size={14} aria-hidden="true" />
          Add more
        </Link>
      </div>

      {documents.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No documents yet. Upload your policy, hospital bills and discharge
          summary so we can work out what is still missing.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {documents.map((document) => (
            <article
              key={document.id}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 14,
              }}
            >
              <div className="row-between" style={{ alignItems: "flex-start" }}>
                <span className="row" style={{ minWidth: 0, alignItems: "flex-start" }}>
                  <FileText
                    size={16}
                    style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }}
                    aria-hidden="true"
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      className="heading"
                      style={{
                        display: "block",
                        fontSize: 14,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {document.file_name}
                    </span>
                    <span
                      className="muted"
                      style={{ display: "block", fontSize: 12, marginTop: 2 }}
                    >
                      {readableDocumentType(document.document_type)}
                      {document.page_count ? ` · ${document.page_count} pages` : ""}
                      {document.processing_provider
                        ? ` · ${document.processing_provider}`
                        : ""}
                    </span>
                  </span>
                </span>
                <span className={extractionPill(document.extraction_status)}>
                  {EXTRACTION_LABELS[document.extraction_status]}
                </span>
              </div>

              {document.error_message && (
                <p
                  role="alert"
                  style={{
                    margin: "10px 0 0",
                    fontSize: 13,
                    color: "var(--red)",
                  }}
                >
                  {document.error_message}
                </p>
              )}

              {document.facts.length > 0 && (
                <dl
                  style={{
                    margin: "12px 0 0",
                    display: "grid",
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  {document.facts.map((fact) => (
                    <div key={fact.fact_key} className="row-between">
                      <dt className="muted">{fact.label}</dt>
                      <dd style={{ margin: 0, fontWeight: 600 }}>
                        {String(fact.value_json)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}