"use client";
import { useState } from "react";
export function VoiceInput({
  onTranscript,
}: {
  onTranscript: (value: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-soft"
      onClick={() => {
        setRecording(!recording);
        if (!recording)
          setTimeout(() => {
            onTranscript(
              "Mummy ko hospital mein admit kiya hai. Bill teen lakh ka hai. Policy hai but claim samajh nahi aa raha.",
            );
            setRecording(false);
          }, 900);
      }}
    >
      {recording ? "Listening…" : "🎙 Try voice input"}
    </button>
  );
}
