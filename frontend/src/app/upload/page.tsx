"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { EcosystemFooter } from "@/components/common/EcosystemFooter";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface FileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  errorMessage?: string;
}

interface CaseOption {
  id: string;
  hospital_name: string | null;
}

interface ExistingDocument {
  id: string;
  file_name: string;
  processing_status: string;
  page_count: number | null;
  error_message: string | null;
  facts_count?: number;
}

const ACCEPTED_EXTS = ".pdf,.jpg,.jpeg,.png,.webp,.docx";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string>("Rahul Sharma");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRefs = useRef<Map<string, File>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const loadCases = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setGlobalError("You must be signed in to upload.");
          setLoadingCases(false);
        }
        return;
      }

      setUserEmail(user.email);
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Rahul Sharma");

      const { data, error } = await supabase
        .from("cases")
        .select("id, hospital_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) setGlobalError("Could not load your cases. Please try again.");
      const userCases = data ?? [];
      setCases(userCases);

      const requestedCaseId = new URLSearchParams(window.location.search).get("caseId");
      setSelectedCaseId(
        userCases.some((c) => c.id === requestedCaseId)
          ? requestedCaseId!
          : userCases[0]?.id ?? "",
      );
      setLoadingCases(false);
    };

    void loadCases();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDocuments = async () => {
      setExistingDocuments([]);
      if (!selectedCaseId) return;

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      try {
        const response = await fetch(
          `${apiUrl}/api/v1/cases/${encodeURIComponent(selectedCaseId)}/documents`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled) setExistingDocuments(result.items ?? []);
      } catch {
        // Fallback silently if offline
      }
    };

    void loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [selectedCaseId]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: FileEntry[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setGlobalError(`File "${file.name}" exceeds the 20 MB limit.`);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      fileRefs.current.set(id, file);
      newEntries.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "idle",
      });
    }
    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const setStatus = (id: string, update: Partial<FileEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...update } : e)),
    );
  };

  const uploadAll = async () => {
    if (!selectedCaseId || uploading) return;
    setUploading(true);
    setGlobalError("");

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setGlobalError("You must be logged in to upload.");
      setUploading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    for (const entry of entries) {
      if (entry.status === "done") continue;
      const fileObj = fileRefs.current.get(entry.id);
      if (!fileObj) continue;

      setStatus(entry.id, { status: "uploading" });

      try {
        const formData = new FormData();
        formData.append("file", fileObj, entry.name);
        const res = await fetch(
          `${apiUrl}/api/v1/cases/${encodeURIComponent(selectedCaseId)}/documents`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? `Server error ${res.status}`);
        }

        const result = await res.json();
        setStatus(entry.id, { status: "done" });
        setExistingDocuments((prev) => [
          {
            id: result.id,
            file_name: result.filename,
            processing_status: "done",
            page_count: result.page_count,
            error_message: null,
            facts_count: result.facts_count ?? 0,
          },
          ...prev,
        ]);
      } catch (err: unknown) {
        setStatus(entry.id, {
          status: "error",
          errorMessage:
            err instanceof Error ? err.message : "Document processing failed.",
        });
      }
    }

    setUploading(false);
  };

  const doneCount = entries.filter((e) => e.status === "done").length;
  const pendingCount = entries.filter(
    (e) => e.status === "idle" || e.status === "error",
  ).length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <AppSidebar currentCaseId={selectedCaseId} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppNavbar userName={userName} userEmail={userEmail} />

        <main style={{ padding: "30px 20px 70px", maxWidth: 960, width: "100%", margin: "0 auto" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
              Upload Documents
            </span>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="label" style={{ color: "#0066f5" }}>Document Vault</span>
              <span className="pill pill-blue">AI-Powered OCR</span>
            </div>
            <h1 className="heading" style={{ fontSize: 26, margin: "2px 0 6px", color: "var(--paytm-navy)" }}>
              Upload Case Documents
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Upload your insurance policy, hospital estimate, admission card, and final bills. Paytm Sahayak extracts clauses, room rent caps, and non-payables.
            </p>
          </div>

          {/* Case Selector Card */}
          <div className="card" style={{ padding: "18px 20px", marginBottom: 20 }}>
            <label
              htmlFor="case-select"
              style={{
                display: "block",
                marginBottom: 8,
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Select Medical Claim Case:
            </label>
            <select
              id="case-select"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              disabled={loadingCases || cases.length === 0 || uploading}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 500,
              }}
            >
              {loadingCases && <option value="">Loading your claims…</option>}
              {!loadingCases && cases.length === 0 && (
                <option value="">No claims found — Create a claim first</option>
              )}
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.hospital_name || "Medical Claim"} · Case #{c.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            id="upload-dropzone"
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? "#0066f5" : "#cbd5e1"}`,
              borderRadius: 20,
              padding: "48px 32px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "#eff6ff" : "#ffffff",
              transition: "all 0.2s ease",
              marginBottom: 24,
              boxShadow: "0 2px 10px rgba(0, 41, 112, 0.03)",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#e0f2fe",
                color: "#0066f5",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Upload size={28} />
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
              {dragOver ? "Drop your documents here" : "Click to upload or drag & drop"}
            </h3>
            <p style={{ color: "#64748b", fontSize: 13.5, margin: "0 0 16px" }}>
              Supports PDF, JPG, PNG, WEBP, and DOCX (Max 20 MB per file)
            </p>

            <span className="btn btn-primary btn-sm" style={{ pointerEvents: "none", borderRadius: 20 }}>
              Browse Files
            </span>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTS}
              onChange={onInputChange}
              style={{ display: "none" }}
              aria-label="Select files to upload"
            />
          </div>

          {globalError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 13,
                color: "#b91c1c",
              }}
            >
              ⚠️ {globalError}
            </div>
          )}

          {/* Files Queued for Upload */}
          {entries.length > 0 && (
            <div className="card" style={{ padding: "22px", marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
                  {entries.length} file{entries.length !== 1 ? "s" : ""} selected
                  {doneCount > 0 && (
                    <span style={{ color: "#10b981", marginLeft: 8, fontSize: 13 }}>
                      · {doneCount} processed ✓
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    entries.forEach((e) => fileRefs.current.delete(e.id));
                    setEntries([]);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ color: "#ef4444", fontSize: 12 }}
                >
                  Clear all
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {entries.map((e) => {
                  const isPdf = e.name.toLowerCase().endsWith(".pdf");

                  return (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: e.status === "done" ? "#ecfdf5" : "#f8fafc",
                        border: `1px solid ${e.status === "done" ? "#a7f3d0" : "#e2e8f0"}`,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: isPdf ? "#fee2e2" : "#e0f2fe",
                          color: isPdf ? "#dc2626" : "#0284c7",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>
                          {e.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>
                          {formatBytes(e.size)}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {e.status === "done" && (
                          <span className="pill pill-green" style={{ fontSize: 11 }}>
                            ✓ Processed
                          </span>
                        )}
                        {e.status === "uploading" && (
                          <span className="pill pill-blue" style={{ fontSize: 11 }}>
                            Uploading…
                          </span>
                        )}
                        {e.status === "idle" && (
                          <span className="pill pill-slate" style={{ fontSize: 11 }}>
                            Ready
                          </span>
                        )}
                        {e.status === "error" && (
                          <span className="pill pill-red" style={{ fontSize: 11 }}>
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={uploadAll}
                  disabled={uploading || !selectedCaseId}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    marginTop: 18,
                    padding: "12px",
                    borderRadius: 12,
                    fontSize: 14.5,
                  }}
                >
                  {uploading
                    ? "⏳ Processing documents with AI…"
                    : `Upload & Process ${pendingCount} Document${pendingCount !== 1 ? "s" : ""} →`}
                </button>
              )}

              {doneCount === entries.length && entries.length > 0 && (
                <div style={{ marginTop: 18, textAlign: "center" }}>
                  <Link
                    href={`/case/${encodeURIComponent(selectedCaseId)}`}
                    className="btn btn-primary"
                  >
                    View Updated Case Money Map →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Already Processed Documents */}
          {existingDocuments.length > 0 && (
            <div className="card" style={{ padding: "20px 22px" }}>
              <h3 className="heading" style={{ fontSize: 16, margin: "0 0 14px", color: "var(--paytm-navy)" }}>
                Processed Case Documents ({existingDocuments.length})
              </h3>
              <div style={{ display: "grid", gap: 8 }}>
                {existingDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>{doc.file_name}</span>
                    <span style={{ color: "#059669", fontSize: 12 }}>
                      {doc.page_count ? `${doc.page_count} pages` : "Analyzed"} ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <EcosystemFooter />
      </div>
    </div>
  );
}
