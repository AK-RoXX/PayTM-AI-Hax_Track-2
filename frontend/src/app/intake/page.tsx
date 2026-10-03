import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ClaimIntakeForm } from "@/components/intake/ClaimIntakeForm";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { EcosystemFooter } from "@/components/common/EcosystemFooter";

export const metadata: Metadata = {
  title: "New Claim — Paytm Sahayak",
  description: "Start a new health insurance claim and medical financial journey.",
};

export default async function IntakePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Rahul Sharma";

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <AppSidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppNavbar userName={fullName} userEmail={user.email} />

        <main style={{ padding: "30px 20px 70px", maxWidth: 860, width: "100%", margin: "0 auto" }}>
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
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
          </div>

          <section className="card" style={{ padding: "32px 28px" }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="label" style={{ color: "#0066f5" }}>New Claim Case</span>
                <span className="pill pill-blue">Step 1 of 2</span>
              </div>
              <h1 className="heading" style={{ fontSize: 26, margin: "2px 0 6px", color: "var(--paytm-navy)" }}>
                Start with What Happened
              </h1>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Describe your hospitalization emergency. You can upload policies and medical bills in the next step.
              </p>
            </div>

            <ClaimIntakeForm />
          </section>
        </main>

        <EcosystemFooter />
      </div>
    </div>
  );
}
