import type { ExtractedFact } from "@/lib/types";

function renderValue(fact: ExtractedFact): string {
  const value = fact.value_json;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "Not found";
  if (fact.value_type === "money") {
    return `INR ${Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  }
  return String(value);
}

const STATUS_LABELS: Record<string, string> = {
  extracted: "Extracted",
  verified: "Verified",
  needs_review: "Check this",
  conflict: "Conflict",
};

function statusPill(status: string) {
  if (status === "verified") return "pill pill-green";
  if (status === "conflict") return "pill pill-red";
  if (status === "needs_review") return "pill pill-amber";
  return "pill pill-cream";
}

export function ExtractedFacts({ facts }: { facts: ExtractedFact[] }) {
  if (facts.length === 0) {
    return (
      <section className="card">
        <div className="label" style={{ marginBottom: 10 }}>
          Facts we read
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Nothing has been read from your documents yet. Every fact below will
          show the page it came from, so you can check it against your original.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="label" style={{ marginBottom: 4 }}>
        Facts we read
      </div>
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
        Extracted from your uploads. Check any flagged against your original.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {facts.map((fact) => (
          <article
            key={`${fact.document_id ?? "case"}-${fact.fact_key}`}
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
            }}
          >
            <div className="row-between" style={{ alignItems: "flex-start" }}>
              <span className="heading" style={{ fontSize: 14 }}>
                {fact.label}
              </span>
              <span className={statusPill(fact.verification_status)}>
                {STATUS_LABELS[fact.verification_status] ?? fact.verification_status}
              </span>
            </div>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--navy)",
              }}
            >
              {renderValue(fact)}
            </p>

            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
              {fact.document_name || "Uploaded document"}
              {fact.source_page ? ` · page ${fact.source_page}` : ""} ·{" "}
              {Math.round(fact.confidence * 100)}% confidence
            </p>

            {fact.source_quote && (
              <blockquote
                className="evidence"
                style={{ margin: "10px 0 0", fontSize: 13 }}
              >
                {fact.source_quote}
              </blockquote>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}