const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: Update logAudit function signature to accept document_name
content = content.replace(
  'async function logAudit(action:string,docId:string|undefined,studyId:string,field:string,oldVal:string,newVal:string,sigReason:string=""){\n    await supabase.from("audit_trail").insert([{\n      user_id:user.id,user_email:user.email,action,document_id:docId,\n      study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,\n    }]);\n  }',
  'async function logAudit(action:string,docId:string|undefined,studyId:string,field:string,oldVal:string,newVal:string,sigReason:string="",docName:string=""){\n    await supabase.from("audit_trail").insert([{\n      user_id:user.id,user_email:user.email,action,document_id:docId,\n      study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,document_name:docName,\n    }]);\n  }'
);

// Fix 2: Update logAudit calls to pass document name where available
// Document uploaded
content = content.replace(
  'await logAudit("Document uploaded",data[0].id,activeStudy.study_id,"status","",fDocStatus);',
  'await logAudit("Document uploaded",data[0].id,activeStudy.study_id,"status","",fDocStatus,"",fCustomName||pendingFileName||an);'
);

// Document approved (handleApprove)
content = content.replace(
  'await logAudit("Document approved",selectedDoc.id,selectedDoc.study_id,"status","Under Review","Approved",approveReason);',
  'await logAudit("Document approved",selectedDoc.id,selectedDoc.study_id,"status","Under Review","Approved",approveReason,selectedDoc.custom_file_name||selectedDoc.artifact_name);'
);

// Document submitted for review
content = content.replace(
  'await logAudit("Document submitted for review",selectedDoc.id,selectedDoc.study_id,"status","Draft","Under Review");',
  'await logAudit("Document submitted for review",selectedDoc.id,selectedDoc.study_id,"status","Draft","Under Review","",selectedDoc.custom_file_name||selectedDoc.artifact_name);'
);

// Comment added
content = content.replace(
  'await logAudit("Comment added",selectedDoc.id,selectedDoc.study_id,"comments","",commentText.trim());',
  'await logAudit("Comment added",selectedDoc.id,selectedDoc.study_id,"comments","",commentText.trim(),"",selectedDoc.custom_file_name||selectedDoc.artifact_name);'
);

// Document archived (documents panel)
content = content.replace(
  'await logAudit("Document archived",d.id,d.study_id,"status",d.status,"Archived");',
  'await logAudit("Document archived",d.id,d.study_id,"status",d.status,"Archived","",d.custom_file_name||d.artifact_name);'
);

// Query raised
content = content.replace(
  'await logAudit("Query raised",queryDoc.id,activeStudy?.study_id||"","query","",queryText.trim());',
  'await logAudit("Query raised",queryDoc.id,activeStudy?.study_id||"","query","",queryText.trim(),"",queryDoc.custom_file_name||queryDoc.artifact_name);'
);

// Fix 3: Show document_name in audit trail table instead of truncated ID
content = content.replace(
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.document_id?.slice(0,8)||"-"}</td>',
  '<td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.document_name||l.document_id?.slice(0,8)||"-"}</td>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
