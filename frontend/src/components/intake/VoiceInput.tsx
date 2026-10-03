"use client";

import React, { useState } from "react";
import { Mic, X, Sparkles } from "lucide-react";

export function VoiceInput({
  onTranscript,
}: {
  onTranscript: (value: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [listening, setListening] = useState(false);

  const startListening = () => {
    setModalOpen(true);
    setListening(true);

    setTimeout(() => {
      onTranscript(
        "Meri mummy hospital mein admit hain. Insurance hai but mujhe samajh nahi aa raha kitna cover hoga. Yeh documents hain. Hospital ₹80,000 maang raha hai. Mere paas abhi ₹30,000 hain. Kya karu?",
      );
      setListening(false);
      setModalOpen(false);
    }, 2400);
  };

  return (
    <>
      <button
        type="button"
        onClick={startListening}
        className="btn btn-soft"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 20,
          padding: "8px 16px",
          fontSize: 13,
        }}
      >
        <Mic size={16} />
        <span>Speak in Hindi or English</span>
      </button>

      {/* Screen 8: Voice Input Modal from Application UI.png */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 380,
              width: "100%",
              padding: "36px 24px",
              textAlign: "center",
              borderRadius: 24,
              boxShadow: "0 25px 60px rgba(0, 41, 112, 0.2)",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setListening(false);
                setModalOpen(false);
              }}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#f1f5f9",
                border: 0,
                color: "#64748b",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>

            <span className="label" style={{ color: "#0066f5", marginBottom: 20, display: "block" }}>
              Voice Input
            </span>

            {/* Audio Waveform visualization from Screen 8 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                height: 80,
                margin: "24px 0",
              }}
            >
              {[18, 38, 64, 48, 72, 34, 56, 40, 22].map((height, i) => (
                <span
                  key={i}
                  style={{
                    width: 5,
                    height: listening ? `${height}px` : "12px",
                    borderRadius: 4,
                    background: i % 2 === 0 ? "#00baf2" : "#0066f5",
                    transition: "height 0.2s ease-in-out",
                    animation: listening ? `pulse 1.2s infinite ease-in-out ${i * 0.1}s` : "none",
                  }}
                />
              ))}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
              {listening ? "Listening…" : "Voice Captured!"}
            </h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>
              Speak naturally in Hindi, English, or Hinglish.
            </p>

            <button
              type="button"
              onClick={() => {
                setListening(false);
                setModalOpen(false);
              }}
              className="btn btn-outline btn-sm"
              style={{ borderRadius: 20, padding: "8px 20px" }}
            >
              Tap to stop
            </button>
          </div>
        </div>
      )}
    </>
  );
}
