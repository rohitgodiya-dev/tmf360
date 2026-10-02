import { supabase } from "./supabase";

// The Documents bucket is private. Every file access goes through a short-lived
// signed URL, which storage only issues to users its policies allow (AZB-06).
const BUCKET = "Documents";

export async function signedFileUrl(path: string, opts: { expiresIn?: number; download?: string | boolean } = {}) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, opts.expiresIn ?? 60, opts.download ? { download: opts.download } : undefined);
  if (error || !data) throw new Error(error?.message || "Could not create file link");
  return data.signedUrl;
}

// Long enough for an embedded viewer to load the file.
export function previewFileUrl(path: string) {
  return signedFileUrl(path, { expiresIn: 600 });
}

// Opens the tab synchronously so popup blockers allow it, then points it at the signed URL.
export async function openFile(path: string) {
  const win = window.open("", "_blank");
  try {
    const url = await signedFileUrl(path);
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (e) {
    win?.close();
    alert("Could not open file: " + (e as Error).message);
  }
}

export async function downloadFile(path: string, filename: string) {
  try {
    // The download option makes storage send Content-Disposition: attachment.
    window.location.href = await signedFileUrl(path, { download: filename || true });
  } catch (e) {
    alert("Could not download file: " + (e as Error).message);
  }
}
