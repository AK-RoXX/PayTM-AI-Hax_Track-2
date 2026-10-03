"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Send,
  Mic,
  Paperclip,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { askCase, type AskResponse } from "@/lib/api";
import type { Evidence } from "@/lib/types";
import { SahayakRobot } from "../common/SahayakRobot";

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp?: string;
  evidence?: Evidence[];
  abstained?: boolean;
  hasMoneyMap?: boolean;
  attachedDocs?: Array<{ name: string; type: "pdf" | "jpg" }>;
};

export function ClaimAssistant({ caseId }: { caseId: string }) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Initial messages demonstrating the authentic conversation from Screen 2 & 3 in Application UI.png
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "user",
      text: "Meri mummy hospital mein admit hain. Insurance hai but mujhe samajh nahi aa raha kitna cover hoga. Yeh documents hain. Hospital ₹80,000 maang raha hai. Mere paas abhi ₹30,000 hain. Kya karu?",
      timestamp: "10:24 AM",
      attachedDocs: [
        { name: "Policy Document.pdf", type: "pdf" },
        { name: "Hospital Bill.jpg", type: "jpg" },
        { name: "Discharge Summary.pdf", type: "pdf" },
      ],
    },
    {
      id: "msg-2",
      sender: "assistant",
      text: "I understand. I've reviewed your policy and hospital bill. Here's the clear breakdown of your coverage and financial gap:",
      timestamp: "10:25 AM",
      hasMoneyMap: true,
      evidence: [
        {
          claim: "Room rent restriction",
          document_name: "Policy Document.pdf",
          page_number: 18,
          quote: "Room rent shall be restricted to maximum of ₹5,000 per day...",
          confidence: 0.98,
        },
      ],
    },
  ]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setAsking(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const result = await askCase(caseId, trimmed, session.access_token);
        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: result.answer,
          timestamp: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          evidence: result.evidence,
          abstained: result.abstained,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Informative mock response when session is offline or local testing
        setTimeout(() => {
          const assistantMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            sender: "assistant",
            text: `Based on your policy document (Page 18), your base hospitalization is eligible up to ₹2,10,000. For the remaining ₹40,000 gap, you can check Paytm pre-approved personal loans or request an enhanced cashless authorization.`,
            timestamp: new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            evidence: [
              {
                claim: "Coverage eligibility",
                document_name: "Policy Document.pdf",
                page_number: 18,
                quote: "Standard cashless authorization applies to in-network hospital expenses.",
                confidence: 0.96,
              },
            ],
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }, 700);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not reach Sahayak assistant.",
      );
    } finally {
      setAsking(false);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    setTimeout(() => {
      setQuestion(
        "Kya room rent poora cover hoga ya mujhe extra dena padega?",
      );
      setIsListening(false);
    }, 1200);
  };

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Top Header matching Application UI.png */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SahayakRobot size="sm" online />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                Sahayak
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "#10b981",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#10b981",
                  }}
                />
                Online
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Natural conversation with AI financial assistant
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pill pill-blue hidden sm:inline-flex" style={{ fontSize: 11 }}>
            Hinglish / English
          </span>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div
        style={{
          padding: "20px",
          minHeight: 340,
          maxHeight: 520,
          overflowY: "auto",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                gap: 6,
                maxWidth: "85%",
                alignSelf: isUser ? "flex-end" : "flex-start",
              }}
            >
              {/* Bubble Container */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isUser ? "#e0f2fe" : "#ffffff",
                  color: isUser ? "#034870" : "#1e293b",
                  border: `1px solid ${isUser ? "#bae6fd" : "#e2e8f0"}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: 0 }}>{msg.text}</p>

                {/* Attached Document Chips in User Bubble */}
                {msg.attachedDocs && msg.attachedDocs.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "1px dashed #7dd3fc",
                    }}
                  >
                    {msg.attachedDocs.map((doc, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: doc.type === "pdf" ? "#fee2e2" : "#ffffff",
                          color: doc.type === "pdf" ? "#b91c1c" : "#0284c7",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        {doc.type === "pdf" ? <FileText size={13} /> : <ImageIcon size={13} />}
                        {doc.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline Money Map Card preview (from Screen 2 in Application UI.png) */}
                {msg.hasMoneyMap && (
                  <div
                    style={{
                      marginTop: 14,
                      background: "#f8fbff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 14,
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Money Map Preview
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                        Hospital Bill: ₹3,00,000
                      </span>
                    </div>

                    {/* Progress multi-color bar */}
                    <div style={{ height: 8, borderRadius: 4, display: "flex", overflow: "hidden", marginBottom: 10 }}>
                      <div style={{ width: "70%", background: "#10b981" }} title="70% Approved" />
                      <div style={{ width: "13%", background: "#f59e0b" }} title="13% Out of pocket" />
                      <div style={{ width: "17%", background: "#8b5cf6" }} title="17% Under assessment" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                      <div>
                        <div style={{ color: "#10b981", fontWeight: 700 }}>₹2,10,000</div>
                        <div style={{ color: "#64748b" }}>Approved</div>
                      </div>
                      <div>
                        <div style={{ color: "#f59e0b", fontWeight: 700 }}>₹40,000</div>
                        <div style={{ color: "#64748b" }}>Out-of-Pocket</div>
                      </div>
                      <div>
                        <div style={{ color: "#8b5cf6", fontWeight: 700 }}>₹50,000</div>
                        <div style={{ color: "#64748b" }}>Under Review</div>
                      </div>
                    </div>

                    <a
                      href="#money-map"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#0066f5",
                        marginTop: 10,
                      }}
                    >
                      View details <ArrowRight size={13} />
                    </a>
                  </div>
                )}

                {/* Evidence citations */}
                {msg.evidence && msg.evidence.length > 0 && !msg.abstained && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      background: "#f1f5f9",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#475569",
                      borderLeft: "3px solid #0066f5",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Source: </span>
                    {msg.evidence[0].document_name} · Page {msg.evidence[0].page_number}
                    <div style={{ fontStyle: "italic", marginTop: 2 }}>
                      &ldquo;{msg.evidence[0].quote}&rdquo;
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              {msg.timestamp && (
                <span style={{ fontSize: 11, color: "#94a3b8", padding: "0 4px" }}>
                  {msg.timestamp}
                </span>
              )}
            </div>
          );
        })}

        {asking && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13 }}>
            <SahayakRobot size="sm" animated />
            <span>Checking policy clauses and hospital bills…</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 16px",
          background: "#ffffff",
          borderTop: "1px solid #f1f5f9",
          overflowX: "auto",
        }}
      >
        {[
          "Check claim status",
          "Is room rent capped?",
          "How to cover ₹40,000 gap?",
          "Upload discharge summary",
        ].map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setQuestion(prompt)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input Bar matching Application UI.png */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "12px 16px",
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Attachment link */}
        <Link
          href={`/upload?caseId=${encodeURIComponent(caseId)}`}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#f8fafc",
            color: "#64748b",
            border: "1px solid #e2e8f0",
          }}
          title="Upload documents"
        >
          <Paperclip size={18} />
        </Link>

        {/* Input */}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            isListening
              ? "Listening to voice input in Hindi/English..."
              : "Type a message in Hindi, Hinglish, or English..."
          }
          disabled={asking || isListening}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 24,
            border: isListening ? "1.5px solid #00baf2" : "1px solid #e2e8f0",
            background: isListening ? "#f0fdfa" : "#f8fafc",
            fontSize: 14,
            outline: "none",
          }}
        />

        {/* Mic Button (Voice Input) */}
        <button
          type="button"
          onClick={handleVoiceInput}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: isListening ? "#00baf2" : "#f8fafc",
            color: isListening ? "#ffffff" : "#64748b",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          title="Voice input"
        >
          <Mic size={18} className={isListening ? "animate-pulse" : ""} />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={asking || !question.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#0066f5",
            color: "#ffffff",
            border: 0,
            cursor: asking || !question.trim() ? "not-allowed" : "pointer",
            opacity: asking || !question.trim() ? 0.6 : 1,
            boxShadow: "0 2px 8px rgba(0, 102, 245, 0.3)",
          }}
          aria-label="Send message"
        >
          <Send size={17} style={{ marginLeft: 2 }} />
        </button>
      </form>

      {error && (
        <div style={{ padding: "8px 16px", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}
    </section>
  );
}