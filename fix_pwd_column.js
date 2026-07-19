const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: Remove Password from headers array (we'll keep Actions and Password separate)
// Current: "Actions","Password" - keep this

// Fix 2: Split the Actions td into two tds - one for Deactivate, one for Change Pwd
const oldActionsTd = `<td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                    {isAdmin&&<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>}
                    {isAdmin&&<button onClick={()=>{setPwdTargetUser(u);setNewPwd("");setPwdMsg("");setShowPwdModal(true);}} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:P.primary}}>Change Pwd</button>}
                  </div>
                </td>`;

const newActionsTd = `<td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                    {isAdmin&&<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>}
                  </div>
                </td>
                <td style={{padding:"10px 14px"}}>
                  {isAdmin&&<button onClick={()=>{setPwdTargetUser(u);setNewPwd("");setPwdMsg("");setShowPwdModal(true);}} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:P.primary}}>Change Pwd</button>}
                </td>`;

if (c.includes(oldActionsTd)) {
  c = c.replace(oldActionsTd, newActionsTd);
  console.log('Actions/Password columns split - OK');
} else {
  console.log('Pattern not found');
  const idx = c.indexOf('Deactivate":"Activate"}</button>}');
  if (idx > -1) console.log('Context:', JSON.stringify(c.slice(idx-50, idx+300)));
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done.');
