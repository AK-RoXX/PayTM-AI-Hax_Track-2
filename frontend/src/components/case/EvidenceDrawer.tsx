"use client";

import { useState } from "react";
import type { Evidence } from "@/lib/types";

export function EvidenceDrawer({ items }: { items: Evidence[] }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <div className="label">Evidence</div>
          <b>Every number, traced to a page</b>
        </div>
        <button
          className="btn btn-soft btn-sm"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? `Hide ${items.length}` : `Show ${items.length}`}
        </button>
      </div>

      {!open ? null : items.length === 0 ? (
        <p className="muted" style={{ marginTop: 14, marginBottom: 0 }}>
          No evidence yet. It appears once we read a fact out of your documents.
        </p>
      ) : (
        <div style={{ marginTop: 14 }}>
          {items.map((item, index) => (
            <div
              className="evidence"
              key={`${item.claim}-${index}`}
              style={{ marginTop: 10 }}
            >
              <b>{item.claim}</b>
              <p className="muted" style={{ margin: "7px 0", fontSize: 12 }}>
                {item.document_name}
                {item.page_number ? ` · page ${item.page_number}` : ""}
                {item.section ? ` · ${item.section}` : ""}
              </p>
              <em>&ldquo;{item.quote}&rdquo;</em>
              <p className="muted" style={{ marginBottom: 0, fontSize: 12 }}>
                Evidence confidence: {Math.round(item.confidence * 100)}%
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}