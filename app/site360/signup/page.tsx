'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const C = {
  orange: '#F97316', orangeLight: '#FFF7ED',
  navy: '#0F1E3D', navyLight: '#1E3A5F',
  bg: '#F8FAFC', bgCard: '#FFFFFF',
  border: '#E5EDF6', text: '#111827',
  textSec: '#374151', textMuted: '#6B7280',
  green: '#10B981', greenLight: '#ECFDF5',
  red: '#EF4444', redLight: '#FEF2F2',
};

type Step = 1 | 2 | 3 | 4;

export default function Site360SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [token, setToken] = useState('');
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Step 1 — Account
  const [account, setAccount] = useState({ full_name: '', email: '', password: '', confirmPassword: '' });
  // Step 2 — Site
  const [siteForm, setSiteForm] = useState({ site_name: '', site_code: '', country: '', city: '', pi_name: '', pi_email: '' });
  // Step 3 — Study
  const [studyForm, setStudyForm] = useState({ study_id: '', protocol: '', phase: '', sponsor: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) { setError('Invalid or missing invite token.'); setLoading(false); return; }
    setToken(t);
    validateToken(t);
  }, []);

  async function validateToken(t: string) {
    const { data, error: err } = await supabase
      .from('site360_signup_tokens')
      .select('*')
      .eq('token', t)
      .eq('used', false)
      .single();

    if (err || !data) {
      setError('This invite link is invalid or has already been used.');
      setLoading(false);
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setError('This invite link has expired. Please contact Trial360 OS support.');
      setLoading(false);
      return;
    }

    setTokenData(data);
    setAccount(a => ({ ...a, email: data.email }));
    setSiteForm(s => ({ ...s, site_name: data.site_name || '' }));
    setLoading(false);
  }

  async function handleCreateAccount() {
    if (!account.full_name || !account.email || !account.password) { setError('Please fill in all fields.'); return; }
    if (account.password !== account.confirmPassword) { setError('Passwords do not match.'); return; }
    if (account.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setSaving(true);

    const { error: signupErr } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: { data: { full_name: account.full_name } },
    });

    if (signupErr) {
      // Try signing in if account already exists
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
      if (loginErr) { setError(signupErr.message); setSaving(false); return; }
    }

    setSaving(false);
    setStep(2);
  }

  async function handleCreateSite() {
    if (!siteForm.site_name || !siteForm.pi_name) { setError('Please fill in all required fields.'); return; }
    setError('');
    setStep(3);
  }

  async function handleCreateStudy() {
    if (!studyForm.study_id) { setError('Please enter a Study ID.'); return; }
    setError('');
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get or create org
      let orgId: string;
      const { data: existingRole } = await supabase.from('user_roles').select('org_id').eq('user_id', user.id).single();

      if (existingRole?.org_id) {
        orgId = existingRole.org_id;
      } else {
        const { data: newOrg } = await supabase.from('organizations').insert([{ name: siteForm.site_name, type: 'Site' }]).select().single();
        if (!newOrg) throw new Error('Failed to create organization');
        orgId = newOrg.id;

        await supabase.from('user_roles').insert([{
          user_id: user.id, org_id: orgId, email: user.email,
          full_name: account.full_name, role: 'Site Coordinator', is_active: true,
        }]);
      }

      // Create site
      const { data: newSite } = await supabase.from('sites').insert([{
        org_id: orgId, ...siteForm, status: 'active',
        activation_date: new Date().toISOString().split('T')[0],
        created_by: user.id,
      }]).select().single();
      if (!newSite) throw new Error('Failed to create site');

      // Create study
      const { data: newStudy } = await supabase.from('studies').insert([{
        org_id: orgId, ...studyForm, status: 'Active', created_by: user.id,
      }]).select().single();
      if (!newStudy) throw new Error('Failed to create study');

      // Link site to study
      await supabase.from('site_studies').insert([{
        site_id: newSite.id, study_id: newStudy.id, org_id: orgId, status: 'Active',
        activation_date: new Date().toISOString().split('T')[0],
      }]);

      // Add user to site members
      await supabase.from('site_members').insert([{
        site_id: newSite.id, org_id: orgId, user_id: user.id, role: 'CRC', is_active: true,
      }]);

      // Mark token as used
      await supabase.from('site360_signup_tokens').update({ used: true }).eq('token', token);

      setStep(4);
    } catch (e: any) {
      setError(e.message || 'Setup failed. Please try again.');
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: '14px', padding: '11px 14px',
    border: `1.5px solid ${C.border}`, borderRadius: '10px',
    color: C.text, background: C.bg, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const field = (label: string, required: boolean, el: React.ReactNode) => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {el}
    </div>
  );

  const stepDot = (n: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step >= n ? C.orange : C.border, color: step >= n ? '#fff' : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{n}</div>
      {n < 4 && <div style={{ width: '40px', height: '2px', background: step > n ? C.orange : C.border }} />}
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: C.navy }}>
      <div style={{ color: 'rgba(255,255,255,0.6)' }}>Validating invite...</div>
    </div>
  );

  if (error && !tokenData) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: C.navy, padding: '20px' }}>
      <div style={{ background: C.bgCard, borderRadius: '16px', padding: '32px', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: C.navy, marginBottom: '8px' }}>Invalid Invite</div>
        <div style={{ fontSize: '14px', color: C.textSec, marginBottom: '20px' }}>{error}</div>
        <a href="/site360/home" style={{ display: 'inline-block', padding: '10px 24px', background: C.orange, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Back to Site360</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/favicon.ico" alt="Site360" width={28} height={28} style={{ objectFit: 'contain' }} />
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Site<span style={{ color: C.orange }}>360</span></span>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: C.bgCard, borderRadius: '20px', padding: '36px 32px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

          {/* Progress */}
          {step < 4 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
              {[1, 2, 3, 4].map(n => stepDot(n))}
            </div>
          )}

          {/* Step labels */}
          {step < 4 && (
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: C.navy }}>
                {step === 1 ? 'Create your account' : step === 2 ? 'Set up your site' : 'Add your first study'}
              </div>
              <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '4px' }}>
                {step === 1 ? `Welcome! You've been invited to join Site360.` : step === 2 ? 'Tell us about your clinical research site.' : 'Add the first study your site is participating in.'}
              </div>
            </div>
          )}

          {/* STEP 1 — Account */}
          {step === 1 && (
            <>
              {field('Full name', true, <input type="text" value={account.full_name} onChange={e => setAccount(a => ({ ...a, full_name: e.target.value }))} placeholder="Jane Smith" style={inputStyle} />)}
              {field('Email address', true, <input type="email" value={account.email} disabled style={{ ...inputStyle, background: C.border, color: C.textMuted }} />)}
              {field('Password', true, <input type="password" value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} placeholder="At least 8 characters" style={inputStyle} />)}
              {field('Confirm password', true, <input type="password" value={account.confirmPassword} onChange={e => setAccount(a => ({ ...a, confirmPassword: e.target.value }))} placeholder="Repeat password" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleCreateAccount()} />)}
              {error && <div style={{ marginBottom: '14px', fontSize: '13px', color: C.red, padding: '10px', background: C.redLight, borderRadius: '8px' }}>{error}</div>}
              <button onClick={handleCreateAccount} disabled={saving} style={{ width: '100%', padding: '13px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating account...' : 'Continue →'}
              </button>
            </>
          )}

          {/* STEP 2 — Site */}
          {step === 2 && (
            <>
              {field('Site name', true, <input type="text" value={siteForm.site_name} onChange={e => setSiteForm(s => ({ ...s, site_name: e.target.value }))} placeholder="Mayo Clinic — Rochester" style={inputStyle} />)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>{field('Site code', false, <input type="text" value={siteForm.site_code} onChange={e => setSiteForm(s => ({ ...s, site_code: e.target.value }))} placeholder="MAY-001" style={inputStyle} />)}</div>
                <div>{field('Country', false, <input type="text" value={siteForm.country} onChange={e => setSiteForm(s => ({ ...s, country: e.target.value }))} placeholder="United States" style={inputStyle} />)}</div>
              </div>
              {field('City', false, <input type="text" value={siteForm.city} onChange={e => setSiteForm(s => ({ ...s, city: e.target.value }))} placeholder="Rochester, MN" style={inputStyle} />)}
              {field('Principal Investigator name', true, <input type="text" value={siteForm.pi_name} onChange={e => setSiteForm(s => ({ ...s, pi_name: e.target.value }))} placeholder="Dr. Jane Smith" style={inputStyle} />)}
              {field('PI email', false, <input type="email" value={siteForm.pi_email} onChange={e => setSiteForm(s => ({ ...s, pi_email: e.target.value }))} placeholder="pi@site.com" style={inputStyle} />)}
              {error && <div style={{ marginBottom: '14px', fontSize: '13px', color: C.red, padding: '10px', background: C.redLight, borderRadius: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', border: `1px solid ${C.border}`, borderRadius: '10px', background: C.bgCard, cursor: 'pointer', fontSize: '13px', color: C.textSec }}>← Back</button>
                <button onClick={handleCreateSite} style={{ flex: 2, padding: '12px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Continue →</button>
              </div>
            </>
          )}

          {/* STEP 3 — Study */}
          {step === 3 && (
            <>
              <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '16px', padding: '10px 12px', background: C.bg, borderRadius: '8px' }}>
                You can add more studies later from Site360. Add your first study to get started.
              </div>
              {field('Study ID', true, <input type="text" value={studyForm.study_id} onChange={e => setStudyForm(s => ({ ...s, study_id: e.target.value }))} placeholder="e.g. T003, BCS-101" style={inputStyle} />)}
              {field('Protocol name', false, <input type="text" value={studyForm.protocol} onChange={e => setStudyForm(s => ({ ...s, protocol: e.target.value }))} placeholder="e.g. A Phase II study of..." style={inputStyle} />)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>{field('Phase', false, <select value={studyForm.phase} onChange={e => setStudyForm(s => ({ ...s, phase: e.target.value }))} style={{ ...inputStyle }}><option value="">Select phase</option>{['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Observational'].map(p => <option key={p}>{p}</option>)}</select>)}</div>
                <div>{field('Sponsor', false, <input type="text" value={studyForm.sponsor} onChange={e => setStudyForm(s => ({ ...s, sponsor: e.target.value }))} placeholder="Sponsor name" style={inputStyle} />)}</div>
              </div>
              {error && <div style={{ marginBottom: '14px', fontSize: '13px', color: C.red, padding: '10px', background: C.redLight, borderRadius: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', border: `1px solid ${C.border}`, borderRadius: '10px', background: C.bgCard, cursor: 'pointer', fontSize: '13px', color: C.textSec }}>← Back</button>
                <button onClick={handleCreateStudy} disabled={saving} style={{ flex: 2, padding: '12px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Setting up...' : 'Complete setup →'}
                </button>
              </div>
            </>
          )}

          {/* STEP 4 — Done */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: C.navy, marginBottom: '10px' }}>You're all set!</div>
              <div style={{ fontSize: '14px', color: C.textSec, lineHeight: 1.7, marginBottom: '28px' }}>
                <strong>{siteForm.site_name}</strong> is now set up on Site360. Your first study <strong>{studyForm.study_id}</strong> has been added. Welcome to Trial360 OS.
              </div>
              <button onClick={() => window.location.href = '/site360'} style={{ width: '100%', padding: '14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Go to Site360 Dashboard →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}