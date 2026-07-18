import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { docs, study, donePct, ri, missing, pending } = await req.json();
    
    // Build CSV-style Excel using simple XML SpreadsheetML (no external deps needed)
    const now = new Date().toLocaleDateString();
    
    const escXml = (s: string) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    
    const headerStyle = 'style="background:#F97316;color:#fff;font-weight:bold;font-size:11pt;"';
    const coverStyle = 'style="font-size:10pt;"';
    
    let coverRows = `
      <Row><Cell ss:StyleID="s1"><Data ss:Type="String">TMF360 - Inspection Package</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Study ID</Data></Cell><Cell><Data ss:Type="String">${escXml(study?.study_id||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Protocol</Data></Cell><Cell><Data ss:Type="String">${escXml(study?.protocol||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Sponsor</Data></Cell><Cell><Data ss:Type="String">${escXml(study?.sponsor||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Phase</Data></Cell><Cell><Data ss:Type="String">${escXml(study?.phase||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Status</Data></Cell><Cell><Data ss:Type="String">${escXml(study?.status||"")}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Export Date</Data></Cell><Cell><Data ss:Type="String">${now}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">TMF Completeness</Data></Cell><Cell><Data ss:Type="String">${donePct}%</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Inspection Readiness Score</Data></Cell><Cell><Data ss:Type="String">${ri}/100</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Missing Core Documents</Data></Cell><Cell><Data ss:Type="Number">${missing}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Pending Review</Data></Cell><Cell><Data ss:Type="Number">${pending}</Data></Cell></Row>
      <Row></Row>
    `;
    
    let docRows = `<Row>
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
    </Row>`;
    
    docs.forEach((d: any) => {
      docRows += `<Row>
        <Cell><Data ss:Type="String">${escXml(d.zone)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.artifact_num)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.artifact_name)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.custom_file_name||d.file_name||"")}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.version||"")}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.status)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.owner||"")}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.effective_date||"")}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.expiry_date||"")}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.approved_by||"")}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(d.approved_at?new Date(d.approved_at).toLocaleDateString():"")}</Data></Cell>
      </Row>`;
    });
    
    const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="s1"><Font ss:Bold="1" ss:Size="14"/></Style>
  </Styles>
  <Worksheet ss:Name="Cover">
    <Table>${coverRows}</Table>
  </Worksheet>
  <Worksheet ss:Name="Document Tracker">
    <Table>${docRows}</Table>
  </Worksheet>
</Workbook>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="TMF360_Inspection_Package_${study?.study_id||"export"}_${Date.now()}.xls"`,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
