import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ApiError } from "@/lib/api";
import { getCase, getDecisionFlow } from "@/lib/api-server";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { EcosystemFooter } from "@/components/common/EcosystemFooter";
import { CaseHeader } from "@/components/case/CaseHeader";
import { DecisionFlowCard } from "@/components/case/DecisionFlowCard";
import { ClaimAssistant } from "@/components/case/ClaimAssistant";
import { ClaimReadinessCard } from "@/components/case/ClaimReadinessCard";
import { CaseTimeline } from "@/components/case/CaseTimeline";
import { DocumentList } from "@/components/case/DocumentList";
import { FinancialMap } from "@/components/case/FinancialMap";
import { NextActionCard } from "@/components/case/NextActionCard";

export const metadata = { title: "Claim Review — Paytm Sahayak" };

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Rahul Sharma";

  let data;
  let decisionFlow;
  try {
    [data, decisionFlow] = await Promise.all([
      getCase(caseId),
      getDecisionFlow(caseId).catch((err) => {
        console.warn("Decision flow fetch fallback:", err);
        return null;
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) redirect("/dashboard");
    throw error;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      {/* Desktop Left Sidebar */}
      <AppSidebar currentCaseId={caseId} />

      {/* Main Workspace */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppNavbar userName={userName} userEmail={user?.email} />

        <main style={{ padding: "24px 20px 60px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
          {/* Breadcrumb Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
              {data.case_code || data.id}
            </span>
          </div>

          {/* Case Header Banner with Edit Support */}
          <CaseHeader data={data} />

          {/* Decision-Making & Next Steps Pipeline Flow */}
          {decisionFlow && (
            <div style={{ marginTop: 24 }}>
              <DecisionFlowCard initialData={decisionFlow} caseId={caseId} />
            </div>
          )}

          {/* Responsive 2-Column Split */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 540px), 1fr))",
              gap: 24,
              marginTop: decisionFlow ? 0 : 24,
            }}
          >
            {/* Left Column: Interactive Chat & Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Sahayak Conversational Assistant */}
              <ClaimAssistant caseId={caseId} />

              {/* Next Action Priority Card */}
              <NextActionCard
                caseId={caseId}
                action={data.next_best_action}
                missingCount={data.missing_requirements.length}
                financialMap={data.financial_map}
              />

              {/* Document List Vault */}
              <DocumentList documents={data.documents} caseId={caseId} />
            </div>

            {/* Right Column: Money Map & Claim Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Money Map with Donut Chart and Editable Total Bill */}
              <FinancialMap data={data} />

              {/* Claim Readiness Score */}
              <ClaimReadinessCard data={data} />

              {/* Real-time Timeline Status Stepper */}
              <CaseTimeline events={data.timeline} caseId={caseId} />
            </div>
          </div>
        </main>

        <EcosystemFooter />
      </div>
    </div>
  );
}