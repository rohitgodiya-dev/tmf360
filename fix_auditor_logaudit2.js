const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('selectedDoc.id, selectedDoc.study_id, "status", selectedDoc.status, newStatus, actionComment.trim()')) {
    lines[i] = lines[i].replace(
      'selectedDoc.id, selectedDoc.study_id, "status", selectedDoc.status, newStatus, actionComment.trim()',
      'selectedDoc.id, selectedDoc.study_id, "status", selectedDoc.status, newStatus, actionComment.trim(), selectedDoc.custom_file_name||selectedDoc.artifact_name'
    );
    console.log('Fixed at line', i + 1);
    break;
  }
}

fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
