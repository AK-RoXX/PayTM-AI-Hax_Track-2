import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paytm Sahaayak — Your AI Financial Case Manager',
  description:
    'Evidence-first AI assistant for medical emergencies. Understand your insurance coverage, collect documents, and get one clear next step — in seconds.',
};

const features = [
  {
    icon: '🛡️',
    title: 'Insurance Coverage Analysis',
    desc: "Upload your policy and hospital documents. Sahaayak reads them so you don't have to.",
  },
  {
    icon: '📄',
    title: 'Multi-Format Document Upload',
    desc: 'PDFs, images, and Word docs — all processed with AI. Stored securely and searchable.',
  },
  {
    icon: '💰',
    title: 'Financial Gap Planning',
    desc: 'Get a clear planning estimate: hospital bill minus possible coverage equals your planning gap.',
  },
  {
    icon: '✅',
    title: 'Claim Readiness Score',
    desc: "Know exactly which documents are verified and what's missing — before you submit.",
  },
  {
    icon: '🔍',
    title: 'Evidence-Backed Answers',
    desc: 'Every answer cites the exact document, page, and clause. No guessing, no false claims.',
  },
  {
    icon: '🔔',
    title: 'Smart Reminders',
    desc: 'Automated reminders for missing documents and claim status updates via n8n workflows.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Describe your situation',
    desc: 'Tell Sahaayak about the hospitalization in Hindi, Hinglish, or English — voice or text.',
  },
  {
    num: '02',
    title: 'Upload documents',
    desc: 'Add your insurance policy, hospital estimate, admission records, and more.',
  },
  {
    num: '03',
    title: 'Get your claim readiness',
    desc: 'See your coverage estimate, missing items, and one clear next action.',
  },
];

const trust = ['Free to use', 'No data shared without consent', 'Hindi / Hinglish / English'];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,247,239,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1120, margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🩺</div>
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
              Paytm <span style={{ color: 'var(--amber)' }}>Sahaayak</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/auth/login" className="btn btn-outline btn-sm">Sign in</Link>
            <Link href="/auth/signup" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '80px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 500, height: 500,
          borderRadius: '50%', opacity: 0.06,
          background: 'radial-gradient(circle, var(--amber) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -60, width: 350, height: 350,
          borderRadius: '50%', opacity: 0.05,
          background: 'radial-gradient(circle, var(--navy) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1120, margin: 'auto', display: 'grid', gap: 60, alignItems: 'center',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

          <div className="anim-fade-in-up" style={{ maxWidth: 620 }}>
            
            <h1 className="display" style={{ fontSize: 'clamp(38px, 6vw, 64px)', marginBottom: 20, color: 'var(--navy)' }}>
              One clear next step<br />
              <span style={{ color: 'var(--amber)' }}>when money is urgent.</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--ink-mid)', marginBottom: 36, maxWidth: 520 }}>
              Paytm Sahaayak is an evidence-first AI financial case manager for hospital bills and insurance claims.
              Upload your documents, understand your coverage, and know exactly what to do next — in minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/auth/signup" className="btn btn-amber btn-lg">
                Start my claim case →
              </Link>
              <Link href="/auth/login" className="btn btn-outline btn-lg">
                Sign in
              </Link>
            </div>
            <div style={{ marginTop: 28, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {trust.map((t) => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-mid)' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="anim-fade-in" style={{ animationDelay: '0.2s' }}>
            <div style={{
              background: 'var(--surface)', borderRadius: 28, padding: 12,
              boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)',
              maxWidth: 540, margin: 'auto',
            }}>
              <Image
                src="/hero-illustration.jpg"
                alt="Paytm Sahaayak — insurance claim assistant illustration"
                width={540}
                height={405}
                style={{ borderRadius: 20, width: '100%', height: 'auto' }}
                priority
              />
              <div style={{
                margin: '14px 8px 8px',
                background: 'var(--cream-100)', borderRadius: 16, padding: '14px 18px',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: 'var(--green-pale)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                }}>📋</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>CLAIM READINESS</div>
                  <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 15 }}>90% ready</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Upload discharge summary to proceed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{
        padding: '80px 24px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ maxWidth: 1120, margin: 'auto' }}>
          <div className="text-center" style={{ marginBottom: 56 }}>
            <span className="label" style={{ marginBottom: 10, display: 'block' }}>How it works</span>
            <h2 className="heading" style={{ fontSize: 36, color: 'var(--navy)' }}>Three steps to clarity</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {steps.map((s, i) => (
              <div key={i}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, background: 'var(--amber-pale)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                }}>
                  <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 20, color: 'var(--amber)' }}>{s.num}</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: 'var(--navy)' }}>{s.title}</h3>
                <p style={{ color: 'var(--ink-mid)', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1120, margin: 'auto' }}>
          <div className="text-center" style={{ marginBottom: 56 }}>
            <span className="label" style={{ marginBottom: 10, display: 'block' }}>Everything you need</span>
            <h2 className="heading" style={{ fontSize: 36, color: 'var(--navy)' }}>Built for stressful moments</h2>
            <p style={{ marginTop: 12, color: 'var(--ink-mid)', maxWidth: 500, margin: '12px auto 0' }}>
              Every feature is designed to cut through confusion and give you one actionable answer.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {features.map((f, i) => (
              /* hover-lift uses pure CSS :hover — no JS handlers needed */
              <div key={i} className="card hover-lift" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: 'var(--cream-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0, border: '1px solid var(--border-subtle)',
                }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 5, color: 'var(--navy)' }}>{f.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-mid)', lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: '80px 24px',
        background: 'var(--navy)', borderRadius: 32,
        maxWidth: 1072, margin: '0 auto 80px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 400, height: 400,
          borderRadius: '50%', opacity: 0.08,
          background: 'radial-gradient(circle, var(--amber-light) 0%, transparent 70%)',
        }} />
        <h2 className="display" style={{ fontSize: 40, color: '#fff', marginBottom: 16 }}>
          Start your case in 60 seconds.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 17, maxWidth: 440, margin: '0 auto 36px' }}>
          No confusing jargon. No waiting on hold. Just clear, evidence-backed guidance for your medical emergency.
        </p>
        <Link href="/auth/signup" className="btn btn-amber btn-lg" style={{ fontSize: 16 }}>
          Create a free account →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          © 2025 Paytm Sahaayak Prototype · Built for Sarvam AI × Cognee Hackathon
        </p>
      </footer>
    </div>
  );
}
