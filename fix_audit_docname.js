const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix the audit trail query to also fetch document names
content = content.replace(
  'supabase.from("audit_trail").select("*").eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(100).then(({data})=>{if(data)setLogs(data);});',
  'supabase.from("audit_trail").select("*, documents(artifact_name, custom_file_name, file_name)").eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(100).then(({data})=>{if(data)setLogs(data);});'
);

// Fix the document column to show name from the join
content = content.replace(
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px",maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.field_changed==="comments"||l.field_changed==="query"||l.field_changed==="query_reply"?l.new_value?.slice(0,40)+(l.new_value?.length>40?"...":""):l.document_id?.slice(0,8)||"-"}</td>',
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.documents?.custom_file_name||l.documents?.artifact_name||l.documents?.file_name||l.document_id?.slice(0,8)||"-"}</td>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
