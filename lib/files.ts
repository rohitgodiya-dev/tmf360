import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Storage buckets are private. Every file access goes through a short-lived
// signed URL, which storage only issues to users its policies allow (AZB-06).
const DEFAULT_BUCKET = "Documents";

type SignOptions = { expiresIn?: number; download?: string | boolean; bucket?: string };

export async function signedFileUrl(path: string, opts: SignOptions = {}) {
  const { data, error } = await supabase.storage
    .from(opts.bucket ?? DEFAULT_BUCKET)
    .createSignedUrl(path, opts.expiresIn ?? 60, opts.download ? { download: opts.download } : undefined);
  if (error || !data) throw new Error(error?.message || "Could not create file link");
  return data.signedUrl;
}

// Long enough for an embedded viewer to load the file.
export function previewFileUrl(path: string, bucket?: string) {
  return signedFileUrl(path, { expiresIn: 600, bucket });
}

// Opens the tab synchronously so popup blockers allow it, then points it at the signed URL.
export async function openFile(path: string, bucket?: string) {
  const win = window.open("", "_blank");
  try {
    const url = await signedFileUrl(path, { bucket });
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (e) {
    win?.close();
    alert("Could not open file: " + (e as Error).message);
  }
}

export async function downloadFile(path: string, filename: string, bucket?: string) {
  try {
    // The download option makes storage send Content-Disposition: attachment.
    window.location.href = await signedFileUrl(path, { download: filename || true, bucket });
  } catch (e) {
    alert("Could not download file: " + (e as Error).message);
  }
}

// Signed preview URL for an embedded <img>/<iframe>; null while loading or when path is empty.
export function useSignedUrl(path: string | null | undefined, bucket?: string) {
  // Keyed by path so a link for a previous file is never shown for the current one.
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    previewFileUrl(path, bucket)
      .then((url) => { if (!cancelled) setSigned({ path, url }); })
      .catch((e) => console.error("Could not create preview link:", e));
    return () => { cancelled = true; };
  }, [path, bucket]);
  return path && signed?.path === path ? signed.url : null;
}
