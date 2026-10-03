"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileText,
  LoaderCircle,
  Plus,
  ReceiptText,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  getBillLineItems,
  getPolicyAssessment,
  getPolicyTerms,
  runPolicyAssessment,
  saveBillLineItems,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type {
  BillLineCategory,
  BillLineItem,
  CaseData,
  CaseDocument,
  PolicyScenario,
  PolicyTermsResponse,
} from "@/lib/types";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const categoryLabels: Record<BillLineCategory, string> = {
  room_rent: "Room rent",
  room_related: "Boarding / DMO / nursing",
  icu: "ICU",
  other_medical: "Other medical",
  pharmacy: "Pharmacy",
  consumables: "Consumables",
  diagnostics: "Diagnostics",
  implants_devices: "Implants / devices",
  unclassified: "Needs category",
};

const categoryOptions = Object.entries(categoryLabels) as [BillLineCategory, string][];

function newLine(): BillLineItem {
  return {
    line_id: globalThis.crypto?.randomUUID?.() ?? `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: "",
    category: "unclassified",
    amount: 0,
    quantity: null,
    source_page: 1,
    source_quote: "",
    confidence: 1,
    extraction_status: "manual",
  };
}

function documentTitle(document: CaseDocument) {
  const state = document.processing_status === "done"
    ? "Ready"
    : document.processing_status === "failed"
      ? "Needs upload again"
      : "Processing";
  return `${document.file_name} · ${state}`;
}

function readableCategory(category: string) {
  return categoryLabels[category as BillLineCategory] ?? category.replaceAll("_", " ");
}

export function FinancialMap({ data }: { data: CaseData }) {
  const billDocuments = useMemo(
    () => data.documents.filter((document) => document.document_type === "hospital_estimate"),
    [data.documents],
  );
  const policyDocuments = useMemo(
    () => data.documents.filter((document) => document.document_type === "health_policy"),
    [data.documents],
  );

  const [token, setToken] = useState<string | null>(null);
  const [terms, setTerms] = useState<PolicyTermsResponse | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [selectedBillId, setSelectedBillId] = useState("");
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [savedSignature, setSavedSignature] = useState("");
  const [billTotal, setBillTotal] = useState<number | null>(null);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [proportionate, setProportionate] = useState<"yes" | "no" | "unknown">("unknown");
  const [scenario, setScenario] = useState<PolicyScenario | null>(null);
  const [scenarioState, setScenarioState] = useState<"current" | "stale" | "not_calculated">("not_calculated");
  const [loading, setLoading] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedCandidate = terms?.candidates.find(
    (candidate) => candidate.policy_document_id === selectedPolicyId,
  );
  const selectedBill = billDocuments.find((document) => document.id === selectedBillId);
  const selectedPolicy = policyDocuments.find((document) => document.id === selectedPolicyId);
  const sum = items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
  const signature = JSON.stringify(items);
  const isDirty = signature !== savedSignature;
  const extractedBillTotal = billTotal;
  const difference = extractedBillTotal === null ? null : sum - extractedBillTotal;
  const allLinesUsable = items.length > 0 && items.every((item) =>
    item.description.trim() && Number(item.amount) > 0 && item.category !== "unclassified" &&
    ((item.category !== "room_rent" && item.category !== "room_related" && item.category !== "icu") || (item.quantity !== null && item.quantity > 0)),
  );
  const sharedDaysValid = [
    items.filter((item) => item.category === "room_rent" || item.category === "room_related"),
    items.filter((item) => item.category === "icu"),
  ].every((group) => new Set(group.map((item) => item.quantity).filter((days) => days !== null)).size <= 1);
  const reconciles = difference !== null && Math.abs(difference) <= 1;
  const canCalculate = Boolean(
    token && selectedCandidate?.status === "needs_schedule_confirmation" &&
    selectedCandidate.rule_summary && selectedBill?.processing_status === "done" &&
    scheduleConfirmed && allLinesUsable && sharedDaysValid && reconciles && !saving,
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Sign in to review your policy scenario.");
        const [termsResponse, assessmentResponse] = await Promise.all([
          getPolicyTerms(data.id, accessToken),
          getPolicyAssessment(data.id, accessToken),
        ]);
        if (!active) return;
        setToken(accessToken);
        setTerms(termsResponse);

        const saved = assessmentResponse.assessment;
        if (saved?.result) {
          setScenario(saved.result);
          setScenarioState(assessmentResponse.status);
          setSelectedPolicyId(saved.source_snapshot.policy_document_id ?? "");
          setSelectedBillId(saved.source_snapshot.bill_document_id ?? "");
        }

        const savedPolicyId = saved?.source_snapshot.policy_document_id;
        const readyCandidate = termsResponse.candidates.find(
          (candidate) => candidate.policy_document_id === savedPolicyId && candidate.status === "needs_schedule_confirmation",
        ) ?? termsResponse.candidates.find((candidate) => candidate.status === "needs_schedule_confirmation");
        if (!savedPolicyId && readyCandidate?.policy_document_id) {
          setSelectedPolicyId(readyCandidate.policy_document_id);
        }
        if (!saved?.source_snapshot.bill_document_id && billDocuments.length) {
          setSelectedBillId(billDocuments[0].id);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load Money Map.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [data.id, billDocuments]);

  useEffect(() => {
    let active = true;
    if (!token || !selectedBillId) return;
    const loadLines = async () => {
      setLoadingLines(true);
      setError("");
      try {
        const response = await getBillLineItems(data.id, selectedBillId, token);
        if (!active) return;
        const reviewedItems = response.items.length ? response.items : [newLine()];
        setItems(reviewedItems);
        setBillTotal(response.bill_total);
        setNotice(response.review_message);
        setSavedSignature(JSON.stringify(reviewedItems));
        setScheduleConfirmed(false);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load bill rows.");
      } finally {
        if (active) setLoadingLines(false);
      }
    };
    void loadLines();
    return () => { active = false; };
  }, [data.id, selectedBillId, token]);

  const updateLine = (lineId: string, update: Partial<BillLineItem>) => {
    setItems((current) => current.map((item) => item.line_id === lineId ? { ...item, ...update } : item));
    setScenarioState((current) => current === "current" ? "stale" : current);
  };

  const saveDraft = async () => {
    if (!token || !selectedBillId || items.length === 0) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await saveBillLineItems(data.id, selectedBillId, items, false, token);
      setItems(response.items);
      setBillTotal(response.bill_total);
      setSavedSignature(JSON.stringify(response.items));
      setScenarioState(scenario ? "stale" : "not_calculated");
      setNotice("Review saved. Confirm the complete itemisation when every bill line is accounted for.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the bill review.");
    } finally {
      setSaving(false);
    }
  };

  const calculateScenario = async () => {
    if (!token || !selectedBillId || !selectedCandidate?.rule_summary) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const confirmed = await saveBillLineItems(data.id, selectedBillId, items, true, token);
      setItems(confirmed.items);
      setBillTotal(confirmed.bill_total);
      setSavedSignature(JSON.stringify(confirmed.items));
      const result = await runPolicyAssessment(data.id, {
        policy_document_id: selectedCandidate.policy_document_id!,
        bill_document_id: selectedBillId,
        policy_uin: selectedCandidate.rule_summary.uin,
        schedule_confirmed: true,
        proportionate_deduction_applicability: proportionate,
      }, token);
      setScenario(result);
      setScenarioState("current");
      setNotice("Scenario refreshed from the reviewed bill lines and selected policy reference.");
    } catch (calculateError) {
      setError(calculateError instanceof Error ? calculateError.message : "Could not calculate this scenario.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="card" id="money-map" style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
          <LoaderCircle size={18} className="animate-spin" /> Loading your policy and bill evidence…
        </div>
      </section>
    );
  }

  const readyPolicies = terms?.candidates.filter((candidate) => candidate.status === "needs_schedule_confirmation") ?? [];
  const rule = selectedCandidate?.rule_summary;
  const scenarioFinance = scenario?.financial_map;

  return (
    <section className="card" id="money-map" style={{ padding: "26px", display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span className="label" style={{ color: "#0066f5" }}>Paytm Money Map</span>
            <span className={`pill ${scenarioState === "current" ? "pill-green" : scenarioState === "stale" ? "pill-orange" : "pill-blue"}`} style={{ fontSize: 11 }}>
              {scenarioState === "current" ? "Scenario current" : scenarioState === "stale" ? "Inputs changed" : "Planning view"}
            </span>
          </div>
          <h2 className="heading" style={{ fontSize: 23, margin: "2px 0 4px", color: "var(--paytm-navy)" }}>Bill, policy limits &amp; your next step</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Review the extracted bill, confirm your active schedule, and see the exact rule behind each modelled line.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "9px 12px" }}>
          <ShieldCheck size={16} color="#087f5b" /> Evidence-linked estimate
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: 12 }}>
        <SummaryTile label="Hospital bill" value={money(scenarioFinance?.hospital_bill_total ?? data.financial_map.hospital_estimate)} color="#0f172a" detail={selectedBill?.file_name ?? "From your uploaded bill"} />
        {scenarioFinance ? (
          <>
            <SummaryTile label="Modelled coverage range" value={`${money(scenarioFinance.modelled_coverage_range_before_unmodelled_terms.minimum)} – ${money(scenarioFinance.modelled_coverage_range_before_unmodelled_terms.maximum)}`} color="#047857" detail="Before other policy terms" />
            <SummaryTile label="Modelled gap range" value={`${money(scenarioFinance.modelled_gap_range_before_unmodelled_terms.minimum)} – ${money(scenarioFinance.modelled_gap_range_before_unmodelled_terms.maximum)}`} color="#b45309" detail="Not insurer-approved or final" />
          </>
        ) : (
          <>
            <SummaryTile label="Sum insured ceiling" value={money(data.financial_map.possible_coverage)} color="#0369a1" detail="Upper limit only; not expected payout" />
            <SummaryTile label="Minimum planning gap" value={money(data.financial_map.estimated_gap)} color="#b45309" detail="May increase after policy terms" />
          </>
        )}
      </div>

      <div style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 16, padding: 18, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750, color: "#0f2e59" }}>
          <ReceiptText size={18} color="#0879e8" /> Build a reviewable estimate
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <label style={fieldLabel}>
            Policy document
            <select value={selectedPolicyId} onChange={(event) => { setSelectedPolicyId(event.target.value); setScheduleConfirmed(false); setScenarioState(scenario ? "stale" : "not_calculated"); }} style={selectStyle}>
              <option value="">Choose a policy…</option>
              {policyDocuments.map((document) => <option key={document.id} value={document.id}>{documentTitle(document)}</option>)}
            </select>
          </label>
          <label style={fieldLabel}>
            Hospital bill / estimate
            <select value={selectedBillId} onChange={(event) => { const nextId = event.target.value; setSelectedBillId(nextId); setScheduleConfirmed(false); setScenarioState(scenario ? "stale" : "not_calculated"); if (!nextId) { setItems([]); setBillTotal(null); setSavedSignature(""); } }} style={selectStyle}>
              <option value="">Choose a bill…</option>
              {billDocuments.map((document) => <option key={document.id} value={document.id}>{documentTitle(document)}</option>)}
            </select>
          </label>
        </div>

        {selectedCandidate && !rule && (
          <div style={messageStyle("amber")}><AlertTriangle size={17} />{selectedCandidate.next_step || "This policy needs review before its numeric rules can be used."}</div>
        )}
        {rule && selectedPolicy && (
          <div style={{ background: "#fff", border: "1px solid #dbeafe", borderRadius: 13, padding: 14, display: "grid", gap: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 750, color: "#0f172a" }}>{rule.insurer} · {rule.product_name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>UIN {rule.uin} · {rule.tier_label} · Sum insured {money(rule.sum_insured)}</div>
              </div>
              <span className="pill pill-blue">{rule.source_kind.replaceAll("_", " ")} reference</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 9 }}>
              <RuleLine title="Room, boarding & nursing daily cap" explanation={rule.room_rent_rule_explanation} quote={rule.room_rent_source_quote} pages={rule.room_rent_source_pages} />
              <RuleLine title="ICU & associated daily cap" explanation={rule.icu_rule_explanation} quote={rule.icu_source_quote} pages={rule.icu_source_pages} />
            </div>
            <label style={{ ...fieldLabel, display: "flex", alignItems: "flex-start", gap: 9, fontWeight: 500 }}>
              <input type="checkbox" checked={scheduleConfirmed} onChange={(event) => setScheduleConfirmed(event.target.checked)} style={{ marginTop: 3 }} />
              I checked the insured person&apos;s active policy schedule; its insurer, UIN, plan, sum insured and version match this reference.
            </label>
            <p style={{ margin: 0, color: "#64748b", fontSize: 11.5 }}>{rule.scope_note} Source: {rule.source_title}, pages {rule.source_pages.join(", ")}.</p>
          </div>
        )}

        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "grid", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 750, color: "#0f172a" }}>Bill line review</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>OCR suggestions are drafts. Check each amount, category, day count, page and quote. Room / boarding / nursing rows sharing a limit need the same stay-day count.</div>
            </div>
            <button type="button" disabled={!selectedBillId} onClick={() => setItems((current) => [...current, newLine()])} className="btn btn-outline" style={{ gap: 6 }}>
              <Plus size={15} /> Add a bill line
            </button>
          </div>

          {!selectedBillId ? (
            <div style={messageStyle("blue")}><FileText size={17} />Upload and select a hospital bill to review its extracted rows.</div>
          ) : loadingLines ? (
            <div style={{ padding: 16, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}><LoaderCircle size={16} /> Loading extracted bill rows…</div>
          ) : (
            <>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
                <table style={{ width: "100%", minWidth: 810, borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                    <th style={thStyle}>Charge and source</th><th style={thStyle}>Category</th><th style={thStyle}>Amount</th><th style={thStyle}>Days</th><th style={thStyle}>Page</th><th style={thStyle}></th>
                  </tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.line_id} style={{ borderTop: "1px solid #eef2f7", verticalAlign: "top" }}>
                        <td style={{ ...tdStyle, width: "34%" }}>
                          <input value={item.description} onChange={(event) => updateLine(item.line_id, { description: event.target.value })} placeholder="For example: Room rent" style={inputStyle} aria-label="Bill line description" />
                          <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>{item.extraction_status === "proposed" ? `OCR suggestion · ${Math.round(item.confidence * 100)}% confidence` : "Added by you"}</div>
                          {item.source_quote && <div style={{ marginTop: 6, color: "#475569", background: "#f8fafc", borderLeft: "2px solid #93c5fd", padding: "6px 8px", borderRadius: 4, maxWidth: 340 }}>&ldquo;{item.source_quote}&rdquo;</div>}
                        </td>
                        <td style={tdStyle}><select value={item.category} onChange={(event) => { const category = event.target.value as BillLineCategory; const daily = category === "room_rent" || category === "room_related" || category === "icu"; updateLine(item.line_id, { category, quantity: daily ? item.quantity : null }); }} style={inputStyle} aria-label="Bill line category">{categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                        <td style={tdStyle}><input type="number" min="0" step="1" value={item.amount || ""} onChange={(event) => updateLine(item.line_id, { amount: Number(event.target.value) })} style={{ ...inputStyle, width: 124 }} aria-label="Bill line amount in rupees" /></td>
                        <td style={tdStyle}><input type="number" min="0" step="0.5" value={item.quantity ?? ""} onChange={(event) => updateLine(item.line_id, { quantity: event.target.value ? Number(event.target.value) : null })} disabled={item.category !== "room_rent" && item.category !== "room_related" && item.category !== "icu"} placeholder="—" style={{ ...inputStyle, width: 86 }} aria-label="Room, boarding, nursing, or ICU days" /></td>
                        <td style={tdStyle}><input type="number" min="1" max={selectedBill?.page_count ?? undefined} value={item.source_page || 1} onChange={(event) => updateLine(item.line_id, { source_page: Math.max(1, Number(event.target.value)) })} style={{ ...inputStyle, width: 68 }} aria-label="Source page number" /></td>
                        <td style={tdStyle}><button type="button" onClick={() => setItems((current) => current.filter((row) => row.line_id !== item.line_id))} aria-label="Remove bill line" title="Remove line" style={iconButton}><Trash2 size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "#f8fafc", borderRadius: 11, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Rows total <strong style={{ color: "#0f172a" }}>{money(sum)}</strong>
                  <span style={{ margin: "0 8px", color: "#cbd5e1" }}>·</span>
                  Bill total <strong style={{ color: "#0f172a" }}>{extractedBillTotal === null ? "Not verified" : money(extractedBillTotal)}</strong>
                  {difference !== null && <span style={{ color: reconciles ? "#047857" : "#b45309", marginLeft: 8 }}>{reconciles ? "Totals reconcile" : `Difference ${money(difference)}`}</span>}
                </div>
                <button type="button" onClick={saveDraft} disabled={saving || !selectedBillId || items.length === 0} className="btn btn-outline" style={{ gap: 6 }}>
                  {saving ? <LoaderCircle size={15} /> : <Save size={15} />} Save review
                </button>
              </div>
              {isDirty && <div style={{ color: "#92400e", fontSize: 11.5 }}>You have unsaved edits. They will be saved when you confirm and calculate.</div>}
              {!sharedDaysValid && <div style={{ color: "#b91c1c", fontSize: 11.5 }}>Rows sharing a daily limit must use the same number of stay days.</div>}
              <label style={fieldLabel}>
                Proportionate-deduction condition
                <select value={proportionate} onChange={(event) => setProportionate(event.target.value as "yes" | "no" | "unknown")} style={selectStyle}>
                  <option value="unknown">Not confirmed — show a range</option>
                  <option value="yes">Hospital / insurer confirmed it applies</option>
                  <option value="no">Hospital tariff confirms no differential billing</option>
                </select>
                <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 400 }}>When it applies, the cited clause scales associate medical expenses by eligible room rate ÷ actual room rate. Pharmacy, consumables, implants/devices, and diagnostics are excluded.</span>
              </label>
              <button type="button" onClick={calculateScenario} disabled={!canCalculate} className="btn btn-primary" style={{ gap: 8, justifySelf: "start", opacity: canCalculate ? 1 : 0.55 }}>
                {saving ? <LoaderCircle size={16} /> : <FileCheck2 size={16} />} Confirm itemisation &amp; calculate
              </button>
              {!canCalculate && <p style={{ margin: "-5px 0 0", fontSize: 11.5, color: "#64748b" }}>To calculate: confirm the active schedule, categorise every row, enter room / ICU days, and reconcile the rows to the bill total.</p>}
            </>
          )}
        </div>
      </div>

      {error && <div style={messageStyle("red")}><AlertTriangle size={17} />{error}</div>}
      {notice && !error && <div style={messageStyle("green")}><CheckCircle2 size={17} />{notice}</div>}

      {readyPolicies.length === 0 && policyDocuments.length > 0 && (
        <div style={messageStyle("amber")}><AlertTriangle size={17} />The uploaded policy does not yet have a confirmed UIN and supported sum-insured tier. Review the policy evidence before calculating.</div>
      )}

      {scenario && (
        <div style={{ display: "grid", gap: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>Line-by-line scenario</h3>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>{scenario.policy.product_name} · Catalog {scenario.catalog_version}{scenario.created_at ? ` · Saved ${new Date(scenario.created_at).toLocaleString("en-IN")}` : ""}</p>
            </div>
            {scenarioState === "stale" && <span className="pill pill-orange">Recalculate: inputs changed</span>}
          </div>
          {scenarioState === "stale" && <div style={messageStyle("amber")}><AlertTriangle size={17} />This saved scenario is based on older inputs. Use the current bill review and policy selection to recalculate before relying on it.</div>}
          <div style={{ display: "grid", gap: 10 }}>
            {scenario.itemized_lines.map((line) => (
              <article key={line.line_id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 13, padding: 15, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 750, color: "#0f172a", fontSize: 14 }}>{line.description}</div>
                    <div style={{ color: "#64748b", fontSize: 11.5, marginTop: 3 }}>{readableCategory(line.category)}{line.quantity_days ? ` · ${line.quantity_days} day(s)` : ""} · Billed {money(line.billed_amount)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#047857", fontWeight: 800, fontSize: 14 }}>{money(line.modelled_amount_range.minimum)}–{money(line.modelled_amount_range.maximum)}</div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>before other terms and the overall sum-insured cap</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                  <EvidenceCard icon={<FileText size={14} />} title={`Bill evidence · ${line.bill_evidence.document_name} · Page ${line.bill_evidence.page_number}`} detail={line.bill_evidence.quote || "User-reviewed bill line; no OCR quote was retained."} />
                  <EvidenceCard icon={<ShieldCheck size={14} />} title={`Policy reference · Pages ${line.policy_rule_evidence.pages.join(", ")}`} detail={line.rule_explanation} quote={line.policy_rule_evidence.quote} />
                </div>
                {line.amount_above_known_daily_limit > 0 && <div style={{ color: "#b45309", fontSize: 11.5 }}>Indicative share above the shared daily cap: {money(line.amount_above_known_daily_limit)}. The cap is allocated across related bill rows in proportion to billed amounts for display.</div>}
              </article>
            ))}
          </div>
          <div style={{ background: "#f8fbff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 13 }}>
            <div style={{ fontSize: 12, fontWeight: 750, color: "#0f2e59" }}>Proportionate deduction basis</div>
            <div style={{ color: "#475569", fontSize: 11.5, marginTop: 5 }}>
              {scenario.proportionate_deduction.applicability.replaceAll("_", " ")}.
              {scenario.proportionate_deduction.actual_room_rate_per_day !== null && ` Eligible daily room rate ${money(scenario.proportionate_deduction.eligible_room_rate_per_day ?? 0)} ÷ billed room rate ${money(scenario.proportionate_deduction.actual_room_rate_per_day)} = ${scenario.proportionate_deduction.room_cost_ratio_assumption.toFixed(4)}.`}
            </div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 5 }}>{scenario.proportionate_deduction.formula_note}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 750, color: "#334155", marginBottom: 5 }}>What is not included</div>
            <div style={{ color: "#64748b", fontSize: 11.5, marginBottom: 7 }}>{scenario.assumptions.join(" · ")}</div>
            <div style={{ color: "#64748b", fontSize: 11.5 }}>{scenario.unmodelled_terms.join(" · ")}</div>
            <p style={{ margin: "9px 0 0", color: "#475569", fontSize: 11.5 }}>{scenario.disclaimer}</p>
          </div>
        </div>
      )}

      {error.includes("Sign in") && <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{data.financial_map.disclaimer}</p>}
    </section>
  );
}

function SummaryTile({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) {
  return <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 15px", background: "#fff", minWidth: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#64748b" }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 5, overflowWrap: "anywhere" }}>{value}</div>
    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{detail}</div>
  </div>;
}

function RuleLine({ title, explanation, quote, pages }: { title: string; explanation: string; quote: string; pages: number[] }) {
  return <div style={{ borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "9px 10px" }}>
    <div style={{ fontWeight: 700, color: "#334155", fontSize: 11.5 }}>{title} · Prospectus page(s) {pages.join(", ")}</div>
    <div style={{ color: "#64748b", fontSize: 11.5, marginTop: 3 }}>{explanation}</div>
    <div style={{ color: "#64748b", fontSize: 10.5, marginTop: 5, fontStyle: "italic" }}>&ldquo;{quote}&rdquo;</div>
  </div>;
}

function EvidenceCard({ icon, title, detail, quote }: { icon: React.ReactNode; title: string; detail: string; quote?: string }) {
  return <div style={{ background: "#f8fafc", borderRadius: 9, padding: "9px 10px", minWidth: 0 }}>
    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10.5, fontWeight: 750, color: "#475569" }}>{icon}<span>{title}</span></div>
    <div style={{ fontSize: 11, color: "#64748b", marginTop: 5, overflowWrap: "anywhere" }}>{detail}</div>
    {quote && <div style={{ fontSize: 10.5, color: "#475569", marginTop: 5, fontStyle: "italic", overflowWrap: "anywhere" }}>&ldquo;{quote}&rdquo;</div>}
  </div>;
}

const fieldLabel: React.CSSProperties = { display: "grid", gap: 6, color: "#334155", fontSize: 12, fontWeight: 700 };
const selectStyle: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", padding: "10px 11px", color: "#0f172a", width: "100%", font: "inherit", fontWeight: 500 };
const inputStyle: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", padding: "8px 9px", color: "#0f172a", width: "100%", minWidth: 68, font: "inherit" };
const thStyle: React.CSSProperties = { padding: "10px 9px", fontWeight: 700, borderBottom: "1px solid #e2e8f0" };
const tdStyle: React.CSSProperties = { padding: "10px 9px" };
const iconButton: React.CSSProperties = { border: "1px solid #fecaca", color: "#b91c1c", background: "#fff", borderRadius: 8, padding: 7, cursor: "pointer" };

function messageStyle(tone: "blue" | "green" | "amber" | "red"): React.CSSProperties {
  const palette = {
    blue: { color: "#1d4ed8", background: "#eff6ff", border: "#bfdbfe" },
    green: { color: "#047857", background: "#ecfdf5", border: "#a7f3d0" },
    amber: { color: "#92400e", background: "#fffbeb", border: "#fde68a" },
    red: { color: "#b91c1c", background: "#fef2f2", border: "#fecaca" },
  }[tone];
  return { display: "flex", alignItems: "flex-start", gap: 8, border: `1px solid ${palette.border}`, color: palette.color, background: palette.background, padding: "11px 12px", borderRadius: 10, fontSize: 12.5 };
}
