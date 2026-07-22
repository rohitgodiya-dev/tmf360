const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.tsx', 'utf8').split('\n');

// Find the demo_requests query line and add setDemos after it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('supabase.from("demo_requests").select')) {
    // Check if next line already has setDemos
    if (!lines[i+1] || !lines[i+1].includes('setDemos')) {
      lines.splice(i + 1, 0, '    if(demoData)setDemos(demoData);');
      console.log('Added setDemos at line', i + 2);
    } else {
      console.log('setDemos already exists at line', i + 2);
    }
    break;
  }
}

// Also check demos state exists
const content = lines.join('\n');
if (!content.includes('const[demos,setDemos]')) {
  // Find tokens state and add demos after
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const[tokens,setTokens]=useState')) {
      lines.splice(i + 1, 0,
        '  const[demos,setDemos]=useState<any[]>([]);',
        '  const[selectedDemo,setSelectedDemo]=useState<any>(null);',
        '  const[demoNotes,setDemoNotes]=useState("");'
      );
      console.log('Added demos state at line', i + 2);
      break;
    }
  }
} else {
  console.log('Demos state already exists');
}

fs.writeFileSync('app/admin/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
