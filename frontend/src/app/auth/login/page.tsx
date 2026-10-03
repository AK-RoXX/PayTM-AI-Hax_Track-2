'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

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
            Welcome back
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                id="email"
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)' }}>
                  Password
                </label>
                <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
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
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 4, borderRadius: 14 }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" style={{ color: 'var(--navy)', fontWeight: 600 }}>
              Create one free
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
