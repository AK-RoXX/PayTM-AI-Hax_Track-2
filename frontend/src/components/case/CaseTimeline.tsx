"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Clock, Upload, ArrowRight } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";

function formatTimestamp(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CaseTimeline({
  events,
  caseId,
}: {
  events: TimelineEvent[];
  caseId?: string;
}) {
  // Display actual timeline events from the case state — no hardcoded fallbacks
  const displayEvents = events || [];

  if (displayEvents.length === 0) {
    return (
      <section className="card" style={{ padding: "26px" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="label" style={{ color: "#0066f5" }}>Claim Tracking</span>
            <span className="pill pill-blue">Live Status</span>
          </div>
          <h2 className="heading" style={{ fontSize: 22, margin: "2px 0 4px", color: "var(--paytm-navy)" }}>
            Claim Status
          </h2>
        </div>
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: 14,
            border: "1px dashed #cbd5e1",
          }}
        >
          <Clock size={28} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
            No activity yet
          </p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Upload documents or start a conversation to generate timeline events.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ padding: "26px" }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="label" style={{ color: "#0066f5" }}>Claim Tracking</span>
          <span className="pill pill-blue">Live Status</span>
        </div>
        <h2 className="heading" style={{ fontSize: 22, margin: "2px 0 4px", color: "var(--paytm-navy)" }}>
          Claim Status
        </h2>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          Real-time timeline and clear next steps
        </p>
      </div>

      {/* Stepper Timeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
        {displayEvents.map((event, idx) => {
          const isLast = idx === displayEvents.length - 1;
          const isComplete = event.status === "complete";
          const isAttention = event.status === "attention";
          const isCurrent = event.status === "current";
          const isPending = event.status === "pending";

          return (
            <div
              key={event.id || idx}
              style={{
                display: "flex",
                gap: 16,
                position: "relative",
                paddingBottom: isLast ? 8 : 24,
              }}
            >
              {/* Connecting line */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: 13,
                    top: 28,
                    bottom: 0,
                    width: 2,
                    background: isComplete ? "#10b981" : "#e2e8f0",
                  }}
                />
              )}

              {/* Status Icon */}
              <div style={{ flexShrink: 0, zIndex: 2 }}>
                {isComplete && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#10b981",
                      color: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 0 0 3px #dcfce7",
                    }}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  </div>
                )}
                {isAttention && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#f59e0b",
                      color: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 0 0 3px #fef3c7",
                    }}
                  >
                    <AlertCircle size={16} strokeWidth={2.5} />
                  </div>
                )}
                {isCurrent && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#0066f5",
                      color: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 0 0 4px #dbeafe",
                    }}
                  >
                    <Clock size={16} strokeWidth={2.5} />
                  </div>
                )}
                {isPending && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#f8fafc",
                      border: "2px solid #cbd5e1",
                      color: "#94a3b8",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#cbd5e1" }} />
                  </div>
                )}
              </div>

              {/* Event Content */}
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14.5,
                      color: isPending ? "#64748b" : "#0f172a",
                    }}
                  >
                    {event.title}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: isAttention ? "#b45309" : "#64748b",
                      fontWeight: isAttention ? 600 : 400,
                    }}
                  >
                    {event.occurred_at ? formatTimestamp(event.occurred_at) : ""}
                  </span>
                </div>
                {event.detail && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      margin: "3px 0 0",
                      lineHeight: 1.45,
                    }}
                  >
                    {event.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload prompt — only shown when there are pending/attention events */}
      {displayEvents.some((ev) => ev.status === "attention" || ev.status === "pending") && (
        <div
          style={{
            marginTop: 20,
            background: "#eff6ff",
            border: "1.5px solid #bfdbfe",
            borderRadius: 16,
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              fontSize: 13.5,
              color: "#1e3a8a",
              fontWeight: 500,
              margin: "0 0 14px",
              lineHeight: 1.5,
            }}
          >
            There are pending items that need your attention. Upload required documents to proceed.
          </p>

          <Link
            href={caseId ? `/upload?caseId=${encodeURIComponent(caseId)}` : "/upload"}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12 }}
          >
            <Upload size={16} />
            Submit Document
          </Link>
        </div>
      )}
    </section>
  );
}