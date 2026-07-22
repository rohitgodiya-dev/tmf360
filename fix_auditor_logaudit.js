const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

content = content.replace(
  'actionType === "approve" ? "Document approved via TMF Auditor" : "Document moved to pending review via TMF Auditor",\n        selectedDoc.id, selectedDoc.study_id, "status", selectedDoc.status, newStatus, actionComment.trim()',
  'actionType === "approve" ? "Document approved via TMF Auditor" : "Document moved to pending review via TMF Auditor",\n        selectedDoc.id, selectedDoc.study_id, "status", selectedDoc.status, newStatus, actionComment.trim(), selectedDoc.custom_file_name||selectedDoc.artifact_name'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
