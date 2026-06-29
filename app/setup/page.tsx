"use client";
import{useState,useEffect}from"react";
import{supabase}from"../../lib/supabase";
import{useRouter}from"next/navigation";

export default function SetupPage(){
  const[step,setStep]=useState(1);
  const[user,setUser]=useState<any>(null);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState<{text:string,type:"error"|"ok"}|null>(null);
  const router=useRouter();

  // Step 1
  const[orgName,setOrgName]=useState("");
  const[orgType,setOrgType]=useState("Medical Device Manufacturer");
  const[orgCode,setOrgCode]=useState("");
  const[country,setCountry]=useState("");
  const[timezone,setTimezone]=useState("UTC-06:00 Central");
  const[language,setLanguage]=useState("English (US)");
  const[contactName,setContactName]=useState("");
  const[contactEmail,setContactEmail]=useState("");
  const[orgWebsite,setOrgWebsite]=useState("");

  // Step 2
  const[productType,setProductType]=useState("Medical Device");
  const[productTypeOther,setProductTypeOther]=useState("");
  const[regRegions,setRegRegions]=useState<string[]>(["FDA (US)"]);
  const[regOther,setRegOther]=useState("");
  const[esigCompliance,setEsigCompliance]=useState<string[]>(["21 CFR Part 11 (FDA)"]);
  const[numTrials,setNumTrials]=useState("1 trial");
  const[siteModel,setSiteModel]=useState("Single-site");

  // Step 3
  const[tmfModel,setTmfModel]=useState("DIA TMF Reference Model v3.3.1");
  const[retention,setRetention]=useState("");
  const[uploadFmt,setUploadFmt]=useState("PDF / PDF-A only");
  const[versioning,setVersioning]=useState("Auto-version on upload");
  const[accessModel,setAccessModel]=useState<string[]>(["Internal team only"]);
  const[teamSize,setTeamSize]=useState("1–5 people");

  const[errors,setErrors]=useState<string[]>([]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(!session?.user){router.push("/platform");return;}
      setUser(session.user);
      setContactEmail(session.user.email||"");
      supabase.from("user_roles").select("org_id").eq("user_id",session.user.id).single().then(({data})=>{
        if(data?.org_id)router.push("/platform");
      });
    });
  },[]);

  function showMsg(text:string,type:"error"|"ok"){
    setMessage({text,type});
    setTimeout(()=>setMessage(null),3500);
  }

  function togglePill(arr:string[],set:(v:string[])=>void,val:string){
    set(arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]);
  }

  function validate(){
    const errs:string[]=[];
    if(step===1){
      if(!orgName.trim())errs.push("orgName");
      if(!orgCode.trim())errs.push("orgCode");
      if(!country.trim())errs.push("country");
      if(!contactName.trim())errs.push("contactName");
      if(!contactEmail.trim())errs.push("contactEmail");
    }
    if(step===2){
      if(!productType)errs.push("productType");
      if(!regRegions.length)errs.push("regRegions");
    }
    if(step===3){
      if(!accessModel.length)errs.push("accessModel");
    }
    setErrors(errs);
    return errs.length===0;
  }

  function goNext(){
    if(!validate()){showMsg("Please fill in all required fields","error");return;}
    if(step===4){launch();return;}
    setStep(step+1);
  }

  function goBack(){if(step>1)setStep(step-1);}

  async function launch(){
    if(!user)return;
    setSaving(true);
    const regDisplay=[...regRegions,regOther?`Other — ${regOther}`:""].filter(Boolean).join(", ");
    const{data:org,error:orgError}=await supabase.from("organizations").insert([{
      name:orgName.trim(),type:orgType,code:orgCode.trim().toUpperCase(),
      country,timezone,language,
      product_type:productType+(productType==="Other"&&productTypeOther?` — ${productTypeOther}`:""),
      regulatory_regions:regDisplay,
      trial_phases:numTrials,
      therapeutic_areas:siteModel,
      tmf_reference_model:tmfModel,
      retention_period:retention||"15 years",
      team_size:teamSize,
      created_by:user.id,
    }]).select().single();

    if(orgError){showMsg("Error: "+orgError.message,"error");setSaving(false);return;}

    const{error:roleError}=await supabase.from("user_roles").upsert([{
      user_id:user.id,
      email:user.email,
      role:"System Administrator",
      full_name:contactName.trim(),
      is_active:true,
      notifications_enabled:true,
      can_upload_download:true,
      can_download:true,
      org_id:org.id,
    }],{onConflict:"user_id"});

    if(roleError){showMsg("Error: "+roleError.message,"error");setSaving(false);return;}
    router.push("/platform");
  }

  const STEPS=[
    {n:1,label:"Organisation Identity",desc:"Name, contact and location details"},
    {n:2,label:"Workspace Scope",desc:"Products, regulations and trial model"},
    {n:3,label:"TMF Configuration",desc:"Access, roles and document settings"},
    {n:4,label:"Review & Launch",desc:"Confirm and launch your workspace"},
  ];

  const pcts=["","25%","50%","75%","100%"];

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

  function Pill({label,active,onClick}:{label:string,active:boolean,onClick:()=>void}){
    return<span onClick={onClick} style={{fontSize:"11px",padding:"5px 13px",borderRadius:"20px",cursor:"pointer",border:`1px solid ${active?"#2563EB":"#E2E8F0"}`,background:active?"#EFF6FF":"#F8FAFC",color:active?"#2563EB":"#64748B",fontWeight:active?"600":"400",userSelect:"none" as const}}>{label}</span>;
  }

  function TypeBtn({label,active,onClick}:{label:string,active:boolean,onClick:()=>void}){
    return<button onClick={onClick} style={{fontSize:"11px",padding:"6px 14px",borderRadius:"8px",cursor:"pointer",border:`1px solid ${active?"#2563EB":"#E2E8F0"}`,background:active?"#EFF6FF":"#F8FAFC",color:active?"#2563EB":"#64748B",fontWeight:active?"600":"400"}}>{label}</button>;
  }

  return(
    <div style={{display:"flex",width:"100%",height:"100vh",background:"#fff",overflow:"hidden",fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#0F172A"}}>

      {/* SIDEBAR */}
      <aside style={{width:"230px",minWidth:"230px",background:"#0F1E3D",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"1.5rem 1.25rem .75rem"}}>
          <div style={{fontSize:"20px",fontWeight:"700",color:"#fff",letterSpacing:"-.5px",marginBottom:"2px"}}>TMF<span style={{color:"#3B82F6"}}>360</span></div>
          <div style={{fontSize:"10px",color:"#64748B",marginBottom:"1.5rem"}}>Trial Master File Management</div>
          <div style={{fontSize:"13px",fontWeight:"600",color:"#fff",marginBottom:"5px"}}>Organisation Setup</div>
          <div style={{fontSize:"11px",color:"#94A3B8",lineHeight:"1.6",marginBottom:"1.5rem"}}>Set up your workspace. You can update these details anytime from settings.</div>
        </div>
        <div style={{display:"flex",flexDirection:"column"}}>
          {STEPS.map((s,i)=>(
            <div key={s.n}>
              <div style={{display:"flex",gap:"10px",padding:".6rem 1.25rem",background:step===s.n?"rgba(59,130,246,.12)":"transparent"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"600",flexShrink:0,marginTop:"2px",background:step>s.n||step===s.n?"#2563EB":"#1E3A5F",color:step>s.n||step===s.n?"#fff":"#64748B",border:step>s.n||step===s.n?"none":"1.5px solid #263F5E"}}>
                  {step>s.n?"✓":s.n}
                </div>
                <div>
                  <div style={{fontSize:"12px",fontWeight:"500",color:step>=s.n?"#60A5FA":"#475569"}}>{s.label}</div>
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
            <span style={{fontSize:"13px",color:"#2563EB",fontWeight:"500"}}>Step {step} of 4</span>
            <span style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginLeft:"4px"}}>{STEPS[step-1]?.label}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"#2563EB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"600",color:"#fff"}}>{user?.email?.[0]?.toUpperCase()||"U"}</div>
            <div>
              <div style={{fontSize:"12px",fontWeight:"600",color:"#0F172A"}}>{user?.email}</div>
              <div style={{fontSize:"11px",color:"#64748B"}}>System Administrator</div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{flex:1,padding:"1.5rem 1.75rem",overflowY:"auto"}}>

            {message&&<div style={{padding:"10px 14px",borderRadius:"8px",marginBottom:"1rem",fontSize:"12px",border:`1px solid ${message.type==="error"?"#FECACA":"#BBF7D0"}`,background:message.type==="error"?"#FEF2F2":"#F0FDF4",color:message.type==="error"?"#EF4444":"#16A34A"}}>{message.text}</div>}

            {/* STEP 1 */}
            {step===1&&(
              <div>
                <div style={{fontSize:"22px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>Tell us about your organisation</div>
                <div style={{fontSize:"13px",color:"#64748B",marginBottom:"1.25rem"}}>Basic identity information to configure your workspace</div>
                <div style={card}>
                  <div style={cardTitle}>Organisation details</div>
                  <div style={grid3}>
                    <div><label style={lbl}>Organisation Name <span style={{color:"#EF4444"}}>*</span></label><input value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="e.g. Optiscan Imaging Ltd." style={inp(errors.includes("orgName"))}/><div style={hint}>Legal name of your organisation</div></div>
                    <div><label style={lbl}>Organisation Type <span style={{color:"#EF4444"}}>*</span></label><select value={orgType} onChange={e=>setOrgType(e.target.value)} style={sel}>{["Sponsor","CRO","Site / Investigator","Academic Institution","Biotech","Medical Device Manufacturer","IRB / IEC","Regulatory Authority","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label style={lbl}>Organisation Code <span style={{color:"#EF4444"}}>*</span></label><input value={orgCode} onChange={e=>setOrgCode(e.target.value.toUpperCase())} placeholder="e.g. OIL" maxLength={10} style={inp(errors.includes("orgCode"))}/><div style={hint}>Short prefix used in document IDs</div></div>
                  </div>
                  <div style={grid3}>
                    <div><label style={lbl}>Country <span style={{color:"#EF4444"}}>*</span></label><input value={country} onChange={e=>setCountry(e.target.value)} placeholder="e.g. United States" style={inp(errors.includes("country"))}/></div>
                    <div><label style={lbl}>Time Zone</label><select value={timezone} onChange={e=>setTimezone(e.target.value)} style={sel}>{["UTC-08:00 Pacific","UTC-07:00 Mountain","UTC-06:00 Central","UTC-05:00 Eastern","UTC+00:00 GMT","UTC+01:00 CET","UTC+05:30 IST","UTC+08:00 CST","UTC+09:00 JST"].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label style={lbl}>Language</label><select value={language} onChange={e=>setLanguage(e.target.value)} style={sel}>{["English (US)","English (UK)","French","German","Spanish","Japanese","Chinese"].map(l=><option key={l}>{l}</option>)}</select></div>
                  </div>
                </div>
                <div style={card}>
                  <div style={cardTitle}>Primary contact</div>
                  <div style={grid3}>
                    <div><label style={lbl}>Contact Name <span style={{color:"#EF4444"}}>*</span></label><input value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="e.g. Rohit Sharma" style={inp(errors.includes("contactName"))}/><div style={hint}>Main point of contact for this account</div></div>
                    <div><label style={lbl}>Contact Email <span style={{color:"#EF4444"}}>*</span></label><input value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="e.g. rohit@optiscan.com" type="email" style={inp(errors.includes("contactEmail"))}/><div style={hint}>Used for account recovery and audit notifications</div></div>
                    <div><label style={lbl}>Organisation Website</label><input value={orgWebsite} onChange={e=>setOrgWebsite(e.target.value)} placeholder="e.g. https://optiscan.com" style={inp(false)}/><div style={hint}>Optional — helps verify sponsor identity</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step===2&&(
              <div>
                <div style={{fontSize:"22px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>Define your workspace scope</div>
                <div style={{fontSize:"13px",color:"#64748B",marginBottom:"1.25rem"}}>These are organisation-level defaults — you'll set trial-specific details when you create each trial</div>
                <div style={card}>
                  <div style={cardTitle}>Primary product type</div>
                  <div style={{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"8px"}}>What types of products does your organisation primarily develop? <span style={{color:"#EF4444"}}>*</span></div>
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const,marginBottom:productType==="Other"?"10px":"0"}}>
                    {["Medical Device","Drug / Biologic","Combination Product","IVD","Software as a Medical Device (SaMD)","Other"].map(t=><TypeBtn key={t} label={t} active={productType===t} onClick={()=>setProductType(t)}/>)}
                  </div>
                  {productType==="Other"&&<input value={productTypeOther} onChange={e=>setProductTypeOther(e.target.value)} placeholder="Please specify product type…" style={{...inp(false),width:"260px",marginTop:"8px"}}/>}
                </div>
                <div style={card}>
                  <div style={cardTitle}>Regulatory footprint</div>
                  <div style={{marginBottom:"1.25rem"}}>
                    <div style={{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"8px"}}>Regulatory regions you operate in <span style={{color:"#EF4444"}}>*</span></div>
                    <div style={{display:"flex",gap:"7px",flexWrap:"wrap" as const}}>
                      {["FDA (US)","EMA (EU)","Health Canada","TGA (Australia)","PMDA (Japan)","MHRA (UK)","Anvisa (Brazil)","CDSCO (India)","SFDA (Saudi Arabia)","Other"].map(r=><Pill key={r} label={r} active={regRegions.includes(r)} onClick={()=>togglePill(regRegions,setRegRegions,r)}/>)}
                    </div>
                    {regRegions.includes("Other")&&<input value={regOther} onChange={e=>setRegOther(e.target.value)} placeholder="Specify other regulatory region(s)…" style={{...inp(false),width:"300px",marginTop:"8px"}}/>}
                  </div>
                  <div>
                    <div style={{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"8px"}}>Electronic signature compliance requirements</div>
                    <div style={{display:"flex",gap:"7px",flexWrap:"wrap" as const}}>
                      {["21 CFR Part 11 (FDA)","EU Annex 11","ISO 14155:2020","ICH E6(R3) GCP","Not required yet"].map(e=><Pill key={e} label={e} active={esigCompliance.includes(e)} onClick={()=>togglePill(esigCompliance,setEsigCompliance,e)}/>)}
                    </div>
                  </div>
                </div>
                <div style={card}>
                  <div style={cardTitle}>Trial portfolio</div>
                  <div style={grid2}>
                    <div><label style={lbl}>Anticipated number of active trials</label><select value={numTrials} onChange={e=>setNumTrials(e.target.value)} style={sel}>{["1 trial","2–5 trials","6–20 trials","20+ trials"].map(t=><option key={t}>{t}</option>)}</select><div style={hint}>Determines whether you need multi-study folder hierarchy</div></div>
                    <div><label style={lbl}>Trial site model</label><select value={siteModel} onChange={e=>setSiteModel(e.target.value)} style={sel}>{["Single-site","Multi-site (same country)","Multi-site (international)","Decentralised / Virtual"].map(s=><option key={s}>{s}</option>)}</select><div style={hint}>Affects Zone 10 (Site Management) structure in your TMF</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step===3&&(
              <div>
                <div style={{fontSize:"22px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>TMF Configuration</div>
                <div style={{fontSize:"13px",color:"#64748B",marginBottom:"1.25rem"}}>Configure your Trial Master File workspace, access model, and compliance settings</div>
                <div style={card}>
                  <div style={cardTitle}>TMF structure</div>
                  <div style={grid2}>
                    <div><label style={lbl}>TMF Reference Model</label><select value={tmfModel} onChange={e=>setTmfModel(e.target.value)} style={sel}>{["DIA TMF Reference Model v3.3.1","DIA TMF Reference Model v3.0","Custom","Hybrid"].map(t=><option key={t}>{t}</option>)}</select><div style={hint}>TMF360 is aligned to v3.3.1 by default</div></div>
                    <div><label style={lbl}>Document Retention Period</label><input value={retention} onChange={e=>setRetention(e.target.value)} placeholder="e.g. 15 years, 25 years, per ICH E6(R3)…" style={inp(false)}/><div style={hint}>ISO 14155 requires minimum 15 years for medical devices</div></div>
                  </div>
                  <div style={grid2}>
                    <div><label style={lbl}>Default upload format</label><select value={uploadFmt} onChange={e=>setUploadFmt(e.target.value)} style={sel}>{["PDF / PDF-A only","Any format accepted","Office formats + PDF"].map(f=><option key={f}>{f}</option>)}</select></div>
                    <div><label style={lbl}>Document versioning</label><select value={versioning} onChange={e=>setVersioning(e.target.value)} style={sel}>{["Auto-version on upload","Manual versioning","Major versions only"].map(v=><option key={v}>{v}</option>)}</select></div>
                  </div>
                </div>
                <div style={card}>
                  <div style={cardTitle}>Access and collaboration model</div>
                  <div style={{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"8px"}}>Who will access this eTMF? <span style={{color:"#EF4444"}}>*</span></div>
                  <div style={{display:"flex",gap:"7px",flexWrap:"wrap" as const}}>
                    {["Internal team only","Sites can upload documents","CRO co-manages TMF","Sponsor oversight / read-only","Regulatory inspector access"].map(a=><Pill key={a} label={a} active={accessModel.includes(a)} onClick={()=>togglePill(accessModel,setAccessModel,a)}/>)}
                  </div>
                </div>
                <div style={card}>
                  <div style={cardTitle}>Team size</div>
                  <div style={grid2}>
                    <div><label style={lbl}>Anticipated team size</label><select value={teamSize} onChange={e=>setTeamSize(e.target.value)} style={sel}>{["1–5 people","6–20 people","21–50 people","51–100 people","100+ people"].map(s=><option key={s}>{s}</option>)}</select></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step===4&&(
              <div>
                <div style={{fontSize:"22px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>Review and finish</div>
                <div style={{fontSize:"13px",color:"#64748B",marginBottom:"1.25rem"}}>Your workspace is ready — review your settings before launching</div>
                <div style={card}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
                    {[
                      {label:"Identity",rows:[["Organisation",orgName||"—"],["Type",orgType],["Code",orgCode||"—"],["Country",country||"—"],["Language",language],["Primary Contact",contactName||"—"],["Contact Email",contactEmail||"—"]]},
                      {label:"Workspace Scope",rows:[["Product Type",productType],["Regulatory Regions",regRegions.join(", ")||"—"],["e-Sig Compliance",esigCompliance.join(", ")||"—"],["Active Trials",numTrials],["Site Model",siteModel]]},
                      {label:"TMF Configuration",rows:[["Reference Model",tmfModel],["Retention Period",retention||"15 years"],["Upload Format",uploadFmt],["Versioning",versioning],["Access Model",accessModel.join(", ")||"—"],["Team Size",teamSize]]},
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
                  ✅ All required fields are complete. Your workspace is ready to launch.
                </div>
              </div>
            )}

          </div>

          {/* PROGRESS PANEL */}
          <div style={{width:"188px",minWidth:"170px",padding:"1rem",borderLeft:"1px solid #E2E8F0",background:"#fff",flexShrink:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{fontSize:"13px",fontWeight:"700",color:"#0F172A",marginBottom:"12px"}}>Setup Progress</div>
            <div style={{fontSize:"24px",fontWeight:"700",color:"#0F172A",marginBottom:"4px"}}>{pcts[step]}</div>
            <div style={{height:"6px",background:"#F1F5F9",borderRadius:"3px",marginBottom:"16px",overflow:"hidden"}}>
              <div style={{height:"100%",width:pcts[step],borderRadius:"3px",background:"#2563EB",transition:"width .4s ease"}}/>
            </div>
            {orgName&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Organisation</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{orgName}</div></div>}
            {orgType&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Type</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{orgType}</div></div>}
            {orgCode&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Code</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{orgCode}</div></div>}
            {country&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Country</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{country}</div></div>}
            {contactName&&<div style={{marginBottom:"8px"}}><div style={{fontSize:"10px",color:"#94A3B8"}}>Contact</div><div style={{fontSize:"11px",fontWeight:"600",color:"#0F172A"}}>{contactName}</div></div>}
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:"10px",padding:".85rem",marginTop:"12px"}}>
              <div style={{fontSize:"11px",fontWeight:"600",color:"#1D4ED8",marginBottom:"5px"}}>ℹ Update anytime</div>
              <div style={{fontSize:"10px",color:"#1E40AF",lineHeight:"1.6"}}>All settings can be changed from Organisation Settings after launch.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginTop:"20px"}}>
              <button onClick={goNext} disabled={saving} style={{fontSize:"12px",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontWeight:"600",border:"none",background:"#2563EB",color:"#fff",opacity:saving?0.6:1}}>
                {saving?"Setting up…":step===4?"Launch Workspace →":"Next →"}
              </button>
              {step>1&&<button onClick={goBack} style={{fontSize:"12px",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontWeight:"500",border:"1px solid #CBD5E1",background:"#fff",color:"#374151"}}>← Back</button>}
              <button onClick={()=>router.push("/platform")} style={{fontSize:"11px",borderRadius:"8px",padding:"6px 16px",cursor:"pointer",fontWeight:"400",border:"1px solid #E2E8F0",background:"transparent",color:"#94A3B8"}}>Skip for now</button>
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