'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AcceptInvitePage() {
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || '';
    setToken(t);
    if (!t) { setError('No invite token found in this link.'); setLoading(false); return; }
    fetch(`/api/site360-invite/validate?token=${t}`)
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setInvite(data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/site360-invite/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSubmitting(false); return; }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: data.email, password });
      if (signInErr) { setError('Account created — please sign in.'); window.location.href = '/site360/login'; return; }
      window.location.href = '/site360';
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
      setSubmitting(false);
    }
  }

  const C = { orange: '#F97316', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', red: '#EF4444', redLight: '#FEF2F2' };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>Loading invite...</div>;

  if (error && !invite) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ fontSize: '16px', color: C.text, marginBottom: '8px' }}>{error}</div>
        <a href="/site360/login" style={{ fontSize: '13px', color: C.orange }}>Go to sign in</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#F9FAFB' }}>
      <div style={{ background: '#fff', border: `0.5px solid ${C.border}`, borderRadius: '16px', padding: '2rem', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>Site<span style={{ color: C.orange }}>360</span></div>
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px' }}>Set up your account</div>
          <div style={{ fontSize: '13px', marginTop: '10px' }}>{invite.email} — <strong>{invite.role}</strong></div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#374151', display: 'block', marginBottom: '4px' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '11px', color: '#374151', display: 'block', marginBottom: '4px' }}>Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', boxSizing: 'border-box' as const }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        {error && <div style={{ fontSize: '11px', color: C.red, background: C.redLight, padding: '8px 10px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}
        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '10px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Creating account...' : 'Set password & continue'}
        </button>
      </div>
    </div>
  );
}