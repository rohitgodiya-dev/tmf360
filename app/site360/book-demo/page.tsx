'use client';
import { useState } from 'react';
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

export default function Site360BookDemoPage() {
  const [form, setForm] = useState({
    name: '', role: '', site_name: '', institution: '',
    country: '', email: '', phone: '', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.name || !form.email || !form.site_name || !form.institution) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.from('demo_requests').insert([{
      name: form.name,
      email: form.email,
      company: form.institution,
      role: form.role,
      phone: form.phone,
      message: `Site: ${form.site_name} | Country: ${form.country} | ${form.message}`,
      source: 'site360',
      status: 'pending',
    }]);
    if (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
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
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {el}
    </div>
  );

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
        <div style={{ background: C.bgCard, borderRadius: '20px', padding: '40px 32px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: C.navy, marginBottom: '10px' }}>Request Received!</div>
          <div style={{ fontSize: '14px', color: C.textSec, lineHeight: 1.7, marginBottom: '24px' }}>
            Thank you, <strong>{form.name}</strong>. We have received your demo request for <strong>{form.site_name}</strong>. Our team will review your request and send you a signup link within 1–2 business days.
          </div>
          <a href="/site360/home" style={{ display: 'inline-block', padding: '12px 28px', background: C.orange, color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            Back to Site360
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Nav */}
      <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/favicon.ico" alt="Site360" width={28} height={28} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Site<span style={{ color: C.orange }}>360</span></span>
        </div>
        <a href="/site360/home" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>← Back to Site360</a>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '60px', padding: '40px 40px 80px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Left — value prop */}
        <div style={{ flex: 1, paddingTop: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(249,115,22,0.15)', border: '0.5px solid rgba(249,115,22,0.4)', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.orange, display: 'inline-block' }} />
            <span style={{ fontSize: '12px', color: C.orange, fontWeight: 600 }}>For Clinical Research Sites</span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '16px' }}>
            Book your<br />Site360 demo
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, marginBottom: '32px' }}>
            See how Site360 can help your site manage its ISF, participants, safety reporting, and monitoring visits — all in one inspection-ready platform.
          </p>
          {[
            ['📁', 'Full ISF management aligned to DIA TMF Reference Model'],
            ['👥', 'Participant enrollment and diary compliance tracking'],
            ['⚠', 'AE/SAE reporting and protocol deviation management'],
            ['🔍', 'Monitoring visit preparation and action item tracking'],
            ['🤖', 'Trinity AI — your always-available GCP compliance expert'],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Right — form */}
        <div style={{ background: C.bgCard, borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', flexShrink: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.navy, marginBottom: '4px' }}>Request a demo</div>
          <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '24px' }}>Tell us about your site and we'll be in touch within 1–2 business days.</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Your name', true, <input type="text" value={form.name} onChange={e => update('name')(e.target.value)} placeholder="Jane Smith" style={inputStyle} />)}</div>
            <div>{field('Your role', false, <input type="text" value={form.role} onChange={e => update('role')(e.target.value)} placeholder="CRC, CRA, PI..." style={inputStyle} />)}</div>
          </div>

          {field('Site name', true, <input type="text" value={form.site_name} onChange={e => update('site_name')(e.target.value)} placeholder="Mayo Clinic — Rochester" style={inputStyle} />)}
          {field('Hospital / Institution', true, <input type="text" value={form.institution} onChange={e => update('institution')(e.target.value)} placeholder="Mayo Clinic" style={inputStyle} />)}
          {field('Country', false, <input type="text" value={form.country} onChange={e => update('country')(e.target.value)} placeholder="United States" style={inputStyle} />)}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Work email', true, <input type="email" value={form.email} onChange={e => update('email')(e.target.value)} placeholder="you@site.com" style={inputStyle} />)}</div>
            <div>{field('Phone', false, <input type="tel" value={form.phone} onChange={e => update('phone')(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle} />)}</div>
          </div>

          {field('Message', false, <textarea value={form.message} onChange={e => update('message')(e.target.value)} placeholder="Tell us about your site, how many studies you run, and what you're looking for..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />)}

          {error && <div style={{ marginBottom: '14px', fontSize: '13px', color: C.red, padding: '10px 14px', background: C.redLight, borderRadius: '8px' }}>{error}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '13px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
            {loading ? 'Submitting...' : 'Request a demo →'}
          </button>

          <div style={{ marginTop: '16px', fontSize: '11px', color: C.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
            By submitting this form you agree to our Privacy Policy. We'll only use your information to contact you about Site360.
          </div>
        </div>
      </div>
    </div>
  );
}