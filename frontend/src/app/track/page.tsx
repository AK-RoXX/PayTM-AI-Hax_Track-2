import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCase } from "@/lib/api-server";
import { ClaimAssistant } from "@/components/case/ClaimAssistant";

export const metadata = { title: "Track a claim — Paytm Sahaayak" };

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

  const claim = cases?.[0];
  if (!claim) redirect("/intake");
  if (caseId && caseId !== claim.id) redirect(`/track?caseId=${encodeURIComponent(caseId)}`);

  const data = await getCase(claim.id);

  return (
    <main className="shell">
      <Link href={`/case/${claim.id}`} className="muted">
        ← Back to case
      </Link>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="label">Claim tracking</div>
        <h1 style={{ margin: "6px 0" }}>{data.case_code ?? claim.id}</h1>
        <div className="grid" style={{ margin: "18px 0" }}>
          <div className="row-between">
            <span>Documents uploaded</span>
            <b style={{ color: data.documents.length ? "#15753b" : "#c46a00" }}>
              {data.documents.length}
            </b>
          </div>
          <div className="row-between">
            <span>Readiness</span>
            <b style={{ color: data.readiness_score >= 80 ? "#15753b" : "#c46a00" }}>
              {data.readiness_score}%
            </b>
          </div>
          <div className="row-between">
            <span>Outstanding requirements</span>
            <b style={{ color: data.missing_requirements.length ? "#c46a00" : "#15753b" }}>
              {data.missing_requirements.length}
            </b>
          </div>
        </div>

        <p className="muted">{data.next_best_action}</p>
      </section>

      <div style={{ marginTop: 16 }}>
        <ClaimAssistant caseId={claim.id} />
      </div>
    </main>
  );
}