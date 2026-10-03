import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";

import { ApiError } from "@/lib/api";
import { getCase, getEvidence } from "@/lib/api-server";
import { CaseHeader } from "@/components/case/CaseHeader";
import { ClaimAssistant } from "@/components/case/ClaimAssistant";
import { ClaimReadinessCard } from "@/components/case/ClaimReadinessCard";
import { CaseTimeline } from "@/components/case/CaseTimeline";
import { DocumentList } from "@/components/case/DocumentList";
import { EvidenceDrawer } from "@/components/case/EvidenceDrawer";
import { ExtractedFacts } from "@/components/case/ExtractedFacts";
import { FinancialMap } from "@/components/case/FinancialMap";
import { NextActionCard } from "@/components/case/NextActionCard";

export const metadata = { title: "Claim review — Paytm Sahaayak" };

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  let data, evidence;
  try {
    [data, evidence] = await Promise.all([getCase(caseId), getEvidence(caseId)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) redirect("/dashboard");
    throw error;
  }

  return (
    <main className="shell">
      <Link href="/dashboard" className="muted row" style={{ gap: 6, fontSize: 13 }}>
        <ArrowLeft size={14} aria-hidden="true" />
        Dashboard
      </Link>

      <div className="grid" style={{ marginTop: 14 }}>
        <CaseHeader data={data} />
        <NextActionCard
          caseId={caseId}
          action={data.next_best_action}
          missingCount={data.missing_requirements.length}
          financialMap={data.financial_map}
        />
        <ClaimReadinessCard data={data} />
        <FinancialMap data={data} />
        <DocumentList documents={data.documents} />
        <ExtractedFacts facts={data.facts} />
        <EvidenceDrawer items={evidence.items} />
        <ClaimAssistant caseId={caseId} />
        <CaseTimeline events={data.timeline} />

        <Link
          href={`/upload?caseId=${encodeURIComponent(caseId)}`}
          className="btn btn-soft"
        >
          <Upload size={15} aria-hidden="true" />
          Upload another document
        </Link>
      </div>
    </main>
  );
}