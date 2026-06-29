function calcQuality(d:any):{score:number,flags:string[]}{
  const flags:string[]=[];
  if(!d.file_path||!d.file_name){flags.push("NO_FILE");}
  if(!d.effective_date){flags.push("MISSING_DATE");}
  if(!d.owner||d.owner.trim()===""){flags.push("MISSING_OWNER");}
  if(!d.version||d.version.trim()===""){flags.push("MISSING_VERSION");}
  if(!d.custom_file_name||d.custom_file_name.trim()===""){flags.push("MISSING_CUSTOM_NAME");}
  if(d.expiry_date&&new Date(d.expiry_date)<new Date()){flags.push("EXPIRED");}
  let score=100;
  if(flags.includes("NO_FILE"))score-=20;
  if(flags.includes("MISSING_DATE"))score-=10;
  if(flags.includes("MISSING_OWNER"))score-=10;
  if(flags.includes("MISSING_VERSION"))score-=10;
  if(flags.includes("MISSING_CUSTOM_NAME"))score-=5;
  if(flags.includes("EXPIRED"))score-=15;
  return{score:Math.max(0,score),flags};
}

const FLAG_LABELS:Record<string,{label:string,color:string,bg:string,fix:string}> = {
  "NO_FILE":{label:"No file uploaded",color:"#991B1B",bg:"#FEF2F2",fix:"Upload the document file"},
  "MISSING_DATE":{label:"Missing effective date",color:"#92400E",bg:"#FFFBEB",fix:"Add the effective date"},
  "MISSING_OWNER":{label:"Missing owner",color:"#92400E",bg:"#FFFBEB",fix:"Assign a document owner"},
  "MISSING_VERSION":{label:"Missing version",color:"#92400E",bg:"#FFFBEB",fix:"Add version number (e.g. v1.0)"},
  "MISSING_CUSTOM_NAME":{label:"No custom document name",color:"#1E40AF",bg:"#EFF6FF",fix:"Set a descriptive document name"},
  "EXPIRED":{label:"Document expired",color:"#991B1B",bg:"#FEF2F2",fix:"Renew or replace the expired document"},
  "DUPLICATE":{label:"Duplicate file name",color:"#6B21A8",bg:"#FAF5FF",fix:"Check for duplicate uploads"},
  "VERSION_CONFLICT":{label:"Version conflict",color:"#6B21A8",bg:"#FAF5FF",fix:"Review multiple versions of same artifact"},
};

function QualityPanel({docs,P,supabase,setDocs}:{docs:any[],P:any,supabase:any,setDocs:any}){
  const fileNames=docs.map(d=>d.file_name).filter(Boolean);
  const duplicateNames=fileNames.filter((n,i)=>fileNames.indexOf(n)!==i);
  const artifactNums=docs.map(d=>d.artifact_num);
  const duplicateArtifacts=artifactNums.filter((n,i)=>artifactNums.indexOf(n)!==i);

  const docsWithQuality=docs.map(d=>{
    const{score,flags}=calcQuality(d);
    const allFlags=[...flags];
    if(d.file_name&&duplicateNames.includes(d.file_name))allFlags.push("DUPLICATE");
    if(d.artifact_num&&duplicateArtifacts.includes(d.artifact_num))allFlags.push("VERSION_CONFLICT");
    return{...d,qualityScore:Math.max(0,score-(allFlags.includes("DUPLICATE")?15:0)-(allFlags.includes("VERSION_CONFLICT")?10:0)),qualityFlags:allFlags};
  }).sort((a,b)=>a.qualityScore-b.qualityScore);

  const avgScore=docs.length?Math.round(docsWithQuality.reduce((s,d)=>s+d.qualityScore,0)/docs.length):0;
  const perfect=docsWithQuality.filter(d=>d.qualityScore===100).length;
  const needsWork=docsWithQuality.filter(d=>d.qualityScore<70).length;

  const scoreColor=(s:number)=>s>=90?"#10B981":s>=70?"#F59E0B":"#EF4444";
  const scoreBg=(s:number)=>s>=90?"#ECFDF5":s>=70?"#FFFBEB":"#FEF2F2";

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
        {[
          {val:`${avgScore}`,label:"Average quality score",color:scoreColor(avgScore),bg:scoreBg(avgScore)},
          {val:`${docs.length}`,label:"Total documents",color:P.primary,bg:P.primaryLight},
          {val:`${perfect}`,label:"Perfect score (100)",color:"#10B981",bg:"#ECFDF5"},
          {val:`${needsWork}`,label:"Needs attention (<70)",color:"#EF4444",bg:"#FEF2F2"},
        ].map((m,i)=>(
          <div key={i} style={{background:`linear-gradient(135deg,${m.bg},#fff)`,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px",borderTop:`3px solid ${m.color}`}}>
            <div style={{fontSize:"26px",fontWeight:"500",color:m.color}}>{m.val}</div>
            <div style={{fontSize:"11px",color:P.textSec,marginTop:"3px"}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Issue summary */}
      {Object.keys(FLAG_LABELS).map(flag=>{
        const affected=docsWithQuality.filter(d=>d.qualityFlags.includes(flag));
        if(!affected.length)return null;
        const f=FLAG_LABELS[flag];
        return(
          <div key={flag} style={{background:f.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{flex:1}}>
              <span style={{fontSize:"12px",fontWeight:"500",color:f.color}}>{f.label}</span>
              <span style={{fontSize:"11px",color:P.textTert,marginLeft:"8px"}}>{affected.length} document{affected.length!==1?"s":""}</span>
              <div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>Fix: {f.fix}</div>
            </div>
            <span style={{fontSize:"11px",fontWeight:"500",color:f.color,flexShrink:0}}>−{flag==="NO_FILE"?20:flag==="EXPIRED"?15:flag==="DUPLICATE"?15:flag==="VERSION_CONFLICT"?10:flag==="MISSING_CUSTOM_NAME"?5:10} pts each</span>
          </div>
        );
      })}

      {/* Document list */}
      <div style={{background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${P.border}`,fontSize:"11px",fontWeight:"500",color:P.textSec}}>All documents — sorted by quality score</div>
        <table style={{width:"100%",fontSize:"11px",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
            {["Score","Artifact","Zone","File","Issues","Status"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",fontWeight:"500",color:P.textTert}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {docsWithQuality.length===0?(
              <tr><td colSpan={6} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No documents yet.</td></tr>
            ):docsWithQuality.map((d,i)=>(
              <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <div style={{width:"36px",height:"36px",borderRadius:"50%",background:scoreBg(d.qualityScore),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"500",color:scoreColor(d.qualityScore),border:`1.5px solid ${scoreColor(d.qualityScore)}`}}>{d.qualityScore}</div>
                  </div>
                </td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</div>
                  <div style={{fontSize:"11px",fontWeight:"500"}}>{d.custom_file_name||d.artifact_name}</div>
                </td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>Zone {d.zone}</td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.file_name?`${fileIcon(d.file_name)} ${d.file_name}`:"—"}</td>
                <td style={{padding:"8px 10px"}}>
                  {d.qualityFlags.length===0?(
                    <span style={{fontSize:"10px",color:"#10B981"}}>✓ No issues</span>
                  ):(
                    <div style={{display:"flex",gap:"3px",flexWrap:"wrap" as const}}>
                      {d.qualityFlags.map((f:string,fi:number)=>(
                        <span key={fi} style={{fontSize:"9px",padding:"1px 5px",borderRadius:"4px",background:FLAG_LABELS[f]?.bg||"#F3F4F6",color:FLAG_LABELS[f]?.color||P.textSec}}>{FLAG_LABELS[f]?.label||f}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{padding:"8px 10px"}}>
                  <span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"8px",background:d.status==="Approved"?"#ECFDF5":d.status==="Under Review"?"#EFF6FF":"#FFFBEB",color:d.status==="Approved"?"#065F46":d.status==="Under Review"?"#1E40AF":"#92400E"}}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTrail({user,activeStudy,P}:{user:any,activeStudy:any,P:any}){
  const [logs,setLogs]=useState<any[]>([]);
  useEffect(()=>{
    if(!user||!activeStudy)return;
    supabase.from("audit_trail").select("*").eq("user_id",user.id).eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(50).then(({data})=>{if(data)setLogs(data);});
  },[user,activeStudy]);
  if(!activeStudy)return<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>;
  if(logs.length===0)return<div style={{fontSize:"12px",color:P.textTert}}>No audit events yet. Actions will appear here as documents are uploaded and approved.</div>;
  return(
    <div style={{background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
      <table style={{width:"100%",fontSize:"11px",borderCollapse:"collapse"}}>
        <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
          {["Timestamp","User","Action","Document","Field","Old value","New value","Signature reason"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",fontWeight:"500",color:P.textTert}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {logs.map((l,i)=>(
            <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
              <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:"10px",color:P.textTert,whiteSpace:"nowrap"}}>{new Date(l.created_at).toLocaleString()}</td>
              <td style={{padding:"7px 10px",color:P.textSec}}>{l.user_email}</td>
              <td style={{padding:"7px 10px"}}><span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"8px",background:l.action.includes("approved")?P.successLight:P.primaryLight,color:l.action.includes("approved")?"#065F46":P.primary}}>{l.action}</span></td>
              <td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.document_id?.slice(0,8)||"—"}</td>
              <td style={{padding:"7px 10px",color:P.textTert}}>{l.field_changed||"—"}</td>
              <td style={{padding:"7px 10px",color:P.textTert}}>{l.old_value||"—"}</td>
              <td style={{padding:"7px 10px",color:P.textSec}}>{l.new_value||"—"}</td>
              <td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.signature_reason||"—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserManagementPanel({user, P, supabase}: {user: any, P: any, supabase: any}) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", user?.id).single().then(({data}:any) => {
      if (data?.role === "System Administrator") setIsAdmin(true);
    });
  }, [user]);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("CRA");
  const [invitePassword, setInvitePassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const ROLES = ["System Administrator","Sponsor Admin","TMF Lead","Clinical Trial Manager","Clinical Trial Associate","CRA","Regulatory","Quality Assurance","Medical Monitor","Site Coordinator","Investigator","Auditor","Inspector"];
  const RC: Record<string,string> = {"System Administrator":"#6366F1","Sponsor Admin":"#8B5CF6","TMF Lead":"#10B981","Clinical Trial Manager":"#3B82F6","Clinical Trial Associate":"#06B6D4","CRA":"#F59E0B","Regulatory":"#EF4444","Quality Assurance":"#EC4899","Medical Monitor":"#14B8A6","Site Coordinator":"#84CC16","Investigator":"#F97316","Auditor":"#6B7280","Inspector":"#DC2626"};
  useEffect(() => { loadUsers(); }, []);
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
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontSize:"14px",fontWeight:"500"}}>User Management</h1>
        {isAdmin&&<button onClick={()=>setShowModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Add User</button>}
      </div>
      {message&&<div style={{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",background:message.includes("Error")?P.dangerLight:P.successLight,color:message.includes("Error")?P.danger:P.success}}>{message}</div>}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const,padding:"10px 14px",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px"}}>
        {ROLES.map(r=><span key={r} style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",background:(RC[r]||"#6366F1")+"22",color:RC[r]||"#6366F1",fontWeight:"500"}}>{r}</span>)}
      </div>
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
            {["Name / Email","Role","Status","Added","Notifications","Upload","Download","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={6} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>
            :users.length===0?<tr><td colSpan={6} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>
            :users.map((u)=>(
              <tr key={u.id} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                <td style={{padding:"10px 14px"}}><div style={{fontWeight:"500"}}>{u.full_name||"—"}</div><div style={{fontSize:"11px",color:P.textSec}}>{u.email}</div></td>
                <td style={{padding:"10px 14px"}}>
                  {isAdmin?<select value={u.role} onChange={e=>updateRole(u.id,e.target.value)} style={{fontSize:"11px",padding:"4px 8px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:(RC[u.role]||"#6366F1")+"22",color:RC[u.role]||"#6366F1",fontWeight:"500"}}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select>:<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",background:(RC[u.role]||"#6366F1")+"22",color:RC[u.role]||"#6366F1",fontWeight:"500"}}>{u.role}</span>}
                </td>
                <td style={{padding:"10px 14px"}}><span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"20px",background:u.is_active?"#ECFDF5":"#F3F4F6",color:u.is_active?"#10B981":"#6B7280",fontWeight:"500"}}>{u.is_active?"Active":"Inactive"}</span></td>
                <td style={{padding:"10px 14px",fontSize:"11px",color:P.textSec}}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleDocAccess(u.id,u.can_upload_download)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:u.can_upload_download?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.can_upload_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_upload_download?"YES":"NO"}</button>:<span style={{fontSize:"10px",color:u.can_upload_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_upload_download?"YES":"NO"}</span>}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleDownload(u.id,u.can_download)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:u.can_download?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.can_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_download?"YES":"NO"}</button>:<span style={{fontSize:"10px",color:u.can_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_download?"YES":"NO"}</span>}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleNotifications(u.id,u.notifications_enabled)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:u.notifications_enabled?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.notifications_enabled?"#10B981":"#EF4444",fontWeight:"500"}}>{u.notifications_enabled?"ON":"OFF"}</button>:<span style={{fontSize:"10px",color:u.notifications_enabled?"#10B981":"#EF4444",fontWeight:"500"}}>{u.notifications_enabled?"ON":"OFF"}</span>}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>:<span style={{fontSize:"10px",color:u.is_active?"#10B981":"#EF4444",fontWeight:"500"}}>{u.is_active?"Active":"Inactive"}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add Team Member</h2>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Full Name</label><input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="e.g. Jane Smith" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Email</label><input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="jane@organization.com" type="email" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Password</label><input value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} placeholder="Create a password for this user" type="password" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Role</label>
              <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addUser} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function ProfilePanel({user, P, supabase}: {user: any, P: any, supabase: any}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success"|"error">("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("full_name,role").eq("user_id", user.id).single().then(({data}:any) => {
      if (data) { setFullName(data.full_name || ""); setRole(data.role || ""); }
      setLoading(false);
    });
  }, [user]);

  async function saveName() {
    if (!fullName.trim()) return;
    setSaving(true);
    const {error} = await supabase.from("user_roles").update({full_name: fullName.trim()}).eq("user_id", user.id);
    if (!error) { setMessage("Name updated successfully"); setMessageType("success"); }
    else { setMessage("Error: " + error.message); setMessageType("error"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) { setMessage("All password fields are required"); setMessageType("error"); return; }
    if (newPassword !== confirmPassword) { setMessage("New passwords do not match"); setMessageType("error"); return; }
    if (newPassword.length < 6) { setMessage("Password must be at least 6 characters"); setMessageType("error"); return; }
    setSaving(true);
    const {error: signInError} = await supabase.auth.signInWithPassword({email: user.email, password: currentPassword});
    if (signInError) { setMessage("Current password is incorrect"); setMessageType("error"); setSaving(false); return; }
    const {error} = await supabase.auth.updateUser({password: newPassword});
    if (!error) { setMessage("Password changed successfully"); setMessageType("success"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    else { setMessage("Error: " + error.message); setMessageType("error"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  }

  if (loading) return <div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px",maxWidth:"600px"}}>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>My Profile</h1>

      {message && (
        <div style={{padding:"10px 14px",borderRadius:"8px",fontSize:"12px",background:messageType==="success"?P.successLight:P.dangerLight,color:messageType==="success"?P.success:P.danger}}>
          {message}
        </div>
      )}

      {/* Profile Info */}
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
        <h2 style={{fontSize:"12px",fontWeight:"500",color:P.textSec,marginBottom:"16px",textTransform:"uppercase" as const,letterSpacing:".06em"}}>Profile Information</h2>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Full Name</label>
            <div style={{display:"flex",gap:"8px"}}>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" style={{flex:1,fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}/>
              <button onClick={saveName} disabled={saving} style={{fontSize:"11px",padding:"8px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:saving?0.6:1}}>Save</button>
            </div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Email</label>
            <input value={user?.email||""} disabled style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",background:P.bgTert,color:P.textSec,cursor:"not-allowed"}}/>
            <p style={{fontSize:"10px",color:P.textTert,marginTop:"3px"}}>Email cannot be changed. Contact your System Administrator.</p>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Role</label>
            <input value={role} disabled style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",background:P.bgTert,color:P.textSec,cursor:"not-allowed"}}/>
            <p style={{fontSize:"10px",color:P.textTert,marginTop:"3px"}}>Role is assigned by your System Administrator.</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
        <h2 style={{fontSize:"12px",fontWeight:"500",color:P.textSec,marginBottom:"16px",textTransform:"uppercase" as const,letterSpacing:".06em"}}>Change Password</h2>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Current Password</label>
            <div style={{position:"relative" as const}}><input type={showCurrentPwd?"text":"password"} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowCurrentPwd(!showCurrentPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showCurrentPwd?"🙈":"👁"}</button></div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>New Password</label>
            <div style={{position:"relative" as const}}><input type={showNewPwd?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowNewPwd(!showNewPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showNewPwd?"🙈":"👁"}</button></div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Confirm New Password</label>
            <div style={{position:"relative" as const}}><input type={showConfirmPwd?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowConfirmPwd(!showConfirmPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showConfirmPwd?"🙈":"👁"}</button></div>
          </div>
          <button onClick={changePassword} disabled={saving} style={{fontSize:"12px",padding:"9px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:saving?0.6:1,alignSelf:"flex-start"}}>
            {saving?"Changing...":"Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesPanel({user, P, supabase, activeStudy}: {user: any, P: any, supabase: any, activeStudy: any}) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    loadConversations();
    loadAllUsers();
  }, [activeStudy]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      pollRef.current = setInterval(() => loadMessages(activeConv.id), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior:"smooth"});
  }, [messages]);

  async function loadConversations() {
    if (!user) return;
    const {data} = await supabase
      .from("conversations")
      .select("*, conversation_members!inner(user_id)")
      .eq("conversation_members.user_id", user.id)
      .eq("study_id", activeStudy?.study_id || "")
      .order("updated_at", {ascending: false});
    if (data) setConversations(data);
  }

  async function loadAllUsers() {
    const {data} = await supabase.from("user_roles").select("user_id,email,full_name").eq("is_active", true);
    if (data) setAllUsers(data.filter((u:any) => u.user_id !== user?.id));
  }

  async function loadMessages(convId: string) {
    const {data} = await supabase
      .from("messages")
      .select("*, message_attachments(*)")
      .eq("conversation_id", convId)
      .order("created_at", {ascending: true});
    if (data) setMessages(data);
  }

  async function startDM(targetUser: any) {
    // Check if DM already exists
    const existing = conversations.find(c => !c.is_group && c.name === targetUser.email);
    if (existing) { setActiveConv(existing); setShowNewChat(false); return; }

    const {data: conv} = await supabase.from("conversations").insert([{
      study_id: activeStudy?.study_id || "",
      name: targetUser.email,
      is_group: false,
      created_by: user.id,
    }]).select().single();

    if (conv) {
      await supabase.from("conversation_members").insert([
        {conversation_id: conv.id, user_id: user.id, email: user.email, full_name: ""},
        {conversation_id: conv.id, user_id: targetUser.user_id, email: targetUser.email, full_name: targetUser.full_name},
      ]);
      await loadConversations();
      setActiveConv(conv);
    }
    setShowNewChat(false);
  }

  async function createGroup() {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    const {data: conv} = await supabase.from("conversations").insert([{
      study_id: activeStudy?.study_id || "",
      name: groupName.trim(),
      is_group: true,
      created_by: user.id,
    }]).select().single();

    if (conv) {
      const members = [
        {conversation_id: conv.id, user_id: user.id, email: user.email, full_name: ""},
        ...selectedUsers.map(uid => {
          const u = allUsers.find((au:any) => au.user_id === uid);
          return {conversation_id: conv.id, user_id: uid, email: u?.email || "", full_name: u?.full_name || ""};
        })
      ];
      await supabase.from("conversation_members").insert(members);
      await loadConversations();
      setActiveConv(conv);
    }
    setShowNewGroup(false);
    setGroupName("");
    setSelectedUsers([]);
  }

  async function sendMessage() {
    if ((!newMessage.trim() && !selectedFile) || !activeConv) return;
    const senderName = allUsers.find((u:any) => u.user_id === user?.id)?.full_name || user?.email || "";

    let hasAttachment = false;
    let filePath = "";
    let fileName = "";

    if (selectedFile) {
      setUploading(true);
      const path = `messages/${activeConv.id}/${Date.now()}_${selectedFile.name}`;
      const {error} = await supabase.storage.from("Documents").upload(path, selectedFile);
      if (!error) { filePath = path; fileName = selectedFile.name; hasAttachment = true; }
      setUploading(false);
    }

    const {data: msg} = await supabase.from("messages").insert([{
      conversation_id: activeConv.id,
      sender_id: user.id,
      sender_email: user.email,
      sender_name: senderName,
      content: newMessage.trim(),
      has_attachment: hasAttachment,
    }]).select().single();

    if (msg && hasAttachment && filePath) {
      await supabase.from("message_attachments").insert([{
        message_id: msg.id,
        file_name: fileName,
        file_path: filePath,
        file_type: selectedFile?.type || "",
        file_size: selectedFile?.size || 0,
      }]);
    }

    await supabase.from("conversations").update({updated_at: new Date().toISOString()}).eq("id", activeConv.id);
    setNewMessage("");
    setSelectedFile(null);
    loadMessages(activeConv.id);
    loadConversations();
  }

  const getConvName = (conv: any) => {
    if (conv.is_group) return conv.name;
    const other = conv.name;
    const u = allUsers.find((u:any) => u.email === other);
    return u?.full_name || other;
  };

  const getInitials = (name: string) => name?.split(" ").map((n:string)=>n[0]).join("").toUpperCase().slice(0,2) || "?";

  return (
    <div style={{display:"flex",height:"calc(100vh - 120px)",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
      {/* Sidebar */}
      <div style={{width:"260px",borderRight:`0.5px solid ${P.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px",borderBottom:`0.5px solid ${P.border}`,display:"flex",gap:"6px"}}>
          <button onClick={()=>setShowNewChat(true)} style={{flex:1,fontSize:"11px",padding:"6px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer"}}>+ Direct Message</button>
          <button onClick={()=>setShowNewGroup(true)} style={{flex:1,fontSize:"11px",padding:"6px",background:P.successLight,color:P.success,border:`0.5px solid ${P.success}`,borderRadius:"6px",cursor:"pointer"}}>+ Group</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {conversations.length===0?(
            <div style={{padding:"20px",textAlign:"center",color:P.textTert,fontSize:"11px"}}>No conversations yet</div>
          ):conversations.map(conv=>(
            <div key={conv.id} onClick={()=>setActiveConv(conv)}
              style={{padding:"10px 12px",cursor:"pointer",borderBottom:`0.5px solid ${P.bgTert}`,background:activeConv?.id===conv.id?P.primaryLight:"transparent",display:"flex",alignItems:"center",gap:"8px"}}>
              <div style={{width:"32px",height:"32px",borderRadius:"50%",background:conv.is_group?"#8B5CF6":P.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"500",color:"#fff",flexShrink:0}}>
                {conv.is_group?"#":getInitials(getConvName(conv))}
              </div>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:"12px",fontWeight:"500",color:P.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{getConvName(conv)}</div>
                <div style={{fontSize:"10px",color:P.textTert}}>{conv.is_group?"Group":"Direct message"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {!activeConv?(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"8px",color:P.textTert}}>
          <div style={{fontSize:"2rem"}}>💬</div>
          <div style={{fontSize:"12px"}}>Select a conversation or start a new one</div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {/* Header */}
          <div style={{padding:"10px 16px",borderBottom:`0.5px solid ${P.border}`,display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"50%",background:activeConv.is_group?"#8B5CF6":P.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"500",color:"#fff"}}>
              {activeConv.is_group?"#":getInitials(getConvName(activeConv))}
            </div>
            <div>
              <div style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{getConvName(activeConv)}</div>
              <div style={{fontSize:"10px",color:P.textTert}}>{activeConv.is_group?"Group chat":"Direct message"} · {activeStudy?.study_id}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:"8px"}}>
            {messages.map(msg=>{
              const isMe = msg.sender_id === user?.id;
              return(
                <div key={msg.id} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:"8px",alignItems:"flex-end"}}>
                  <div style={{width:"24px",height:"24px",borderRadius:"50%",background:isMe?P.primary:"#8B5CF6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",color:"#fff",flexShrink:0}}>
                    {getInitials(msg.sender_name||msg.sender_email)}
                  </div>
                  <div style={{maxWidth:"70%"}}>
                    {!isMe&&<div style={{fontSize:"9px",color:P.textTert,marginBottom:"2px"}}>{msg.sender_name||msg.sender_email}</div>}
                    {msg.content&&<div style={{background:isMe?P.primary:P.bgSec,color:isMe?"#fff":P.text,padding:"8px 12px",borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px",fontSize:"12px",lineHeight:"1.5"}}>{msg.content}</div>}
                    {msg.message_attachments?.map((att:any)=>(
                      <div key={att.id} style={{marginTop:"4px"}}>
                        <a href={supabase.storage.from("Documents").getPublicUrl(att.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer"
                          style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 10px",background:isMe?"rgba(255,255,255,0.2)":P.bgTert,borderRadius:"8px",textDecoration:"none",color:isMe?"#fff":P.text,fontSize:"11px"}}>
                          📎 {att.file_name}
                        </a>
                      </div>
                    ))}
                    <div style={{fontSize:"9px",color:P.textTert,marginTop:"2px",textAlign:isMe?"right":"left"}}>{new Date(msg.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div style={{padding:"10px 12px",borderTop:`0.5px solid ${P.border}`,display:"flex",gap:"8px",alignItems:"flex-end"}}>
            <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setSelectedFile(f);}}/>
            <button onClick={()=>fileInputRef.current?.click()} style={{padding:"8px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"8px",cursor:"pointer",fontSize:"14px"}}>📎</button>
            <div style={{flex:1}}>
              {selectedFile&&<div style={{fontSize:"10px",color:P.primary,marginBottom:"4px",padding:"3px 8px",background:P.primaryLight,borderRadius:"4px",display:"flex",justifyContent:"space-between"}}>
                📎 {selectedFile.name} <button onClick={()=>setSelectedFile(null)} style={{background:"none",border:"none",cursor:"pointer",color:P.danger,fontSize:"10px"}}>✕</button>
              </div>}
              <input value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
                placeholder="Type a message..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}/>
            </div>
            <button onClick={sendMessage} disabled={uploading} style={{padding:"8px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",opacity:uploading?0.6:1}}>
              {uploading?"...":"Send"}
            </button>
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {showNewChat&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"380px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>New Direct Message</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"1rem",maxHeight:"300px",overflowY:"auto"}}>
              {allUsers.map((u:any)=>(
                <div key={u.user_id} onClick={()=>startDM(u)} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"8px",border:`0.5px solid ${P.border}`,cursor:"pointer",background:P.bgSec}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"50%",background:P.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:"#fff"}}>{getInitials(u.full_name||u.email)}</div>
                  <div><div style={{fontSize:"12px",fontWeight:"500"}}>{u.full_name||"—"}</div><div style={{fontSize:"10px",color:P.textSec}}>{u.email}</div></div>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowNewChat(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Create Group Chat</h2>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Group Name</label>
              <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="e.g. Site 002 Team" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/>
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px"}}>Select Members</label>
              <div style={{display:"flex",flexDirection:"column",gap:"4px",maxHeight:"200px",overflowY:"auto"}}>
                {allUsers.map((u:any)=>(
                  <div key={u.user_id} onClick={()=>setSelectedUsers(prev=>prev.includes(u.user_id)?prev.filter(id=>id!==u.user_id):[...prev,u.user_id])}
                    style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",borderRadius:"6px",border:`0.5px solid ${selectedUsers.includes(u.user_id)?P.primary:P.border}`,cursor:"pointer",background:selectedUsers.includes(u.user_id)?P.primaryLight:P.bgSec}}>
                    <div style={{width:"16px",height:"16px",borderRadius:"3px",border:`1.5px solid ${selectedUsers.includes(u.user_id)?P.primary:P.border}`,background:selectedUsers.includes(u.user_id)?P.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:"#fff"}}>
                      {selectedUsers.includes(u.user_id)?"✓":""}
                    </div>
                    <div style={{fontSize:"12px"}}>{u.full_name||u.email}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowNewGroup(false);setSelectedUsers([]);setGroupName("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={createGroup} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Create Group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
