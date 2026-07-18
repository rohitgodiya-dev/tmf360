const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Add Report to sidebar
c = c.replace(
  '{navItem("readiness","Inspection readiness","ti-shield-check")}',
  '{navItem("readiness","Inspection readiness","ti-shield-check")}\n          {navItem("report","Report","ti-file-analytics")}'
);

// 2. Remove export buttons from readiness panel header and restore clean header
const oldReadinessHeader = `          {/* INSPECTION READINESS */}
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

const newReadinessHeader = `          {/* INSPECTION READINESS */}
          {panel==="readiness"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection readiness - {activeStudy?.study_id||"No study selected"}</h1>`;

if (c.includes(oldReadinessHeader)) {
  c = c.replace(oldReadinessHeader, newReadinessHeader);
  console.log('Readiness header restored - OK');
} else {
  console.log('Readiness header not found - may already be clean');
}

// 3. Add Report panel before MESSAGES panel
const reportPanel = `          {/* REPORT */}
          {panel==="report"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                <div>
                  <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection Package Export - {activeStudy?.study_id||"No study selected"}</h1>
                  <p style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Export all approved documents as an inspection-ready package</p>
                </div>
              </div>
              {!activeStudy?(
                <div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"14px"}}>
                  <div style={{fontSize:"13px",fontWeight:"500",marginBottom:"6px",color:P.text}}>No study selected</div>
                  <div style={{fontSize:"12px"}}>Select a study to generate inspection reports.</div>
                </div>
              ):(
                <>
                  {/* Study summary card */}
                  <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"14px",padding:"16px"}}>
                    <h2 style={{fontSize:"12px",fontWeight:"600",color:P.textSec,marginBottom:"12px",textTransform:"uppercase",letterSpacing:".06em"}}>Study Summary</h2>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px"}}>
                      {[
                        {val:\`\${donePct}%\`,label:"TMF Completeness",color:P.blue,bg:P.blueLight},
                        {val:\`\${ri}/100\`,label:"Readiness Score",color:ri>=80?P.success:ri>=50?P.primary:P.danger,bg:ri>=80?P.successLight:ri>=50?P.primaryLight:P.dangerLight},
                        {val:missing,label:"Missing Core Docs",color:P.danger,bg:P.dangerLight},
                        {val:studyDocs.filter(d=>d.status==="Approved").length,label:"Approved Documents",color:P.success,bg:P.successLight},
                        {val:pending,label:"Pending Review",color:P.blue,bg:P.blueLight},
                        {val:expiring,label:"Expiring (90 days)",color:P.warning,bg:P.warningLight},
                      ].map((m,i)=>(
                        <div key={i} style={{background:m.bg,borderRadius:"10px",padding:"12px 14px"}}>
                          <div style={{fontSize:"22px",fontWeight:"700",color:m.color}}>{m.val}</div>
                          <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"6px",fontSize:"11px",color:P.textSec}}>
                      <div><span style={{fontWeight:"500"}}>Study ID:</span> {activeStudy.study_id}</div>
                      <div><span style={{fontWeight:"500"}}>Protocol:</span> {activeStudy.protocol}</div>
                      <div><span style={{fontWeight:"500"}}>Sponsor:</span> {activeStudy.sponsor}</div>
                      <div><span style={{fontWeight:"500"}}>Phase:</span> {activeStudy.phase}</div>
                      <div><span style={{fontWeight:"500"}}>Status:</span> {activeStudy.status}</div>
                      <div><span style={{fontWeight:"500"}}>Export Date:</span> {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Export buttons */}
                  <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"14px",padding:"16px"}}>
                    <h2 style={{fontSize:"12px",fontWeight:"600",color:P.textSec,marginBottom:"12px",textTransform:"uppercase",letterSpacing:".06em"}}>Export Inspection Package</h2>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
                      {/* Excel */}
                      <div style={{border:\`0.5px solid \${P.border}\`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#ECFDF5",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <i className="ti ti-file-spreadsheet" style={{fontSize:"22px",color:"#10B981"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Excel</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Document tracker with full metadata. All approved documents listed by zone and artifact.</div>
                        </div>
                        <button onClick={async()=>{
                          const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                          if(!approvedDocs.length){alert("No approved documents to export.");return;}
                          const res=await fetch("/api/export/excel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                          const blob=await res.blob();
                          const url=URL.createObjectURL(blob);
                          const a=document.createElement("a");a.href=url;a.download=\`TMF360_\${activeStudy.study_id}_Tracker_\${Date.now()}.xls\`;a.click();URL.revokeObjectURL(url);
                        }} style={{fontSize:"11px",fontWeight:"500",padding:"8px 14px",background:"#10B981",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                          <i className="ti ti-download" style={{fontSize:"13px"}}/>Download Excel
                        </button>
                      </div>

                      {/* PDF */}
                      <div style={{border:\`0.5px solid \${P.border}\`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <i className="ti ti-file-type-pdf" style={{fontSize:"22px",color:"#EF4444"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>PDF Report</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Formatted inspection report with cover page, study summary, and document index.</div>
                        </div>
                        <button onClick={async()=>{
                          const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                          if(!approvedDocs.length){alert("No approved documents to export.");return;}
                          const res=await fetch("/api/export/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                          const html=await res.text();
                          const w=window.open("","_blank");
                          if(w){w.document.write(html);w.document.close();}
                        }} style={{fontSize:"11px",fontWeight:"500",padding:"8px 14px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                          <i className="ti ti-download" style={{fontSize:"13px"}}/>Open PDF
                        </button>
                      </div>

                      {/* Word */}
                      <div style={{border:\`0.5px solid \${P.border}\`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <i className="ti ti-file-type-doc" style={{fontSize:"22px",color:"#3B82F6"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Word Document</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Editable Word report with cover page, study summary, and document index.</div>
                        </div>
                        <button onClick={async()=>{
                          const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                          if(!approvedDocs.length){alert("No approved documents to export.");return;}
                          const res=await fetch("/api/export/word",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                          const blob=await res.blob();
                          const url=URL.createObjectURL(blob);
                          const a=document.createElement("a");a.href=url;a.download=\`TMF360_\${activeStudy.study_id}_Report_\${Date.now()}.doc\`;a.click();URL.revokeObjectURL(url);
                        }} style={{fontSize:"11px",fontWeight:"500",padding:"8px 14px",background:"#3B82F6",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                          <i className="ti ti-download" style={{fontSize:"13px"}}/>Download Word
                        </button>
                      </div>
                    </div>

                    <div style={{marginTop:"12px",padding:"10px 14px",background:P.bgSec,borderRadius:"8px",fontSize:"11px",color:P.textTert}}>
                      <i className="ti ti-info-circle" style={{fontSize:"13px",marginRight:"6px"}}/>
                      Only <strong style={{color:P.text}}>Approved</strong> documents are included in the export. Currently {studyDocs.filter(d=>d.status==="Approved").length} approved document{studyDocs.filter(d=>d.status==="Approved").length!==1?"s":""} available.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

`;

// Insert before MESSAGES panel
const messagesPanel = `          {/* MESSAGES */}`;
if (c.includes(messagesPanel)) {
  c = c.replace(messagesPanel, reportPanel + messagesPanel);
  console.log('Report panel added - OK');
} else {
  console.log('ERROR: Could not find MESSAGES panel anchor');
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
