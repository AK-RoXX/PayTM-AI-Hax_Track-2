import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, FileText, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCase } from "@/lib/api-server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { EcosystemFooter } from "@/components/common/EcosystemFooter";
import { CaseTimeline } from "@/components/case/CaseTimeline";
import { ClaimAssistant } from "@/components/case/ClaimAssistant";

export const metadata: Metadata = {
  title: "Track Claim — Paytm Sahayak",
  description: "Track your health insurance claim status and next steps in real-time.",
};

type SearchParams = Promise<{ caseId?: string }>;

export default async function TrackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { caseId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: cases } = await supabase
    .from("cases")
    .select("id, case_code, status, readiness_score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const activeClaim = caseId ? cases?.find((c) => c.id === caseId) || cases?.[0] : cases?.[0];
  if (!activeClaim) redirect("/intake");

  const data = await getCase(activeClaim.id);
  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Rahul Sharma";

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <AppSidebar currentCaseId={activeClaim.id} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppNavbar userName={fullName} userEmail={user.email} />

        <main style={{ padding: "26px 20px 60px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Link
              href={`/case/${activeClaim.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              <ArrowLeft size={14} /> Back to Case Overview
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
              Tracking
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div className="card" style={{ padding: "18px 20px" }}>
              <span className="label" style={{ color: "#0066f5" }}>Claim Code</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                {data.case_code || data.id}
              </div>
            </div>

            <div className="card" style={{ padding: "18px 20px" }}>
              <span className="label" style={{ color: "#059669" }}>Readiness Score</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#059669", marginTop: 4 }}>
                {data.readiness_score}% Complete
              </div>
            </div>

            <div className="card" style={{ padding: "18px 20px" }}>
              <span className="label" style={{ color: "#d97706" }}>Outstanding Items</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706", marginTop: 4 }}>
                {data.missing_requirements.length} Document(s) Needed
              </div>
            </div>
          </div>

          {/* 2-Column Split: Timeline Stepper + Sahayak Assistant */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
              gap: 24,
            }}
          >
            {/* Screen 6 Claim Status Timeline */}
            <CaseTimeline events={data.timeline} caseId={activeClaim.id} />

            {/* Chat Assistant */}
            <ClaimAssistant caseId={activeClaim.id} />
          </div>
        </main>

        <EcosystemFooter />
      </div>
    </div>
  );
}