const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Replace the panel state initializer to read from localStorage
c = c.replace(
  'const[panel,setPanel]=useState("auth");',
  'const[panel,setPanel]=useState("auth");'
);

// 2. Replace the setPanel("dashboard") calls after login to also save to localStorage
// We need to wrap setPanel in a function that also saves to localStorage

// Replace the panel state declaration
c = c.replace(
  'const[panel,setPanel]=useState("auth");',
  'const[panel,setPanelRaw]=useState("auth");\n  function setPanel(p:string){setPanelRaw(p);if(p!=="auth")try{localStorage.setItem("tmf_panel",p);}catch{}}' 
);

// 3. After login, restore saved panel
const oldDashboard = 'else{setPanel("dashboard");loadUserRole(session.user.id);}';
const newDashboard = 'else{const saved=typeof window!=="undefined"?localStorage.getItem("tmf_panel"):null;setPanel(saved&&saved!=="auth"?saved:"dashboard");loadUserRole(session.user.id);}';

const count = (c.match(new RegExp(oldDashboard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log('Found setPanel("dashboard") occurrences:', count);

c = c.replaceAll(oldDashboard, newDashboard);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
