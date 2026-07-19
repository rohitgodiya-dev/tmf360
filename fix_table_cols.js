const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix colSpan on loading and empty rows from 8 to 9
c = c.replace(
  '<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>',
  '<tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>'
);
c = c.replace(
  '<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>',
  '<tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>'
);

// Count headers and tds to verify
const headerCount = (c.match(/"Name \/ Email","Role","Status","Added","Upload","Download","Notifications","Action","Password"/g)||[]).length;
console.log('Header row found:', headerCount > 0);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done.');
