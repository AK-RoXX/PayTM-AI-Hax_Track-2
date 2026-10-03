import React from "react";
import { Sparkles, FileText, Lock, Layers } from "lucide-react";
import { PaytmLogo } from "./PaytmLogo";

export function EcosystemFooter() {
  const pillars = [
    {
      icon: Sparkles,
      title: "Powered by AI",
      desc: "(Gemini + RAG)",
    },
    {
      icon: FileText,
      title: "Uses your documents",
      desc: "(PDF, images, voice, chat)",
    },
    {
      icon: Lock,
      title: "Secure & private",
      desc: "(Your data, your control)",
    },
    {
      icon: Layers,
      title: "Connected to Paytm ecosystem",
      desc: "(Insurance | Lending | Payments | Credit)",
    },
  ];

  return (
    <footer
      style={{
        background: "#ffffff",
        borderTop: "1px solid var(--border)",
        padding: "24px 20px",
        marginTop: "auto",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PaytmLogo size="md" subtitleText="AI for your financial journeys" />
        </div>

        {/* 4 Pillars */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 22,
          }}
        >
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--primary-blue-light)",
                    color: "var(--primary-blue)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Tagline */}
        <div
          style={{
            textAlign: "right",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 13.5,
            color: "var(--primary-blue)",
            lineHeight: 1.35,
          }}
        >
          Real problems. Real people.
          <br />
          <span style={{ color: "var(--paytm-navy)" }}>Real solutions.</span>
        </div>
      </div>
    </footer>
  );
}
