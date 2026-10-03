"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Invite = { email: string; full_name: string; role: string; organisation: string | null; expires_at: string; product: "tmf360" | "site360" };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/v1/invitations/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message ?? "Something went wrong");
  return data as T;
}

const box: React.CSSProperties = {
  maxWidth: 420, margin: "80px auto", padding: "28px 32px", background: "#fff",
  border: "1px solid #E5E7EB", borderRadius: 16, fontFamily: "Arial, sans-serif",
};
const input: React.CSSProperties = {
  width: "100%", fontSize: 13, padding: "9px 11px", border: "1px solid #E5E7EB", borderRadius: 8, marginBottom: 10, boxSizing: "border-box",
};

function AcceptInvite() {
  const token = useSearchParams().get("token") ?? "";
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState(token ? "" : "This invitation link is incomplete.");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    post<Invite>("lookup", { token }).then(setInvite).catch((e) => setLoadError(e.message));
  }, [token]);

  async function accept() {
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setSaving(true);
    try {
      await post("accept", { token, password });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  }

  return (
    <div style={box}>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>{invite?.product === "site360" ? "Site" : "TMF"}<span style={{ color: "#F97316" }}>360</span></h1>
      {loadError && <p style={{ color: "#991B1B", fontSize: 13 }}>{loadError}</p>}
      {!loadError && !invite && <p style={{ color: "#6B7280", fontSize: 13 }}>Checking your invitation…</p>}
      {invite && !done && (
        <>
          <p style={{ color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
            You&apos;ve been invited to join <strong>{invite.organisation ?? "an organisation"}</strong> as{" "}
            <strong>{invite.role}</strong>. Choose a password for <strong>{invite.email}</strong>.
          </p>
          <input style={input} type="password" placeholder="New password (at least 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <input style={input} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {error && <p style={{ color: "#991B1B", fontSize: 12, margin: "0 0 10px" }}>{error}</p>}
          <button onClick={accept} disabled={saving} style={{ width: "100%", padding: 10, fontSize: 13, fontWeight: 700, color: "#fff", background: saving ? "#FDBA74" : "#F97316", border: "none", borderRadius: 8, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Creating your account…" : "Create account"}
          </button>
        </>
      )}
      {done && (
        <>
          <p style={{ color: "#065F46", fontSize: 13 }}>Your account is ready.</p>
          <a href={invite?.product === "site360" ? "/site360/login" : "/platform"} style={{ display: "inline-block", padding: "9px 18px", fontSize: 13, fontWeight: 700, color: "#fff", background: "#F97316", borderRadius: 8, textDecoration: "none" }}>Sign in</a>
        </>
      )}
    </div>
  );
}

export default function InvitePage() {
  // useSearchParams needs a Suspense boundary for the page to prerender (Next.js 16).
  return (
    <Suspense fallback={<div style={box}>Loading…</div>}>
      <AcceptInvite />
    </Suspense>
  );
}
