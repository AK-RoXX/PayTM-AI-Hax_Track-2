import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowDownLeft,
  ArrowRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  FileText,
  HeartPulse,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { EcosystemFooter } from "@/components/common/EcosystemFooter";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analytics — Paytm Sahayak",
  description: "A categorized view of your claim and financial activity.",
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function StatCard({
  label,
  amount,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  amount: string;
  detail: string;
  icon: typeof Wallet;
  tone: { bg: string; color: string };
}) {
  return (
    <article className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{label}</p>
          <p className="heading" style={{ margin: "10px 0 4px", color: "#0f172a", fontSize: 26 }}>
            {amount}
          </p>
          <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{detail}</p>
        </div>
        <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, display: "grid", placeItems: "center", background: tone.bg, color: tone.color }}>
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: cases, error } = await supabase
    .from("cases")
    .select("id, case_code, status, hospital_name, estimated_bill, estimated_coverage, estimated_gap, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = cases ?? [];
  const totals = rows.reduce(
    (sum, item) => ({
      bills: sum.bills + Number(item.estimated_bill ?? 0),
      coverage: sum.coverage + Number(item.estimated_coverage ?? 0),
      gap: sum.gap + Number(item.estimated_gap ?? 0),
    }),
    { bills: 0, coverage: 0, gap: 0 },
  );
  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
  const firstName = fullName.split(" ")[0];

  const categories = [
    { label: "Medical bills", amount: totals.bills, icon: HeartPulse, color: "#e11d48", bg: "#fff1f2", note: "Estimated hospital expenses across your claims" },
    { label: "Insurance coverage", amount: totals.coverage, icon: ShieldCheck, color: "#0284c7", bg: "#eff6ff", note: "Estimated coverage recorded for your claims" },
    { label: "Estimated funding gap", amount: totals.gap, icon: CircleDollarSign, color: "#d97706", bg: "#fffbeb", note: "Potential out-of-pocket amount across your claims" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <AppSidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppNavbar userName={fullName} userEmail={user.email} />
        <main style={{ width: "100%", maxWidth: 1200, margin: "0 auto", padding: "30px 24px 70px" }}>
          <header style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0066f5", fontSize: 13, fontWeight: 700 }}>
              <ChartNoAxesCombined size={17} /> YOUR MONEY OVERVIEW
            </div>
            <h1 className="heading" style={{ margin: "8px 0 4px", fontSize: 28, color: "#0f172a" }}>Analytics</h1>
            <p className="muted" style={{ margin: 0 }}>Hi {firstName}, here’s a categorized view of the financial information in your claims.</p>
          </header>

          {error ? (
            <div className="card" role="alert" style={{ padding: 20, color: "#b91c1c" }}>We couldn’t load your analytics. Refresh the page to try again.</div>
          ) : (
            <>
              <section aria-label="Financial summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
                <StatCard label="Estimated medical bills" amount={money(totals.bills)} detail={`${rows.length} ${rows.length === 1 ? "claim" : "claims"} in your account`} icon={Wallet} tone={{ bg: "#fff1f2", color: "#e11d48" }} />
                <StatCard label="Estimated insurance coverage" amount={money(totals.coverage)} detail="Based on saved claim estimates" icon={ShieldCheck} tone={{ bg: "#eff6ff", color: "#0284c7" }} />
                <StatCard label="Estimated funding gap" amount={money(totals.gap)} detail="Planning estimate, not an insurer decision" icon={CircleDollarSign} tone={{ bg: "#fffbeb", color: "#d97706" }} />
              </section>

              <section className="card" style={{ padding: 22, marginBottom: 22 }}>
                <div style={{ marginBottom: 16 }}>
                  <h2 className="heading" style={{ fontSize: 18, color: "#0f172a", margin: "0 0 4px" }}>Categories</h2>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>Totals are calculated from your saved claim estimates.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {categories.map(({ label, amount, icon: Icon, color, bg, note }) => (
                    <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <span style={{ width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center", background: bg, color }}><Icon size={18} /></span>
                        <span style={{ fontWeight: 650, color: "#334155", fontSize: 14 }}>{label}</span>
                      </div>
                      <div className="heading" style={{ color: "#0f172a", fontSize: 22, marginBottom: 5 }}>{money(amount)}</div>
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{note}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card" style={{ padding: 22, marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
                  <div>
                    <h2 className="heading" style={{ fontSize: 18, color: "#0f172a", margin: "0 0 4px" }}>Claim financial activity</h2>
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>Your latest claim estimates, grouped by case.</p>
                  </div>
                  <FileText size={20} color="#64748b" />
                </div>
                {rows.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, textAlign: "left" }}>
                      <thead><tr style={{ color: "#64748b", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "11px 8px", fontWeight: 600 }}>Claim</th><th style={{ padding: "11px 8px", fontWeight: 600 }}>Category</th><th style={{ padding: "11px 8px", fontWeight: 600 }}>Bill</th><th style={{ padding: "11px 8px", fontWeight: 600 }}>Coverage</th><th style={{ padding: "11px 8px", fontWeight: 600 }}>Gap</th>
                      </tr></thead>
                      <tbody>{rows.map((item) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#334155" }}>
                          <td style={{ padding: "14px 8px" }}><Link href={`/case/${item.id}`} style={{ color: "#0066f5", fontWeight: 650, textDecoration: "none" }}>{item.hospital_name || item.case_code || "Medical claim"}</Link><div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div></td>
                          <td style={{ padding: "14px 8px" }}><span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><HeartPulse size={14} color="#e11d48" /> Medical claim</span></td>
                          <td style={{ padding: "14px 8px" }}>{money(Number(item.estimated_bill ?? 0))}</td><td style={{ padding: "14px 8px" }}>{money(Number(item.estimated_coverage ?? 0))}</td><td style={{ padding: "14px 8px", fontWeight: 650 }}>{money(Number(item.estimated_gap ?? 0))}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 14, textAlign: "center", padding: "30px 18px" }}>
                    <FileText size={28} color="#94a3b8" style={{ margin: "0 auto 10px" }} />
                    <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 14 }}>Your claim analytics will appear here when you start a claim.</p>
                    <Link href="/intake" className="btn btn-primary">Start a claim <ArrowRight size={15} /></Link>
                  </div>
                )}
              </section>

              <section className="card" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <CreditCard size={19} color="#64748b" />
                  <h2 className="heading" style={{ fontSize: 18, color: "#0f172a", margin: 0 }}>Transactions</h2>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, borderRadius: 14, background: "#f8fafc", padding: 16 }}>
                  <ArrowDownLeft size={19} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ color: "#334155", fontSize: 14, fontWeight: 650, margin: "0 0 4px" }}>No transaction records connected yet</p>
                    <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.55, margin: 0 }}>This account currently has claim estimates only. Paytm, bank, and UPI transaction history is not connected, so no spending categories or transaction totals are shown.</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
        <EcosystemFooter />
      </div>
    </div>
  );
}
