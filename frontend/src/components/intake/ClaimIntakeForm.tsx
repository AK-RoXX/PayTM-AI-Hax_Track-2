"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCase } from "@/lib/api";

export function ClaimIntakeForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [patientRelation, setPatientRelation] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [estimatedBill, setEstimatedBill] = useState("");
  const [language, setLanguage] = useState("english");
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

  return (
    <form onSubmit={submitClaim} className="grid" style={{ gap: 18 }}>
      <label className="col">
        <span className="label">Describe the situation</span>
        <textarea
          required
          maxLength={2000}
          rows={5}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Who is in hospital, and what support do you need?"
        />
      </label>

      <div className="grid two">
        <label className="col">
          <span className="label">Patient relation</span>
          <select
            required
            value={patientRelation}
            onChange={(event) => setPatientRelation(event.target.value)}
          >
            <option value="">Choose relation</option>
            <option value="self">Self</option>
            <option value="mother">Mother</option>
            <option value="father">Father</option>
            <option value="spouse">Spouse</option>
            <option value="child">Child</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="col">
          <span className="label">Preferred language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="hinglish">Hindi / Hinglish</option>
          </select>
        </label>

        <label className="col">
          <span className="label">Hospital</span>
          <input
            value={hospitalName}
            onChange={(event) => setHospitalName(event.target.value)}
            maxLength={160}
            placeholder="Hospital name"
          />
        </label>

        <label className="col">
          <span className="label">Estimated bill (optional)</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={estimatedBill}
            onChange={(event) => setEstimatedBill(event.target.value)}
            placeholder="₹"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="pill pill-red" style={{ padding: 12 }}>
          {error}
        </p>
      )}

      <div className="row-between" style={{ flexWrap: "wrap" }}>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          You can add or correct details later.
        </p>
        <button className="btn btn-amber" type="submit" disabled={submitting}>
          {submitting ? "Creating claim…" : "Create claim"}
          {!submitting && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
