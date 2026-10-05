// Minimal Excel (.xlsx) writer for reports and exports (Part 11, D32). Builds SpreadsheetML with
// jszip: inline strings, numbers, a bold frozen header row and auto-filter. Text that a spreadsheet
// would run as a formula (= + - @) is prefixed with ' so it stays text.
import JSZip from "jszip";

export type Cell = string | number | boolean | null | undefined | Date;
export type Sheet = { name: string; columns: string[]; rows: Cell[][] };

const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function colName(i: number): string {
  let n = i + 1, s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Text as a spreadsheet will show it, with formula-like values neutralised. */
export function safeText(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function cellXml(v: Cell, ref: string, header: boolean): string {
  const style = header ? ' s="1"' : "";
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
  const text = v instanceof Date ? v.toISOString().replace("T", " ").slice(0, 19) + " UTC" : typeof v === "boolean" ? (v ? "Yes" : "No") : safeText(String(v));
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(text.slice(0, 32000))}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const all = [sheet.columns as Cell[], ...sheet.rows];
  const widths = sheet.columns.map((c, i) =>
    Math.min(60, Math.max(8, ...all.slice(0, 200).map((r) => String(r[i] ?? "").length + 2))));
  const rows = all.map((r, ri) =>
    `<row r="${ri + 1}">${r.map((v, ci) => cellXml(v, `${colName(ci)}${ri + 1}`, ri === 0)).join("")}</row>`).join("");
  const last = `${colName(Math.max(0, sheet.columns.length - 1))}${all.length}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows}</sheetData>
${sheet.columns.length ? `<autoFilter ref="A1:${last}"/>` : ""}
</worksheet>`;
}

/** Sheet names: max 31 chars, no []:*?/\ and unique. */
function sheetNames(sheets: Sheet[]): string[] {
  const used = new Set<string>();
  return sheets.map((s, i) => {
    let n = (s.name.replace(/[\[\]:*?/\\]/g, " ").trim() || `Sheet${i + 1}`).slice(0, 31);
    while (used.has(n.toLowerCase())) n = `${n.slice(0, 28)} ${i + 1}`;
    used.add(n.toLowerCase());
    return n;
  });
}

export async function buildXlsx(sheets: Sheet[]): Promise<Uint8Array> {
  const zip = new JSZip();
  const names = sheetNames(sheets);
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
<definedNames>${sheets.map((s, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(names[i]).replace(/'/g, "''")}'!$A$1:$${colName(Math.max(0, s.columns.length - 1))}$${s.rows.length + 1}</definedName>`).join("")}</definedNames>
</workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
</styleSheet>`);
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A download response for a workbook. */
export function xlsxResponse(bytes: Uint8Array, fileName: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${fileName.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
