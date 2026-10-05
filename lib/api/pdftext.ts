// Server-side PDF text for content comparison (Part 12a, AI-04). Uses pdf.js's legacy build, which
// runs in Node without a browser worker. Text only; scans without a text layer return empty pages.
const MAX_PAGES = 300;

export async function pdfPagesText(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false, disableFontFace: true }).promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      pages.push(content.items.map((i) => ("str" in i ? i.str : "")).join(" "));
    }
    return pages;
  } catch {
    return [];
  } finally {
    await doc.destroy();
  }
}

/** Word 5-shingles of normalised text (hashed to keep memory small). */
export function shingleSet(text: string, k = 5): Set<number> {
  const words = text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const out = new Set<number>();
  for (let i = 0; i + k <= words.length; i++) {
    let h = 2166136261;
    for (const c of words.slice(i, i + k).join(" ")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    out.add(h >>> 0);
  }
  return out;
}

/** Jaccard similarity of two shingle sets (0–1). */
export function similarity(a: Set<number>, b: Set<number>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const x of small) if (big.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
