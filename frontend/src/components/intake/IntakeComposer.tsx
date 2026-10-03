"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VoiceInput } from "./VoiceInput";
import { createCase } from "@/lib/api";
export function IntakeComposer() {
  const [message, setMessage] = useState(
    "My mother is hospitalized. The bill is ₹3 lakh. I have insurance but I do not know what is covered.",
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const submit = async () => {
    setLoading(true);
    const c = await createCase(message);
    router.push(`/case/${c.id}`);
  };
  return (
    <section className="card">
      <div className="label">Describe what happened</div>
      <textarea
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ marginTop: 10 }}
      />
      <div className="grid two" style={{ marginTop: 12 }}>
        <VoiceInput onTranscript={setMessage} />
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Creating case…" : "Create my case"}
        </button>
      </div>
    </section>
  );
}
