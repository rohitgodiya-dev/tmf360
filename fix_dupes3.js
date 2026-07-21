const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

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

console.log('Found', queryStateLines.length, 'query state lines at:', queryStateLines);

// Keep only first 6, remove the rest in reverse order
const toRemove = queryStateLines.slice(6);
console.log('Removing', toRemove.length, 'duplicate lines');
for(let i = toRemove.length - 1; i >= 0; i--) {
  lines.splice(toRemove[i], 1);
}

fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
