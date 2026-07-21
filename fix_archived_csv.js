const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Find and fix the broken join("\n") in exportCSV
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const csv=[headers,...rows].map(r=>r.map((v:string)=>JSON.stringify(v)).join(",")).join("')) {
    // This line has a broken newline - fix it by combining with next line
    lines[i] = '    const csv=[headers,...rows].map(r=>r.map((v:string)=>JSON.stringify(v)).join(",")).join("\\n");';
    // Remove the next line which contains the orphaned closing
    if (lines[i+1] && lines[i+1].trim() === '");') {
      lines.splice(i+1, 1);
    }
    console.log('Fixed at line', i+1);
    break;
  }
}

fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
