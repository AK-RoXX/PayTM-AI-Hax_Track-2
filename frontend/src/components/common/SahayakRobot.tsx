import React from "react";

interface SahayakRobotProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  online?: boolean;
  animated?: boolean;
  className?: string;
}

export function SahayakRobot({
  size = "md",
  online = false,
  animated = false,
  className = "",
}: SahayakRobotProps) {
  const pixelSize =
    typeof size === "number"
      ? size
      : {
          sm: 36,
          md: 60,
          lg: 130,
          xl: 190,
        }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${
        animated ? "anim-float" : ""
      } ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 160 160"
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Head gradients */}
          <linearGradient id="headGrad" x1="40" y1="20" x2="120" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e8f3fe" />
            <stop offset="100%" stopColor="#c5e3fb" />
          </linearGradient>

          {/* Screen Visor Gradient */}
          <linearGradient id="visorGrad" x1="50" y1="42" x2="110" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#002660" />
            <stop offset="100%" stopColor="#00183d" />
          </linearGradient>

          {/* Body gradient */}
          <linearGradient id="bodyGrad" x1="55" y1="100" x2="105" y2="148" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e2f0fc" />
            <stop offset="100%" stopColor="#bde1fa" />
          </linearGradient>

          {/* Cyan Glow / Accents */}
          <linearGradient id="cyanAccent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38d4ff" />
            <stop offset="100%" stopColor="#00baf2" />
          </linearGradient>

          {/* Soft Shadow Filter */}
          <filter id="botShadow" x="-20%" y="-10%" width="140%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#002970" floodOpacity="0.12" />
          </filter>
        </defs>

        <g filter="url(#botShadow)">
          {/* Antenna */}
          <path d="M80 32 V18" stroke="#00baf2" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="14" r="6" fill="#00baf2" />
          <circle cx="80" cy="14" r="2.5" fill="#ffffff" />

          {/* Earphones / Side Pods */}
          {/* Left Ear */}
          <rect x="28" y="46" width="10" height="26" rx="5" fill="#002970" />
          <rect x="30" y="49" width="6" height="20" rx="3" fill="#00baf2" />
          {/* Right Ear */}
          <rect x="122" y="46" width="10" height="26" rx="5" fill="#002970" />
          <rect x="124" y="49" width="6" height="20" rx="3" fill="#00baf2" />

          {/* Ear Bridge/Band */}
          <path
            d="M34 52 C34 26 126 26 126 52"
            stroke="#c8e4fa"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Floating Hands */}
          {/* Left Hand */}
          <circle cx="34" cy="116" r="10" fill="url(#bodyGrad)" stroke="#c5e3fb" strokeWidth="2" />
          <circle cx="34" cy="116" r="4" fill="#00baf2" opacity="0.8" />
          {/* Right Hand (Waving) */}
          <circle cx="126" cy="108" r="10" fill="url(#bodyGrad)" stroke="#c5e3fb" strokeWidth="2" />
          <circle cx="126" cy="108" r="4" fill="#00baf2" opacity="0.8" />

          {/* Robot Body */}
          <path
            d="M58 102 C58 98 102 98 102 102 L108 132 C108 142 96 148 80 148 C64 148 52 142 52 132 Z"
            fill="url(#bodyGrad)"
            stroke="#d4ebfc"
            strokeWidth="2.5"
          />
          {/* Body Center Badge */}
          <rect x="70" y="112" width="20" height="14" rx="7" fill="#002970" />
          <circle cx="77" cy="119" r="2.5" fill="#00baf2" />
          <circle cx="83" cy="119" r="2.5" fill="#00baf2" />

          {/* Robot Head (Round pill) */}
          <rect
            x="36"
            y="26"
            width="88"
            height="68"
            rx="30"
            fill="url(#headGrad)"
            stroke="#c5e3fb"
            strokeWidth="2.5"
          />

          {/* Visor Screen */}
          <rect
            x="48"
            y="38"
            width="64"
            height="44"
            rx="18"
            fill="url(#visorGrad)"
          />

          {/* Visor Reflection Gloss */}
          <path
            d="M56 44 C66 41 84 41 94 43 C91 47 70 48 58 48 Z"
            fill="#ffffff"
            opacity="0.25"
          />

          {/* Glowing Eyes */}
          {/* Left Eye */}
          <ellipse cx="66" cy="58" rx="6" ry="8" fill="#00baf2" />
          <circle cx="68" cy="55" r="2.5" fill="#ffffff" />
          <circle cx="64" cy="62" r="1" fill="#ffffff" />

          {/* Right Eye */}
          <ellipse cx="94" cy="58" rx="6" ry="8" fill="#00baf2" />
          <circle cx="96" cy="55" r="2.5" fill="#ffffff" />
          <circle cx="92" cy="62" r="1" fill="#ffffff" />

          {/* Cute Smiling Mouth */}
          <path
            d="M74 68 Q80 74 86 68"
            stroke="#00baf2"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cute Cheeks */}
          <ellipse cx="58" cy="66" rx="3.5" ry="2" fill="#38d4ff" opacity="0.6" />
          <ellipse cx="102" cy="66" rx="3.5" ry="2" fill="#38d4ff" opacity="0.6" />
        </g>
      </svg>

      {/* Online indicator */}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500"
          style={{
            width: Math.max(10, pixelSize * 0.22),
            height: Math.max(10, pixelSize * 0.22),
            boxShadow: "0 0 0 2px #fff",
          }}
          title="Sahayak Online"
        />
      )}
    </div>
  );
}
