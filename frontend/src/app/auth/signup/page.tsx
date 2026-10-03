'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PaytmLogo } from '@/components/common/PaytmLogo';
import { SahayakRobot } from '@/components/common/SahayakRobot';

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

    if (data.session) {
      router.push('/intake');
      router.refresh();
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg)',
        }}
      >
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }} className="anim-fade-in">
          <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--paytm-navy)', marginBottom: 8 }}>
            Check your inbox
          </h2>
          <p style={{ color: 'var(--ink-mid)', lineHeight: 1.6, fontSize: 14.5 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your Paytm Sahayak account.
          </p>
          <Link
            href="/auth/login"
            className="btn btn-primary"
            style={{ marginTop: 24, width: '100%', borderRadius: 14 }}
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

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
        <div className="text-center" style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <SahayakRobot size="md" online animated />
          </div>
          <PaytmLogo size="lg" subtitleText="AI Financial Journey Assistant" href="/" />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--paytm-navy)',
              marginBottom: 4,
              marginTop: 16,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Create your account
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>
            Get instant health claim analysis &amp; financing options
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px', borderRadius: 20 }}>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="name"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink-mid)',
                  marginBottom: 6,
                }}
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink-mid)',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="At least 8 characters"
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
              id="signup-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                fontSize: 15,
                marginTop: 6,
                borderRadius: 14,
              }}
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <div className="divider" style={{ margin: '22px 0' }} />

          <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Already have an account?{' '}
            <Link
              href="/auth/login"
              style={{ color: 'var(--primary-blue)', fontWeight: 700 }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center" style={{ marginTop: 22, fontSize: 12, color: 'var(--subtle)' }}>
          By continuing, you agree to Paytm Sahayak Terms of Service
        </p>
      </div>
    </div>
  );
}
