'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

const C = {
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  navy: '#0F1E3D',
  navyLight: '#1E3A5F',
  bg: '#F7FAFE',
  bgCard: '#FFFFFF',
  border: '#E5EDF6',
  textPrimary: '#062B63',
  textSec: '#55719C',
  textMuted: '#8FA3BE',
  green: '#0AAF72',
  greenLight: '#E8F9F2',
  red: '#E53935',
  redLight: '#FFF0F1',
};

type Lang = 'en' | 'es';
type Mode = 'password' | 'magic';

const STRINGS = {
  en: {
    welcome: 'Welcome to your study portal',
    sub: 'Sign in to access your diary, activities, and study information.',
    email: 'Email address',
    emailPlaceholder: 'your@email.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    sendMagicLink: 'Send magic link',
    sendingLink: 'Sending...',
    magicLinkSent: 'Check your email',
    magicLinkSub: 'We sent a sign-in link to your email. Tap the link to access your portal.',
    switchToMagic: 'Sign in without password',
    switchToPassword: 'Sign in with password',
    forgotPassword: 'Forgot password?',
    errorInvalid: 'Invalid email or password. Please try again.',
    errorGeneral: 'Something went wrong. Please try again.',
    poweredBy: 'Powered by Trial360 OS',
    privacy: 'Your data is protected and encrypted.',
    language: 'Español',
    noAccount: 'Your account is created by your study team. Contact your site coordinator if you need access.',
  },
  es: {
    welcome: 'Bienvenido a su portal del estudio',
    sub: 'Inicie sesión para acceder a su diario, actividades e información del estudio.',
    email: 'Correo electrónico',
    emailPlaceholder: 'su@correo.com',
    password: 'Contraseña',
    passwordPlaceholder: '••••••••',
    signIn: 'Iniciar sesión',
    signingIn: 'Iniciando sesión...',
    sendMagicLink: 'Enviar enlace mágico',
    sendingLink: 'Enviando...',
    magicLinkSent: 'Revise su correo',
    magicLinkSub: 'Enviamos un enlace de acceso a su correo. Toque el enlace para acceder a su portal.',
    switchToMagic: 'Iniciar sesión sin contraseña',
    switchToPassword: 'Iniciar sesión con contraseña',
    forgotPassword: '¿Olvidó su contraseña?',
    errorInvalid: 'Correo o contraseña incorrectos. Por favor intente de nuevo.',
    errorGeneral: 'Algo salió mal. Por favor intente de nuevo.',
    poweredBy: 'Desarrollado por Trial360 OS',
    privacy: 'Sus datos están protegidos y encriptados.',
    language: 'English',
    noAccount: 'Su cuenta es creada por su equipo del estudio. Comuníquese con el coordinador del sitio si necesita acceso.',
  },
};

export default function ParticipantLoginPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const t = STRINGS[lang];

  async function handlePasswordLogin() {
    if (!email.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(t.errorInvalid);
      setLoading(false);
      return;
    }
    // Verify this user is a registered participant
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('email', email.trim())
      .single();
    if (!participant) {
      await supabase.auth.signOut();
      setError(lang === 'en'
        ? 'No participant account found. Contact your study coordinator.'
        : 'No se encontró cuenta de participante. Contacte a su coordinador del estudio.');
      setLoading(false);
      return;
    }
    window.location.href = '/participant360';
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/participant360` },
    });
    if (err) {
      setError(t.errorGeneral);
      setLoading(false);
      return;
    }
    setMagicSent(true);
    setLoading(false);
  }

  // ── Magic link sent screen ───────────────────────────────────────────────
  if (magicSent) {
    return (
      <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px' }}>
        <div style={{ background: C.bgCard, borderRadius: '20px', padding: '32px 24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary, marginBottom: '10px' }}>{t.magicLinkSent}</div>
          <div style={{ fontSize: '14px', color: C.textSec, lineHeight: 1.6, marginBottom: '24px' }}>{t.magicLinkSub}</div>
          <div style={{ fontSize: '12px', color: C.textMuted, padding: '10px', background: C.bg, borderRadius: '10px' }}>{email}</div>
          <button
            onClick={() => { setMagicSent(false); setMode('password'); }}
            style={{ marginTop: '20px', background: 'none', border: 'none', color: C.orange, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {t.switchToPassword}
          </button>
        </div>
      </div>
    );
  }

  // ── Login screen ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top bar */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/favicon.ico" alt="Participant360" width={28} height={28} style={{ objectFit: 'contain' }} />
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Participant<span style={{ color: C.orange }}>360</span></div>
        </div>
        <button
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
        >
          {t.language}
        </button>
      </div>

      {/* Main card */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: C.bgCard, borderRadius: '20px', padding: '28px 24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary, marginBottom: '6px' }}>{t.welcome}</div>
            <div style={{ fontSize: '13px', color: C.textSec, lineHeight: 1.6 }}>{t.sub}</div>
          </div>

          {/* Email field */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '6px' }}>{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? handlePasswordLogin() : handleMagicLink())}
              style={{ width: '100%', fontSize: '15px', padding: '13px 14px', border: `1.5px solid ${C.border}`, borderRadius: '10px', color: C.textPrimary, background: C.bg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            />
          </div>

          {/* Password field */}
          {mode === 'password' && (
            <div style={{ marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '6px' }}>{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                style={{ width: '100%', fontSize: '15px', padding: '13px 14px', border: `1.5px solid ${C.border}`, borderRadius: '10px', color: C.textPrimary, background: C.bg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
              />
            </div>
          )}

          {/* Forgot password */}
          {mode === 'password' && (
            <div style={{ textAlign: 'right', marginBottom: '18px' }}>
              <button
                onClick={async () => {
                  if (!email.trim()) { setError('Please enter your email first.'); return; }
                  await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/participant360` });
                  alert('Password reset email sent.');
                }}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: C.orange, cursor: 'pointer', fontWeight: 500 }}
              >
                {t.forgotPassword}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: '14px', fontSize: '13px', color: C.red, padding: '10px 14px', background: C.redLight, borderRadius: '8px' }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={mode === 'password' ? handlePasswordLogin : handleMagicLink}
            disabled={loading || !email.trim() || (mode === 'password' && !password.trim())}
            style={{ width: '100%', padding: '14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !email.trim() || (mode === 'password' && !password.trim()) ? 0.6 : 1, transition: 'all 0.15s', fontFamily: 'inherit', marginBottom: '14px' }}
          >
            {loading ? (mode === 'password' ? t.signingIn : t.sendingLink) : (mode === 'password' ? t.signIn : t.sendMagicLink)}
          </button>

          {/* Mode toggle */}
          <button
            onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(''); }}
            style={{ width: '100%', padding: '12px', background: 'transparent', color: C.textSec, border: `1px solid ${C.border}`, borderRadius: '12px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {mode === 'password' ? t.switchToMagic : t.switchToPassword}
          </button>

          {/* No account note */}
          <div style={{ marginTop: '20px', padding: '12px 14px', background: C.bg, borderRadius: '10px', fontSize: '11px', color: C.textMuted, lineHeight: 1.6, textAlign: 'center' }}>
            {t.noAccount}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{t.privacy}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{t.poweredBy}</div>
      </div>

    </div>
  );
}