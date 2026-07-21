const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Remove the duplicate block - the second insertion of query states
const duplicate = '\n  const[showQueryModal,setShowQueryModal]=useState(false);\n  const[queryDoc,setQueryDoc]=useState<any>(null);\n  const[queryText,setQueryText]=useState("");\n  const[queryType,setQueryType]=useState("Question");\n  const[queryPriority,setQueryPriority]=useState("Medium");\n  const[queryDueDate,setQueryDueDate]=useState("");';

// Find all occurrences
let count = 0;
let idx = 0;
while ((idx = content.indexOf(duplicate, idx)) !== -1) {
  count++;
  idx++;
}
console.log('Found occurrences:', count);

if (count === 2) {
  // Remove the second occurrence
  const first = content.indexOf(duplicate);
  const second = content.indexOf(duplicate, first + 1);
  content = content.slice(0, second) + content.slice(second + duplicate.length);
  console.log('Removed duplicate');
}

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
