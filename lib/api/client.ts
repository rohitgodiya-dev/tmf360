// Browser-side caller for /api/v1: attaches the current session token and turns
// error responses into thrown ApiClientErrors with the server's code and message.
import { supabase } from "../supabase";

export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`/api/v1${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiClientError(res.status, err.code ?? "internal", err.message ?? res.statusText, err.details);
  }
  return body as T;
}
