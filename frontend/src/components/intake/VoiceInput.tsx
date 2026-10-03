"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { transcribeAudio } from "@/lib/api";

const LANGUAGES = [
  { code: "auto", label: "Detect automatically" },
  { code: "as-IN", label: "Assamese" },
  { code: "bn-IN", label: "Bengali" },
  { code: "en-IN", label: "English" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "hi-IN", label: "Hindi" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "mr-IN", label: "Marathi" },
  { code: "od-IN", label: "Odia" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "ur-IN", label: "Urdu" },
];

export function VoiceInput({ onTranscript }: { onTranscript: (value: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [languageCode, setLanguageCode] = useState("auto");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Voice recording is not supported in this browser. You can type your claim below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stopTracks();
        setRecording(false);
        setMessage("Recording failed. Please try again or type your claim.");
      };
      recorder.onstop = async () => {
        stopTracks();
        setRecording(false);
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (!audio.size) {
          setMessage("No audio was captured. Please try again.");
          return;
        }
        setProcessing(true);
        try {
          const { data: { session } } = await createClient().auth.getSession();
          if (!session?.access_token) throw new Error("Your session has expired. Sign in again to transcribe audio.");
          const result = await transcribeAudio(audio, languageCode, session.access_token);
          onTranscript(result.transcript);
          setMessage("Transcript added. You can edit it before continuing.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Could not transcribe this recording. Please try again.");
        } finally {
          setProcessing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      // Sarvam's synchronous speech endpoint is intended for clips under 30 seconds.
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 28_000);
    } catch {
      stopTracks();
      setMessage("Microphone access was not available. Allow microphone access or type your claim.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <label style={{ fontSize: 12, color: "#475569" }}>
        Voice language
        <select
          value={languageCode}
          onChange={(event) => setLanguageCode(event.target.value)}
          disabled={recording || processing}
          aria-label="Spoken language"
          style={{ marginLeft: 6, padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}
        >
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>{language.label}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={processing}
        className="btn btn-soft"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 20, padding: "8px 16px", fontSize: 13 }}
      >
        {recording ? <Square size={15} /> : <Mic size={16} />}
        <span>{processing ? "Transcribing…" : recording ? "Stop recording" : "Speak in an Indian language"}</span>
      </button>
      {message && <span role="status" style={{ flexBasis: "100%", fontSize: 12, color: "#475569" }}>{message}</span>}
    </div>
  );
}
