"use client";
import{useState,useEffect}from"react";
import{supabase}from"../../lib/supabase";
import{useRouter}from"next/navigation";

const P={
  primary:"#F97316",primaryLight:"#FFEDD5",primaryDark:"#EA580C",
  navy:"#0F1E3D",navyLight:"#1E3A5F",
  text:"#111827",textSec:"#374151",textTert:"#6B7280",textMuted:"#9CA3AF",
  bg:"#FFFFFF",bgSec:"#F9FAFB",bgTert:"#F3F4F6",
  border:"#E5E7EB",borderSec:"#D1D5DB",
  success:"#10B981",successLight:"#ECFDF5",
  danger:"#EF4444",dangerLight:"#FEF2F2",
  warning:"#F59E0B",warningLight:"#FFFBEB",
  blue:"#3B82F6",blueLight:"#EFF6FF",
  purple:"#8B5CF6",purpleLight:"#F5F3FF",
};

export default function AdminPortal(){
  const router=useRouter();
  const[panel,setPanel]=useState("login");
  const[adminUser,setAdminUser]=useState<any>(null);
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[authError,setAuthError]=useState("");
  const[loading,setLoading]=useState(false);

  // Data states
  const[orgs,setOrgs]=useState<any[]>([]);
  const[users,setUsers]=useState<any[]>([]);
  const[tickets,setTickets]=useState<any[]>([]);
  const[studies,setStudies]=useState<any[]>([]);
  const[tokens,setTokens]=useState<any[]>([]);
  const[demos,setDemos]=useState<any[]>([]);
  const[selectedDemo,setSelectedDemo]=useState<any>(null);
  const[demoNotes,setDemoNotes]=useState("");
  const[demos,setDemos]=useState<any[]>([]);
  const[selectedDemo,setSelectedDemo]=useState<any>(null);
  const[demoNotes,setDemoNotes]=useState("");
  const[stats,setStats]=useState<any>({orgs:0,users:0,studies:0,docs:0,tickets:0});

  // Token generator
  const[genOrgName,setGenOrgName]=useState("");
  const[genEmail,setGenEmail]=useState("");
  const[generatedLink,setGeneratedLink]=useState("");
  const[genLoading,setGenLoading]=useState(false);

  // Selected ticket
  const[selectedTicket,setSelectedTicket]=useState<any>(null);
  const[ticketReply,setTicketReply]=useState("");

  // Filters
  const[ticketFilter,setTicketFilter]=useState("All");
  const[orgSearch,setOrgSearch]=useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        checkAdminAccess(session.user);
      }
    });
  },[]);

  async function checkAdminAccess(user:any){
    const{data}=await supabase.from("admin_users").select("*").eq("email",user.email).eq("is_active",true).single();
    if(data){
      setAdminUser({...user,...data});
      await supabase.from("admin_users").update({last_login:new Date().toISOString()}).eq("email",user.email);
      setPanel("dashboard");
      loadAllData();
    }else{
      setAuthError("You do not have admin access.");
    }
  }

  async function handleLogin(){
    setAuthError("");setLoading(true);
    const{data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setAuthError(error.message);setLoading(false);return;}
    if(data.user)await checkAdminAccess(data.user);
    setLoading(false);
  }

  async function loadAllData(){
    // Load orgs
    const{data:orgData}=await supabase.from("organizations").select("*").order("created_at",{ascending:false});
    if(orgData)setOrgs(orgData);

    // Load users
    const{data:userData}=await supabase.from("user_roles").select("*").order("created_at",{ascending:false});
    if(userData)setUsers(userData);

    // Load tickets
    const{data:ticketData}=await supabase.from("support_tickets").select("*").order("created_at",{ascending:false});
    if(ticketData)setTickets(ticketData);

    // Load studies
    const{data:studyData}=await supabase.from("studies").select("*").order("created_at",{ascending:false});
    if(studyData)setStudies(studyData);

    // Load tokens
    const{data:tokenData}=await supabase.from("signup_tokens").select("*").order("created_at",{ascending:false}).limit(20);
    if(tokenData)setTokens(tokenData);

    // Load demo requests
    const{data:demoData}=await supabase.from("demo_requests").select("*").order("created_at",{ascending:false});
    if(demoData)setDemos(demoData);

    // Stats
    const[{count:orgCount},{count:userCount},{count:studyCount},{count:docCount},{count:ticketCount}]=await Promise.all([
      supabase.from("organizations").select("*",{count:"exact",head:true}),
      supabase.from("user_roles").select("*",{count:"exact",head:true}),
      supabase.from("studies").select("*",{count:"exact",head:true}),
      supabase.from("documents").select("*",{count:"exact",head:true}),
      supabase.from("support_tickets").select("*",{count:"exact",head:true}),
    ]);
    setStats({orgs:orgCount||0,users:userCount||0,studies:studyCount||0,docs:docCount||0,tickets:ticketCount||0});
  }

  async function generateToken(){
    if(!genOrgName.trim()){alert("Please enter an organisation name.");return;}
    setGenLoading(true);
    const res=await fetch("/api/generate-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({org_name:genOrgName,email:genEmail,secret:process.env.NEXT_PUBLIC_TOKEN_SECRET||"tmf360-admin-2026",created_by:adminUser?.email})});
    const data=await res.json();
    if(data.signup_url){
      setGeneratedLink(data.signup_url);
      loadAllData();
    }else{
      alert("Error: "+data.error);
    }
    setGenLoading(false);
  }

  async function updateTicketStatus(id:string,status:string){
    await supabase.from("support_tickets").update({status,resolved_at:status==="Resolved"?new Date().toISOString():null}).eq("id",id);
    setSelectedTicket((prev:any)=>prev?{...prev,status}:null);
    loadAllData();
  }

  async function addTicketReply(){
    if(!ticketReply.trim()||!selectedTicket)return;
    const existing=selectedTicket.replies||"";
    const newReplies=existing+(existing?"\n":"")+"["+new Date().toLocaleString()+" - "+adminUser?.email+" (TMF360 Support)]: "+ticketReply.trim();
    await supabase.from("support_tickets").update({replies:newReplies,status:"In progress"}).eq("id",selectedTicket.id);
    setSelectedTicket((prev:any)=>({...prev,replies:newReplies,status:"In progress"}));
    setTicketReply("");
    loadAllData();
  }

  async function deactivateUser(userId:string){
    if(!confirm("Deactivate this user?"))return;
    await supabase.from("user_roles").update({is_active:false}).eq("user_id",userId);
    loadAllData();
  }

  async function updateDemoStatus(id:string,status:string,notes?:string){
    await supabase.from("demo_requests").update({status,notes:notes||null,confirmed_at:status==="Confirmed"?new Date().toISOString():null,confirmed_by:status==="Confirmed"?adminUser?.email:null}).eq("id",id);
    setSelectedDemo((prev:any)=>prev?{...prev,status,notes:notes||prev.notes}:null);
    loadAllData();
  }

  async function updateDemoStatus(id:string,status:string,notes?:string){
    await supabase.from("demo_requests").update({status,notes:notes||null,confirmed_at:status==="Confirmed"?new Date().toISOString():null,confirmed_by:status==="Confirmed"?adminUser?.email:null}).eq("id",id);
    setSelectedDemo((prev:any)=>prev?{...prev,status,notes:notes||prev.notes}:null);
    loadAllData();
  }

  async function revokeToken(id:string){
    if(!confirm("Revoke this token?"))return;
    await supabase.from("signup_tokens").update({used_at:new Date().toISOString()}).eq("id",id);
    loadAllData();
  }

  function navItem(id:string,label:string,icon:string,badge?:number){
    return(
      <button onClick={()=>setPanel(id)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:"none",cursor:"pointer",width:"100%",textAlign:"left",fontSize:"12px",background:panel===id?"rgba(249,115,22,0.15)":"transparent",color:panel===id?"#F97316":"#94A3B8",fontWeight:panel===id?"600":"400",position:"relative" as const}}>
        <i className={`ti ${icon}`} style={{fontSize:"16px"}}/>
        {label}
        {badge?<span style={{marginLeft:"auto",fontSize:"10px",padding:"1px 6px",borderRadius:"20px",background:"#EF4444",color:"#fff",fontWeight:"600"}}>{badge}</span>:null}
      </button>
    );
  }

  const openTickets=tickets.filter(t=>t.status==="Open").length;
  const filteredTickets=ticketFilter==="All"?tickets:tickets.filter(t=>t.status===ticketFilter);
  const filteredOrgs=orgSearch?orgs.filter(o=>o.name?.toLowerCase().includes(orgSearch.toLowerCase())):orgs;

  const priorityColor=(p:string)=>p==="High"?"#EF4444":p==="Medium"?"#F59E0B":"#10B981";
  const statusBg=(s:string)=>s==="Open"?"#EFF6FF":s==="In progress"?"#FFF7ED":"#ECFDF5";
  const statusColor=(s:string)=>s==="Open"?"#1D4ED8":s==="In progress"?"#C2410C":"#065F46";

  if(panel==="login")return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${P.navy} 0%,${P.navyLight} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:P.bg,borderRadius:"16px",padding:"2rem",width:"380px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:"24px",fontWeight:"700",color:P.text}}>TMF<span style={{color:P.primary}}>360</span></div>
          <div style={{fontSize:"12px",color:P.textTert,marginTop:"2px"}}>Admin Portal</div>
          <div style={{fontSize:"10px",color:P.textMuted,marginTop:"4px",padding:"3px 10px",background:P.bgTert,borderRadius:"20px",display:"inline-block"}}>Internal use only</div>
        </div>
        <div style={{marginBottom:"10px"}}>
          <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="admin@tmf360.com" style={{width:"100%",fontSize:"12px",padding:"9px 12px",border:`1px solid ${P.border}`,borderRadius:"8px",outline:"none"}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>
        <div style={{marginBottom:"1rem"}}>
          <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="--------" style={{width:"100%",fontSize:"12px",padding:"9px 12px",border:`1px solid ${P.border}`,borderRadius:"8px",outline:"none"}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>
        {authError&&<div style={{fontSize:"11px",marginBottom:"12px",padding:"8px 12px",borderRadius:"8px",background:P.dangerLight,color:P.danger}}>{authError}</div>}
        <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:"10px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer",opacity:loading?0.7:1}}>{loading?"Signing in...":"Sign in to Admin Portal"}</button>
        <div style={{textAlign:"center",marginTop:"12px",fontSize:"11px",color:P.textTert}}>
          <a href="/platform" style={{color:P.primary,textDecoration:"none"}}>← Back to TMF360</a>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",background:P.bgSec}}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css"/>

      {/* Sidebar */}
      <aside style={{width:"200px",background:P.navy,display:"flex",flexDirection:"column",flexShrink:0,padding:"0 8px 8px"}}>
        <div style={{padding:"16px 8px 12px"}}>
          <div style={{fontSize:"18px",fontWeight:"700",color:"#fff"}}>TMF<span style={{color:P.primary}}>360</span></div>
          <div style={{fontSize:"10px",color:"#64748B",marginTop:"1px"}}>Admin Portal</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"2px",flex:1}}>
          <p style={{fontSize:"9px",fontWeight:"600",color:"#475569",padding:"8px 8px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Overview</p>
          {navItem("dashboard","Dashboard","ti-layout-dashboard")}
          {navItem("clients","Clients","ti-building",orgs.length)}
          {navItem("studies","Studies","ti-flask",studies.length)}
          <p style={{fontSize:"9px",fontWeight:"600",color:"#475569",padding:"10px 8px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Support</p>
          {navItem("tickets","All Tickets","ti-ticket",openTickets||undefined)}
          {navItem("users","All Users","ti-users")}
          <p style={{fontSize:"9px",fontWeight:"600",color:"#475569",padding:"10px 8px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Onboarding</p>
          {navItem("signup","Signup Links","ti-link")}
          {navItem("tokens","Token History","ti-history")}
          <p style={{fontSize:"9px",fontWeight:"600",color:"#475569",padding:"10px 8px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Sales</p>
          {navItem("demos","Demo Requests","ti-calendar-event",demos.filter(d=>d.status==="Pending").length||undefined)}
        </div>
        <div style={{borderTop:"1px solid #1E3A5F",paddingTop:"8px"}}>
          <div style={{fontSize:"11px",color:"#64748B",padding:"6px 8px"}}>{adminUser?.email}</div>
          <button onClick={async()=>{await supabase.auth.signOut();setPanel("login");setAdminUser(null);}} style={{fontSize:"11px",color:"#64748B",background:"transparent",border:"none",cursor:"pointer",padding:"6px 8px",textAlign:"left",width:"100%"}}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflowY:"auto",padding:"1.25rem"}}>

        {/* DASHBOARD */}
        {panel==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            <div>
              <h1 style={{fontSize:"20px",fontWeight:"700",color:P.text}}>Admin Dashboard</h1>
              <p style={{fontSize:"12px",color:P.textTert,marginTop:"2px"}}>Platform overview across all organisations</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px"}}>
              {[
                {val:stats.orgs,label:"Organisations",color:P.primary,bg:P.primaryLight,icon:"ti-building"},
                {val:stats.users,label:"Total Users",color:P.blue,bg:P.blueLight,icon:"ti-users"},
                {val:stats.studies,label:"Studies",color:P.purple,bg:P.purpleLight,icon:"ti-flask"},
                {val:stats.docs,label:"Documents",color:P.success,bg:P.successLight,icon:"ti-files"},
                {val:openTickets,label:"Open Tickets",color:P.danger,bg:P.dangerLight,icon:"ti-ticket"},
              ].map((m,i)=>(
                <div key={i} style={{background:m.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                    <div style={{width:"36px",height:"36px",borderRadius:"8px",background:P.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <i className={`ti ${m.icon}`} style={{fontSize:"18px",color:m.color}}/>
                    </div>
                  </div>
                  <div style={{fontSize:"28px",fontWeight:"700",color:m.color}}>{m.val}</div>
                  <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
              <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px"}}>
                <h2 style={{fontSize:"13px",fontWeight:"600",marginBottom:"12px"}}>Recent Organisations</h2>
                {orgs.slice(0,5).map((o,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 0",borderBottom:`0.5px solid ${P.bgTert}`}}>
                    <div style={{width:"32px",height:"32px",borderRadius:"8px",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:P.primary,flexShrink:0}}>{o.code||o.name?.slice(0,2).toUpperCase()}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"12px",fontWeight:"500"}}>{o.name}</div>
                      <div style={{fontSize:"10px",color:P.textTert}}>{o.type} · {o.country}</div>
                    </div>
                    <div style={{fontSize:"10px",color:P.textTert}}>{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
                {orgs.length===0&&<div style={{fontSize:"12px",color:P.textTert}}>No organisations yet.</div>}
              </div>
              <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px"}}>
                <h2 style={{fontSize:"13px",fontWeight:"600",marginBottom:"12px"}}>Open Support Tickets</h2>
                {tickets.filter(t=>t.status==="Open").slice(0,5).map((t,i)=>(
                  <div key={i} onClick={()=>{setSelectedTicket(t);setPanel("tickets");}} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 0",borderBottom:`0.5px solid ${P.bgTert}`,cursor:"pointer"}}>
                    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:priorityColor(t.priority),flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"12px",fontWeight:"500",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{t.title}</div>
                      <div style={{fontSize:"10px",color:P.textTert}}>{t.created_by_email}</div>
                    </div>
                    <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:statusBg(t.status),color:statusColor(t.status)}}>{t.status}</span>
                  </div>
                ))}
                {tickets.filter(t=>t.status==="Open").length===0&&<div style={{fontSize:"12px",color:P.success}}>No open tickets 🎉</div>}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS */}
        {panel==="clients"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <h1 style={{fontSize:"14px",fontWeight:"600"}}>All Organisations ({orgs.length})</h1>
              <div style={{display:"flex",gap:"8px"}}>
                <input value={orgSearch} onChange={e=>setOrgSearch(e.target.value)} placeholder="Search organisations..." style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",width:"200px"}}/>
                <button onClick={()=>setPanel("signup")} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Generate Signup Link</button>
              </div>
            </div>
            <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
                  {["Organisation","Type","Country","Code","Studies","Users","Created"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filteredOrgs.length===0?<tr><td colSpan={7} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No organisations found.</td></tr>
                  :filteredOrgs.map((o,i)=>{
                    const orgStudies=studies.filter(s=>s.org_id===o.id);
                    const orgUsers=users.filter(u=>u.org_id===o.id);
                    return(
                      <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{fontWeight:"500"}}>{o.name}</div>
                          <div style={{fontSize:"10px",color:P.textTert}}>{o.code}</div>
                        </td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec}}>{o.type}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec}}>{o.country}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:"11px"}}>{o.code}</td>
                        <td style={{padding:"10px 12px"}}><span style={{fontSize:"11px",fontWeight:"600",color:P.blue}}>{orgStudies.length}</span></td>
                        <td style={{padding:"10px 12px"}}><span style={{fontSize:"11px",fontWeight:"600",color:P.purple}}>{orgUsers.length}</span></td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textTert}}>{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STUDIES */}
        {panel==="studies"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <h1 style={{fontSize:"14px",fontWeight:"600"}}>All Studies ({studies.length})</h1>
            <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
                  {["Study ID","Protocol","Phase","Status","Sponsor","Organisation","Created"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {studies.length===0?<tr><td colSpan={7} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No studies yet.</td></tr>
                  :studies.map((s,i)=>{
                    const org=orgs.find(o=>o.id===s.org_id);
                    return(
                      <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:"600",color:P.primary}}>{s.study_id}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec,maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{s.protocol||"-"}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px"}}>{s.phase}</td>
                        <td style={{padding:"10px 12px"}}><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.primaryLight,color:P.primary}}>{s.status}</span></td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec}}>{s.sponsor||"-"}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec}}>{org?.name||"-"}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textTert}}>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TICKETS */}
        {panel==="tickets"&&(
          <div style={{display:"flex",gap:"12px",height:"calc(100vh - 80px)"}}>
            {/* Ticket list */}
            <div style={{width:"360px",flexShrink:0,display:"flex",flexDirection:"column",gap:"8px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"600"}}>Support Tickets</h1>
                <button onClick={loadAllData} style={{fontSize:"11px",padding:"4px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>Refresh</button>
              </div>
              <div style={{display:"flex",gap:"4px"}}>
                {["All","Open","In progress","Resolved"].map(f=>(
                  <button key={f} onClick={()=>setTicketFilter(f)} style={{fontSize:"10px",padding:"4px 10px",borderRadius:"20px",border:`0.5px solid ${ticketFilter===f?P.primary:P.border}`,background:ticketFilter===f?P.primaryLight:"transparent",color:ticketFilter===f?P.primary:P.textSec,cursor:"pointer"}}>{f}</button>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
                {filteredTickets.map((t,i)=>(
                  <div key={i} onClick={()=>setSelectedTicket(t)} style={{background:P.bg,border:`0.5px solid ${selectedTicket?.id===t.id?P.primary:P.border}`,borderRadius:"10px",padding:"12px",cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                      <span style={{width:"6px",height:"6px",borderRadius:"50%",background:priorityColor(t.priority),flexShrink:0}}/>
                      <span style={{fontSize:"12px",fontWeight:"500",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{t.title}</span>
                      <span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"20px",background:statusBg(t.status),color:statusColor(t.status),flexShrink:0}}>{t.status}</span>
                    </div>
                    <div style={{fontSize:"10px",color:P.textTert}}>{t.created_by_email} · {new Date(t.created_at).toLocaleDateString()}</div>
                    {t.study_id&&<div style={{fontSize:"10px",color:P.blue,marginTop:"2px"}}>Study: {t.study_id}</div>}
                  </div>
                ))}
                {filteredTickets.length===0&&<div style={{textAlign:"center",padding:"2rem",fontSize:"12px",color:P.textTert}}>No tickets.</div>}
              </div>
            </div>

            {/* Ticket detail */}
            {selectedTicket?(
              <div style={{flex:1,background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{padding:"14px 18px",borderBottom:`0.5px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:"14px",fontWeight:"600"}}>{selectedTicket.title}</div>
                    <div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>{selectedTicket.created_by_email} · {new Date(selectedTicket.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{display:"flex",gap:"6px"}}>
                    {["Open","In progress","Resolved"].map(s=>(
                      <button key={s} onClick={()=>updateTicketStatus(selectedTicket.id,s)} style={{fontSize:"10px",padding:"4px 10px",borderRadius:"20px",border:`0.5px solid ${selectedTicket.status===s?P.primary:P.border}`,background:selectedTicket.status===s?P.primaryLight:"transparent",color:selectedTicket.status===s?P.primary:P.textSec,cursor:"pointer"}}>{s}</button>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:"12px"}}>
                  <div style={{background:P.bgSec,borderRadius:"8px",padding:"12px 14px"}}>
                    <div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Description</div>
                    <div style={{fontSize:"12px",color:P.textSec,lineHeight:"1.6",whiteSpace:"pre-wrap" as const}}>{selectedTicket.description}</div>
                  </div>
                  {selectedTicket.replies&&(
                    <div>
                      <div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,marginBottom:"8px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Conversation</div>
                      {selectedTicket.replies.split("\n").map((r:string,i:number)=>{
                        const isAdmin=r.includes("(TMF360 Support)");
                        return(
                          <div key={i} style={{background:isAdmin?P.primaryLight:P.bgSec,borderRadius:"8px",padding:"8px 12px",marginBottom:"6px",fontSize:"11px",color:P.textSec,lineHeight:"1.55",borderLeft:isAdmin?`3px solid ${P.primary}`:"none"}}>{r}</div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{padding:"14px 18px",borderTop:`0.5px solid ${P.border}`}}>
                  <textarea value={ticketReply} onChange={e=>setTicketReply(e.target.value)} placeholder="Type your reply to the client..." rows={3} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,fontFamily:"inherit",marginBottom:"8px"}}/>
                  <button onClick={addTicketReply} disabled={!ticketReply.trim()} style={{fontSize:"12px",padding:"7px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:ticketReply.trim()?1:0.4}}>Send Reply</button>
                </div>
              </div>
            ):(
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:P.textTert,fontSize:"12px"}}>Select a ticket to view details</div>
            )}
          </div>
        )}

        {/* USERS */}
        {panel==="users"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <h1 style={{fontSize:"14px",fontWeight:"600"}}>All Users ({users.length})</h1>
            <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
                  {["Name","Email","Role","Organisation","Status","Joined","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {users.length===0?<tr><td colSpan={7} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>
                  :users.map((u,i)=>{
                    const org=orgs.find(o=>o.id===u.org_id);
                    return(
                      <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <td style={{padding:"10px 12px",fontWeight:"500"}}>{u.full_name||"-"}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec}}>{u.email}</td>
                        <td style={{padding:"10px 12px"}}><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.primaryLight,color:P.primary}}>{u.role}</span></td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec}}>{org?.name||"-"}</td>
                        <td style={{padding:"10px 12px"}}><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:u.is_active?"#ECFDF5":"#F3F4F6",color:u.is_active?"#065F46":"#6B7280"}}>{u.is_active?"Active":"Inactive"}</span></td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textTert}}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{padding:"10px 12px"}}>
                          {u.is_active&&<button onClick={()=>deactivateUser(u.user_id)} style={{fontSize:"10px",padding:"3px 8px",background:P.dangerLight,color:P.danger,border:`0.5px solid #FECACA`,borderRadius:"4px",cursor:"pointer"}}>Deactivate</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SIGNUP LINK GENERATOR */}
        {panel==="signup"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"16px",maxWidth:"560px"}}>
            <h1 style={{fontSize:"14px",fontWeight:"600"}}>Generate Signup Link</h1>
            <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
              <div style={{marginBottom:"12px"}}>
                <label style={{fontSize:"11px",fontWeight:"600",color:P.textSec,display:"block",marginBottom:"4px"}}>Organisation Name <span style={{color:P.danger}}>*</span></label>
                <input value={genOrgName} onChange={e=>setGenOrgName(e.target.value)} placeholder="e.g. Optiscan Imaging Ltd." style={{width:"100%",fontSize:"12px",padding:"9px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",outline:"none"}}/>
              </div>
              <div style={{marginBottom:"16px"}}>
                <label style={{fontSize:"11px",fontWeight:"600",color:P.textSec,display:"block",marginBottom:"4px"}}>Pre-fill Email (optional)</label>
                <input value={genEmail} onChange={e=>setGenEmail(e.target.value)} type="email" placeholder="client@organisation.com" style={{width:"100%",fontSize:"12px",padding:"9px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",outline:"none"}}/>
                <div style={{fontSize:"10px",color:P.textTert,marginTop:"4px"}}>If provided, the email field will be pre-filled and locked on the signup page</div>
              </div>
              <button onClick={generateToken} disabled={genLoading||!genOrgName.trim()} style={{fontSize:"12px",padding:"10px 20px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:genLoading||!genOrgName.trim()?0.5:1,fontWeight:"600"}}>
                {genLoading?"Generating...":"Generate Signup Link"}
              </button>
            </div>
            {generatedLink&&(
              <div style={{background:P.successLight,border:`0.5px solid #A7F3D0`,borderRadius:"12px",padding:"16px"}}>
                <div style={{fontSize:"12px",fontWeight:"600",color:P.success,marginBottom:"8px"}}>✅ Signup link generated — valid for 7 days</div>
                <div style={{fontSize:"11px",color:P.textSec,background:P.bg,borderRadius:"8px",padding:"10px 12px",wordBreak:"break-all" as const,marginBottom:"10px",border:`0.5px solid ${P.border}`}}>{generatedLink}</div>
                <button onClick={()=>{navigator.clipboard.writeText(generatedLink);alert("Copied to clipboard!");}} style={{fontSize:"11px",padding:"6px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer"}}>Copy Link</button>
              </div>
            )}
            <div style={{background:P.blueLight,border:`0.5px solid #BFDBFE`,borderRadius:"10px",padding:"12px 14px",fontSize:"11px",color:"#1E40AF"}}>
              <strong>How it works:</strong> Send the link to the client. They click it, create their account, and are automatically guided through the org setup wizard. The link expires after 7 days and can only be used once.
            </div>
          </div>
        )}

        {/* TOKEN HISTORY */}
        {panel==="tokens"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <h1 style={{fontSize:"14px",fontWeight:"600"}}>Signup Token History</h1>
              <button onClick={()=>setPanel("signup")} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ New Token</button>
            </div>
            <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
                  {["Organisation","Email","Created","Expires","Status","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tokens.length===0?<tr><td colSpan={6} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No tokens yet.</td></tr>
                  :tokens.map((t,i)=>{
                    const isUsed=!!t.used_at;
                    const isExpired=!isUsed&&new Date(t.expires_at)<new Date();
                    const isActive=!isUsed&&!isExpired;
                    return(
                      <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <td style={{padding:"10px 12px",fontWeight:"500"}}>{t.org_name||"-"}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textSec}}>{t.email||"-"}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textTert}}>{new Date(t.created_at).toLocaleDateString()}</td>
                        <td style={{padding:"10px 12px",fontSize:"11px",color:P.textTert}}>{new Date(t.expires_at).toLocaleDateString()}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:isUsed?"#ECFDF5":isExpired?"#FEF2F2":"#EFF6FF",color:isUsed?"#065F46":isExpired?"#991B1B":"#1D4ED8"}}>
                            {isUsed?"Used":isExpired?"Expired":"Active"}
                          </span>
                        </td>
                        <td style={{padding:"10px 12px",display:"flex",gap:"6px"}}>
                          {isActive&&<button onClick={()=>{const url=`${window.location.origin}/signup?token=${t.token}`;navigator.clipboard.writeText(url);alert("Copied!");}} style={{fontSize:"10px",padding:"3px 8px",background:P.blueLight,color:P.blue,border:`0.5px solid #BFDBFE`,borderRadius:"4px",cursor:"pointer"}}>Copy Link</button>}
                          {isActive&&<button onClick={()=>revokeToken(t.id)} style={{fontSize:"10px",padding:"3px 8px",background:P.dangerLight,color:P.danger,border:`0.5px solid #FECACA`,borderRadius:"4px",cursor:"pointer"}}>Revoke</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}