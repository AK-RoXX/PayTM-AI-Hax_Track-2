"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Hospital, User, FileText, Edit3, X, Check, IndianRupee } from "lucide-react";
import type { CaseData } from "@/lib/types";
import { updateCase } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

function readableStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const RELATION_LABELS: Record<string, string> = {
  self: "Self (You)",
  mother: "Mother",
  father: "Father",
  spouse: "Spouse",
  child: "Child",
  other: "Family Member",
};

export function CaseHeader({ data }: { data: CaseData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [hospitalName, setHospitalName] = useState(data.hospital_name || "");
  const [patientRelation, setPatientRelation] = useState(data.patient_relation || "self");
  const [estimatedBill, setEstimatedBill] = useState(
    data.financial_map?.hospital_estimate ? String(data.financial_map.hospital_estimate) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const relation = RELATION_LABELS[data.patient_relation] ?? data.patient_relation;
  const failedDocuments = data.documents.filter(
    (document) => document.processing_status === "failed",
  ).length;

  const currentBill = data.financial_map?.hospital_estimate || 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const billNum = estimatedBill.trim() ? Number(estimatedBill) : null;
      if (billNum !== null && (!Number.isFinite(billNum) || billNum < 0)) {
        setError("Please enter a valid bill amount.");
        setSaving(false);
        return;
      }

      await updateCase(
        data.id,
        {
          hospital_name: hospitalName.trim() || null,
          patient_relation: patientRelation,
          estimated_bill: billNum,
        },
        session?.access_token
      );

      setSuccessMsg("Claim updated successfully!");
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg("");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update claim details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="card" style={{ padding: "24px 26px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="label" style={{ color: "#0066f5" }}>Health Insurance Case</span>
              <span className="pill pill-blue">Active Case</span>
            </div>

            <h1
              className="heading"
              style={{
                fontSize: 26,
                margin: "2px 0 8px",
                color: "var(--paytm-navy)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span>{data.case_code || data.id}</span>
            </h1>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
                color: "#475569",
                fontSize: 13.5,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <User size={15} style={{ color: "#64748b" }} />
                Patient: <strong>{relation}</strong>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Hospital size={15} style={{ color: "#64748b" }} />
                Hospital: <strong>{data.hospital_name || "Not specified"}</strong>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IndianRupee size={15} style={{ color: "#64748b" }} />
                Total Bill:{" "}
                <strong>
                  {currentBill > 0
                    ? `₹${currentBill.toLocaleString("en-IN")}`
                    : "Not entered"}
                </strong>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileText size={15} style={{ color: "#64748b" }} />
                Documents: <strong>{data.documents.length} uploaded</strong>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              id="edit-claim-details-btn"
              onClick={() => {
                setHospitalName(data.hospital_name || "");
                setPatientRelation(data.patient_relation || "self");
                setEstimatedBill(currentBill ? String(currentBill) : "");
                setError("");
                setSuccessMsg("");
                setIsEditing(true);
              }}
              className="btn btn-outline"
              style={{
                fontSize: 13,
                padding: "7px 14px",
                borderRadius: 12,
                gap: 6,
                borderColor: "#0066f5",
                color: "#0066f5",
                fontWeight: 600,
                background: "#f0f7ff",
              }}
            >
              <Edit3 size={14} />
              Edit Claim Details
            </button>

            {failedDocuments > 0 && (
              <span className="pill pill-red">
                {failedDocuments} document failed
              </span>
            )}
            <span className="pill pill-green" style={{ fontSize: 13, padding: "6px 12px" }}>
              <ShieldCheck size={14} />
              {readableStatus(data.status)}
            </span>
          </div>
        </div>
      </section>

      {/* Edit Claim Modal */}
      {isEditing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditing(false);
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 520,
              width: "100%",
              padding: "28px 26px",
              boxShadow: "0 20px 45px rgba(0,0,0,0.2)",
              borderRadius: 20,
              background: "#ffffff",
              position: "relative",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div>
                <span className="label" style={{ color: "#0066f5" }}>
                  Claim Management
                </span>
                <h3
                  className="heading"
                  style={{
                    fontSize: 20,
                    margin: "2px 0 0",
                    color: "var(--paytm-navy)",
                  }}
                >
                  Edit Claim Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  border: 0,
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Estimated Total Bill */}
              <div>
                <label
                  htmlFor="edit-total-bill"
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 6,
                  }}
                >
                  Total Estimated Bill Amount (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    id="edit-total-bill"
                    type="number"
                    min="0"
                    step="1"
                    value={estimatedBill}
                    onChange={(e) => setEstimatedBill(e.target.value)}
                    placeholder="e.g. 350000"
                    style={{
                      width: "100%",
                      padding: "11px 14px 11px 32px",
                      borderRadius: 12,
                      border: "1.5px solid #cbd5e1",
                      fontSize: 14.5,
                      fontWeight: 600,
                    }}
                  />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                  Updating the total bill recalculates your Paytm Money Map and out-of-pocket gap immediately.
                </p>
              </div>

              {/* Hospital Name */}
              <div>
                <label
                  htmlFor="edit-hospital-name"
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 6,
                  }}
                >
                  Hospital Name
                </label>
                <input
                  id="edit-hospital-name"
                  type="text"
                  maxLength={160}
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. Apollo Hospital, Max Healthcare"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Patient Relation */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 6,
                  }}
                >
                  Patient Relation
                </label>
                <select
                  value={patientRelation}
                  onChange={(e) => setPatientRelation(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 14,
                    background: "#ffffff",
                  }}
                >
                  <option value="self">Self (You)</option>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="other">Family Member</option>
                </select>
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#ecfdf5",
                    color: "#059669",
                    borderRadius: 10,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  <Check size={16} />
                  {successMsg}
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  style={{ borderRadius: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-claim-details-btn"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ borderRadius: 12, minWidth: 130 }}
                >
                  {saving ? "Saving Changes…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}