const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: async async -> async
c = c.replace('async async function handleAction()', 'async function handleAction()');

// Fix 2: The broken updateData block - has misplaced closing brace
// Find and fix: comments line followed by "    };" then "    if (actionType..."
const bad = `      comments: (selectedDoc.comments||"") + (selectedDoc.comments?"\\n":"") + "[" + new Date().toLocaleString() + " - " + user.email + "]: " + actionComment.trim()
    };
    };
    
    if (actionType === "approve") {`;

const good = `      comments: (selectedDoc.comments||"") + (selectedDoc.comments?"\\n":"") + "[" + new Date().toLocaleString() + " - " + user.email + "]: " + actionComment.trim()
    };
    
    if (actionType === "approve") {`;

if (c.includes(bad)) {
  c = c.replace(bad, good);
  console.log('Fix 2 applied - OK');
} else {
  // Try alternate CRLF version
  const badCRLF = bad.replace(/\n/g, '\r\n');
  const goodCRLF = good.replace(/\n/g, '\r\n');
  if (c.includes(badCRLF)) {
    c = c.replace(badCRLF, goodCRLF);
    console.log('Fix 2 applied (CRLF) - OK');
  } else {
    console.log('Fix 2: pattern not found, checking context...');
    const idx = c.indexOf('actionComment.trim()\r\n    };\r\n');
    if (idx > -1) {
      console.log('Found at index:', idx);
      console.log(JSON.stringify(c.slice(idx, idx + 200)));
    }
  }
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
