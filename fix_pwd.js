const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Remove the misplaced changeUserPassword function that's inside JSX
c = c.replace(
`  async function changeUserPassword() {
    if(!newPwd.trim()||newPwd.length<6){setPwdMsg("Password must be at least 6 characters.");return;}
    const res=await fetch("/api/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:pwdTargetUser.user_id,newPassword:newPwd})});
    const data=await res.json();
    if(data.error){setPwdMsg("Error: "+data.error);}else{setPwdMsg("Password changed successfully.");setTimeout(()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");},1500);}
  }

              </tr>`,
`              </tr>`
);

// Add changeUserPassword function after toggleNotifications
c = c.replace(
  'async function toggleNotifications(id: string, current: boolean) {\n    await supabase.from("user_roles").update({notifications_enabled:!current}).eq("id",id);\n    loadUsers();\n  }',
  'async function toggleNotifications(id: string, current: boolean) {\n    await supabase.from("user_roles").update({notifications_enabled:!current}).eq("id",id);\n    loadUsers();\n  }\n  async function changeUserPassword() {\n    if(!newPwd.trim()||newPwd.length<6){setPwdMsg("Password must be at least 6 characters.");return;}\n    const res=await fetch("/api/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:pwdTargetUser.user_id,newPassword:newPwd})});\n    const data=await res.json();\n    if(data.error){setPwdMsg("Error: "+data.error);}else{setPwdMsg("Password changed successfully.");setTimeout(()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");},1500);}\n  }'
);

// Add password modal before closing </div> of UserManagementPanel return
// Find the showModal closing block and add modal after it
c = c.replace(
  `    </div>
  );
}


function ProfilePanel`,
  `    {showPwdModal&&pwdTargetUser&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
        <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:\`0.5px solid \${P.border}\`}}>
          <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Change Password</h2>
          <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{pwdTargetUser.full_name||pwdTargetUser.email}</p>
          <div style={{marginBottom:"1rem"}}>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New Password</label>
            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Min 6 characters" style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"8px 10px"}} onKeyDown={e=>e.key==="Enter"&&changeUserPassword()}/>
          </div>
          {pwdMsg&&<div style={{fontSize:"11px",marginBottom:"10px",padding:"8px 10px",borderRadius:"8px",background:pwdMsg.includes("Error")?P.dangerLight:P.successLight,color:pwdMsg.includes("Error")?P.danger:P.success}}>{pwdMsg}</div>}
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <button onClick={()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");}} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
            <button onClick={changeUserPassword} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Change Password</button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}


function ProfilePanel`
);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. File length:', c.length);

const checks = [
  ['changeUserPassword function', c.includes('async function changeUserPassword()')],
  ['password modal', c.includes('Change Password</button>')],
  ['no misplaced function in JSX', !c.includes('if(!newPwd.trim()||newPwd.length<6){setPwdMsg("Password must be at least 6 characters.");return;}\n    const res=await fetch\n              </tr>')],
];
checks.forEach(([name, ok]) => console.log(ok ? 'OK' : 'FAIL', name));
