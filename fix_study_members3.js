const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

// Find the line with "const [isAdmin, setIsAdmin] = useState(false);" inside UserManagementPanel
let targetLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [isAdmin, setIsAdmin] = useState(false);') && 
      lines[i-2] && lines[i-2].includes('UserManagementPanel')) {
    targetLine = i;
    break;
  }
}

// If not found by context, find by content
if (targetLine === -1) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const [isAdmin, setIsAdmin] = useState(false);')) {
      targetLine = i;
      break;
    }
  }
}

console.log('Found isAdmin state at line:', targetLine + 1);

if (targetLine !== -1) {
  const newLines = [
    '  const [studyMembers, setStudyMembers] = useState<any[]>([]);',
    '  const [showAddMember, setShowAddMember] = useState(false);',
    '  const [memberUserId, setMemberUserId] = useState("");',
    '  const [memberRole, setMemberRole] = useState("CRA");',
    '  const [memberMsg, setMemberMsg] = useState("");',
  ];
  lines.splice(targetLine + 1, 0, ...newLines);
  console.log('Inserted state declarations');
}

fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
