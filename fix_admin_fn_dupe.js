const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

// Find and remove the first occurrence of updateDemoStatus (keep second)
const fnStr = `async function updateDemoStatus(id:string,status:string,notes?:string){\n    await supabase.from("demo_requests").update({status,notes:notes||null,confirmed_at:status==="Confirmed"?new Date().toISOString():null,confirmed_by:status==="Confirmed"?adminUser?.email:null}).eq("id",id);\n    setSelectedDemo((prev:any)=>prev?{...prev,status,notes:notes||prev.notes}:null);\n    loadAllData();\n  }`;

const firstIdx = content.indexOf('async function updateDemoStatus');
const secondIdx = content.indexOf('async function updateDemoStatus', firstIdx + 1);

if (secondIdx !== -1) {
  // Remove the first occurrence
  const endOfFirst = content.indexOf('\n  }', firstIdx) + 4;
  content = content.slice(0, firstIdx) + content.slice(endOfFirst).trimStart();
  console.log('Removed first duplicate updateDemoStatus');
} else {
  console.log('Only one occurrence found - no duplicate');
}

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log('done');
