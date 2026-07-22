const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Add logAudit after query insert in Query Modal
content = content.replace(
  'const{error}=await supabase.from("document_queries").insert([{\n                  org_id:orgId,study_id:activeStudy?.study_id,document_id:queryDoc.id,\n                  artifact_num:queryDoc.artifact_num,artifact_name:queryDoc.artifact_name,zone:queryDoc.zone,\n                  query_type:queryType,priority:queryPriority,query_text:queryText.trim(),\n                  raised_by:user.id,raised_by_email:user.email,owner_email:queryDoc.owner,\n                  status:"Open",due_date:queryDueDate||null,\n                }]);\n                if(!error){',
  'const{error}=await supabase.from("document_queries").insert([{\n                  org_id:orgId,study_id:activeStudy?.study_id,document_id:queryDoc.id,\n                  artifact_num:queryDoc.artifact_num,artifact_name:queryDoc.artifact_name,zone:queryDoc.zone,\n                  query_type:queryType,priority:queryPriority,query_text:queryText.trim(),\n                  raised_by:user.id,raised_by_email:user.email,owner_email:queryDoc.owner,\n                  status:"Open",due_date:queryDueDate||null,\n                }]);\n                if(!error){await logAudit("Query raised",queryDoc.id,activeStudy?.study_id||"","query","","Query: "+queryText.trim(),"",queryDoc.custom_file_name||queryDoc.artifact_name);'
);

// 2. Add logAudit after query reply in QueriesPanel
content = content.replace(
  'await supabase.from("document_queries").update({replies:newReplies}).eq("id",selectedQuery.id);\n    await logAudit("Query reply added",selectedQuery.document_id,selectedQuery.study_id,"query_reply","",replyText.trim());',
  'await supabase.from("document_queries").update({replies:newReplies}).eq("id",selectedQuery.id);\n    await logAudit("Query reply added",selectedQuery.document_id,selectedQuery.study_id,"query_reply","","Reply: "+replyText.trim(),"",selectedQuery.artifact_name);'
);

// 3. Add docName to query closed
content = content.replace(
  'await logAudit("Query closed",selectedQuery.document_id,selectedQuery.study_id,"query_status","Open","Closed");',
  'await logAudit("Query closed",selectedQuery.document_id,selectedQuery.study_id,"query_status","Open","Closed","",selectedQuery.artifact_name);'
);

// 4. Add docName to query reopened
content = content.replace(
  'await logAudit("Query reopened",selectedQuery.document_id,selectedQuery.study_id,"query_status","Closed","Open");',
  'await logAudit("Query reopened",selectedQuery.document_id,selectedQuery.study_id,"query_status","Closed","Open","",selectedQuery.artifact_name);'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
