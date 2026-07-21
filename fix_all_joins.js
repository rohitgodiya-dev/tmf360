const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

let fixed = 0;
let i = 0;
while (i < lines.length) {
  // Find lines ending with .join(" and next line is ");
  if (lines[i].includes('.join(",")).join("') && !lines[i].includes('.join(",")).join("\\n")')) {
    // Check if line ends abruptly (broken newline)
    const trimmed = lines[i].trimEnd();
    if (trimmed.endsWith('.join(",")).join("')) {
      // Fix: append \n"); and remove next line
      lines[i] = trimmed + '\\n");';
      if (i + 1 < lines.length && lines[i+1].trim() === '");') {
        lines.splice(i+1, 1);
      }
      fixed++;
      console.log('Fixed line', i+1);
    }
  }
  i++;
}

console.log('Total fixed:', fixed);
fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
