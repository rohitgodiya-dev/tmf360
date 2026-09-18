"use client";
import{useState,useEffect}from"react";
import{supabase}from"../../../lib/supabase";
import{useRouter}from"next/navigation";

// Mirrors TMF360's app/setup/page.tsx structure exactly (navy sidebar with step
// list, top bar, split body with progress panel, trust bar). One deliberate
// difference: this uses Site360's own orange accent (#F97316) throughout,
// not the blue (#2563EB) TMF360's setup page uses — so Site360's signup and
// setup pages read as one consistent product. Flag if you'd rather match
// TMF360's blue exactly instead.
export default function Site360SetupPage(){
  const[step,setStep]=useState(1);
  const[user,setUser]=useState<any>(null);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState<{text:string,type:"error"|"ok"}|null>(null);
  const router=useRouter();

  // Step 1 — Site Identity
  const[siteName,setSiteName]=useState("");
  const[siteCode,setSiteCode]=useState("");
  const[country,setCountry]=useState("");
  const[city,setCity]=useState("");
  const[piName,setPiName]=useState("");
  const[piEmail,setPiEmail]=useState("");

  // Step 2 — First Study
  const[studyId,setStudyId]=useState("");
  const[protocol,setProtocol]=useState("");
  const[phase,setPhase]=useState("Phase I");
  const[sponsor,setSponsor]=useState("");

  const[errors,setErrors]=useState<string[]>([]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(!session?.user){router.push("/site360/login");return;}
      setUser(session.user);
      supabase.from("user_roles").select("org_id").eq("user_id",session.user.id).single().then(({data})=>{
        if(data?.org_id)router.push("/site360");
      });
    });
  },[]);

  function showMsg(text:string,type:"error"|"ok"){
    setMessage({text,type});
    setTimeout(()=>setMessage(null),3500);
  }

  function validate(){
    const errs:string[]=[];
    if(step===1){
      if(!siteName.trim())errs.push("siteName");
      if(!country.trim())errs.push("country");
      if(!piName.trim())errs.push("piName");
    }
    if(step===2){
      if(!studyId.trim())errs.push("studyId");
    }
    setErrors(errs);
    return errs.length===0;
  }

  function goNext(){
    if(!validate()){showMsg("Please fill in all required fields","error");return;}
    if(step===3){launch();return;}
    setStep(step+1);
  }

  function goBack(){if(step>1)setStep(step-1);}

  async function launch(){
    if(!user)return;
    setSaving(true);
    try{
      const fullName=user.user_metadata?.full_name||user.email?.split("@")[0]||"Site User";

      // Get or create org
      let orgId:string;
      const{data:existingRole}=await supabase.from("user_roles").select("org_id").eq("user_id",user.id).single();
      if(existingRole?.org_id){
        orgId=existingRole.org_id;
      }else{
        const{data:newOrg,error:orgErr}=await supabase.from("organizations").insert([{name:siteName.trim(),type:"Site",created_by:user.id}]).select().single();
        if(orgErr||!newOrg){showMsg("Error: "+(orgErr?.message||"Failed to create organisation"),"error");setSaving(false);return;}
        orgId=newOrg.id;

        const{error:roleErr}=await supabase.from("user_roles").insert([{
          user_id:user.id,org_id:orgId,email:user.email,
          full_name:fullName,role:"Site Coordinator",is_active:true,
        }]);
        if(roleErr){showMsg("Error: "+roleErr.message,"error");setSaving(false);return;}
      }

      // Create site
      const{data:newSite,error:siteErr}=await supabase.from("sites").insert([{
        org_id:orgId,site_name:siteName.trim(),site_code:siteCode.trim(),country,city,
        pi_name:piName.trim(),pi_email:piEmail.trim(),status:"active",
        activation_date:new Date().toISOString().split("T")[0],created_by:user.id,
      }]).select().single();
      if(siteErr||!newSite){showMsg("Error: "+(siteErr?.message||"Failed to create site"),"error");setSaving(false);return;}

      // Create study
      const{data:newStudy,error:studyErr}=await supabase.from("studies").insert([{
        org_id:orgId,study_id:studyId.trim(),protocol,phase,sponsor,status:"Active",
      }]).select().single();
      if(studyErr||!newStudy){showMsg("Error: "+(studyErr?.message||"Failed to create study"),"error");setSaving(false);return;}

      // Link site to study
      await supabase.from("site_studies").insert([{
        site_id:newSite.id,study_id:newStudy.id,org_id:orgId,status:"Active",
        activation_date:new Date().toISOString().split("T")[0],
      }]);

      // Add user to site members
      await supabase.from("site_members").insert([{
        site_id:newSite.id,org_id:orgId,user_id:user.id,role:"CRC",is_active:true,
      }]);

      router.push("/site360");
    }catch(e:any){
      showMsg("Error: "+(e.message||"Setup failed"),"error");
    }
    setSaving(false);
  }

  const STEPS=[
    {n:1,label:"Site Identity",desc:"Name, location and PI details"},
    {n:2,label:"First Study",desc:"Add the study this site runs"},
    {n:3,label:"Review & Launch",desc:"Confirm and launch your site"},
  ];

  const pcts=["","33%","66%","100%"];

  const inp=(hasErr:boolean)=>({
    border:`1px solid ${hasErr?"#EF4444":"#CBD5E1"}`,borderRadius:"8px",
    padding:"0 12px",height:"38px",fontSize:"12px",color:"#0F172A",
    background:"#fff",width:"100%",fontFamily:"inherit",outline:"none",
  });

  const sel={
    border:"1px solid #CBD5E1",borderRadius:"8px",padding:"0 12px",
    height:"38px",fontSize:"12px",color:"#0F172A",background:"#fff",
    width:"100%",fontFamily:"inherit",outline:"none",
  };

  const card={background:"#fff",border:"1px solid #E2E8F0",borderRadius:"12px",padding:"1.5rem",marginBottom:"1rem"};
  const cardTitle={fontSize:"11px",fontWeight:"700",color:"#94A3B8",textTransform:"uppercase" as const,letterSpacing:".06em",marginBottom:"1rem",paddingBottom:"8px",borderBottom:"1px solid #F1F5F9"};
  const grid3={display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1.25rem",marginBottom:"1.25rem"};
  const grid2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem",marginBottom:"1.25rem"};
  const lbl={fontSize:"11px",fontWeight:"600" as const,color:"#374151",display:"block",marginBottom:"5px"};
  const hint={fontSize:"10px",color:"#94A3B8",marginTop:"4px"};

  const ACCENT="#F97316";
  const ACCENT_LIGHT="#FFEDD5";

  return(
    <div style={{display:"flex",width:"100%",height:"100vh",background:"#fff",overflow:"hidden",fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#0F172A"}}>

      {/* SIDEBAR */}
      <aside style={{width:"230px",minWidth:"230px",background:"#0F1E3D",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"1.5rem 1.25rem .75rem"}}>
          <div style={{fontSize:"20px",fontWeight:"700",color:"#fff",letterSpacing:"-.5px",marginBottom:"2px"}}>Site<span style={{color:ACCENT}}>360</span></div>
          <div style={{fontSize:"10px",color:"#64748B",marginBottom:"1.5rem"}}>Site Operations Platform</div>
          <div style={{fontSize:"13px",fontWeight:"600",color:"#fff",marginBottom:"5px"}}>Site Setup</div>
          <div style={{fontSize:"11px",color:"#94A3B8",lineHeight:"1.6",marginBottom:"1.5rem"}}>Set up your site and first study. You can update these details anytime from settings.</div>
        </div>
        <div style={{display:"flex",flexDirection:"column"}}>
          {STEPS.map((s,i)=>(
            <div key={s.n}>
              <div style={{display:"flex",gap:"10px",padding:".6rem 1.25rem",background:step===s.n?`rgba(249,115,22,.12)`:"transparent"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"600",flexShrink:0,marginTop:"2px",background:step>s.n||step===s.n?ACCENT:"#1E3A5F",color:step>s.n||step===s.n?"#fff":"#64748B",border:step>s.n||step===s.n?"none":"1.5px solid #263F5E"}}>
                  {step>s.n?"✓":s.n}
                </div>
                <div>
                  <div style={{fontSize:"12px",fontWeight:"500",color:step>=s.n?"#FDBA74":"#475569"}}>{s.label}</div>
                  <div style={{fontSize:"10px",color:"#475569",marginTop:"2px",lineHeight:"1.4"}}>{s.desc}</div>
                </div>
              </div>
              {i<STEPS.length-1&&<div style={{width:"1.5px",height:"12px",background:"#1E3A5F",marginLeft:"calc(1.25rem + 12px)"}}/>}
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#F8FAFC",minWidth:0}}>

        {/* TOPBAR */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".85rem 1.75rem",borderBottom:"1px solid #E2E8F0",background:"#fff",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <span style={{fontSize:"13px",color:ACCENT,fontWeight:"500"}}>Step {step} of 3</span>
            <span style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginLeft:"4px"}}>{STEPS[step-1]?.label}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"34px",height:"34px",borderRadius:"50%",background:ACCENT,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"600",color:"#fff"}}>{user?.email?.[0]?.toUpperCase()||"U"}</div>
            <div>
              <div style={{fontSize:"12px",fontWeight:"600",color:"#0F172A"}}>{user?.email}</div>
              <div style={{fontSize:"11px",color:"#64748B"}}>Site Coordinator</div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{flex:1,padding:"1.5rem 1.75rem",overflowY:"auto"}}>

            {message&&<div style={{padding:"10px 14px",borderRadius:"8px",marginBottom:"1rem",fontSize:"12px",border:`1px solid ${message.type==="error"?"#FECACA":"#BBF7D0"}`,background:message.type==="error"?"#FEF2F2":"#F0FDF4",color:message.type==="error"?"#EF4444":"#16A34A"}}>{message.text}</div>}

            {/* STEP 1 — SITE IDENTITY */}
            {step===1&&(
              <div>
                <div style={{fontSize:"22px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>Tell us about your site</div>
                <div style={{fontSize:"13px",color:"#64748B",marginBottom:"1.25rem"}}>Basic identity information to configure your Site360 workspace</div>
                <div style={card}>
                  <div style={cardTitle}>Site details</div>
                  <div style={grid3}>
                    <div><label style={lbl}>Site Name <span style={{color:"#EF4444"}}>*</span></label><input value={siteName} onChange={e=>setSiteName(e.target.value)} placeholder="e.g. Mayo Clinic — Rochester" style={inp(errors.includes("siteName"))}/><div style={hint}>Full name of your clinical research site</div></div>
                    <div><label style={lbl}>Site Code</label><input value={siteCode} onChange={e=>setSiteCode(e.target.value.toUpperCase())} placeholder="e.g. MAY-001" style={inp(false)}/><div style={hint}>Short identifier used in document IDs</div></div>
                    <div><label style={lbl}>Country <span style={{color:"#EF4444"}}>*</span></label><input value={country} onChange={e=>setCountry(e.target.value)} placeholder="e.g. United States" style={inp(errors.includes("country"))}/></div>
                  </div>
                  <div style={grid3}>
                    <div><label style={lbl}>City</label><input value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Rochester, MN" style={inp(false)}/></div>
                    <div><label style={lbl}>Principal Investigator <span style={{color:"#EF4444"}}>*</span></label><input value={piName} onChange={e=>setPiName(e.target.value)} placeholder="e.g. Dr. Jane Smith" style={inp(errors.includes("piName"))}/></div>
                    <div><label style={lbl}>PI Email</label><input value={piEmail} onChange={e=>setPiEmail(e.target.value)} type="email" placeholder="pi@site.com" style={inp(false)}/></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — FIRST STUDY */}
            {step===2&&(
              <div>
                <div style={{fontSize:"22px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>Add your first study</div>
                <div style={{fontSize:"13px",color:"#64748B",marginBottom:"1.25rem"}}>You can add more studies later from Site360</div>
                <div style={card}>
                  <div style={cardTitle}>Study details</div>
                  <div style={grid2}>
                    <div><label style={lbl}>Study ID <span style={{color:"#EF4444"}}>*</span></label><input value={studyId} onChange={e=>setStudyId(e.target.value)} placeholder="e.g. T003, BCS-101" style={inp(errors.includes("studyId"))}/></div>
                    <div><label style={lbl}>Sponsor</label><input value={sponsor} onChange={e=>setSponsor(e.target.value)} placeholder="Sponsor name" style={inp(false)}/></div>
                  </div>
                  <div style={grid2}>
                    <div><label style={lbl}>Protocol Title</label><input value={protocol} onChange={e=>setProtocol(e.target.value)} placeholder="e.g. A Phase II study of..." style={inp(false)}/></div>
                    <div><label style={lbl}>Phase</label><select value={phase} onChange={e=>setPhase(e.target.value)} style={sel}>{["Phase I","Phase II","Phase III","Phase IV","Observational"].map(p=><option key={p}>{p}</option>)}</select></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — REVIEW & LAUNCH */}
            {step===3&&(
              <div>
                <div style={{fontSize:"22px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>Review and finish</div>
                <div style={{fontSize:"13px",color:"#64748B",marginBottom:"1.25rem"}}>Your site is ready — review your settings before launching</div>
                <div style={card}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
                    {[
                      {label:"Site Identity",rows:[["Site Name",siteName||"—"],["Site Code",siteCode||"—"],["Country",country||"—"],["City",city||"—"],["Principal Investigator",piName||"—"],["PI Email",piEmail||"—"]]},
                      {label:"First Study",rows:[["Study ID",studyId||"—"],["Protocol",protocol||"—"],["Phase",phase],["Sponsor",sponsor||"—"]]},
                    ].map(sec=>(
                      <div key={sec.label}>
                        <div style={{fontSize:"10px",fontWeight:"700",color:"#94A3B8",textTransform:"uppercase" as const,letterSpacing:".06em",paddingBottom:"6px",borderBottom:"1px solid #F1F5F9",marginBottom:"9px"}}>{sec.label}</div>
                        {sec.rows.map(([k,v])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:"12px",padding:"4px 0"}}>
                            <span style={{color:"#64748B"}}>{k}</span>
                            <span style={{color:"#0F172A",fontWeight:"600",textAlign:"right",maxWidth:"58%",wordBreak:"break-word" as const}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:"10px",padding:".85rem 1rem",display:"flex",alignItems:"center",gap:"10px",fontSize:"12px",color:"#15803D",fontWeight:"500",marginTop:"1rem"}}>
                  ✅ All required fields are complete. Your site is ready to launch.
                </div>
              </div>
            )}

          </div>

          {/* PROGRESS PANEL */}
          <div style={{width:"188px",minWidth:"170px",padding:"1rem",borderLeft:"1px solid #E2E8F0",background:"#fff",flexShrink:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{fontSize:"13px",fontWeight:"700",color:"#0F172A",marginBottom:"12px"}}>Setup Progress</div>
            <div style={{fontSize:"24px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>{pcts[step]}</div>
            <div style={{height:"6px",background:"#F1F5F9",borderRadius:"3px",marginBottom:"16px",overflow:"hidden"}}>
              <div style={{height:"100%",width:pcts[step],borderRadius:"3px",background:ACCENT,transition:"width .4s ease"}}/>
            </div>
            {siteName&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Site</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{siteName}</div></div>}
            {country&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Country</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{country}</div></div>}
            {piName&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>PI</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{piName}</div></div>}
            {studyId&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Study</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{studyId}</div></div>}
            <div style={{background:ACCENT_LIGHT,border:`1px solid #FDBA74`,borderRadius:"10px",padding:".85rem",marginTop:"12px"}}>
              <div style={{fontSize:"11px",fontWeight:"600",color:"#C2410C",marginBottom:"5px"}}>ℹ Update anytime</div>
              <div style={{fontSize:"10px",color:"#9A3412",lineHeight:"1.6"}}>Site and study details can be changed from Site360 after launch.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginTop:"20px"}}>
              <button onClick={goNext} disabled={saving} style={{fontSize:"12px",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontWeight:"600",border:"none",background:ACCENT,color:"#fff",opacity:saving?0.6:1}}>
                {saving?"Setting up…":step===3?"Launch Site →":"Next →"}
              </button>
              {step>1&&<button onClick={goBack} style={{fontSize:"12px",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontWeight:"500",border:"1px solid #CBD5E1",background:"#fff",color:"#374151"}}>← Back</button>}
            </div>
          </div>
        </div>

        {/* TRUST BAR */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-around",padding:".65rem 1.75rem",borderTop:"1px solid #E2E8F0",background:"#fff",flexShrink:0}}>
          {[["🛡️","Secure & Compliant","Industry-leading security"],["✅","Audit Ready","Complete audit trail"],["🤖","AI Powered","Smart document insights"],["📈","Scalable","Built to grow with you"]].map(([icon,title,sub])=>(
            <div key={title} style={{display:"flex",alignItems:"center",gap:"7px"}}>
              <span style={{fontSize:"16px"}}>{icon}</span>
              <div><div style={{fontSize:"10px",fontWeight:"700",color:"#374151"}}>{title}</div><div style={{fontSize:"10px",color:"#94A3B8"}}>{sub}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}