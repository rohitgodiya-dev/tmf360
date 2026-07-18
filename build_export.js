const fs = require('fs');

// Create export API directories
['app/api/export/excel', 'app/api/export/pdf', 'app/api/export/word', 'app/api/export/zip'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true});
});

// Excel export route
const excelRoute = `import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { docs, study, donePct, ri, missing, pending } = await req.json();
    
    // Build CSV-style Excel using simple XML SpreadsheetML (no external deps needed)
    const now = new Date().toLocaleDateString();
    
    const escXml = (s: string) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    
    const headerStyle = 'style="background:#F97316;color:#fff;font-weight:bold;font-size:11pt;"';
    const coverStyle = 'style="font-size:10pt;"';
    
    let coverRows = \`
      <Row><Cell ss:StyleID="s1"><Data ss:Type="String">TMF360 - Inspection Package</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Study ID</Data></Cell><Cell><Data ss:Type="String">\${escXml(study?.study_id||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Protocol</Data></Cell><Cell><Data ss:Type="String">\${escXml(study?.protocol||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Sponsor</Data></Cell><Cell><Data ss:Type="String">\${escXml(study?.sponsor||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Phase</Data></Cell><Cell><Data ss:Type="String">\${escXml(study?.phase||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Status</Data></Cell><Cell><Data ss:Type="String">\${escXml(study?.status||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Export Date</Data></Cell><Cell><Data ss:Type="String">\${now}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">TMF Completeness</Data></Cell><Cell><Data ss:Type="String">\${donePct}%</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Inspection Readiness Score</Data></Cell><Cell><Data ss:Type="String">\${ri}/100</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Missing Core Documents</Data></Cell><Cell><Data ss:Type="Number">\${missing}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Pending Review</Data></Cell><Cell><Data ss:Type="Number">\${pending}</Data></Cell></Row>
      <Row></Row>
    \`;
    
    let docRows = \`<Row>
      <Cell><Data ss:Type="String">Zone</Data></Cell>
      <Cell><Data ss:Type="String">Artifact #</Data></Cell>
      <Cell><Data ss:Type="String">Artifact Name</Data></Cell>
      <Cell><Data ss:Type="String">Document Name</Data></Cell>
      <Cell><Data ss:Type="String">Version</Data></Cell>
      <Cell><Data ss:Type="String">Status</Data></Cell>
      <Cell><Data ss:Type="String">Owner</Data></Cell>
      <Cell><Data ss:Type="String">Effective Date</Data></Cell>
      <Cell><Data ss:Type="String">Expiry Date</Data></Cell>
      <Cell><Data ss:Type="String">Approved By</Data></Cell>
      <Cell><Data ss:Type="String">Approved At</Data></Cell>
    </Row>\`;
    
    docs.forEach((d: any) => {
      docRows += \`<Row>
        <Cell><Data ss:Type="String">\${escXml(d.zone)}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.artifact_num)}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.artifact_name)}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.custom_file_name||d.file_name||"")}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.version||"")}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.status)}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.owner||"")}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.effective_date||"")}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.expiry_date||"")}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.approved_by||"")}</Data></Cell>
        <Cell><Data ss:Type="String">\${escXml(d.approved_at?new Date(d.approved_at).toLocaleDateString():"")}</Data></Cell>
      </Row>\`;
    });
    
    const xml = \`<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="s1"><Font ss:Bold="1" ss:Size="14"/></Style>
  </Styles>
  <Worksheet ss:Name="Cover">
    <Table>\${coverRows}</Table>
  </Worksheet>
  <Worksheet ss:Name="Document Tracker">
    <Table>\${docRows}</Table>
  </Worksheet>
</Workbook>\`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": \`attachment; filename="TMF360_Inspection_Package_\${study?.study_id||"export"}_\${Date.now()}.xls"\`,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

// PDF export route (HTML-based, browser will handle via new window)
const pdfRoute = `import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { docs, study, donePct, ri, missing, pending } = await req.json();
    const now = new Date().toLocaleDateString();
    const esc = (s: string) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    
    const rows = docs.map((d: any) => \`
      <tr>
        <td>\${esc(d.zone)}</td>
        <td>\${esc(d.artifact_num)}</td>
        <td>\${esc(d.artifact_name)}</td>
        <td>\${esc(d.custom_file_name||d.file_name||"")}</td>
        <td>\${esc(d.version||"")}</td>
        <td>\${esc(d.owner||"")}</td>
        <td>\${esc(d.effective_date||"")}</td>
        <td>\${esc(d.expiry_date||"")}</td>
        <td>\${esc(d.approved_by||"")}</td>
        <td>\${esc(d.approved_at?new Date(d.approved_at).toLocaleDateString():"")}</td>
      </tr>
    \`).join("");

    const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>TMF360 Inspection Package - \${esc(study?.study_id||"")}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#111;}
  .cover{margin-bottom:30px;padding:20px;border:2px solid #F97316;border-radius:8px;}
  .cover h1{font-size:22px;color:#F97316;margin:0 0 10px;}
  .cover-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
  .cover-item{font-size:11px;} .cover-item span{font-weight:bold;}
  .score-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0;}
  .score-box{text-align:center;padding:12px;border-radius:8px;border:1px solid #E5E7EB;}
  .score-num{font-size:28px;font-weight:bold;} .score-lbl{font-size:10px;color:#6B7280;}
  h2{font-size:14px;color:#111;margin:20px 0 10px;border-bottom:2px solid #F97316;padding-bottom:4px;}
  table{width:100%;border-collapse:collapse;font-size:9px;}
  th{background:#F97316;color:#fff;padding:5px 6px;text-align:left;font-size:9px;}
  td{padding:4px 6px;border-bottom:1px solid #E5E7EB;}
  tr:nth-child(even){background:#F9FAFB;}
  .footer{margin-top:20px;font-size:9px;color:#9CA3AF;text-align:center;border-top:1px solid #E5E7EB;padding-top:8px;}
  @media print{body{margin:10px;} .no-print{display:none;}}
</style>
</head>
<body>
<div class="no-print" style="margin-bottom:16px;">
  <button onclick="window.print()" style="padding:8px 20px;background:#F97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Print / Save as PDF</button>
</div>
<div class="cover">
  <h1>TMF360 — Inspection Package</h1>
  <div class="cover-grid">
    <div class="cover-item"><span>Study ID:</span> \${esc(study?.study_id||"")}</div>
    <div class="cover-item"><span>Protocol:</span> \${esc(study?.protocol||"")}</div>
    <div class="cover-item"><span>Sponsor:</span> \${esc(study?.sponsor||"")}</div>
    <div class="cover-item"><span>Phase:</span> \${esc(study?.phase||"")}</div>
    <div class="cover-item"><span>Status:</span> \${esc(study?.status||"")}</div>
    <div class="cover-item"><span>Export Date:</span> \${now}</div>
  </div>
  <div class="score-grid">
    <div class="score-box"><div class="score-num" style="color:#3B82F6">\${donePct}%</div><div class="score-lbl">TMF Completeness</div></div>
    <div class="score-box"><div class="score-num" style="color:\${ri>=80?"#10B981":ri>=50?"#F97316":"#EF4444"}">\${ri}</div><div class="score-lbl">Readiness Score</div></div>
    <div class="score-box"><div class="score-num" style="color:#EF4444">\${missing}</div><div class="score-lbl">Missing Core Docs</div></div>
  </div>
</div>
<h2>Approved Documents — \${docs.length} document\${docs.length!==1?"s":""}</h2>
<table>
  <thead><tr>
    <th>Zone</th><th>Artifact #</th><th>Artifact Name</th><th>Document Name</th>
    <th>Version</th><th>Owner</th><th>Effective</th><th>Expiry</th><th>Approved By</th><th>Approved At</th>
  </tr></thead>
  <tbody>\${rows}</tbody>
</table>
<div class="footer">Generated by TMF360 — DIA TMF Reference Model v3.3.1 — ICH E6(R3) — 21 CFR Part 11 — \${now}</div>
</body>
</html>\`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": \`inline; filename="TMF360_Inspection_Report_\${study?.study_id||"export"}.html"\`,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

// Word export route (HTML-based .doc)
const wordRoute = `import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { docs, study, donePct, ri, missing, pending } = await req.json();
    const now = new Date().toLocaleDateString();
    const esc = (s: string) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    
    const rows = docs.map((d: any) => \`
      <tr>
        <td>\${esc(d.zone)}</td>
        <td>\${esc(d.artifact_num)}</td>
        <td>\${esc(d.artifact_name)}</td>
        <td>\${esc(d.custom_file_name||d.file_name||"")}</td>
        <td>\${esc(d.version||"")}</td>
        <td>\${esc(d.owner||"")}</td>
        <td>\${esc(d.effective_date||"")}</td>
        <td>\${esc(d.expiry_date||"")}</td>
        <td>\${esc(d.approved_by||"")}</td>
        <td>\${esc(d.approved_at?new Date(d.approved_at).toLocaleDateString():"")}</td>
      </tr>
    \`).join("");

    const html = \`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/><meta name=ProgId content=Word.Document/>
<style>
  body{font-family:Arial,sans-serif;font-size:10pt;margin:1cm;}
  h1{font-size:18pt;color:#F97316;} h2{font-size:13pt;border-bottom:2pt solid #F97316;padding-bottom:3pt;}
  .info-table{width:100%;border-collapse:collapse;margin:10pt 0;}
  .info-table td{padding:4pt;font-size:10pt;}
  table{width:100%;border-collapse:collapse;font-size:8pt;}
  th{background:#F97316;color:#fff;padding:4pt;text-align:left;border:0.5pt solid #E5E7EB;}
  td{padding:3pt;border:0.5pt solid #E5E7EB;}
  .score{font-size:18pt;font-weight:bold;}
</style>
</head>
<body>
<h1>TMF360 — Inspection Package</h1>
<table class="info-table">
  <tr><td><b>Study ID:</b></td><td>\${esc(study?.study_id||"")}</td><td><b>Protocol:</b></td><td>\${esc(study?.protocol||"")}</td></tr>
  <tr><td><b>Sponsor:</b></td><td>\${esc(study?.sponsor||"")}</td><td><b>Phase:</b></td><td>\${esc(study?.phase||"")}</td></tr>
  <tr><td><b>Status:</b></td><td>\${esc(study?.status||"")}</td><td><b>Export Date:</b></td><td>\${now}</td></tr>
  <tr><td><b>TMF Completeness:</b></td><td>\${donePct}%</td><td><b>Readiness Score:</b></td><td>\${ri}/100</td></tr>
  <tr><td><b>Missing Core Docs:</b></td><td>\${missing}</td><td><b>Pending Review:</b></td><td>\${pending}</td></tr>
</table>
<h2>Approved Documents (\${docs.length})</h2>
<table>
  <thead><tr>
    <th>Zone</th><th>Artifact #</th><th>Artifact Name</th><th>Document Name</th>
    <th>Version</th><th>Owner</th><th>Effective</th><th>Expiry</th><th>Approved By</th><th>Approved At</th>
  </tr></thead>
  <tbody>\${rows}</tbody>
</table>
<p style="font-size:8pt;color:#9CA3AF;margin-top:20pt;">Generated by TMF360 — DIA TMF Reference Model v3.3.1 — ICH E6(R3) — 21 CFR Part 11 — \${now}</p>
</body></html>\`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": \`attachment; filename="TMF360_Inspection_Package_\${study?.study_id||"export"}.doc"\`,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('app/api/export/excel/route.ts', excelRoute);
fs.writeFileSync('app/api/export/pdf/route.ts', pdfRoute);
fs.writeFileSync('app/api/export/word/route.ts', wordRoute);
console.log('API routes created');

// Now add export UI to the inspection readiness panel in page.tsx
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

const exportUI = `
          {/* INSPECTION READINESS */}
          {panel==="readiness"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection readiness - {activeStudy?.study_id||"No study selected"}</h1>
                {activeStudy&&(
                  <div style={{display:"flex",gap:"8px"}}>
                    <button onClick={async()=>{
                      const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                      const res=await fetch("/api/export/excel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                      const blob=await res.blob();
                      const url=URL.createObjectURL(blob);
                      const a=document.createElement("a");a.href=url;a.download=\`TMF360_\${activeStudy.study_id}_\${Date.now()}.xls\`;a.click();URL.revokeObjectURL(url);
                    }} style={{fontSize:"11px",padding:"6px 12px",background:"#10B981",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
                      <i className="ti ti-file-spreadsheet" style={{fontSize:"13px"}}/>Excel
                    </button>
                    <button onClick={async()=>{
                      const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                      const res=await fetch("/api/export/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                      const html=await res.text();
                      const w=window.open("","_blank");
                      if(w){w.document.write(html);w.document.close();}
                    }} style={{fontSize:"11px",padding:"6px 12px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
                      <i className="ti ti-file-type-pdf" style={{fontSize:"13px"}}/>PDF
                    </button>
                    <button onClick={async()=>{
                      const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                      const res=await fetch("/api/export/word",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                      const blob=await res.blob();
                      const url=URL.createObjectURL(blob);
                      const a=document.createElement("a");a.href=url;a.download=\`TMF360_\${activeStudy.study_id}_\${Date.now()}.doc\`;a.click();URL.revokeObjectURL(url);
                    }} style={{fontSize:"11px",padding:"6px 12px",background:"#3B82F6",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
                      <i className="ti ti-file-type-doc" style={{fontSize:"13px"}}/>Word
                    </button>
                  </div>
                )}
              </div>`;

// Replace old readiness panel header
const oldReadiness = `          {/* INSPECTION READINESS */}
          {panel==="readiness"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection readiness - {activeStudy?.study_id||"No study selected"}</h1>`;

if (c.includes(oldReadiness)) {
  c = c.replace(oldReadiness, exportUI);
  console.log('Export UI added to readiness panel - OK');
} else {
  console.log('ERROR: Could not find readiness panel header');
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
