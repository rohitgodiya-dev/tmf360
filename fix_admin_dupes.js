const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.tsx', 'utf8').split('\n');

// Find and remove duplicate demo state lines (keep first occurrence)
const demoStateLines = [
  'const[demos,setDemos]=useState<any[]>([]);',
  'const[selectedDemo,setSelectedDemo]=useState<any>(null);',
  'const[demoNotes,setDemoNotes]=useState("");'
];

const seen = new Set();
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  const isDemoState = demoStateLines.some(s => trimmed.includes(s));
  
  if (isDemoState) {
    const key = demoStateLines.find(s => trimmed.includes(s));
    if (seen.has(key)) {
      console.log('Removed duplicate at line', i + 1, ':', trimmed.slice(0, 50));
      continue; // skip duplicate
    }
    seen.add(key);
  }
  newLines.push(lines[i]);
}

console.log('Removed', lines.length - newLines.length, 'duplicate lines');
fs.writeFileSync('app/admin/page.tsx', newLines.join('\n'), 'utf8');
console.log('done');
