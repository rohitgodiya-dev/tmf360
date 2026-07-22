const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

const old = `                <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
                  This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions, electronic signatures, and approvals are permanently recorded.
                </div>
                <AuditTrail user={user} activeStudy={activeStudy} P={P}/>`;

if (content.includes(old)) {
  const rep = `                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <h1 style={{fontSize:"14px",fontWeight:"500"}}>Audit trail - 21 CFR Part 11</h1>
                  <div style={{display:"flex",gap:"8px"}}>
                    <button onClick={async()=>{const{data}=await supabase.from("audit_trail").select("*").eq("study_id",activeStudy?.study_id||"").order("created_at",{ascending:false});if(!data)return;const headers=["Timestamp","User","Action","Document","Field","Old Value","New Value","Signature Reason"];const rows=data.map((l:any)=>[new Date(l.created_at).toLocaleString(),l.user_email,l.action,l.document_name||l.document_id?.slice(0,8)||"",l.field_changed||"",l.old_value||"",l.new_value||"",l.signature_reason||""]);const csv=[headers,...rows].map(r=>r.map((v:string)=>JSON.stringify(v)).join(",")).join("\\n");const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="AuditTrail_"+Date.now()+".csv";a.click();URL.revokeObjectURL(url);}} style={{fontSize:"11px",fontWeight:"500",padding:"6px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"}}><i className="ti ti-download" style={{fontSize:"13px"}}/>Download CSV</button>
                    <button onClick={async()=>{const{data}=await supabase.from("audit_trail").select("*").eq("study_id",activeStudy?.study_id||"").order("created_at",{ascending:false});if(!data)return;const rows=data.map((l:any)=>"<tr><td>"+new Date(l.created_at).toLocaleString()+"</td><td>"+(l.user_email||"")+"</td><td>"+(l.action||"")+"</td><td>"+(l.document_name||l.document_id?.slice(0,8)||"")+"</td><td>"+(l.field_changed||"")+"</td><td>"+(l.old_value||"")+"</td><td>"+(l.new_value||"")+"</td><td>"+(l.signature_reason||"")+"</td></tr>").join("");const html="<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Audit Trail</title><style>body{font-family:Arial,sans-serif;font-size:10px;margin:20px;}table{width:100%;border-collapse:collapse;}th{background:#F97316;color:#fff;padding:6px 8px;text-align:left;}td{padding:5px 8px;border-bottom:1px solid #E5E7EB;}</style></head><body><h1>Audit Trail - "+(activeStudy?.study_id||"")+"</h1><button onclick='window.print()' style='padding:6px 14px;background:#F97316;color:#fff;border:none;border-radius:6px;cursor:pointer;'>Print / Save PDF</button><table><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Document</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Signature Reason</th></tr></thead><tbody>"+rows+"</tbody></table></body></html>";const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}}} style={{fontSize:"11px",fontWeight:"500",padding:"6px 14px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"}}><i className="ti ti-file-type-pdf" style={{fontSize:"13px"}}/>Download PDF</button>
                  </div>
                </div>
                <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
                  This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions, electronic signatures, and approvals are permanently recorded.
                </div>
                <AuditTrail user={user} activeStudy={activeStudy} P={P}/>`;
  content = content.replace(old, rep);
  console.log('Fixed');
} else {
  console.log('NOT matched - checking...');
  const idx = content.indexOf('AuditTrail user={user}');
  console.log('AuditTrail found at char:', idx);
  console.log('Context:', content.slice(idx - 200, idx + 50));
}

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
