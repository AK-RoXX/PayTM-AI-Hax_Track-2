import React from "react";
import Link from "next/link";

interface PaytmLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  subtitleText?: string;
  href?: string;
  className?: string;
}

export function PaytmLogo({
  size = "md",
  showSubtitle = true,
  subtitleText = "AI Financial Journey Assistant",
  href,
  className = "",
}: PaytmLogoProps) {
  const fontSizes = {
    sm: { paytm: "17px", sahayak: "16px", sub: "10px", gap: "6px" },
    md: { paytm: "21px", sahayak: "20px", sub: "11px", gap: "8px" },
    lg: { paytm: "28px", sahayak: "26px", sub: "13px", gap: "10px" },
  };

  const current = fontSizes[size];

  const content = (
    <div
      className={`inline-flex flex-col ${className}`}
      style={{ lineHeight: 1.15 }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: current.gap,
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}
      >
        {/* Official Paytm Wordmark */}
        <span style={{ display: "inline-flex", alignItems: "baseline" }}>
          <span
            style={{
              color: "#00baf2",
              fontSize: current.paytm,
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "-0.04em",
            }}
          >
            pay
          </span>
          <span
            style={{
              color: "#002970",
              fontSize: current.paytm,
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "-0.04em",
            }}
          >
            tm
          </span>
        </span>

        {/* Sahayak Brand Name */}
        <span
          style={{
            color: "#0f172a",
            fontSize: current.sahayak,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Sahayak
        </span>
      </div>

      {showSubtitle && (
        <span
          style={{
            fontSize: current.sub,
            color: "#64748b",
            fontWeight: 500,
            letterSpacing: "0.01em",
            marginTop: 3,
          }}
        >
          {subtitleText}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none" }}>
        {content}
      </Link>
    );
  }

  return content;
}
