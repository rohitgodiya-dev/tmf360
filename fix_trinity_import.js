const fs = require('fs');
let content = fs.readFileSync('app/trinity/page.tsx', 'utf8');
content = content.replace(
  "from\"../../lib/supabase\"",
  "from\"../lib/supabase\""
);
fs.writeFileSync('app/trinity/page.tsx', content, 'utf8');
console.log('Fixed supabase import path');
