const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

content = content.replace(
  'study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,',
  'study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,document_name:docName,'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
