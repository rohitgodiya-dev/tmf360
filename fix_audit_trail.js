const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: Remove user_id filter so all org actions show, not just current user
content = content.replace(
  'supabase.from("audit_trail").select("*").eq("user_id",user.id).eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(50).then(({data})=>{if(data)setLogs(data);});',
  'supabase.from("audit_trail").select("*").eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(100).then(({data})=>{if(data)setLogs(data);});'
);

// Fix 2: Show document name instead of truncated ID, and show full new_value for comments/queries
content = content.replace(
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.document_id?.slice(0,8)||"-"}</td>',
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px",maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.field_changed==="comments"||l.field_changed==="query"||l.field_changed==="query_reply"?l.new_value?.slice(0,40)+(l.new_value?.length>40?"...":""):l.document_id?.slice(0,8)||"-"}</td>'
);

// Fix 3: Make new_value column wider to show comment content
content = content.replace(
  '<td style={{padding:"7px 10px",color:P.textSec}}>{l.new_value||"-"}</td>',
  '<td style={{padding:"7px 10px",color:P.textSec,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.new_value||"-"}</td>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
