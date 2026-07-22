const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Submit for review - pass submission reason
content = content.replace(
  'await logAudit("Document submitted for review",selectedDoc.id,selectedDoc.study_id,"status","Draft","Under Review","",selectedDoc.custom_file_name||selectedDoc.artifact_name);',
  'await logAudit("Document submitted for review",selectedDoc.id,selectedDoc.study_id,"status","Draft","Under Review - "+submissionReason,submissionReason,selectedDoc.custom_file_name||selectedDoc.artifact_name);'
);

// 2. Reject - pass rejection reason
content = content.replace(
  'await logAudit("Document rejected",d.id,d.study_id,"status","Under Review","Draft",reason);',
  'await logAudit("Document rejected",d.id,d.study_id,"status","Under Review","Draft - Reason: "+reason,reason,d.custom_file_name||d.artifact_name);'
);

// 3. Appeal - pass appeal text
content = content.replace(
  'await logAudit("Appeal submitted",d.id,d.study_id,"appeal_reason","",ta.value.trim());',
  'await logAudit("Appeal submitted",d.id,d.study_id,"appeal_reason","",ta.value.trim(),"",d.custom_file_name||d.artifact_name);'
);

// 4. Comment added - pass comment text
content = content.replace(
  'await logAudit("Comment added",selectedDoc.id,selectedDoc.study_id,"comments","",commentText.trim(),"",selectedDoc.custom_file_name||selectedDoc.artifact_name);',
  'await logAudit("Comment added",selectedDoc.id,selectedDoc.study_id,"comments","",commentText.trim(),"Comment: "+commentText.trim(),selectedDoc.custom_file_name||selectedDoc.artifact_name);'
);

// 5. Archive from documents panel
content = content.replace(
  'await logAudit("Document archived",d.id,d.study_id,"status",d.status,"Archived","",d.custom_file_name||d.artifact_name);',
  'await logAudit("Document archived",d.id,d.study_id,"status",d.status,"Archived - Reason: "+reason,reason,d.custom_file_name||d.artifact_name);'
);

// 6. Archive from preview modal
content = content.replace(
  'await logAudit("Document archived",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Archived");',
  'await logAudit("Document archived",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Archived - Reason: "+reason,reason,previewDoc.custom_file_name||previewDoc.artifact_name);'
);

// 7. Query raised - pass query text
content = content.replace(
  'await logAudit("Query raised",queryDoc.id,activeStudy?.study_id||"","query","",queryText.trim(),"",queryDoc.custom_file_name||queryDoc.artifact_name);',
  'await logAudit("Query raised",queryDoc.id,activeStudy?.study_id||"","query","","Query: "+queryText.trim(),"",queryDoc.custom_file_name||queryDoc.artifact_name);'
);

// 8. Query reply - pass reply text
content = content.replace(
  'await logAudit("Query reply added",selectedQuery.document_id,selectedQuery.study_id,"query_reply","",replyText.trim());',
  'await logAudit("Query reply added",selectedQuery.document_id,selectedQuery.study_id,"query_reply","","Reply: "+replyText.trim(),"",selectedQuery.artifact_name);'
);

// 9. Query closed
content = content.replace(
  'await logAudit("Query closed",selectedQuery.document_id,selectedQuery.study_id,"query_status","Open","Closed");',
  'await logAudit("Query closed",selectedQuery.document_id,selectedQuery.study_id,"query_status","Open","Closed","",selectedQuery.artifact_name);'
);

// 10. Query reopened
content = content.replace(
  'await logAudit("Query reopened",selectedQuery.document_id,selectedQuery.study_id,"query_status","Closed","Open");',
  'await logAudit("Query reopened",selectedQuery.document_id,selectedQuery.study_id,"query_status","Closed","Open","",selectedQuery.artifact_name);'
);

// 11. Restore from archive
content = content.replace(
  'await logAudit("Document restored from archive",d.id,d.study_id,"status","Archived",restoreStatus);',
  'await logAudit("Document restored from archive",d.id,d.study_id,"status","Archived","Restored to "+restoreStatus,"",d.custom_file_name||d.artifact_name);'
);

// 12. Permanent delete
content = content.replace(
  'await logAudit("Document permanently deleted",d.id,d.study_id,"status","Archived","Permanently deleted");',
  'await logAudit("Document permanently deleted",d.id,d.study_id,"status","Archived","Permanently deleted","",d.custom_file_name||d.artifact_name);'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
