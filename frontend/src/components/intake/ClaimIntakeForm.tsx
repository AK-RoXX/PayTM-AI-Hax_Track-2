"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, User, Hospital, FileText, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCase } from "@/lib/api";
import { VoiceInput } from "./VoiceInput";

export function ClaimIntakeForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [patientRelation, setPatientRelation] = useState("self");
  const [hospitalName, setHospitalName] = useState("");
  const [estimatedBill, setEstimatedBill] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your session has expired. Sign in again to continue.");
        return;
      }

      const bill = estimatedBill.trim() ? Number(estimatedBill) : null;
      if (bill !== null && (!Number.isFinite(bill) || bill < 0)) {
        setError("Enter a valid estimated bill amount.");
        return;
      }

      const newCase = await createCase(
        {
          message: description.trim(),
          language,
          patient_relation: patientRelation || null,
          hospital_name: hospitalName.trim() || null,
          estimated_bill: bill,
        },
        session.access_token,
      );

      router.push(`/upload?caseId=${encodeURIComponent(newCase.id)}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't create your claim. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const relations = [
    { value: "self", label: "Self" },
    { value: "mother", label: "Mother" },
    { value: "father", label: "Father" },
    { value: "spouse", label: "Spouse" },
    { value: "child", label: "Child" },
    { value: "other", label: "Other" },
  ];

  return (
    <form onSubmit={submitClaim} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Voice Prompt Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, color: "#1e40af", fontWeight: 500 }}>
          💡 Don&apos;t want to type? Tap to describe your hospital emergency by voice:
        </span>
        <VoiceInput onTranscript={(val) => setDescription(val)} />
      </div>

      {/* Description Textarea */}
      <div>
        <label
          htmlFor="description"
          style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}
        >
          Describe the hospitalization situation
        </label>
        <textarea
          id="description"
          required
          maxLength={2000}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. Mummy ko hospital mein admit kiya hai. Bill ₹3,00,000 ka estimate hai. Policy number XYZ hai..."
          style={{
            borderRadius: 12,
            border: "1.5px solid #cbd5e1",
            padding: "12px 14px",
            fontSize: 14,
            background: "#ffffff",
          }}
        />
      </div>

      {/* Patient Relation Pills */}
      <div>
        <label style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          Patient Relation:
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {relations.map((rel) => (
            <button
              key={rel.value}
              type="button"
              onClick={() => setPatientRelation(rel.value)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "1.5px solid",
                borderColor: patientRelation === rel.value ? "#0066f5" : "#cbd5e1",
                background: patientRelation === rel.value ? "#eff6ff" : "#ffffff",
                color: patientRelation === rel.value ? "#0066f5" : "#475569",
                transition: "all 0.15s ease",
              }}
            >
              {patientRelation === rel.value && "✓ "}
              {rel.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hospital Name & Estimated Bill */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div>
          <label
            htmlFor="hospital-name"
            style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}
          >
            Hospital Name
          </label>
          <input
            id="hospital-name"
            value={hospitalName}
            onChange={(event) => setHospitalName(event.target.value)}
            maxLength={160}
            placeholder="e.g. Apollo Hospital, Max Healthcare"
            style={{
              borderRadius: 12,
              border: "1.5px solid #cbd5e1",
              padding: "11px 14px",
              background: "#ffffff",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="estimated-bill"
            style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}
          >
            Estimated Hospital Bill (Optional)
          </label>
          <input
            id="estimated-bill"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={estimatedBill}
            onChange={(event) => setEstimatedBill(event.target.value)}
            placeholder="₹ 3,00,000"
            style={{
              borderRadius: 12,
              border: "1.5px solid #cbd5e1",
              padding: "11px 14px",
              background: "#ffffff",
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#b91c1c", borderRadius: 10, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginTop: 8 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>
          Next: Upload your insurance policy and hospital bills for AI reading.
        </p>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={submitting}
          style={{ borderRadius: 14, gap: 8 }}
        >
          {submitting ? "Creating Claim Case…" : "Continue to Document Upload"}
          {!submitting && <ArrowRight size={17} />}
        </button>
      </div>
    </form>
  );
}
