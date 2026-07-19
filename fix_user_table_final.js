const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: Update headers to correct names
c = c.replace(
  '"Name / Email","Role","Status","Added","Upload","Download","Notifications","Activate / Deactivate","Change Password"',
  '"Name / Email","Role","Status","Added","Upload","Download","Notifications","Action","Password"'
);

// Fix 2: Fix colSpan on loading/empty rows to 9
c = c.replace(
  '<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>',
  '<tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>'
);
c = c.replace(
  '<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>',
  '<tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>'
);

// Fix 3: Split the last td into two tds - one for Deactivate, one for Change Pwd
const oldTd = `<td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                    {isAdmin&&<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>}
                    {isAdmin&&<button onClick={()=>{setPwdTargetUser(u);setNewPwd("");setPwdMsg("");setShowPwdModal(true);}} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:P.primary}}>Change Pwd</button>}
                  </div>
                </td>`;

const newTd = `<td style={{padding:"10px 14px"}}>
                  {isAdmin&&<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>}
                </td>
                <td style={{padding:"10px 14px"}}>
                  {isAdmin&&<button onClick={()=>{setPwdTargetUser(u);setNewPwd("");setPwdMsg("");setShowPwdModal(true);}} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:P.primary}}>Change Pwd</button>}
                </td>`;

if (c.includes(oldTd)) {
  c = c.replace(oldTd, newTd);
  console.log('Fix 3: td split - OK');
} else {
  // Try CRLF
  const oldTdCR = oldTd.replace(/\n/g, '\r\n');
  const newTdCR = newTd.replace(/\n/g, '\r\n');
  if (c.includes(oldTdCR)) {
    c = c.replace(oldTdCR, newTdCR);
    console.log('Fix 3: td split (CRLF) - OK');
  } else {
    console.log('Fix 3: pattern not found, trying inline search...');
    // Find the relevant section
    const idx = c.indexOf('Deactivate":"Activate"}</button>}');
    if (idx > -1) {
      console.log('Found at:', idx);
      console.log(JSON.stringify(c.slice(idx-100, idx+400)));
    }
  }
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
