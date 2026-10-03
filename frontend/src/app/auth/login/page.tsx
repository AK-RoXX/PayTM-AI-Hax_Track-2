'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PaytmLogo } from '@/components/common/PaytmLogo';
import { SahayakRobot } from '@/components/common/SahayakRobot';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(0, 186, 242, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(0, 41, 112, 0.06) 0%, transparent 50%),
          var(--bg)
        `,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }} className="anim-fade-in-up">
        {/* Brand */}
        <div className="text-center" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <SahayakRobot size="md" online animated />
          </div>
          <PaytmLogo size="lg" subtitleText="AI Financial Journey Assistant" href="/" />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--paytm-navy)',
              marginBottom: 4,
              marginTop: 18,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>
            Sign in to access your claims &amp; Money Map
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px', borderRadius: 20 }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink-mid)',
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? 'error' : ''}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label
                  htmlFor="password"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)' }}
                >
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  style={{ fontSize: 12, color: 'var(--primary-blue)', fontWeight: 500 }}
                >
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
                onChange={(e) => setPassword(e.target.value)}
                className={error ? 'error' : ''}
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--red-pale)',
                  border: '1px solid var(--red-border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--red-dark)',
                }}
              >
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                fontSize: 15,
                marginTop: 4,
                borderRadius: 14,
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="divider" style={{ margin: '22px 0' }} />

          <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              style={{ color: 'var(--primary-blue)', fontWeight: 700 }}
            >
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center" style={{ marginTop: 24, fontSize: 12, color: 'var(--subtle)' }}>
          Paytm Sahayak · Protected by 256-bit encryption
        </p>
      </div>
    </div>
  );
}
