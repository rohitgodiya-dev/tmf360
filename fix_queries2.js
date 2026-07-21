const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix split newline - find the broken split pattern around line 2088
// It will appear as split(" followed by newline followed by ")
const broken = content.indexOf('selectedQuery.replies.split("');
if (broken !== -1) {
  // Find the closing quote which is on next line
  const start = broken + 'selectedQuery.replies.split("'.length;
  const end = content.indexOf('").map', start);
  if (end !== -1) {
    content = content.slice(0, broken) + 'selectedQuery.replies.split("\\n").map' + content.slice(end + '").map'.length);
    console.log('fixed split newline');
  }
}

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
