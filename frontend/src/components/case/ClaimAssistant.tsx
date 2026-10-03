"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { askCase, type AskResponse } from "@/lib/api";
import type { Evidence } from "@/lib/types";

type Turn = AskResponse & { question: string };

export function ClaimAssistant({ caseId }: { caseId: string }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  const ask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setAsking(true);
    setError("");
    setQuestion("");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your session expired. Sign in again.");
        return;
      }
      const result = await askCase(caseId, trimmed, session.access_token);
      setTurns((previous) => [...previous, { ...result, question: trimmed }]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not reach the assistant.",
      );
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="card">
      <div className="label" style={{ marginBottom: 4 }}>
        Ask about this claim
      </div>
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
        Answers come only from your uploaded documents, with the page they were
        read from. If we cannot verify something, we say so.
      </p>

      {turns.map((turn, index) => (
        <div
          key={`${turn.question}-${index}`}
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <p className="heading" style={{ margin: 0, fontSize: 13 }}>
            {turn.question}
          </p>
          <p style={{ margin: "6px 0 0" }}>{turn.answer}</p>
          <AnswerEvidence evidence={turn.evidence} abstained={turn.abstained} />
        </div>
      ))}

      <form onSubmit={ask} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <label className="col">
          <span className="sr-only">Your question</span>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Is my room rent covered?"
            maxLength={500}
            disabled={asking}
          />
        </label>
        <button
          type="submit"
          className="btn btn-amber"
          disabled={asking || !question.trim()}
        >
          {asking ? "Checking your documents…" : "Ask"}
        </button>
      </form>

      {error && (
        <p role="alert" className="pill pill-red" style={{ marginTop: 12, padding: 12 }}>
          {error}
        </p>
      )}
    </section>
  );
}

function AnswerEvidence({
  evidence,
  abstained,
}: {
  evidence: Evidence[];
  abstained: boolean;
}) {
  if (abstained || evidence.length === 0) return null;
  return (
    <div className="evidence" style={{ marginTop: 10 }}>
      {evidence.map((item, index) => (
        <div key={`${item.quote}-${index}`}>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            {item.document_name}
            {item.page_number ? ` · page ${item.page_number}` : ""}
          </p>
          <em>&ldquo;{item.quote}&rdquo;</em>
        </div>
      ))}
    </div>
  );
}