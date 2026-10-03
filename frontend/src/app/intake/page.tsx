import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ClaimIntakeForm } from "@/components/intake/ClaimIntakeForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create a claim — Paytm Sahaayak",
};

export default async function IntakePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <main className="shell" style={{ minHeight: "100vh", paddingTop: 28 }}>
      <Link
        href="/dashboard"
        className="row muted"
        style={{ width: "fit-content" }}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Dashboard
      </Link>
      <section className="card" style={{ marginTop: 20 }}>
        <div className="label">New medical claim</div>
        <h1 className="heading" style={{ margin: "8px 0 6px", fontSize: 26 }}>
          Start with what happened
        </h1>
        <p className="muted" style={{ margin: "0 0 22px" }}>
          Add the basic details now. You can upload supporting documents next.
        </p>
        <ClaimIntakeForm />
      </section>
    </main>
  );
}
