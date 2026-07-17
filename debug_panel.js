const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

const startMarker = '\nfunction TmfConfigPanel(';
const startIdx = content.indexOf(startMarker);
if(startIdx === -1){ console.log('TmfConfigPanel start not found!'); process.exit(1); }
console.log('Start found at:', startIdx);

// Show what's at the end of the file
console.log('Last 200 chars of file:');
console.log(JSON.stringify(content.slice(-200)));
