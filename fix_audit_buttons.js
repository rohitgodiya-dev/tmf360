const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Find the audit trail header section and fix button spacing
// The issue is the two buttons are not in a flex container together
// Find: the closing of CSV button and opening of PDF button, add marginLeft:0 to PDF and wrap both

// Find the pattern where CSV button ends and PDF button starts with marginLeft:"8px"
const bad = 'marginLeft:"8px"}}><i className="ti ti-file-type-pdf"';
const good = '}}><i className="ti ti-file-type-pdf"';

if (c.includes(bad)) {
  c = c.replace(bad, good);
  console.log('Removed marginLeft from PDF button - OK');
} else {
  console.log('Pattern not found');
}

// Also check if the buttons are already wrapped - if not wrap them
// Find the div wrapping both buttons
const wrapCheck = c.indexOf('<div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><h1');
if (wrapCheck > -1) {
  console.log('Wrapper div found');
  // Check context around the CSV button to see if buttons are together
  const csvIdx = c.indexOf('Download CSV</button><button');
  console.log('CSV+PDF adjacent:', csvIdx > -1);
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done.');
