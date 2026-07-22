const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

// Check if export default exists
if (!content.includes('export default function AdminPortal')) {
  // Add export default if missing
  content = content.replace('function AdminPortal()', 'export default function AdminPortal()');
  console.log('Added export default');
} else {
  console.log('Export default already present');
}

// Check for "use client"
if (!content.startsWith('"use client"')) {
  content = '"use client";\n' + content;
  console.log('Added use client');
}

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log('Content starts with:', content.slice(0, 100));
console.log('done');
