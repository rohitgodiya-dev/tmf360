"use client";
// Two-factor sign-in (Part 14d, PLT-01): authenticator-app codes (TOTP) via Supabase Auth.
// MfaGate asks for the code after the password when the account has a factor; MfaSettings lets a user
// set one up or remove it, and lets administrators require it and set the SSO email domain.
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { apiFetch } from "../../lib/api/client";

const C = { primary: "#F97316", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5" };
const input: React.CSSProperties = { width: "100%", fontSize: "13px", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: "8px", boxSizing: "border-box" };
const btn = (primary = false): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "8px 14px", borderRadius: "8px", cursor: "pointer", border: primary ? "none" : `0.5px solid ${C.border}`, background: primary ? C.primary : C.bg, color: primary ? "#fff" : C.textSec });

/** Does this session still need the second factor? */
export async function needsSecondFactor(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return !!data && data.currentLevel === "aal1" && data.nextLevel === "aal2";
}

export function MfaGate({ onPass, onSignOut }: { onPass: () => void; onSignOut: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const { data: f, error: lErr } = await supabase.auth.mfa.listFactors();
      if (lErr) throw lErr;
      const factor = f.totp.find((x) => x.status === "verified");
      if (!factor) throw new Error("No authenticator is set up for this account");
      const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
      if (vErr) throw new Error("That code is not correct or has expired");
      onPass();
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bgSec }}>
      <form onSubmit={verify} style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "16px", padding: "2rem", width: "340px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700, color: C.text }}><i className="ti ti-shield-lock" style={{ color: C.primary }} /> Two-factor sign-in</div>
        <div style={{ fontSize: "12px", color: C.textTert }}>Enter the 6-digit code from your authenticator app.</div>
        <input aria-label="Authenticator code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoFocus autoComplete="one-time-code"
          style={{ ...input, fontSize: "20px", letterSpacing: "6px", textAlign: "center", fontFamily: "monospace" }} />
        {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "6px 10px" }}>{error}</div>}
        <button type="submit" disabled={busy || code.length !== 6} style={{ ...btn(true), opacity: busy || code.length !== 6 ? 0.6 : 1 }}>{busy ? "Checking…" : "Verify"}</button>
        <button type="button" onClick={onSignOut} style={btn()}>Sign out</button>
      </form>
    </div>
  );
}

type Factor = { id: string; friendly_name?: string; status: string; created_at: string };

export function MfaSettings({ isAdmin }: { isAdmin: boolean }) {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [policy, setPolicy] = useState<{ require_mfa: boolean; sso_domain: string | null; session_aal: string | null } | null>(null);
  const [form, setForm] = useState({ require_mfa: false, sso_domain: "", reason: "" });

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
    apiFetch<{ require_mfa: boolean; sso_domain: string | null; session_aal: string | null }>("/security-settings")
      .then((p) => { setPolicy(p); setForm({ require_mfa: p.require_mfa, sso_domain: p.sso_domain ?? "", reason: "" }); }).catch(() => setPolicy(null));
  }
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactors((data?.totp ?? []) as Factor[]));
    apiFetch<{ require_mfa: boolean; sso_domain: string | null; session_aal: string | null }>("/security-settings")
      .then((p) => { setPolicy(p); setForm({ require_mfa: p.require_mfa, sso_domain: p.sso_domain ?? "", reason: "" }); }).catch(() => setPolicy(null));
  }, []);

  async function start() {
    setError(""); setMsg("");
    // Clear a half-finished enrolment first (unverified factors).
    for (const f of factors ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    if (e || !data) { setError(e?.message ?? "Could not start set-up"); return; }
    setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirm() {
    if (!enrol) return;
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrol.id, code: code.trim() });
    if (e) { setError("That code is not correct. Check the time on your phone and try again."); return; }
    setEnrol(null); setCode(""); setMsg("Two-factor sign-in is on. You'll be asked for a code each time you sign in."); void load();
  }
  async function remove(id: string) {
    const { error: e } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (e) { setError(e.message.includes("aal2") ? "Sign in with your code first, then remove it." : e.message); return; }
    setMsg("Authenticator removed."); void load();
  }
  async function savePolicy() {
    setError(""); setMsg("");
    try {
      await apiFetch("/security-settings", { method: "PUT", body: JSON.stringify({ require_mfa: form.require_mfa, sso_domain: form.sso_domain.trim() || null, reason: form.reason.trim() }) });
      setMsg("Sign-in policy saved."); void load();
    } catch (e) { setError((e as Error).message); }
  }

  const verified = (factors ?? []).filter((f) => f.status === "verified");
  return (
    <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
      <div style={{ fontSize: "14px", fontWeight: 700, color: C.text }}><i className="ti ti-shield-lock" /> Two-factor sign-in</div>
      {verified.length > 0 ? verified.map((f) => (
        <div key={f.id} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px", color: C.textSec }}>
          <span style={{ flex: 1 }}><i className="ti ti-circle-check" style={{ color: C.ok }} /> {f.friendly_name || "Authenticator app"} (added {new Date(f.created_at).toLocaleDateString()})</span>
          <button onClick={() => remove(f.id)} style={btn()}>Remove</button>
        </div>
      )) : !enrol && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: C.textSec, flex: 1 }}>Use an authenticator app (Microsoft Authenticator, Google Authenticator, 1Password…) for a second step at sign-in.</span>
          <button onClick={start} style={btn(true)}>Set up</button>
        </div>
      )}
      {enrol && (
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrol.qr} alt="QR code for your authenticator app" width={160} height={160} style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: "8px" }} />
          <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "12px", color: C.textSec }}>1. Scan the code with your authenticator app (or enter this key: <code style={{ fontSize: "11px" }}>{enrol.secret}</code>).</div>
            <div style={{ fontSize: "12px", color: C.textSec }}>2. Enter the 6-digit code it shows.</div>
            <input aria-label="Code from your authenticator app" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" style={{ ...input, width: "160px", letterSpacing: "4px", fontFamily: "monospace" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button disabled={code.length !== 6} onClick={confirm} style={{ ...btn(true), opacity: code.length === 6 ? 1 : 0.6 }}>Turn on</button>
              <button onClick={() => setEnrol(null)} style={btn()}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {isAdmin && policy && (
        <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>Organisation sign-in policy</div>
          <label style={{ fontSize: "12px", color: C.textSec, display: "flex", gap: "6px", alignItems: "center" }}>
            <input type="checkbox" checked={form.require_mfa} onChange={(e) => setForm({ ...form, require_mfa: e.target.checked })} /> Require two-factor sign-in for everyone in the organisation
          </label>
          <label style={{ fontSize: "11px", color: C.textSec }}>SSO email domain (sign in with your identity provider; the provider must be registered with Supabase first)
            <input value={form.sso_domain} onChange={(e) => setForm({ ...form, sso_domain: e.target.value })} placeholder="e.g. acme-pharma.com" style={input} />
          </label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Reason for the change *<input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={input} /></label>
          <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: {form.require_mfa ? "people without an authenticator must set one up in My profile before they can use TMF360; " : ""}the change and your reason go into the audit trail.</div>
          <button disabled={form.reason.trim().length < 3} onClick={savePolicy} style={{ ...btn(true), alignSelf: "flex-start", opacity: form.reason.trim().length < 3 ? 0.6 : 1 }}>Save policy</button>
        </div>
      )}
      {msg && <div style={{ fontSize: "12px", color: C.ok, background: C.okBg, borderRadius: "8px", padding: "6px 10px" }}>{msg}</div>}
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "6px 10px" }}>{error}</div>}
    </div>
  );
}

/** SSO sign-in by email domain (needs the identity provider registered in Supabase). */
export async function signInWithSso(email: string): Promise<string | null> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return "Enter your work email first";
  const { data: ok } = await supabase.rpc("sso_available", { p_email: email });
  if (!ok) return "Single sign-on isn't set up for this email domain. Use your password.";
  const { data, error } = await supabase.auth.signInWithSSO({ domain, options: { redirectTo: `${window.location.origin}/platform` } });
  if (error || !data?.url) return error?.message ?? "Single sign-on is not available for this domain yet";
  window.location.assign(data.url);
  return null;
}
