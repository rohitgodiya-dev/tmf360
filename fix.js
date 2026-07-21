const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');
content = content.replace('const chatFileInputRef=useRef<HTMLInputElement>(null);', 'const chatFileInputRef=useRef<HTMLInputElement>(null);\n  const[showQueryModal,setShowQueryModal]=useState(false);\n  const[queryDoc,setQueryDoc]=useState<any>(null);\n  const[queryText,setQueryText]=useState("");\n  const[queryType,setQueryType]=useState("Question");\n  const[queryPriority,setQueryPriority]=useState("Medium");\n  const[queryDueDate,setQueryDueDate]=useState("");');
fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');