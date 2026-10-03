'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // No session means the project requires email confirmation first.
    if (data.session) {
      router.push('/intake');
      router.refresh();
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        background: `radial-gradient(ellipse at 30% 30%, rgba(200,131,42,0.08) 0%, transparent 50%), var(--bg)`,
      }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }} className="anim-fade-in">
          <div style={{ fontSize: 56, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Check your inbox</h2>
          <p style={{ color: 'var(--ink-mid)', lineHeight: 1.65, fontSize: 15 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <Link href="/auth/login" className="btn btn-primary" style={{ marginTop: 28, width: '100%' }}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      background: `
        radial-gradient(ellipse at 20% 20%, rgba(200,131,42,0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(26,37,64,0.06) 0%, transparent 50%),
        var(--bg)
      `,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="anim-fade-in-up">
        {/* Brand */}
        <div className="text-center" style={{ marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🩺</div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
              Paytm <span style={{ color: 'var(--amber)' }}>Sahaayak</span>
            </span>
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, marginTop: 20 }}>
            Create your account
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Free — no credit card required</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)', marginBottom: 6 }}>
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Ankit Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="signup-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={error ? 'error' : ''}
              />
            </div>

            <div>
              <label htmlFor="signup-password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)', marginBottom: 6 }}>
                Password
                <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>(min. 8 characters)</span>
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={error ? 'error' : ''}
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--red-pale)', border: '1px solid #f5c6c6',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: 'var(--red)',
              }}>
                {error}
              </div>
            )}

            <button
              id="signup-submit"
              type="submit"
              className="btn btn-amber"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 4, borderRadius: 14 }}
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'var(--navy)', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center" style={{ marginTop: 24, fontSize: 12, color: 'var(--subtle)' }}>
          Prototype only — no real claim submissions
        </p>
      </div>
    </div>
  );
}
