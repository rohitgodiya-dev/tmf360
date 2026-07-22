const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Revert to simple query without join
content = content.replace(
  'supabase.from("audit_trail").select("*, documents(artifact_name, custom_file_name, file_name)").eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(100).then(({data})=>{if(data)setLogs(data);});',
  'supabase.from("audit_trail").select("*").eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(100).then(({data})=>{if(data)setLogs(data);});'
);

// Fix document column to just show truncated ID for now
content = content.replace(
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.documents?.custom_file_name||l.documents?.artifact_name||l.documents?.file_name||l.document_id?.slice(0,8)||"-"}</td>',
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.document_id?.slice(0,8)||"-"}</td>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
