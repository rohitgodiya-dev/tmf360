const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix signature
content = content.replace(
  'async function logAudit(action:string,docId:string|undefined,studyId:string,field:string,oldVal:string,newVal:string,sigReason:string=""){',
  'async function logAudit(action:string,docId:string|undefined,studyId:string,field:string,oldVal:string,newVal:string,sigReason:string="",docName:string=""){'
);

// Fix insert to include document_name
content = content.replace(
  'user_id:user.id,user_email:user.email,action,document_id:docId,\n      study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,',
  'user_id:user.id,user_email:user.email,action,document_id:docId,\n      study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,document_name:docName,'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
