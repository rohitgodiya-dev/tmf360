const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Check if auditorScore variable was added
console.log('auditorScore var:', c.includes('auditorScore'));

// Check if the gauge was added
console.log('Auditor gauge:', c.includes('Auditor score'));

// Find the inspection section
const idx = c.indexOf('readinessGauge(ri)');
if (idx > -1) {
  console.log('readinessGauge(ri) found at:', idx);
  console.log('Context:', JSON.stringify(c.slice(idx-200, idx+600)));
}
