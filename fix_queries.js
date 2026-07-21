const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix the broken newline in addReply function
content = content.replace(
  'const newReplies=existing+(existing?"\n":"")+"["+new Date().toLocaleString()+" - "+user.email+"]: "+replyText.trim();',
  'const newReplies=existing+(existing?"\\n":"")+"["+new Date().toLocaleString()+" - "+user.email+"]: "+replyText.trim();'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
