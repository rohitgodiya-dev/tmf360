'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

const C = {
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  navy: '#0F1E3D',
  navyLight: '#1E3A5F',
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  border: '#E5EDF6',
  text: '#111827',
  textSec: '#374151',
  textMuted: '#6B7280',
  green: '#10B981',
  greenLight: '#ECFDF5',
  red: '#EF4444',
  redLight: '#FEF2F2',
};

export default function Site360LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    // Verify user has a site role
    const { data: ur } = await supabase
      .from('user_roles')
      .select('role, org_id')
      .eq('email', email.trim())
      .eq('is_active', true)
      .single();

    if (!ur) {
      await supabase.auth.signOut();
      setError('No site account found for this email. Contact your administrator.');
      setLoading(false);
      return;
    }

    window.location.href = '/site360';
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Top bar */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/favicon.ico" alt="Site360" width={28} height={28} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            Site<span style={{ color: C.orange }}>360</span>
          </span>
        </div>
        <a href="/site360/home" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          ← Back to Site360
        </a>
      </div>

      {/* Login card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{
          background: C.bgCard,
          borderRadius: '20px',
          padding: '36px 32px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: C.navy, marginBottom: '6px' }}>
              Sign in to Site360
            </div>
            <div style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.6 }}>
              Access your site dashboard, ISF, participants, safety reporting, and monitoring visits.
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '6px' }}>
              Work email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@organisation.com"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                fontSize: '14px',
                padding: '11px 14px',
                border: `1.5px solid ${C.border}`,
                borderRadius: '10px',
                color: C.text,
                background: C.bg,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: C.textSec }}>Password</label>
              <button
                onClick={async () => {
                  if (!email.trim()) { setError('Enter your email first.'); return; }
                  await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/site360`,
                  });
                  alert('Password reset email sent.');
                }}
                style={{ fontSize: '12px', color: C.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                fontSize: '14px',
                padding: '11px 14px',
                border: `1.5px solid ${C.border}`,
                borderRadius: '10px',
                color: C.text,
                background: C.bg,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '16px',
              fontSize: '13px',
              color: C.red,
              padding: '10px 14px',
              background: C.redLight,
              borderRadius: '8px',
              border: `0.5px solid #FECACA`,
            }}>
              {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            disabled={loading || !email.trim() || !password.trim()}
            style={{
              width: '100%',
              padding: '13px',
              background: C.orange,
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !email.trim() || !password.trim() ? 0.6 : 1,
              fontFamily: 'inherit',
              marginBottom: '16px',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in to Site360'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: C.border }} />
            <span style={{ fontSize: '12px', color: C.textMuted }}>or</span>
            <div style={{ flex: 1, height: '1px', background: C.border }} />
          </div>

          {/* Platform link */}
          <a
            href="/platform"
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              textAlign: 'center' as const,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: C.navy,
              textDecoration: 'none',
              boxSizing: 'border-box' as const,
            }}
          >
            Go to Trial360 OS Platform
          </a>

          {/* Note */}
          <div style={{
            marginTop: '20px',
            padding: '12px 14px',
            background: C.bg,
            borderRadius: '10px',
            fontSize: '11px',
            color: C.textMuted,
            lineHeight: 1.6,
            textAlign: 'center' as const,
          }}>
            Your account is created by your sponsor or CRO. Contact your administrator if you need access.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 32px', textAlign: 'center' as const }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          Site360 · Part of Trial360 OS · trial360os.com
        </div>
      </div>
    </div>
  );
}