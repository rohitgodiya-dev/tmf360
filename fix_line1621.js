const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

console.log('Line 1620:', lines[1619]);
console.log('Line 1621:', lines[1620]);
console.log('Line 1622:', lines[1621]);

// Remove line 1621 (index 1620) if it contains the misplaced csv line
if (lines[1620] && lines[1620].includes('const csv=[headers,...rows]')) {
  lines.splice(1620, 1);
  console.log('Removed misplaced csv line at 1621');
}

fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
