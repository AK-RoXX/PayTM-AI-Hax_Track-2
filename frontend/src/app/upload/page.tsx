"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

const ACCEPTED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "docx",
]);
const ACCEPTED_EXTS = ".pdf,.jpg,.jpeg,.png,.webp,.docx";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  return "📝";
}

export default function UploadPage() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [existingDocuments, setExistingDocuments] = useState<
    ExistingDocument[]
  >([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Map from entry id → actual File object (not stored in React state)
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

      const { data, error } = await supabase
        .from("cases")
        .select("id, hospital_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setGlobalError("Could not load your cases. Please try again.");
      const userCases = data ?? [];
      setCases(userCases);
      const requestedCaseId = new URLSearchParams(window.location.search).get(
        "caseId",
      );
      setSelectedCaseId(
        userCases.some((c) => c.id === requestedCaseId)
          ? requestedCaseId!
          : (userCases[0]?.id ?? ""),
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
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          if (!cancelled) {
            setGlobalError(
              error.detail ??
                `Could not load documents (HTTP ${response.status}).`,
            );
          }
          return;
        }
        const result = await response.json();
        if (!cancelled) setExistingDocuments(result.items ?? []);
      } catch {
        // Existing documents remain optional while the backend is unavailable.
      }
    };
    void loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [selectedCaseId]);

  const addFiles = useCallback((incoming: File[]) => {
    setGlobalError("");
    const newEntries: FileEntry[] = [];

    for (const f of incoming) {
      const extension = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPTED_EXTENSIONS.has(extension)) {
        setGlobalError(
          `"${f.name}" is not supported. Use PDF, JPG, PNG, WEBP, or DOCX.`,
        );
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        setGlobalError(
          `"${f.name}" exceeds the 20 MB limit (${formatBytes(f.size)}).`,
        );
        continue;
      }
      const id = `${f.name}-${Date.now()}-${Math.random()}`;
      fileRefs.current.set(id, f);
      newEntries.push({
        id,
        name: f.name,
        size: f.size,
        type: f.type,
        status: "idle",
      });
    }

    if (newEntries.length > 0) setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeEntry = (id: string) => {
    fileRefs.current.delete(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const setStatus = (id: string, patch: Partial<FileEntry>) =>
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );

  const uploadAll = async () => {
    if (!selectedCaseId) {
      setGlobalError("Choose a case before uploading.");
      return;
    }
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setGlobalError("Your session expired. Sign in again.");
      return;
    }

    const pending = entries.filter(
      (e) => e.status === "idle" || e.status === "error",
    );
    if (!pending.length) return;

    setUploading(true);
    setGlobalError("");

    for (const entry of pending) {
      const fileObj = fileRefs.current.get(entry.id);
      if (!fileObj) {
        setStatus(entry.id, {
          status: "error",
          errorMessage: "File lost — re-select it.",
        });
        continue;
      }

      setStatus(entry.id, { status: "uploading", errorMessage: undefined });
      setStatus(entry.id, { status: "processing" });
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
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
        if (result.status !== "done")
          throw new Error(
            result.error_message ?? "Document processing failed.",
          );
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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(250,247,239,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
          }}
        >
          <Link
            href="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span style={{ color: "var(--muted)", fontSize: 18 }}>←</span>
            <span
              style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}
            >
              Dashboard
            </span>
          </Link>
          <span className="pill pill-cream">Document Upload</span>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: "auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "var(--navy)",
              marginBottom: 8,
            }}
          >
            Upload your documents
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 560,
            }}
          >
            Add insurance policies, hospital bills, admission records, or any
            relevant documents. Sahaayak reads them and extracts key facts
            automatically.
          </p>
        </div>

        {/* Accepted formats */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          {[
            { icon: "📄", label: "PDF" },
            { icon: "🖼️", label: "JPG / PNG / WEBP" },
            { icon: "📝", label: "DOCX" },
            { icon: "⚖️", label: "Max 20 MB" },
          ].map((t) => (
            <span
              key={t.label}
              className="pill pill-cream"
              style={{ fontSize: 12, padding: "5px 12px" }}
            >
              {t.icon} {t.label}
            </span>
          ))}
        </div>

        <label
          htmlFor="case-select"
          style={{
            display: "block",
            marginBottom: 8,
            color: "var(--navy)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Claim case
        </label>
        <select
          id="case-select"
          value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
          disabled={loadingCases || cases.length === 0 || uploading}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--navy)",
            marginBottom: 22,
          }}
        >
          {loadingCases && <option value="">Loading your cases…</option>}
          {!loadingCases && cases.length === 0 && (
            <option value="">No cases available</option>
          )}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.hospital_name || "Medical claim"} · {c.id.slice(0, 8)}
            </option>
          ))}
        </select>
        {!loadingCases && cases.length === 0 && (
          <p
            style={{
              color: "var(--muted)",
              fontSize: 13,
              margin: "-12px 0 20px",
            }}
          >
            Create a claim case before adding documents.
          </p>
        )}

        {/* Drop zone */}
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
            border: `2px dashed ${dragOver ? "var(--amber)" : "var(--border)"}`,
            borderRadius: 22,
            padding: "52px 32px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "var(--amber-pale)" : "var(--surface)",
            transition: "all 0.2s var(--ease-out)",
            marginBottom: 20,
            outline: "none",
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 14 }}>
            {dragOver ? "📂" : "☁️"}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 17,
              color: "var(--navy)",
              marginBottom: 6,
            }}
          >
            {dragOver ? "Drop files here" : "Drag & drop files here"}
          </div>
          <div
            style={{ color: "var(--muted)", fontSize: 14, marginBottom: 22 }}
          >
            PDFs, images, or DOCX documents — or click to browse
          </div>
          <span
            className="btn btn-primary btn-sm"
            style={{ pointerEvents: "none" }}
          >
            Browse files
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

        {/* Global error */}
        {globalError && (
          <div
            style={{
              background: "var(--red-pale)",
              border: "1px solid #f5c6c6",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 18,
              fontSize: 13,
              color: "var(--red)",
            }}
          >
            ⚠️ {globalError}
          </div>
        )}

        {/* File list */}
        {entries.length > 0 && (
          <div className="card" style={{ padding: "22px" }}>
            {/* Header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div
                style={{ fontWeight: 700, color: "var(--navy)", fontSize: 15 }}
              >
                {entries.length} file{entries.length !== 1 ? "s" : ""}
                {doneCount > 0 && (
                  <span
                    style={{
                      color: "var(--green)",
                      marginLeft: 8,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    · {doneCount} processed ✓
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  entries.forEach((e) => fileRefs.current.delete(e.id));
                  setEntries([]);
                }}
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--red)", fontSize: 12 }}
              >
                Clear all
              </button>
            </div>

            {/* File rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background:
                      e.status === "done"
                        ? "var(--green-pale)"
                        : e.status === "error"
                          ? "var(--red-pale)"
                          : e.status === "uploading" ||
                              e.status === "processing"
                            ? "var(--blue-light)"
                            : "var(--cream-100)",
                    border: `1px solid ${
                      e.status === "done"
                        ? "#b7e4cc"
                        : e.status === "error"
                          ? "#f5c6c6"
                          : e.status === "uploading" ||
                              e.status === "processing"
                            ? "#c8dffa"
                            : "var(--border-subtle)"
                    }`,
                    transition: "background 0.3s, border-color 0.3s",
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>
                    {fileIcon(e.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "var(--navy)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
                    >
                      {formatBytes(e.size)}
                      {e.errorMessage && (
                        <span style={{ color: "var(--red)", marginLeft: 6 }}>
                          · {e.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {e.status === "idle" && (
                      <span
                        className="pill pill-cream"
                        style={{ fontSize: 10 }}
                      >
                        Ready
                      </span>
                    )}
                    {e.status === "uploading" && (
                      <span className="pill pill-blue" style={{ fontSize: 10 }}>
                        <span
                          style={{
                            display: "inline-block",
                            animation: "spin 1s linear infinite",
                          }}
                        >
                          ↻
                        </span>{" "}
                        Uploading
                      </span>
                    )}
                    {e.status === "processing" && (
                      <span className="pill pill-blue" style={{ fontSize: 10 }}>
                        Processing
                      </span>
                    )}
                    {e.status === "done" && (
                      <span
                        className="pill pill-green"
                        style={{ fontSize: 10 }}
                      >
                        ✓ Done
                      </span>
                    )}
                    {e.status === "error" && (
                      <span className="pill pill-red" style={{ fontSize: 10 }}>
                        Failed
                      </span>
                    )}
                  </div>
                  {e.status === "idle" && (
                    <button
                      onClick={() => removeEntry(e.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        fontSize: 18,
                        padding: "0 2px",
                        lineHeight: 1,
                      }}
                      aria-label={`Remove ${e.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload button */}
            {pendingCount > 0 && (
              <button
                id="upload-start-btn"
                onClick={uploadAll}
                disabled={uploading || loadingCases || !selectedCaseId}
                className="btn btn-amber"
                style={{
                  width: "100%",
                  marginTop: 18,
                  padding: "14px",
                  fontSize: 15,
                  borderRadius: 14,
                }}
              >
                {uploading
                  ? "⏳ Processing…"
                  : `Upload & process ${pendingCount} file${pendingCount !== 1 ? "s" : ""} →`}
              </button>
            )}

            {doneCount === entries.length && entries.length > 0 && (
              <div style={{ marginTop: 18, textAlign: "center" }}>
                <div
                  style={{
                    color: "var(--green)",
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 12,
                  }}
                >
                  ✓ All files processed successfully!
                </div>
                <Link
                  href={`/case/${encodeURIComponent(selectedCaseId)}`}
                  className="btn btn-primary"
                >
                  Review this claim →
                </Link>
              </div>
            )}
          </div>
        )}

        {existingDocuments.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <div className="label" style={{ marginBottom: 10 }}>
              Documents in this case
            </div>
            <div className="card" style={{ padding: 16 }}>
              {existingDocuments.map((document) => (
                <div
                  key={document.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{ color: "var(--navy)", overflowWrap: "anywhere" }}
                  >
                    {document.file_name}
                  </span>
                  <span
                    style={{
                      color:
                        document.processing_status === "failed"
                          ? "var(--red)"
                          : "var(--muted)",
                      flexShrink: 0,
                      textAlign: "right",
                    }}
                  >
                    {document.processing_status === "done"
                      ? `${document.page_count ?? 0} pages · ${
                          (document.facts_count ?? 0) > 0
                            ? `${document.facts_count} facts read`
                            : "no facts found"
                        }`
                      : document.processing_status}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <Link
                  href={`/case/${encodeURIComponent(selectedCaseId)}`}
                  className="btn btn-primary"
                >
                  Review this claim →
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
