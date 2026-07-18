const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Add Tracker to sidebar after Report
c = c.replace(
  '{navItem("report","Report","ti-file-analytics")}',
  '{navItem("report","Report","ti-file-analytics")}\n          {navItem("tracker","Tracker","ti-bell-ringing")}'
);

// Add Tracker panel before MESSAGES
const trackerPanel = `          {/* TRACKER */}
          {panel==="tracker"&&(
            <TrackerPanel user={user} P={P} supabase={supabase} orgId={orgId} currentUserRole={currentUserRole}/>
          )}

`;

c = c.replace('          {/* MESSAGES */}', trackerPanel + '          {/* MESSAGES */}');

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Tracker panel added to page.tsx');

// Now add TrackerPanel component before ProfilePanel
let page = fs.readFileSync('app/platform/page.tsx', 'utf8');

const trackerComponent = `
function TrackerPanel({user, P, supabase, orgId, currentUserRole}: {user: any, P: any, supabase: any, orgId: string, currentUserRole: string}) {
  const [freq, setFreq] = useState("Off");
  const [expiryWindow, setExpiryWindow] = useState(30);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const canManage = ["System Administrator","Sponsor Admin","TMF Lead"].includes(currentUserRole);

  useEffect(() => {
    if (!user) return;
    fetch(\`/api/notification-preferences?user_id=\${user.id}\`)
      .then(r => r.json())
      .then(data => {
        if (data.report_frequency) setFreq(data.report_frequency);
        if (data.expiry_window) setExpiryWindow(data.expiry_window);
        setLoading(false);
      });
  }, [user]);

  async function savePrefs() {
    setSaving(true);
    const res = await fetch("/api/notification-preferences", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ user_id: user.id, org_id: orgId, report_frequency: freq, expiry_window: expiryWindow })
    });
    const data = await res.json();
    if (data.error) setMsg("Error: " + data.error);
    else setMsg("Preferences saved successfully.");
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  if (loading) return <div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px",maxWidth:"680px"}}>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Notification Tracker</h1>

      {!canManage && (
        <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
          Only TMF Lead, Sponsor Admin, and System Administrator can manage notification preferences.
        </div>
      )}

      {msg && <div style={{padding:"10px 14px",borderRadius:"8px",fontSize:"12px",background:msg.includes("Error")?P.dangerLight:P.successLight,color:msg.includes("Error")?P.danger:P.success}}>{msg}</div>}

      {/* TMF Report Email */}
      <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"12px",padding:"20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"16px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <i className="ti ti-mail" style={{fontSize:"20px",color:P.primary}}/>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>TMF Report Email</div>
            <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Automated email summarising TMF gaps, expiring documents, and pending reviews</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px",fontWeight:"500"}}>Report Frequency</label>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {["Off","Weekly","Bi-weekly","Monthly"].map(f=>(
                <button key={f} onClick={()=>canManage&&setFreq(f)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:\`0.5px solid \${freq===f?P.primary:P.border}\`,background:freq===f?P.primaryLight:"transparent",cursor:canManage?"pointer":"not-allowed",textAlign:"left"}}>
                  <div style={{width:"14px",height:"14px",borderRadius:"50%",border:\`2px solid \${freq===f?P.primary:P.border}\`,background:freq===f?P.primary:"transparent",flexShrink:0}}/>
                  <span style={{fontSize:"12px",color:freq===f?P.primary:P.textSec,fontWeight:freq===f?"500":"400"}}>{f}</span>
                  {f==="Off"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>No emails</span>}
                  {f==="Weekly"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>Every Monday</span>}
                  {f==="Bi-weekly"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>Every 2 weeks</span>}
                  {f==="Monthly"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>1st of month</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px",fontWeight:"500"}}>Expiry Window in Report</label>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {[30,60,90].map(w=>(
                <button key={w} onClick={()=>canManage&&setExpiryWindow(w)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:\`0.5px solid \${expiryWindow===w?P.warning:P.border}\`,background:expiryWindow===w?"#FFFBEB":"transparent",cursor:canManage?"pointer":"not-allowed",textAlign:"left"}}>
                  <div style={{width:"14px",height:"14px",borderRadius:"50%",border:\`2px solid \${expiryWindow===w?P.warning:P.border}\`,background:expiryWindow===w?P.warning:"transparent",flexShrink:0}}/>
                  <span style={{fontSize:"12px",color:expiryWindow===w?"#92400E":P.textSec,fontWeight:expiryWindow===w?"500":"400"}}>{w} days</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Document Expiry Notifications */}
      <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"12px",padding:"20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"12px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#FFFBEB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <i className="ti ti-calendar-exclamation" style={{fontSize:"20px",color:P.warning}}/>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Document Expiry Notifications</div>
            <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Automatic alerts sent to document owner, TMF Lead, and Sponsor Admin</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"10px"}}>
          {[{days:90,color:"#6366F1",bg:"#EEF2FF",label:"90 days"},{days:30,color:P.warning,bg:"#FFFBEB",label:"30 days"},{days:15,color:P.danger,bg:P.dangerLight,label:"15 days"}].map(t=>(
            <div key={t.days} style={{flex:1,background:t.bg,borderRadius:"10px",padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:"22px",fontWeight:"700",color:t.color}}>{t.label}</div>
              <div style={{fontSize:"10px",color:P.textTert,marginTop:"4px"}}>Alert sent</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:"10px",fontSize:"11px",color:P.textTert}}>Three separate emails are sent per document — at exactly 90, 30, and 15 days before expiry. No duplicate sends.</div>
      </div>

      {/* Upload/Approval/Rejection */}
      <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"12px",padding:"20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"12px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:P.successLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <i className="ti ti-bell-ringing" style={{fontSize:"20px",color:P.success}}/>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Upload / Approval / Rejection Notifications</div>
            <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Instant notifications on document status changes</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {[
            {icon:"ti-upload",color:"#6366F1",label:"Document uploaded",desc:"Notifies TMF Lead, Sponsor Admin, System Admin"},
            {icon:"ti-clock",color:P.blue,label:"Submitted for review",desc:"Notifies TMF Lead, Sponsor Admin, System Admin"},
            {icon:"ti-check",color:P.success,label:"Document approved",desc:"Notifies the uploader"},
            {icon:"ti-x",color:P.danger,label:"Document rejected",desc:"Notifies the uploader with rejection reason"},
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",background:P.bgSec,borderRadius:"8px"}}>
              <i className={\`ti \${item.icon}\`} style={{fontSize:"16px",color:item.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:"500",color:P.text}}>{item.label}</div>
                <div style={{fontSize:"10px",color:P.textTert}}>{item.desc}</div>
              </div>
              <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.successLight,color:P.success,fontWeight:"500"}}>Active</span>
            </div>
          ))}
        </div>
      </div>

      {canManage && (
        <button onClick={savePrefs} disabled={saving} style={{fontSize:"12px",fontWeight:"500",padding:"10px 20px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:saving?"not-allowed":"pointer",opacity:saving?0.6:1,alignSelf:"flex-start"}}>
          {saving?"Saving...":"Save Preferences"}
        </button>
      )}
    </div>
  );
}

`;

// Insert TrackerPanel before ProfilePanel
page = page.replace('function ProfilePanel(', trackerComponent + 'function ProfilePanel(');
fs.writeFileSync('app/platform/page.tsx', page, 'utf8');
console.log('TrackerPanel component added');
console.log('Done. Length:', page.length);
