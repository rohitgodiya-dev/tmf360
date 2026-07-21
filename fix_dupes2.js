const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

console.log('Total lines:', lines.length);
console.log('Lines 379-395:');
for(let i=379; i<=395; i++) console.log(i+1, lines[i]);

// Find all lines containing query state declarations
const queryStateLines = [];
lines.forEach((line, idx) => {
  if(line.includes('const[showQueryModal') || 
     line.includes('const[queryDoc') || 
     line.includes('const[queryText') || 
     line.includes('const[queryType') || 
     line.includes('const[queryPriority') || 
     line.includes('const[queryDueDate')) {
    queryStateLines.push(idx);
  }
});

console.log('Query state lines found at:', queryStateLines);

// Remove the second set (lines 387-393 based on error, which is index 386-392)
if(queryStateLines.length === 12) {
  // Remove the second 6 lines (keep first 6)
  const toRemove = queryStateLines.slice(6);
  console.log('Removing lines:', toRemove);
  // Remove in reverse order to keep indices valid
  for(let i = toRemove.length - 1; i >= 0; i--) {
    lines.splice(toRemove[i], 1);
  }
}

fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
