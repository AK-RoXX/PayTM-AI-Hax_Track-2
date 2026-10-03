import Link from "next/link";
import type { Metadata } from "next";
import {
  ShieldCheck,
  Landmark,
  Wallet,
  CreditCard,
  Mic,
  ArrowRight,
  FileText,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight,
  Upload,
  Activity,
  PieChart,
} from "lucide-react";
import { PaytmLogo } from "@/components/common/PaytmLogo";
import { SahayakRobot } from "@/components/common/SahayakRobot";
import { EcosystemFooter } from "@/components/common/EcosystemFooter";

export const metadata: Metadata = {
  title: "Paytm Sahayak — Your AI Partner for Insurance, Loans & More",
  description:
    "AI Financial Journey Assistant for health claims, medical bills, loans, and payments. Get clear coverage breakdowns, evidence-backed answers, and one next step.",
};

const serviceCategories = [
  {
    label: "Insurance",
    desc: "Claims & Policies",
    icon: ShieldCheck,
    bg: "#e0f2fe",
    color: "#0284c7",
    href: "/intake",
  },
  {
    label: "Loans",
    desc: "Hospital Gap Funding",
    icon: Landmark,
    bg: "#ecfdf5",
    color: "#059669",
    href: "/dashboard#loans",
  },
  {
    label: "Payments",
    desc: "Hospital Bills & UPI",
    icon: Wallet,
    bg: "#f5f3ff",
    color: "#7c3aed",
    href: "/dashboard#payments",
  },
  {
    label: "Credit",
    desc: "Instant Medical Limit",
    icon: CreditCard,
    bg: "#e0f7fa",
    color: "#00acc1",
    href: "/dashboard#credit",
  },
];

const pillars = [
  {
    title: "Understand your needs",
    desc: "Speak naturally in Hindi, Hinglish, or English. Tell Sahayak about hospital admission or emergency costs.",
  },
  {
    title: "Read your documents",
    desc: "Upload insurance policies, hospital bills, and discharge summaries. AI extracts policy limits and deductibles.",
  },
  {
    title: "Guide you step-by-step",
    desc: "See a clear Money Map breakdown: what insurance covers, your out-of-pocket gap, and what is under review.",
  },
  {
    title: "Take action for you",
    desc: "Automate document submissions, check cashless status in real-time, and access Paytm instant financing when needed.",
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* ── Top Navigation ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 68,
          }}
        >
          <PaytmLogo size="md" subtitleText="AI Financial Journey Assistant" href="/" />

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/auth/login" className="btn btn-outline btn-sm">
              Sign in
            </Link>
            <Link href="/auth/signup" className="btn btn-primary btn-sm" style={{ borderRadius: 20 }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section matching Desktop Dashboard & Onboarding Screen ── */}
      <section style={{ padding: "50px 24px 40px", position: "relative", overflow: "hidden" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 40,
              alignItems: "center",
            }}
          >
            {/* Left Column: Heading & Value Prop */}
            <div className="anim-fade-in-up">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 14px",
                  borderRadius: 20,
                  background: "#e0f2fe",
                  border: "1px solid #bae6fd",
                  color: "#0369a1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                <Sparkles size={14} /> Paytm Sahayak AI
              </div>

              <h1
                className="display"
                style={{
                  fontSize: "clamp(34px, 5vw, 54px)",
                  color: "var(--paytm-navy)",
                  margin: "0 0 16px",
                }}
              >
                Your AI partner for <br />
                <span style={{ color: "#0066f5" }}>Insurance, Loans &amp; More</span>
              </h1>

              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.65,
                  color: "#475569",
                  marginBottom: 28,
                  maxWidth: 540,
                }}
              >
                Evidence-first financial assistant for medical emergencies and hospital bills. Understand your policy coverage, calculate out-of-pocket costs, and get one clear next step in seconds.
              </p>

              {/* Quick Prompts Box */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 18,
                  padding: "8px 10px 8px 18px",
                  boxShadow: "0 4px 20px rgba(0, 41, 112, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  maxWidth: 500,
                  marginBottom: 24,
                }}
              >
                <div style={{ flex: 1, fontSize: 13.5, color: "#64748b" }}>
                  &ldquo;Mummy hospital mein admit hain. Bill ₹3 Lakh hai...&rdquo;
                </div>
                <Link
                  href="/auth/signup"
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: 12, gap: 6 }}
                >
                  <Mic size={15} /> Try Sahayak
                </Link>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <Link
                  href="/auth/signup"
                  className="btn btn-primary btn-lg"
                  style={{ borderRadius: 14 }}
                >
                  Start with Sahayak <ArrowRight size={17} />
                </Link>
                <Link
                  href="/auth/login"
                  className="btn btn-outline btn-lg"
                  style={{ borderRadius: 14 }}
                >
                  View My Claims
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{ marginTop: 28, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "#475569" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} /> 100% Free to Use
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} /> Hindi / Hinglish / English
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Lock size={15} style={{ color: "#0066f5" }} /> Bank-Grade Privacy
                </span>
              </div>
            </div>

            {/* Right Column: Hero Mascot & Live Interactive Preview */}
            <div className="anim-fade-in" style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 28,
                  padding: 24,
                  border: "1px solid #bfdbfe",
                  boxShadow: "0 20px 50px rgba(0, 41, 112, 0.1)",
                  maxWidth: 460,
                  width: "100%",
                }}
              >
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <SahayakRobot size="lg" online animated />
                  <h3
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 800,
                      fontSize: 22,
                      color: "var(--paytm-navy)",
                      margin: "12px 0 2px",
                    }}
                  >
                    Sahayak
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    Your AI financial journey assistant
                  </p>
                </div>

                {/* 4 Category Pill Buttons (from Mobile Screen 2 in Application UI.png) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {serviceCategories.map((cat, i) => {
                    const Icon = cat.icon;
                    return (
                      <Link
                        key={i}
                        href={cat.href}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "10px 4px",
                          borderRadius: 14,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          textDecoration: "none",
                          transition: "transform 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: cat.bg,
                            color: cat.color,
                            display: "grid",
                            placeItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>
                          {cat.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Money Map Preview Card */}
                <div
                  style={{
                    background: "#f8fbff",
                    border: "1px solid #dbeafe",
                    borderRadius: 16,
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0066f5", textTransform: "uppercase" }}>
                      Hospital Bill Breakdown
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                      ₹3,00,000
                    </span>
                  </div>

                  <div style={{ height: 8, borderRadius: 4, display: "flex", overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ width: "70%", background: "#10b981" }} />
                    <div style={{ width: "13%", background: "#f59e0b" }} />
                    <div style={{ width: "17%", background: "#8b5cf6" }} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "#059669", fontWeight: 700 }}>₹2,10,000 Approved</span>
                    <span style={{ color: "#d97706", fontWeight: 700 }}>₹40,000 Out-of-Pocket</span>
                    <span style={{ color: "#7c3aed", fontWeight: 700 }}>₹50,000 Review</span>
                  </div>
                </div>

                <Link
                  href="/auth/signup"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    marginTop: 18,
                    borderRadius: 14,
                    padding: "13px",
                  }}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Core Capabilities Section (from Screen 1 in Application UI.png) ── */}
      <section style={{ padding: "60px 24px", background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="label" style={{ color: "#0066f5", display: "block", marginBottom: 6 }}>
              AI Financial Journey
            </span>
            <h2 className="heading" style={{ fontSize: 32, color: "var(--paytm-navy)", margin: 0 }}>
              Built for stressful medical moments
            </h2>
            <p className="muted" style={{ margin: "8px auto 0", maxWidth: 520, fontSize: 15 }}>
              From initial hospital admission to final cashless settlement and gap financing.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 24,
            }}
          >
            {pillars.map((item, idx) => (
              <div
                key={idx}
                className="card hover-lift"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                  borderRadius: 18,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "#eff6ff",
                    color: "#0066f5",
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: "grid",
                    placeItems: "center",
                    marginBottom: 16,
                  }}
                >
                  0{idx + 1}
                </div>
                <h3 className="heading" style={{ fontSize: 17, margin: "0 0 8px", color: "#0f172a" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 13.5, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ready to start Banner ── */}
      <section style={{ padding: "60px 24px 80px" }}>
        <div
          className="container"
          style={{
            background: "linear-gradient(135deg, #002970 0%, #004b99 100%)",
            borderRadius: 28,
            padding: "48px 32px",
            color: "#ffffff",
            textAlign: "center",
            boxShadow: "0 16px 40px rgba(0, 41, 112, 0.16)",
          }}
        >
          <h2
            className="display"
            style={{ fontSize: "clamp(26px, 4vw, 36px)", color: "#ffffff", margin: "0 0 12px" }}
          >
            Start your medical claim case in 60 seconds
          </h2>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: 16,
              maxWidth: 520,
              margin: "0 auto 28px",
              lineHeight: 1.6,
            }}
          >
            No paperwork hassle. Upload your policy and bills, and let Paytm Sahayak calculate what insurance pays and what you owe.
          </p>
          <Link
            href="/auth/signup"
            className="btn btn-primary"
            style={{
              background: "#00baf2",
              color: "#002970",
              fontWeight: 700,
              fontSize: 15,
              padding: "14px 28px",
              borderRadius: 24,
            }}
          >
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* ── Ecosystem Footer from Application UI.png ── */}
      <EcosystemFooter />
    </div>
  );
}
