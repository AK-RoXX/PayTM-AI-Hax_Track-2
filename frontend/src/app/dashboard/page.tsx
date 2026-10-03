import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  FileText,
  LogOut,
  Plus,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — Paytm Sahaayak",
  description: "Your medical claim dashboard",
};

function readableStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select(
      "id, case_code, status, patient_relation, hospital_name, readiness_score, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const claimCases = cases ?? [];
  const name =
    user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there";
  const uploadHref = claimCases[0]
    ? `/upload?caseId=${encodeURIComponent(claimCases[0].id)}`
    : "/intake";
  const actions = [
    {
      href: "/intake",
      label: "Create a claim",
      detail: "Start a new medical claim",
      Icon: Plus,
    },
    {
      href: uploadHref,
      label: "Upload documents",
      detail: claimCases.length
        ? "Add documents to your latest claim"
        : "Create a claim to continue",
      Icon: Upload,
    },
    {
      href: "/track",
      label: "Track a claim",
      detail: "View status and follow-ups",
      Icon: Activity,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(250, 247, 239, 0.94)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container row-between" style={{ minHeight: 68 }}>
          <Link href="/dashboard" className="row heading" style={{ gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "var(--amber-pale)",
                color: "var(--amber)",
              }}
            >
              <Activity size={18} />
            </span>
            Paytm Sahaayak
          </Link>
          <div className="row" style={{ gap: 14 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn btn-ghost btn-sm">
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: 38, paddingBottom: 72 }}>
        <header
          className="row-between"
          style={{ alignItems: "flex-end", flexWrap: "wrap", marginBottom: 26 }}
        >
          <div>
            <div className="label">Your care, organized</div>
            <h1 className="heading" style={{ margin: "6px 0", fontSize: 30 }}>
              Welcome back, {name}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              Your claims and next steps, in one place.
            </p>
          </div>
          <Link href="/intake" className="btn btn-amber">
            <Plus size={17} aria-hidden="true" />
            Create claim
          </Link>
        </header>

        <section
          aria-label="Claim actions"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 14,
            marginBottom: 38,
          }}
        >
          {actions.map(({ href, label, detail, Icon }) => (
            <Link
              key={label}
              href={href}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 142,
                padding: 18,
                boxShadow: "var(--shadow-sm)",
                transition:
                  "transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out)",
              }}
            >
              <span style={{ color: "var(--amber)" }}>
                <Icon size={21} aria-hidden="true" />
              </span>
              <span>
                <span
                  className="heading"
                  style={{ display: "block", fontSize: 15 }}
                >
                  {label}
                </span>
                <span
                  className="muted"
                  style={{ display: "block", marginTop: 3, fontSize: 13 }}
                >
                  {detail}
                </span>
              </span>
            </Link>
          ))}
        </section>

        <section>
          <div
            className="row-between"
            style={{ flexWrap: "wrap", marginBottom: 14 }}
          >
            <div>
              <h2 className="heading" style={{ margin: 0, fontSize: 19 }}>
                Recent claims
              </h2>
              <p className="muted" style={{ margin: "3px 0 0", fontSize: 13 }}>
                {claimCases.length} active{" "}
                {claimCases.length === 1 ? "claim" : "claims"}
              </p>
            </div>
            <Link href="/intake" className="btn btn-outline btn-sm">
              New claim <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {casesError ? (
            <div className="card" role="alert" style={{ color: "var(--red)" }}>
              We could not load your claims. Please refresh and try again.
            </div>
          ) : claimCases.length === 0 ? (
            <div
              className="card"
              style={{ padding: 28, background: "var(--cream-50)" }}
            >
              <FileText
                size={24}
                style={{ color: "var(--muted)" }}
                aria-hidden="true"
              />
              <h3
                className="heading"
                style={{ margin: "12px 0 4px", fontSize: 17 }}
              >
                No claims yet
              </h3>
              <p
                className="muted"
                style={{ margin: "0 0 16px", maxWidth: 440 }}
              >
                Create a claim first, then add your policy and hospital
                documents.
              </p>
              <Link href="/intake" className="btn btn-primary">
                Start a claim <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div
              className="card"
              style={{ padding: "4px 18px", boxShadow: "var(--shadow-sm)" }}
            >
              {claimCases.map((claim, index) => (
                <Link
                  key={claim.id}
                  href={`/case/${encodeURIComponent(claim.id)}`}
                  className="row-between"
                  style={{
                    minHeight: 76,
                    padding: "12px 2px",
                    borderBottom:
                      index < claimCases.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    gap: 14,
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span
                      className="heading"
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 14,
                      }}
                    >
                      {claim.hospital_name ||
                        `${claim.patient_relation || "Medical"} claim`}
                    </span>
                    <span
                      className="muted"
                      style={{ display: "block", marginTop: 3, fontSize: 12 }}
                    >
                      {claim.case_code} ·{" "}
                      {new Date(claim.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span className="row" style={{ flexShrink: 0, gap: 10 }}>
                    <span className="pill pill-cream">
                      {readableStatus(claim.status)}
                    </span>
                    <ArrowRight
                      size={16}
                      color="var(--muted)"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
