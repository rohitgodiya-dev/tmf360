const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

content = content.replace(
  'const{data,error}=await supabase.from("documents").insert([d]).select();\n    if(!error&&data){',
  'const{data,error}=await supabase.from("documents").insert([d]).select();\n    console.log("INSERT ERROR:",JSON.stringify(error));\n    console.log("INSERT DATA:",JSON.stringify(data));\n    if(!error&&data){'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
