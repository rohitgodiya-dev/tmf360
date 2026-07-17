const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// FIX 1: Expand isAdmin to include Sponsor Admin and TMF Lead
c = c.replace(
  "if (data?.role === \"System Administrator\") setIsAdmin(true);",
  "if ([\"System Administrator\",\"Sponsor Admin\",\"TMF Lead\"].includes(data?.role)) setIsAdmin(true);"
);

// FIX 2: Add changeUserPassword state and function - add after invitePassword state
c = c.replace(
  'const [message, setMessage] = useState("");\n  const [loading, setLoading] = useState(true);',
  'const [message, setMessage] = useState("");\n  const [loading, setLoading] = useState(true);\n  const [showPwdModal, setShowPwdModal] = useState(false);\n  const [pwdTargetUser, setPwdTargetUser] = useState<any>(null);\n  const [newPwd, setNewPwd] = useState("");\n  const [pwdMsg, setPwdMsg] = useState("");'
);

// FIX 2: Add changeUserPassword function after toggleNotifications
c = c.replace(
  'async function toggleNotifications(id: string, current: boolean) {\n    await supabase.from("user_roles").update({notifications_enabled:!current}).eq("id",id);\n    loadUsers();\n  }',
  'async function toggleNotifications(id: string, current: boolean) {\n    await supabase.from("user_roles").update({notifications_enabled:!current}).eq("id",id);\n    loadUsers();\n  }\n  async function changeUserPassword() {\n    if(!newPwd.trim()||newPwd.length<6){setPwdMsg("Password must be at least 6 characters.");return;}\n    const res=await fetch("/api/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:pwdTargetUser.user_id,newPassword:newPwd})});\n    const data=await res.json();\n    if(data.error){setPwdMsg("Error: "+data.error);}else{setPwdMsg("Password changed successfully.");setTimeout(()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");},1500);}\n  }'
);

// FIX 2: Add Change Password button in Actions column
c = c.replace(
  '<td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>:<span style={{fontSize:"10px",color:u.is_active?"#10B981":"#EF4444",fontWeight:"500"}}>{u.is_active?"Active":"Inactive"}</span>}</td>',
  '<td style={{padding:"10px 14px",display:"flex",gap:"6px",flexWrap:"wrap" as const}}>{isAdmin&&<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>}{isAdmin&&<button onClick={()=>{setPwdTargetUser(u);setNewPwd("");setPwdMsg("");setShowPwdModal(true);}} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:P.primary}}>Change Pwd</button>}</td>'
);

// FIX 2: Add Change Password modal before closing of UserManagementPanel return
c = c.replace(
  '    </div>\n  );\n}\n\n\nfunction ProfilePanel',
  '    {showPwdModal&&pwdTargetUser&&(\n      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>\n        <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:`0.5px solid ${P.border}`}}>\n          <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Change Password</h2>\n          <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{pwdTargetUser.full_name||pwdTargetUser.email}</p>\n          <div style={{marginBottom:"1rem"}}>\n            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New Password</label>\n            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Min 6 characters" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}} onKeyDown={e=>e.key==="Enter"&&changeUserPassword()}/>\n          </div>\n          {pwdMsg&&<div style={{fontSize:"11px",marginBottom:"10px",padding:"8px 10px",borderRadius:"8px",background:pwdMsg.includes("Error")?P.dangerLight:P.successLight,color:pwdMsg.includes("Error")?P.danger:P.success}}>{pwdMsg}</div>}\n          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>\n            <button onClick={()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>\n            <button onClick={changeUserPassword} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Change Password</button>\n          </div>\n        </div>\n      </div>\n    )}\n    </div>\n  );\n}\n\n\nfunction ProfilePanel'
);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. File length:', c.length);

const checks = [
  ['isAdmin includes Sponsor Admin', c.includes('"Sponsor Admin","TMF Lead"')],
  ['showPwdModal state', c.includes('showPwdModal,setShowPwdModal')],
  ['changeUserPassword function', c.includes('async function changeUserPassword()')],
  ['Change Pwd button', c.includes('Change Pwd')],
  ['Password modal', c.includes('Change Password')],
];
checks.forEach(([name, ok]) => console.log(ok ? 'OK' : 'FAIL', name));
