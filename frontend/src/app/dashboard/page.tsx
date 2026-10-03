import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ShieldCheck,
  Landmark,
  Wallet,
  ArrowRight,
  Plus,
  Upload,
  FileCheck,
  FileText,
  Activity,
  PieChart,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { EcosystemFooter } from "@/components/common/EcosystemFooter";
import { SahayakRobot } from "@/components/common/SahayakRobot";

export const metadata: Metadata = {
  title: "Dashboard — Paytm Sahayak",
  description: "AI Financial Journey Assistant for health claims, loans, and payments",
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
  const fullName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Rahul Sharma";

  const firstName = fullName.split(" ")[0];
  const latestCaseId = claimCases[0]?.id;

  const uploadHref = latestCaseId
    ? `/upload?caseId=${encodeURIComponent(latestCaseId)}`
    : "/intake";

  const startWithSahayakHref = latestCaseId
    ? `/case/${encodeURIComponent(latestCaseId)}`
    : "/intake";

  // The 3 Financial Journey Cards directly from Application UI.png
  const journeys = [
    {
      title: "Insurance Claims",
      desc: "Track, resolve and get updates on your health insurance claim",
      href: latestCaseId ? `/case/${latestCaseId}` : "/intake",
      badge: "Active Assistance",
      icon: ShieldCheck,
      iconBg: "#e0f2fe",
      iconColor: "#0284c7",
      borderColor: "#bae6fd",
    },
    {
      title: "Loans",
      desc: "Get financial support and gap funding when you need it",
      href: latestCaseId ? `/case/${latestCaseId}#money-map` : "/dashboard#loans",
      badge: "Instant Approval",
      icon: Landmark,
      iconBg: "#ecfdf5",
      iconColor: "#059669",
      borderColor: "#a7f3d0",
    },
    {
      title: "Payments",
      desc: "Pay bills, recharge and manage your hospital billing transactions",
      href: "/dashboard#payments",
      badge: "Paytm UPI",
      icon: Wallet,
      iconBg: "#f5f3ff",
      iconColor: "#7c3aed",
      borderColor: "#ddd6fe",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      {/* Desktop Left Sidebar */}
      <AppSidebar currentCaseId={latestCaseId} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppNavbar userName={fullName} userEmail={user.email} />

        <main style={{ padding: "30px 24px 70px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
          {/* Greeting */}
          <div style={{ marginBottom: 20 }}>
            <h1
              className="heading"
              style={{
                fontSize: 26,
                color: "#0f172a",
                margin: "0 0 4px",
              }}
            >
              Hi {firstName},
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Your financial journey, simplified.
            </p>
          </div>

          {/* Desktop Dashboard Hero Banner matching Application UI.png */}
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 24,
              border: "1px solid #bfdbfe",
              background: "linear-gradient(135deg, #eef6ff 0%, #f0fdf4 100%)",
              padding: "36px 32px",
              marginBottom: 32,
              boxShadow: "0 4px 20px rgba(0, 41, 112, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                position: "relative",
                zIndex: 2,
              }}
            >
              <div style={{ maxWidth: 580 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0066f5",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  <Sparkles size={14} /> Paytm Sahayak Assistant
                </span>

                <h2
                  className="display"
                  style={{
                    fontSize: "clamp(22px, 3.2vw, 30px)",
                    color: "var(--paytm-navy)",
                    margin: "0 0 10px",
                  }}
                >
                  Need help with your health insurance claim?
                </h2>

                <p
                  style={{
                    fontSize: 15,
                    color: "#334155",
                    lineHeight: 1.6,
                    margin: "0 0 24px",
                  }}
                >
                  Upload your documents, ask questions, or track your claim — all in one place.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <Link
                    href={startWithSahayakHref}
                    className="btn btn-primary"
                    style={{
                      padding: "12px 24px",
                      borderRadius: 14,
                      fontSize: 14.5,
                      fontWeight: 600,
                      gap: 8,
                    }}
                  >
                    Start with Sahayak
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    href="/intake"
                    className="btn btn-outline"
                    style={{
                      padding: "12px 20px",
                      borderRadius: 14,
                      fontSize: 14,
                      background: "#ffffff",
                    }}
                  >
                    <Plus size={16} /> New Claim
                  </Link>
                </div>
              </div>

              {/* 3D Sahayak Robot Mascot */}
              <div className="hidden sm:block" style={{ flexShrink: 0 }}>
                <SahayakRobot size="lg" animated />
              </div>
            </div>
          </section>

          {/* Your Financial Journey Section (From Application UI.png) */}
          <section style={{ marginBottom: 36 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <h3 className="heading" style={{ fontSize: 18, margin: 0, color: "#0f172a" }}>
                  Your Financial Journey
                </h3>
              </div>
              <Link
                href="/dashboard"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0066f5",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                View all <ChevronRight size={15} />
              </Link>
            </div>

            {/* 3 Journey Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 18,
              }}
            >
              {journeys.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className="card hover-lift"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: 180,
                      padding: 22,
                      border: `1px solid ${item.borderColor}`,
                      textDecoration: "none",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: item.iconBg,
                          color: item.iconColor,
                          display: "grid",
                          placeItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <Icon size={22} />
                      </div>

                      <h4
                        className="heading"
                        style={{ fontSize: 16, margin: "0 0 6px", color: "#0f172a" }}
                      >
                        {item.title}
                      </h4>
                      <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                        {item.desc}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0066f5",
                        marginTop: 18,
                      }}
                    >
                      <span>Explore</span>
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Quick Actions List (Screen 2 Mobile in Application UI.png) */}
          <section style={{ marginBottom: 36 }}>
            <h3 className="heading" style={{ fontSize: 16, margin: "0 0 14px", color: "#475569" }}>
              Quick Actions
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              <Link
                href={latestCaseId ? `/case/${latestCaseId}` : "/intake"}
                className="card hover-lift"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "#e0f2fe",
                      color: "#0284c7",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Activity size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                      Check Claim Status
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Track your insurance claim
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </Link>

              <Link
                href={latestCaseId ? `/case/${latestCaseId}#money-map` : "/intake"}
                className="card hover-lift"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "#ecfdf5",
                      color: "#059669",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <PieChart size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                      View Money Map
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      See your bill vs coverage
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </Link>

              <Link
                href={uploadHref}
                className="card hover-lift"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "#eff6ff",
                      color: "#0066f5",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Upload size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                      Upload Documents
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Policy, bill, discharge summary
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </Link>
            </div>
          </section>

          {/* Recent Claims Section */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <h3 className="heading" style={{ fontSize: 18, margin: 0, color: "#0f172a" }}>
                  Recent Claims
                </h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                  {claimCases.length} active {claimCases.length === 1 ? "claim" : "claims"}
                </p>
              </div>

              <Link href="/intake" className="btn btn-outline btn-sm">
                New claim <ArrowRight size={14} />
              </Link>
            </div>

            {casesError ? (
              <div className="card" role="alert" style={{ color: "var(--red)" }}>
                We could not load your claims. Please refresh and try again.
              </div>
            ) : claimCases.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: "36px 24px",
                  textAlign: "center",
                  background: "#ffffff",
                }}
              >
                <FileText
                  size={36}
                  style={{ color: "#94a3b8", margin: "0 auto 12px" }}
                />
                <h4 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                  No claims started yet
                </h4>
                <p className="muted" style={{ margin: "0 auto 20px", maxWidth: 420, fontSize: 13.5 }}>
                  Create a claim to receive real-time coverage calculations, missing document checks, and financing options.
                </p>
                <Link href="/intake" className="btn btn-primary">
                  Start your first claim <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {claimCases.map((claim, index) => (
                  <Link
                    key={claim.id}
                    href={`/case/${encodeURIComponent(claim.id)}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      borderBottom:
                        index < claimCases.length - 1
                          ? "1px solid #f1f5f9"
                          : "none",
                      textDecoration: "none",
                      transition: "background 0.15s ease",
                    }}
                    className="hover:bg-slate-50"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "#e0f2fe",
                          color: "#0284c7",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <ShieldCheck size={20} />
                      </div>

                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: "#0f172a",
                          }}
                        >
                          {claim.hospital_name || `${claim.patient_relation || "Medical"} Claim`}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {claim.case_code || claim.id} ·{" "}
                          {new Date(claim.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="pill pill-green">
                        {readableStatus(claim.status)}
                      </span>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* Ecosystem Footer matching Application UI.png */}
        <EcosystemFooter />
      </div>
    </div>
  );
}
