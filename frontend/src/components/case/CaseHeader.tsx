import type { CaseData } from "@/lib/types";

function readableStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const RELATION_LABELS: Record<string, string> = {
  self: "You",
  mother: "Mother",
  father: "Father",
  spouse: "Spouse",
  child: "Child",
  other: "Someone else",
};

export function CaseHeader({ data }: { data: CaseData }) {
  const relation = RELATION_LABELS[data.patient_relation] ?? data.patient_relation;
  const failedDocuments = data.documents.filter(
    (document) => document.processing_status === "failed",
  ).length;

  return (
    <section className="card">
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="label">Medical claim</div>
          <h1 style={{ margin: "6px 0" }}>{data.case_code ?? data.id}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {relation}
            {data.hospital_name ? ` · ${data.hospital_name}` : ""}
          </p>
        </div>
        <span className="row" style={{ gap: 6, flexShrink: 0 }}>
          {failedDocuments > 0 && (
            <span className="pill pill-red">
              {failedDocuments} document{failedDocuments === 1 ? "" : "s"} failed
            </span>
          )}
          <span className="pill pill-blue">{readableStatus(data.status)}</span>
        </span>
      </div>
    </section>
  );
}