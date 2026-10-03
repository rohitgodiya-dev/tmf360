// Server-side checks on stored document files.
import { createHash } from "node:crypto";
import { serviceClient } from "./service";

/** SHA-256 (hex) of a stored file in the Documents bucket, or null if it isn't there. */
export async function hashStoredFile(path: string): Promise<string | null> {
  const { data: blob } = await serviceClient().storage.from("Documents").download(path);
  if (!blob) return null;
  return createHash("sha256").update(Buffer.from(await blob.arrayBuffer())).digest("hex");
}

/** The hash in a "<sha256>.<ext>" file name, if the path has one. */
export function hashInPath(path: string): string | null {
  return /(?:^|\/)([0-9a-f]{64})\.[^/]*$/i.exec(path)?.[1]?.toLowerCase() ?? null;
}
