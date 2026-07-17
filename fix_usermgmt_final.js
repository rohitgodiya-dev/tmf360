const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Find start and end of UserManagementPanel
const start = c.indexOf('function UserManagementPanel(');
const end = c.indexOf('\nfunction ProfilePanel(');

if (start === -1 || end === -1) {
  console.log('ERROR: Could not find UserManagementPanel or ProfilePanel');
  process.exit(1);
}

const ROLES_REF = c.slice(0, start).includes('const ROLES=') ? '' : '// ROLES and RC must be defined elsewhere';

const newPanel = `function UserManagementPanel({user, P, supabase}: {user: any, P: any, supabase: any}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("CRA");
  const [invitePassword, setInvitePassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdTargetUser, setPwdTargetUser] = useState<any>(null);
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", user?.id).single().then(({data}:any) => {
      if (["System Administrator","Sponsor Admin","TMF Lead"].includes(data?.role)) setIsAdmin(true);
    });
    loadUsers();
  }, [user]);

  async function loadUsers() {
    const {data} = await supabase.from("user_roles").select("*").order("created_at",{ascending:false});
    if (data) setUsers(data);
    setLoading(false);
  }

  async function addUser() {
    if (!inviteEmail.trim()) return;
    setMessage("Sending invitation...");
    try {
      const res = await fetch("/api/invite", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:inviteEmail.trim(),role:inviteRole,full_name:inviteName.trim(),password:invitePassword,invited_by_email:user?.email})});
      const data = await res.json();
      if (data.error) { setMessage("Error: "+data.error); }
      else { setMessage("Invitation sent to "+inviteEmail); setShowModal(false); setInviteEmail(""); setInviteName(""); loadUsers(); }
    } catch(e: any) { setMessage("Error: "+e.message); }
    setTimeout(()=>setMessage(""),4000);
  }

  async function updateRole(id: string, role: string) {
    await supabase.from("user_roles").update({role}).eq("id",id);
    loadUsers();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("user_roles").update({is_active:!current}).eq("id",id);
    loadUsers();
  }

  async function toggleDocAccess(id: string, current: boolean) {
    await supabase.from("user_roles").update({can_upload_download:!current}).eq("id",id);
    loadUsers();
  }

  async function toggleDownload(id: string, current: boolean) {
    await supabase.from("user_roles").update({can_download:!current}).eq("id",id);
    loadUsers();
  }

  async function toggleNotifications(id: string, current: boolean) {
    await supabase.from("user_roles").update({notifications_enabled:!current}).eq("id",id);
    loadUsers();
  }

  async function changeUserPassword() {
    if(!newPwd.trim()||newPwd.length<6){setPwdMsg("Password must be at least 6 characters.");return;}
    const res=await fetch("/api/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:pwdTargetUser.user_id,newPassword:newPwd})});
    const data=await res.json();
    if(data.error){setPwdMsg("Error: "+data.error);}else{setPwdMsg("Password changed successfully.");setTimeout(()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");},1500);}
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontSize:"14px",fontWeight:"500"}}>User Management</h1>
        {isAdmin&&<button onClick={()=>setShowModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Add User</button>}
      </div>
      {message&&<div style={{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",background:message.includes("Error")?P.dangerLight:P.successLight,color:message.includes("Error")?P.danger:P.success}}>{message}</div>}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const,padding:"10px 14px",background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"12px"}}>
        {ROLES.map(r=><span key={r} style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",background:(RC[r]||"#6366F1")+"22",color:RC[r]||"#6366F1",fontWeight:"500"}}>{r}</span>)}
      </div>
      <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"12px",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr style={{borderBottom:\`0.5px solid \${P.border}\`}}>
            {["Name / Email","Role","Status","Added","Notifications","Upload","Download","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>
            :users.length===0?<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>
            :users.map((u)=>(
              <tr key={u.id} style={{borderBottom:\`0.5px solid \${P.bgTert}\`}}>
                <td style={{padding:"10px 14px"}}><div style={{fontWeight:"500"}}>{u.full_name||"-"}</div><div style={{fontSize:"11px",color:P.textSec}}>{u.email}</div></td>
                <td style={{padding:"10px 14px"}}>
                  {isAdmin?<select value={u.role} onChange={e=>updateRole(u.id,e.target.value)} style={{fontSize:"11px",padding:"4px 8px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:(RC[u.role]||"#6366F1")+"22",color:RC[u.role]||"#6366F1",fontWeight:"500"}}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select>:<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",background:(RC[u.role]||"#6366F1")+"22",color:RC[u.role]||"#6366F1",fontWeight:"500"}}>{u.role}</span>}
                </td>
                <td style={{padding:"10px 14px"}}><span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"20px",background:u.is_active?"#ECFDF5":"#F3F4F6",color:u.is_active?"#10B981":"#6B7280",fontWeight:"500"}}>{u.is_active?"Active":"Inactive"}</span></td>
                <td style={{padding:"10px 14px",fontSize:"11px",color:P.textSec}}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleDocAccess(u.id,u.can_upload_download)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:u.can_upload_download?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.can_upload_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_upload_download?"YES":"NO"}</button>:<span style={{fontSize:"10px",color:u.can_upload_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_upload_download?"YES":"NO"}</span>}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleDownload(u.id,u.can_download)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:u.can_download?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.can_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_download?"YES":"NO"}</button>:<span style={{fontSize:"10px",color:u.can_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_download?"YES":"NO"}</span>}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleNotifications(u.id,u.notifications_enabled)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:u.notifications_enabled?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.notifications_enabled?"#10B981":"#EF4444",fontWeight:"500"}}>{u.notifications_enabled?"ON":"OFF"}</button>:<span style={{fontSize:"10px",color:u.notifications_enabled?"#10B981":"#EF4444",fontWeight:"500"}}>{u.notifications_enabled?"ON":"OFF"}</span>}</td>
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                    {isAdmin&&<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>}
                    {isAdmin&&<button onClick={()=>{setPwdTargetUser(u);setNewPwd("");setPwdMsg("");setShowPwdModal(true);}} style={{fontSize:"10px",padding:"3px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:P.primary}}>Change Pwd</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:\`0.5px solid \${P.border}\`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add Team Member</h2>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Full Name</label><input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="e.g. Jane Smith" style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Email</label><input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="jane@organization.com" type="email" style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Password</label><input value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} placeholder="Create a password for this user" type="password" style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Role</label>
              <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}>
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addUser} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add User</button>
            </div>
          </div>
        </div>
      )}
      {showPwdModal&&pwdTargetUser&&(
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

`;

c = c.slice(0, start) + newPanel + c.slice(end);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. File length:', c.length);

const checks = [
  ['UserManagementPanel exists', c.includes('function UserManagementPanel(')],
  ['changeUserPassword function inside component', c.includes('async function changeUserPassword()')],
  ['showPwdModal state', c.includes('showPwdModal, setShowPwdModal') || c.includes('[showPwdModal, setShowPwdModal]')],
  ['Change Pwd button', c.includes('Change Pwd')],
  ['Password modal', c.includes('Change Password</button>')],
  ['No duplicate tr', !(c.match(/\/tr>\s*\n\s*<\/tr>/g)||[]).length],
  ['ProfilePanel still exists', c.includes('function ProfilePanel(')],
];
checks.forEach(([name, ok]) => console.log(ok ? 'OK' : 'FAIL', name));
