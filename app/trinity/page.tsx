"use client";
import{useState,useEffect,useRef}from"react";
import{supabase}from"../../lib/supabase";

const P={
  primary:"#F97316",primaryLight:"#FFEDD5",primaryDark:"#EA580C",
  text:"#111827",textSec:"#374151",textTert:"#6B7280",textMuted:"#9CA3AF",
  bg:"#FFFFFF",bgSec:"#F9FAFB",bgTert:"#F3F4F6",
  border:"#E5E7EB",borderSec:"#D1D5DB",
  success:"#10B981",successLight:"#ECFDF5",
  danger:"#EF4444",dangerLight:"#FEF2F2",
  warning:"#F59E0B",warningLight:"#FFFBEB",
  blue:"#3B82F6",blueLight:"#EFF6FF",
  purple:"#8B5CF6",purpleLight:"#F5F3FF",
  lavender:"#E9ECFB",
};

const VAULT_DOC_TYPES=[
  "Protocol","Protocol Amendment","Investigator's Brochure",
  "Statistical Analysis Plan","Monitoring Plan","Medical Monitoring Plan",
  "IRB / IEC Decision","Regulatory Authority Decision","Clinical Trial Agreement",
  "Informed Consent Form","Risk Management Plan","Quality Plan",
  "Data Management Plan","Safety Management Plan","Other",
];

const SEVERITY_COLOR=(s:string)=>s==="Critical"?P.danger:s==="Major"?P.warning:P.blue;
const SEVERITY_BG=(s:string)=>s==="Critical"?P.dangerLight:s==="Major"?P.warningLight:P.blueLight;

interface ChatMsg{
  role:"ai"|"user";
  text:string;
  isHealthCard?:boolean;
  sourceTags?:string[];
  classification?:{zoneLine:string;confidence:number;warning?:{detail:string;action:string}};
  pendingClassification?:any;
  classStage?:string;
}

interface VaultDoc{
  id:string;
  file_name:string;
  custom_name:string;
  document_type:string;
  file_path:string;
  file_size:number;
  extracted_text:string;
  uploaded_by:string;
  uploaded_at:string;
  is_active:boolean;
}

interface Finding{
  id:string;
  finding_type:string;
  severity:string;
  title:string;
  detail:string;
  source_doc:string;
  artifact_ref:string;
  status:string;
  created_at:string;
}

export default function TrinityPage(){
  const[user,setUser]=useState<any>(null);
  const[orgId,setOrgId]=useState("");
  const[studies,setStudies]=useState<any[]>([]);
  const[activeStudy,setActiveStudy]=useState<any>(null);
  const[userRole,setUserRole]=useState("");
  const[userFullName,setUserFullName]=useState("");
  const[panel,setPanel]=useState<"chat"|"vault"|"findings"|"briefing">("chat");
  const[loading,setLoading]=useState(true);
  const[docs,setDocs]=useState<any[]>([]);
  const[tmfConfig,setTmfConfig]=useState<any[]>([]);
  const[chatMessages,setChatMessages]=useState<ChatMsg[]>([{
    role:"ai",
    text:"Hi, I'm Trinity — your AI TMF Specialist. I can read your study vault documents, classify uploaded files, identify missing documents, and answer questions about your trial master file.\n\nUpload your Protocol and key study documents to the Study Vault first, and I'll use them to give you study-specific insights.",
  }]);
  const[chatInput,setChatInput]=useState("");
  const[chatLoading,setChatLoading]=useState(false);
  const[chatDocAction,setChatDocAction]=useState<{msgIdx:number;stage:number;disabled:boolean}|null>(null);
  const[approveStage,setApproveStage]=useState<0|1|2|3>(0);
  const[approveDocId,setApproveDocId]=useState<string|null>(null);
  const[flagStage,setFlagStage]=useState<"idle"|"form"|"done">("idle");
  const[flagMsgIdx,setFlagMsgIdx]=useState<number|null>(null);
  const[flagDocId,setFlagDocId]=useState<string|null>(null);
  const[flagReason,setFlagReason]=useState("");
  const[flagComment,setFlagComment]=useState("");
  const messagesEnd=useRef<HTMLDivElement>(null);
  const chatFileInput=useRef<HTMLInputElement>(null);
  const[vaultDocs,setVaultDocs]=useState<VaultDoc[]>([]);
  const[vaultUploading,setVaultUploading]=useState(false);
  const[vaultProgress,setVaultProgress]=useState("");
  const[vaultDocType,setVaultDocType]=useState("Protocol");
  const[vaultCustomName,setVaultCustomName]=useState("");
  const[vaultFile,setVaultFile]=useState<File|null>(null);
  const vaultFileInput=useRef<HTMLInputElement>(null);
  const[findings,setFindings]=useState<Finding[]>([]);
  const[analysing,setAnalysing]=useState(false);
  const[briefing,setBriefing]=useState<any>(null);
  const[briefingLoading,setBriefingLoading]=useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){setUser(session.user);loadUserContext(session.user.id);}
      else{window.location.href="/platform";}
    });
  },[]);

  useEffect(()=>{messagesEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMessages]);

  async function loadUserContext(uid:string){
    const{data}=await supabase.from("user_roles").select("role,org_id,full_name").eq("user_id",uid).single();
    if(!data){window.location.href="/platform";return;}
    setUserRole(data.role);setOrgId(data.org_id);setUserFullName(data.full_name||"");
    const savedStudyId=localStorage.getItem("tmf_active_study")||"";
    const{data:studyData}=await supabase.from("studies").select("*").eq("org_id",data.org_id).order("created_at",{ascending:false});
    if(studyData&&studyData.length>0){
      setStudies(studyData);
      const active=savedStudyId?studyData.find((s:any)=>s.study_id===savedStudyId)||studyData[0]:studyData[0];
      setActiveStudy(active);loadStudyData(active.study_id,data.org_id);
    }
    setLoading(false);
  }

  async function loadStudyData(studyId:string,oid:string){
    const[{data:docData},{data:configData},{data:vaultData},{data:findingData}]=await Promise.all([
      supabase.from("documents").select("*").eq("study_id",studyId).eq("org_id",oid).order("created_at",{ascending:false}),
      supabase.from("tmf_config").select("*").eq("org_id",oid).eq("study_id",studyId).eq("is_enabled",true),
      supabase.from("study_vault").select("*").eq("org_id",oid).eq("study_id",studyId).eq("is_active",true).order("uploaded_at",{ascending:false}),
      supabase.from("trinity_findings").select("*").eq("org_id",oid).eq("study_id",studyId).order("created_at",{ascending:false}),
    ]);
    if(docData)setDocs(docData);
    if(configData)setTmfConfig(configData);
    if(vaultData)setVaultDocs(vaultData as VaultDoc[]);
    if(findingData)setFindings(findingData as Finding[]);
  }

  function switchStudy(studyId:string){
    const s=studies.find(x=>x.study_id===studyId);
    if(s){setActiveStudy(s);localStorage.setItem("tmf_active_study",studyId);loadStudyData(studyId,orgId);setChatMessages([{role:"ai",text:`Switched to study ${studyId}. I've loaded the TMF data and vault documents for this study.`}]);}
  }

  const activeTMF=tmfConfig.filter(c=>c.type==="artifact").map(c=>({z:c.zone_num,zn:c.zone_name||"",s:c.section_num||"",a:c.artifact_num,an:c.artifact_name,cl:c.classification||"Core",iso:c.iso_ref||""}));
  const activeZONES=tmfConfig.filter(c=>c.type==="zone").sort((a,b)=>parseFloat(a.zone_num)-parseFloat(b.zone_num)).map(c=>({z:c.zone_num,zn:c.zone_name}));
  const coreArts=activeTMF.filter(a=>a.cl==="Core");
  const filedNums=docs.filter(d=>d.status==="Approved").map(d=>d.artifact_num);
  const filedCore=coreArts.filter(a=>filedNums.includes(a.a)).length;
  const totalCore=coreArts.length;
  const donePct=totalCore?Math.round((filedCore/totalCore)*100):0;
  const missing=totalCore-filedCore;
  const pending=docs.filter(d=>d.status==="Under Review").length;
  const expiring=docs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).length;
  const critZones=["3","4","5"];const majZones=["1","2","7"];
  const gaps={
    crit:activeTMF.filter(a=>a.cl==="Core"&&critZones.includes(a.z)&&!filedNums.includes(a.a)),
    major:activeTMF.filter(a=>a.cl==="Core"&&majZones.includes(a.z)&&!filedNums.includes(a.a)),
    minor:activeTMF.filter(a=>a.cl==="Core"&&!critZones.includes(a.z)&&!majZones.includes(a.z)&&!filedNums.includes(a.a)),
  };
  const totalW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+w;},0);
  const zoneComp=(z:string)=>{const t=activeTMF.filter(a=>a.cl==="Core"&&a.z===z).length;const f=docs.filter(d=>d.status==="Approved"&&activeTMF.some(a=>a.a===d.artifact_num&&a.z===z)).length;return t?Math.round((f/t)*100):0;};
  const earnedW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+(zoneComp(z)/100)*w;},0);
  const ri=totalW?Math.round((earnedW/totalW)*100):0;

  async function uploadVaultDoc(){
    if(!vaultFile||!activeStudy||!orgId)return;
    setVaultUploading(true);setVaultProgress("Uploading...");
    const path=`vault/${orgId}/${activeStudy.study_id}/${Date.now()}_${vaultFile.name}`;
    const{error:upErr}=await supabase.storage.from("Documents").upload(path,vaultFile);
    if(upErr){setVaultProgress("Upload failed: "+upErr.message);setVaultUploading(false);return;}
    setVaultProgress("Extracting text...");
    let extractedText="";
    try{
      const reader=new FileReader();
      const base64=await new Promise<string>((res,rej)=>{reader.onload=()=>res((reader.result as string).split(",")[1]);reader.onerror=rej;reader.readAsDataURL(vaultFile);});
      const resp=await fetch("/api/vault/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:vaultFile.name})});
      const data=await resp.json();extractedText=data.text||"";
    }catch(e){extractedText="";}
    setVaultProgress("Saving...");
    const{data:inserted}=await supabase.from("study_vault").insert([{org_id:orgId,study_id:activeStudy.study_id,file_name:vaultFile.name,custom_name:vaultCustomName||vaultFile.name,document_type:vaultDocType,file_path:path,file_size:vaultFile.size,extracted_text:extractedText,uploaded_by:user?.email,is_active:true}]).select();
    if(inserted){setVaultDocs(prev=>[inserted[0] as VaultDoc,...prev]);setVaultProgress("Done!");setChatMessages(prev=>[...prev,{role:"ai",text:`I've read "${vaultCustomName||vaultFile.name}" (${vaultDocType}) and added it to the Study Vault. I'll now use this document as a source of truth when answering questions about ${activeStudy.study_id}.`}]);setTimeout(()=>{setVaultFile(null);setVaultCustomName("");setVaultProgress("");},2000);}
    setVaultUploading(false);
  }

  async function deleteVaultDoc(id:string){
    if(!confirm("Remove this document from the vault?"))return;
    await supabase.from("study_vault").update({is_active:false}).eq("id",id);
    setVaultDocs(prev=>prev.filter(d=>d.id!==id));
  }

  async function runVaultAnalysis(){
    if(!activeStudy||vaultDocs.length===0){alert("Upload at least one document to the Study Vault first.");return;}
    setAnalysing(true);
    try{
      const vaultContext=vaultDocs.map(d=>`[${d.document_type}] ${d.custom_name}:\n${d.extracted_text?.slice(0,3000)||"No text extracted"}`).join("\n\n---\n\n");
      const missingList=gaps.crit.concat(gaps.major).concat(gaps.minor).map(g=>`${g.a} - ${g.an} (Zone ${g.z})`).join("\n");
      const prompt=`You are a clinical trial TMF expert. Analyse the following study vault documents and the list of missing TMF artifacts. Identify specific gaps, version mismatches, and required documents based on what you can read in the vault documents. Return a JSON array of findings with this structure:\n[{"finding_type":"gap","severity":"Critical","title":"short title","detail":"detailed explanation","source_doc":"which vault doc","artifact_ref":"DIA artifact number"}]\n\nVAULT DOCUMENTS:\n${vaultContext}\n\nMISSING TMF ARTIFACTS:\n${missingList}\n\nFILED DOCUMENTS:\n${docs.filter(d=>d.status==="Approved").map(d=>`${d.artifact_num} - ${d.artifact_name} v${d.version||"?"}`).join("\n")}\n\nReturn ONLY the JSON array, no other text.`;
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,context:"You are a TMF analysis engine. Return only valid JSON."})});
      const data=await res.json();
      let newFindings:any[]=[];
      try{const raw=data.response?.replace(/```json|```/g,"").trim();newFindings=JSON.parse(raw);}catch{newFindings=[];}
      if(newFindings.length>0){
        const toInsert=newFindings.map((f:any)=>({...f,org_id:orgId,study_id:activeStudy.study_id,status:"Open"}));
        const{data:saved}=await supabase.from("trinity_findings").insert(toInsert).select();
        if(saved)setFindings(prev=>[...saved,...prev]);
      }
      setPanel("findings");
    }catch(e){alert("Analysis failed. Please try again.");}
    setAnalysing(false);
  }

  async function resolveFinding(id:string){
    await supabase.from("trinity_findings").update({status:"Resolved",resolved_at:new Date().toISOString(),resolved_by:user?.email}).eq("id",id);
    setFindings(prev=>prev.map(f=>f.id===id?{...f,status:"Resolved"}:f));
  }

  async function generateBriefing(){
    if(!activeStudy)return;
    setBriefingLoading(true);
    const vaultContext=vaultDocs.slice(0,3).map(d=>`[${d.document_type}]: ${d.extracted_text?.slice(0,1000)||""}`).join("\n\n");
    const prompt=`Generate a daily TMF briefing for study ${activeStudy.study_id}. Return JSON:\n{"summary":"2 sentence overview","priority_actions":[{"action":"string","reason":"string","urgency":"High"}],"stats":{"completeness":${donePct},"missing":${missing},"pending":${pending},"expiring":${expiring},"ri":${ri}},"vault_insight":"one insight from vault if available"}\n\nVAULT:\n${vaultContext}\n\nReturn ONLY valid JSON.`;
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,context:"Return only valid JSON."})});
      const data=await res.json();
      const raw=data.response?.replace(/```json|```/g,"").trim();
      setBriefing(JSON.parse(raw));
    }catch{setBriefing(null);}
    setBriefingLoading(false);
  }

  useEffect(()=>{if(panel==="briefing"&&!briefing&&activeStudy)generateBriefing();},[panel,activeStudy]);

  function buildVaultContext(){
    if(vaultDocs.length===0)return"No vault documents uploaded for this study.";
    return vaultDocs.map(d=>`[${d.document_type} - ${d.custom_name}]:\n${d.extracted_text?.slice(0,2000)||"No text extracted"}`).join("\n\n---\n\n");
  }

  function detectFlagReason(doc:any){
    if(!doc.version||doc.version.trim()==="")return"Missing version — no version number is on file for this document.";
    if(doc.expiry_date&&new Date(doc.expiry_date)<new Date())return`Document expired — expired on ${doc.expiry_date}.`;
    return`Version mismatch — document version ${doc.version} does not match the current tracked version.`;
  }

  function padZone(z:string){return z.padStart(2,"0");}
  function formatSection(s:string){const p=(s||"").split(".");if(p.length<2)return s||"00.00";return`${p[0].padStart(2,"0")}.${p[1]}`;}

  function presentClassification(){
    if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Select a study first."}]);return;}
    const pendingDoc=docs.find(d=>d.status==="Under Review");
    if(!pendingDoc){setChatMessages(prev=>[...prev,{role:"ai",text:`No documents currently under review in ${activeStudy.study_id}.`}]);return;}
    const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);
    const zoneLine=`Zone ${padZone(pendingDoc.zone)} — Section ${formatSection(art?.s||"")} — ${art?.an||pendingDoc.artifact_name}`;
    const flags:string[]=[];
    if(!pendingDoc.version)flags.push("missing version");
    if(pendingDoc.expiry_date&&new Date(pendingDoc.expiry_date)<new Date())flags.push("expired");
    const warning=flags.length>0?{detail:detectFlagReason(pendingDoc),action:"Request the current version from the site before filing."}:undefined;
    const confidence=flags.length>0?65:88;
    setChatMessages(prev=>{
      const idx=prev.length;
      setChatDocAction({msgIdx:idx,stage:0,disabled:false});
      return[...prev,{role:"ai",text:"I've classified this document and checked it against the version tracker.",classification:{zoneLine,confidence,warning}}];
    });
  }

  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return;
    const userMsg=chatInput.trim();setChatInput("");
    setChatMessages(prev=>[...prev,{role:"user",text:userMsg}]);
    setChatDocAction(null);setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");
    setApproveStage(0);setApproveDocId(null);
    setChatLoading(true);
    const lower=userMsg.toLowerCase();
    if(activeStudy&&/(health|status|readiness|overview)/.test(lower)&&/(tmf|study|trial)/.test(lower)){
      const summary=`${donePct}% complete, with ${missing} core documents outstanding and ${pending} awaiting review. Inspection readiness is ${ri}/100 for ${activeStudy.study_id}.`;
      setChatMessages(prev=>[...prev,{role:"ai",text:summary,isHealthCard:true,sourceTags:["Gap analysis","Inspection readiness","Document tracker"]}]);
      setChatLoading(false);return;
    }
    if(activeStudy&&/why/.test(lower)&&/(flag|reject)/.test(lower)){
      const flaggedDoc=docs.find(d=>d.status==="Draft"&&(d as any).rejection_reason);
      if(flaggedDoc){setChatMessages(prev=>[...prev,{role:"ai",text:`"${flaggedDoc.custom_file_name||flaggedDoc.artifact_name}" was flagged:\n${(flaggedDoc as any).rejection_reason}`,sourceTags:["Document tracker","Audit trail"]}]);}
      else{setChatMessages(prev=>[...prev,{role:"ai",text:`No flagged documents in ${activeStudy.study_id} right now.`}]);}
      setChatLoading(false);return;
    }
    if(activeStudy&&/(review|approve|classify|flag|upload)/.test(lower)&&/(doc|document|file|tracker)/.test(lower)){
      presentClassification();setChatLoading(false);return;
    }
    try{
      const vaultCtx=buildVaultContext();
      const missingList=gaps.crit.concat(gaps.major).concat(gaps.minor).map((g:any)=>`${g.a} - ${g.an} (Zone ${g.z})`).join("\n");
      const studyContext=activeStudy?`Active study: ${activeStudy.study_id} (${activeStudy.protocol||""}). Sponsor: ${activeStudy.sponsor||""}. Phase: ${activeStudy.phase||""}. Status: ${activeStudy.status||""}.\nTMF completeness: ${donePct}%. Inspection readiness: ${ri}/100. Missing core documents (${missing} total):\n${missingList}\nPending review: ${pending}. Expiring within 90 days: ${expiring}.`:"No active study selected.";
      const recentTurns=chatMessages.slice(-6).map(m=>`${m.role==="user"?"User":"Trinity"}: ${m.text}`).join("\n");
      const context=`${studyContext}\n\nSTUDY VAULT DOCUMENTS (use these as primary source of truth):\n${vaultCtx}\n\nRecent conversation:\n${recentTurns}\n\nOnly answer using data for study ${activeStudy?.study_id||""}. Use vault documents as primary reference.`;
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,context})});
      const data=await res.json();
      setChatMessages(prev=>[...prev,{role:"ai",text:data.response||"I couldn't process that request."}]);
    }catch{setChatMessages(prev=>[...prev,{role:"ai",text:"Error connecting. Please try again."}]);}
    setChatLoading(false);
  }

  const openFindings=findings.filter(f=>f.status==="Open");
  const vaultHasProtocol=vaultDocs.some(d=>d.document_type==="Protocol");

  if(loading)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:P.lavender,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"24px",fontWeight:"700",color:P.text}}>TMF<span style={{color:P.primary}}>360</span></div>
        <div style={{fontSize:"12px",color:P.textTert,marginTop:"4px"}}>Loading Trinity...</div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",background:P.bg}}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css"/>
      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .trinity-tab{border:none;background:transparent;cursor:pointer;padding:10px 16px;font-size:12px;font-weight:500;border-bottom:2px solid transparent;transition:all .2s;font-family:inherit;}
        .trinity-tab.active{border-bottom-color:#F97316;color:#F97316;}
        .trinity-tab:not(.active){color:#6B7280;}
        .trinity-tab:not(.active):hover{color:#374151;}
      `}</style>

      <header style={{display:"flex",alignItems:"center",gap:"12px",padding:"0 1.5rem",height:"52px",borderBottom:`0.5px solid ${P.border}`,background:P.bg,flexShrink:0}}>
        <a href="/platform" style={{display:"flex",alignItems:"center",gap:"6px",textDecoration:"none",color:P.textTert,fontSize:"12px"}}>
          <i className="ti ti-arrow-left" style={{fontSize:"14px"}}/>Back to TMF360
        </a>
        <div style={{width:"1px",height:"20px",background:P.border}}/>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"28px",height:"28px",borderRadius:"50%",background:`linear-gradient(135deg,${P.primaryLight},#fff)`,border:`0.5px solid ${P.primaryLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>
          </div>
          <div>
            <div style={{fontSize:"14px",fontWeight:"700",color:P.text}}>Trinity <span style={{color:P.primary}}>AI Specialist</span></div>
            <div style={{fontSize:"10px",color:P.textTert}}>Study-aware · Vault-powered · Real-time</div>
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
          {studies.length>0&&(
            <select value={activeStudy?.study_id||""} onChange={e=>switchStudy(e.target.value)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"5px 10px",background:P.bg,fontFamily:"inherit"}}>
              {studies.map(s=><option key={s.study_id} value={s.study_id}>{s.study_id}</option>)}
            </select>
          )}
          {activeStudy&&<span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",background:P.primaryLight,color:P.primary,fontWeight:"500"}}>{activeStudy.status}</span>}
          <span style={{fontSize:"11px",color:P.textTert}}>{user?.email}</span>
        </div>
      </header>

      <div style={{display:"flex",alignItems:"center",borderBottom:`0.5px solid ${P.border}`,background:P.bg,paddingLeft:"1.5rem",flexShrink:0}}>
        {[
          {id:"chat",label:"Chat",icon:"ti-message-circle"},
          {id:"vault",label:`Study Vault${vaultDocs.length>0?` (${vaultDocs.length})`:""}`,icon:"ti-database"},
          {id:"findings",label:`Findings${openFindings.length>0?` · ${openFindings.length} open`:""}`,icon:"ti-alert-triangle"},
          {id:"briefing",label:"Daily Briefing",icon:"ti-sun"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setPanel(t.id as any)} className={`trinity-tab${panel===t.id?" active":""}`}>
            <i className={`ti ${t.icon}`} style={{fontSize:"13px",marginRight:"5px",verticalAlign:"-1px"}}/>{t.label}
          </button>
        ))}
        <div style={{marginLeft:"auto",paddingRight:"1.5rem",display:"flex",gap:"8px",alignItems:"center"}}>
          {vaultDocs.length>0&&(
            <button onClick={runVaultAnalysis} disabled={analysing} style={{fontSize:"11px",padding:"5px 14px",background:P.purple,color:"#fff",border:"none",borderRadius:"8px",cursor:analysing?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:"6px",opacity:analysing?0.7:1}}>
              {analysing?<i className="ti ti-loader" style={{fontSize:"13px",animation:"spin 1s linear infinite"}}/>:<i className="ti ti-brain" style={{fontSize:"13px"}}/>}
              {analysing?"Analysing...":"Run Analysis"}
            </button>
          )}
        </div>
      </div>

      {panel==="chat"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"8px 1.5rem",display:"flex",gap:"6px",flexWrap:"wrap",borderBottom:`0.5px solid ${P.border}`,background:P.bgSec,flexShrink:0}}>
            {["What's my TMF health?","What is the primary endpoint of this study?","What documents are missing from Zone 3?","Summarise the Protocol","What sites are in this trial?","Review a pending document"].map(q=>(
              <button key={q} onClick={()=>setChatInput(q)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"20px",padding:"4px 12px",color:P.textSec,background:P.bg,cursor:"pointer",whiteSpace:"nowrap"}}>{q}</button>
            ))}
            {!vaultHasProtocol&&<span style={{fontSize:"11px",padding:"4px 12px",borderRadius:"20px",background:"#FFFBEB",color:"#92400E",border:"0.5px solid #FDE68A"}}>Upload Protocol to vault for full insights</span>}
          </div>

          <div style={{flex:1,overflowY:"auto",background:`linear-gradient(135deg,${P.lavender} 0%,#F5F6FC 45%,${P.bg} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0 8px"}}>
            <div style={{width:"100%",maxWidth:"800px",padding:"0 24px",display:"flex",flexDirection:"column",gap:"16px"}}>
              {chatMessages.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:"10px",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  {m.role==="ai"&&(
                    <span style={{width:"28px",height:"28px",borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${P.primaryLight},#fff)`,border:`0.5px solid ${P.primaryLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,marginTop:"2px"}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>
                    </span>
                  )}
                  <div style={{maxWidth:"78%",display:"flex",flexDirection:"column",gap:"6px"}}>
                    {m.role==="ai"&&<div style={{fontSize:"10px",color:P.textTert,fontWeight:"600",paddingLeft:"2px"}}>Trinity</div>}
                    {m.text&&!m.text.startsWith("__FILED__")&&(
                      <div style={{fontSize:"13px",borderRadius:m.role==="ai"?"10px 10px 10px 4px":"10px 10px 4px 10px",padding:"10px 14px",lineHeight:"1.65",whiteSpace:"pre-wrap",background:m.role==="ai"?P.bg:P.bgTert,border:m.role==="ai"?`0.5px solid ${P.border}`:"none",color:P.text}}>{m.text}</div>
                    )}
                    {m.text?.startsWith("__FILED__")&&(
                      <div style={{display:"flex",alignItems:"flex-start",gap:"9px",border:"0.5px solid #bfe6d4",background:P.successLight,borderRadius:"10px",padding:"11px 14px"}}>
                        <span style={{color:P.success,flexShrink:0}}><i className="ti ti-circle-check" style={{fontSize:"16px"}}/></span>
                        <div>
                          <div style={{fontSize:"12px",fontWeight:"600",color:"#0a6b4f"}}>{m.text.replace("__FILED__","").split("\n")[0]}</div>
                          <div style={{fontSize:"11px",color:"#0a6b4f",opacity:.85}}>{m.text.replace("__FILED__","").split("\n")[1]}</div>
                        </div>
                      </div>
                    )}
                    {m.isHealthCard&&activeStudy&&(
                      <>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                          {[{val:`${donePct}%`,label:"TMF completeness",color:P.blue},{val:missing,label:"Missing documents",color:P.danger},{val:`${ri}/100`,label:"Readiness score",color:ri>=80?P.success:ri>=50?P.primary:P.danger}].map((s,si)=>(
                            <div key={si} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"10px 12px"}}>
                              <div style={{fontSize:"18px",fontWeight:"700",color:s.color}}>{s.val}</div>
                              <div style={{fontSize:"10px",color:P.textSec,marginTop:"2px"}}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        {m.sourceTags&&<div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>{m.sourceTags.map((t,ti)=><span key={ti} style={{fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:P.bgTert,color:P.textTert}}>{t}</span>)}</div>}
                      </>
                    )}
                    {m.classification&&(
                      <>
                        <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px 14px",background:P.bg}}>
                          <div style={{fontSize:"13px",fontWeight:"600",color:P.text,marginBottom:"4px"}}>{m.classification.zoneLine}</div>
                          <span style={{fontSize:"10px",fontWeight:"600",padding:"2px 9px",borderRadius:"20px",background:m.classification.confidence>=80?P.successLight:P.warningLight,color:m.classification.confidence>=80?P.success:P.warning}}>Confidence {m.classification.confidence}%</span>
                        </div>
                        {m.classification.warning&&(
                          <div style={{border:"0.5px solid #f3d9a6",background:P.warningLight,borderRadius:"10px",padding:"11px 14px"}}>
                            <div style={{fontSize:"11px",fontWeight:"600",color:P.warning,marginBottom:"4px"}}>⚠️ Version mismatch detected</div>
                            <div style={{fontSize:"11px",color:"#7a5205",lineHeight:"1.55"}}>{m.classification.warning.detail}</div>
                            <div style={{fontSize:"11px",color:"#7a5205",background:"#fff",border:"0.5px solid #f3d9a6",borderRadius:"7px",padding:"7px 10px",marginTop:"6px"}}>Suggested action: {m.classification.warning.action}</div>
                          </div>
                        )}
                      </>
                    )}
                    {chatDocAction?.msgIdx===i&&!chatDocAction.disabled&&(
                      <div style={{display:"flex",gap:"8px"}}>
                        <button onClick={()=>{
                          const pendingDoc=docs.find(d=>d.status==="Under Review");
                          if(!pendingDoc)return;
                          const zoneInfo=activeZONES.find(z=>z.z===pendingDoc.zone);
                          setApproveDocId(pendingDoc.id||null);setApproveStage(1);
                          setChatMessages(prev=>[...prev,{role:"ai",text:`Zone ${padZone(pendingDoc.zone)} - ${zoneInfo?.zn||"Unclassified zone"}\nConfirm this is the correct zone for filing.`}]);
                          setChatDocAction(prev=>prev?{...prev,disabled:true}:null);
                        }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Approve</button>
                        <button onClick={()=>{
                          const pendingDoc=docs.find(d=>d.status==="Under Review");
                          if(!pendingDoc)return;
                          setFlagDocId(pendingDoc.id||null);setFlagReason(detectFlagReason(pendingDoc));setFlagStage("form");setFlagMsgIdx(i);
                          setChatMessages(prev=>[...prev,{role:"ai",text:"Flag initiated. Review the detected reason below and add context before submitting."}]);
                          setChatDocAction(prev=>prev?{...prev,disabled:true}:null);
                        }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Flag</button>
                      </div>
                    )}
                    {approveStage===1&&i===chatMessages.length-1&&m.text.startsWith("Zone ")&&(
                      <button onClick={async()=>{
                        const pendingDoc=docs.find(d=>d.id===approveDocId);
                        if(!pendingDoc)return;
                        const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);
                        setApproveStage(2);
                        setChatMessages(prev=>[...prev,{role:"ai",text:`Artifact - ${art?.an||pendingDoc.artifact_name}\nConfirm this is the correct artifact type.`}]);
                      }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start"}}>Approve Zone</button>
                    )}
                    {approveStage===2&&i===chatMessages.length-1&&m.text.startsWith("Artifact -")&&(
                      <button onClick={async()=>{
                        const pendingDoc=docs.find(d=>d.id===approveDocId);
                        if(!pendingDoc)return;
                        const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);
                        const now=new Date().toISOString();
                        const{error}=await supabase.from("documents").update({status:"Approved",approved_by:user?.email,approved_at:now,signature_reason:"Approved via Trinity AI"}).eq("id",pendingDoc.id);
                        if(!error){
                          await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document approved via Trinity",document_id:pendingDoc.id,study_id:pendingDoc.study_id,field_changed:"status",old_value:pendingDoc.status,new_value:"Approved",signature_reason:"Approved via Trinity AI",document_name:pendingDoc.custom_file_name||pendingDoc.artifact_name}]);
                          setDocs(prev=>prev.map(d=>d.id===pendingDoc.id?{...d,status:"Approved",approved_by:user?.email,approved_at:now}:d));
                          setChatMessages(prev=>[...prev,{role:"ai",text:`__FILED__Filed to Zone ${padZone(pendingDoc.zone)} — Section ${formatSection(art?.s||"")}\nAudit trail entry recorded.`},{role:"ai",text:"Document successfully filed."}]);
                        }
                        setApproveStage(0);setApproveDocId(null);
                      }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start"}}>Approve & File</button>
                    )}
                    {flagStage==="form"&&i===chatMessages.length-1&&m.text.includes("Flag initiated")&&(
                      <div style={{background:P.dangerLight,border:"0.5px solid #f3c9c7",borderRadius:"10px",padding:"12px 14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div>
                          <div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase",letterSpacing:".03em"}}>Auto-detected reason</div>
                          <div style={{fontSize:"12px",background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",color:P.textSec}}>{flagReason}</div>
                        </div>
                        <div>
                          <div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase",letterSpacing:".03em"}}>Your comment</div>
                          <textarea value={flagComment} onChange={e=>setFlagComment(e.target.value)} rows={2} placeholder="Add context for the reviewer..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",resize:"vertical",background:"#fff",fontFamily:"inherit"}}/>
                        </div>
                        <button disabled={!flagComment.trim()} onClick={async()=>{
                          if(!flagDocId)return;
                          const doc=docs.find(d=>d.id===flagDocId);
                          if(!doc)return;
                          const now=new Date().toISOString();
                          const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:flagReason,rejected_by:user?.email,rejected_at:now}).eq("id",doc.id);
                          if(!error){
                            await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document flagged via Trinity",document_id:doc.id,study_id:doc.study_id,field_changed:"status",old_value:doc.status,new_value:"Draft",signature_reason:flagReason,document_name:doc.custom_file_name||doc.artifact_name}]);
                            setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,status:"Draft",rejection_reason:flagReason} as any:d));
                          }
                          setChatMessages(prev=>[...prev,{role:"ai",text:`Document flagged and moved to Draft.\nReason: ${flagReason}\nComment: ${flagComment}`}]);
                          setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");
                        }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:flagComment.trim()?"pointer":"not-allowed",alignSelf:"flex-start",opacity:flagComment.trim()?1:0.5}}>Submit Flag</button>
                      </div>
                    )}
                    {(m as any).classStage==="zone"&&(m as any).pendingClassification&&(
                      <div style={{display:"flex",gap:"8px"}}>
                        <button onClick={()=>{const cl=(m as any).pendingClassification;setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:`Zone ${cl.zone_num} - ${cl.zone_name} approved.\n\n📄 ${cl.artifact_num} - ${cl.artifact_name}\n\n${cl.issues?.length>0?"⚠️ Issues:\n"+cl.issues.join("\n"):""}\n\nApprove this artifact?`,pendingClassification:cl,classStage:"artifact"} as any]);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✓ Approve Zone</button>
                        <button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Zone rejected. Which zone should this document be filed under?"}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✗ Reject</button>
                      </div>
                    )}
                    {(m as any).classStage==="artifact"&&(m as any).pendingClassification&&(
                      <div style={{display:"flex",gap:"8px"}}>
                        <button onClick={async()=>{
                          const cl=(m as any).pendingClassification;
                          setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));
                          setChatLoading(true);
                          try{
                            const byteString=atob(cl.base64);const ab=new ArrayBuffer(byteString.length);const ia=new Uint8Array(ab);for(let j=0;j<byteString.length;j++)ia[j]=byteString.charCodeAt(j);
                            const blob=new Blob([ab],{type:"application/pdf"});
                            const filePath=`${user?.id}/${activeStudy?.study_id}/${Date.now()}_${cl.fileName}`;
                            const{error:upErr}=await supabase.storage.from("Documents").upload(filePath,blob);
                            if(upErr)throw new Error(upErr.message);
                            const hasIssues=(cl.issues?.length>0||cl.missing_fields?.length>0);
                            const docStatus=hasIssues?"Draft":"Under Review";
                            const rejReason=hasIssues?[...(cl.issues||[]),...(cl.missing_fields?.map((f:string)=>"Missing: "+f)||[])].join("; "):undefined;
                            const{data:docData,error:docErr}=await supabase.from("documents").insert([{study_id:activeStudy?.study_id,user_id:user?.id,org_id:orgId,artifact_num:cl.artifact_num,artifact_name:cl.artifact_name,zone:cl.zone_num,version:"",status:docStatus,owner:userFullName||user?.email,file_path:filePath,file_name:cl.fileName,custom_file_name:cl.fileName,file_type:"application/pdf",file_size:0,comments:"Auto-classified by Trinity AI. Confidence: "+cl.confidence+"%",rejection_reason:rejReason||null}]).select();
                            if(docErr)throw new Error(docErr.message);
                            setDocs(prev=>[docData[0],...prev]);
                            await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document auto-classified by Trinity",document_id:docData[0].id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"",new_value:docStatus,signature_reason:"Trinity AI classification",document_name:cl.fileName}]);
                            setChatMessages(prev=>[...prev,{role:"ai",text:hasIssues?`⚠️ Filed to Draft due to issues:\n${rejReason}`:`✅ Filed to Zone ${cl.zone_num} — ${cl.artifact_name}\nStatus: Under Review.`}]);
                          }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Filing error: "+err.message}]);}
                          setChatLoading(false);
                        }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✓ Approve & File</button>
                        <button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Artifact rejected. Which artifact should this be filed under?"}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✗ Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading&&(
                <div style={{display:"flex",gap:"10px"}}>
                  <span style={{width:"28px",height:"28px",borderRadius:"50%",background:`linear-gradient(135deg,${P.primaryLight},#fff)`,border:`0.5px solid ${P.primaryLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,flexShrink:0}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/></svg>
                  </span>
                  <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",display:"flex",gap:"4px",alignItems:"center"}}>
                    {[0,1,2].map(i=><span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:P.textTert,display:"inline-block",animation:"bounce 0.9s infinite",animationDelay:`${i*0.15}s`}}/>)}
                  </div>
                </div>
              )}
              <div ref={messagesEnd}/>
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"center",padding:"14px 0 18px",background:`linear-gradient(135deg,${P.lavender} 0%,#F5F6FC 45%,${P.bg} 100%)`,flexShrink:0}}>
            <input ref={chatFileInput} type="file" accept=".pdf" style={{display:"none"}} onChange={async(e)=>{
              const file=e.target.files?.[0];
              if(!file)return;
              if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Select a study first before uploading a document."}]);return;}
              setChatMessages(prev=>[...prev,{role:"user",text:`Uploaded: ${file.name}`}]);
              setChatLoading(true);
              const reader=new FileReader();
              reader.onload=async(ev)=>{
                const base64=((ev.target?.result as string)||"").split(",")[1];
                setChatMessages(prev=>[...prev,{role:"ai",text:"Reading your document... I'll analyse the content and suggest the correct TMF zone and artifact."}]);
                try{
                  const res=await fetch("/api/classify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:file.name,activeZONES,activeTMF})});
                  const data=await res.json();
                  if(data.error){setChatMessages(prev=>[...prev,{role:"ai",text:"Could not classify: "+data.error}]);setChatLoading(false);return;}
                  setChatMessages(prev=>[...prev,{role:"ai",text:`I've analysed your document.\n\n${data.reasoning}\n\nSuggested Zone:\n📁 Zone ${data.zone_num} - ${data.zone_name}\n\nConfidence: ${data.confidence}%\n\nApprove this zone?`,pendingClassification:{...data,base64,fileName:file.name},classStage:"zone"} as any]);
                }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Classification error: "+err.message}]);}
                setChatLoading(false);
              };
              reader.readAsDataURL(file);
              if(chatFileInput.current)chatFileInput.current.value="";
            }}/>
            <div style={{width:"100%",maxWidth:"800px",margin:"0 24px",display:"flex",alignItems:"center",gap:"8px",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"26px",padding:"6px 8px 6px 14px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <button onClick={()=>chatFileInput.current?.click()} style={{width:"32px",height:"32px",borderRadius:"50%",border:"none",background:"transparent",color:P.textTert,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>
              </button>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask Trinity anything about this study..." style={{flex:1,border:"none",outline:"none",fontSize:"13px",background:"transparent",color:P.text,padding:"8px 2px"}}/>
              <button onClick={sendChat} disabled={chatLoading} style={{width:"32px",height:"32px",borderRadius:"50%",flexShrink:0,background:chatLoading?P.bgTert:P.primary,border:"none",color:chatLoading?P.textTert:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:chatLoading?"not-allowed":"pointer"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {panel==="vault"&&(
        <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
          <div style={{maxWidth:"800px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
            <div>
              <h2 style={{fontSize:"16px",fontWeight:"700",color:P.text}}>Study Vault</h2>
              <p style={{fontSize:"12px",color:P.textTert,marginTop:"3px"}}>Upload key study documents. Trinity reads these to understand your trial and give study-specific insights.</p>
            </div>
            <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"10px",padding:"12px 16px",fontSize:"11px",color:"#1E40AF"}}>
              <strong>Recommended uploads:</strong> Protocol (most important), Investigator's Brochure, Statistical Analysis Plan, Monitoring Plan, IRB Decision.
            </div>
            <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
              <h3 style={{fontSize:"13px",fontWeight:"600",marginBottom:"14px"}}>Upload to Vault</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
                <div>
                  <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Document type</label>
                  <select value={vaultDocType} onChange={e=>setVaultDocType(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",fontFamily:"inherit"}}>
                    {VAULT_DOC_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Custom name (optional)</label>
                  <input value={vaultCustomName} onChange={e=>setVaultCustomName(e.target.value)} placeholder="e.g. Protocol v2.1 Final" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}/>
                </div>
              </div>
              <div onClick={()=>vaultFileInput.current?.click()} style={{border:`1.5px dashed ${vaultFile?P.primary:P.border}`,borderRadius:"10px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:vaultFile?P.primaryLight:P.bgSec,marginBottom:"12px"}} onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)setVaultFile(f);}}>
                <input ref={vaultFileInput} type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setVaultFile(f);}}/>
                {vaultFile?(
                  <div><div style={{fontSize:"24px",marginBottom:"6px"}}>📄</div><div style={{fontSize:"13px",fontWeight:"500",color:P.primary}}>{vaultFile.name}</div><div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>{(vaultFile.size/1024).toFixed(0)} KB</div></div>
                ):(
                  <div><div style={{fontSize:"24px",marginBottom:"6px"}}>📁</div><div style={{fontSize:"13px",color:P.textSec}}>Drop a PDF here or click to browse</div><div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Supports PDF, DOC, DOCX</div></div>
                )}
              </div>
              {vaultProgress&&<div style={{fontSize:"11px",padding:"8px 12px",borderRadius:"8px",background:vaultProgress.includes("Done")?P.successLight:P.primaryLight,color:vaultProgress.includes("Done")?P.success:P.primary,marginBottom:"10px"}}>{vaultProgress}</div>}
              <button onClick={uploadVaultDoc} disabled={!vaultFile||vaultUploading} style={{fontSize:"12px",fontWeight:"600",padding:"10px 20px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:vaultFile&&!vaultUploading?"pointer":"not-allowed",opacity:vaultFile&&!vaultUploading?1:0.5}}>
                {vaultUploading?"Processing...":"Upload to Vault"}
              </button>
            </div>
            {vaultDocs.length===0?(
              <div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bgSec,borderRadius:"12px",border:`0.5px solid ${P.border}`}}>
                <div style={{fontSize:"32px",marginBottom:"8px"}}>📂</div>
                <div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>Vault is empty</div>
                <div style={{fontSize:"12px",marginTop:"4px"}}>Upload your Protocol first — Trinity will use it as the primary source of truth.</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                <h3 style={{fontSize:"13px",fontWeight:"600"}}>Vault Documents ({vaultDocs.length})</h3>
                {vaultDocs.map(d=>(
                  <div key={d.id} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
                    <div style={{width:"40px",height:"40px",borderRadius:"10px",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>📄</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{d.custom_name||d.file_name}</div>
                      <div style={{display:"flex",gap:"8px",marginTop:"3px",alignItems:"center"}}>
                        <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.purpleLight,color:P.purple,fontWeight:"500"}}>{d.document_type}</span>
                        <span style={{fontSize:"10px",color:P.textTert}}>{d.file_size?(d.file_size/1024).toFixed(0)+"KB":""}</span>
                        <span style={{fontSize:"10px",color:P.textTert}}>{new Date(d.uploaded_at).toLocaleDateString()}</span>
                        {d.extracted_text?<span style={{fontSize:"10px",color:P.success}}>✓ Text extracted ({d.extracted_text.length} chars)</span>:<span style={{fontSize:"10px",color:P.warning}}>⚠ No text extracted</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:"6px"}}>
                      <a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>View</a>
                      <button onClick={()=>deleteVaultDoc(d.id)} style={{fontSize:"11px",padding:"5px 12px",background:P.dangerLight,color:P.danger,border:"none",borderRadius:"6px",cursor:"pointer"}}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {panel==="findings"&&(
        <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
          <div style={{maxWidth:"900px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <h2 style={{fontSize:"16px",fontWeight:"700",color:P.text}}>Trinity Findings</h2>
                <p style={{fontSize:"12px",color:P.textTert,marginTop:"3px"}}>Auto-generated from vault document analysis.</p>
              </div>
              <button onClick={runVaultAnalysis} disabled={analysing||vaultDocs.length===0} style={{fontSize:"12px",padding:"8px 16px",background:P.purple,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",opacity:analysing||vaultDocs.length===0?0.5:1}}>
                {analysing?<i className="ti ti-loader" style={{fontSize:"13px",animation:"spin 1s linear infinite"}}/>:<i className="ti ti-brain" style={{fontSize:"13px"}}/>}
                {analysing?"Analysing...":"Re-run Analysis"}
              </button>
            </div>
            {vaultDocs.length===0&&<div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"12px 16px",fontSize:"11px",color:"#92400E"}}>Upload documents to the Study Vault first, then run analysis to generate findings.</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
              {[{label:"Critical",color:P.danger,bg:P.dangerLight,count:findings.filter(f=>f.severity==="Critical"&&f.status==="Open").length},{label:"Major",color:P.warning,bg:P.warningLight,count:findings.filter(f=>f.severity==="Major"&&f.status==="Open").length},{label:"Minor",color:P.blue,bg:P.blueLight,count:findings.filter(f=>f.severity==="Minor"&&f.status==="Open").length}].map((s,i)=>(
                <div key={i} style={{background:s.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px"}}>
                  <div style={{fontSize:"26px",fontWeight:"700",color:s.color}}>{s.count}</div>
                  <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{s.label} open findings</div>
                </div>
              ))}
            </div>
            {findings.length===0?(
              <div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bgSec,borderRadius:"12px",border:`0.5px solid ${P.border}`}}>
                <div style={{fontSize:"32px",marginBottom:"8px"}}>🔍</div>
                <div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>No findings yet</div>
                <div style={{fontSize:"12px",marginTop:"4px"}}>Upload vault documents and run analysis to generate study-specific findings.</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {["Critical","Major","Minor"].map(sev=>{
                  const sevFindings=findings.filter(f=>f.severity===sev);
                  if(!sevFindings.length)return null;
                  return(
                    <div key={sev}>
                      <h3 style={{fontSize:"11px",fontWeight:"600",color:SEVERITY_COLOR(sev),textTransform:"uppercase",letterSpacing:".06em",marginBottom:"6px"}}>{sev} — {sevFindings.filter(f=>f.status==="Open").length} open</h3>
                      {sevFindings.map(f=>(
                        <div key={f.id} style={{background:P.bg,border:`0.5px solid ${f.status==="Open"?SEVERITY_COLOR(f.severity):P.border}`,borderRadius:"10px",padding:"14px 16px",marginBottom:"6px",display:"flex",gap:"12px",alignItems:"flex-start",opacity:f.status==="Resolved"?0.6:1}}>
                          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:f.status==="Resolved"?P.textMuted:SEVERITY_COLOR(f.severity),flexShrink:0,marginTop:"5px"}}/>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}>
                              <span style={{fontSize:"13px",fontWeight:"600",color:P.text}}>{f.title}</span>
                              <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:SEVERITY_BG(f.severity),color:SEVERITY_COLOR(f.severity),fontWeight:"500"}}>{f.severity}</span>
                              <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:f.status==="Resolved"?P.successLight:P.bgTert,color:f.status==="Resolved"?P.success:P.textTert}}>{f.status}</span>
                            </div>
                            <div style={{fontSize:"12px",color:P.textSec,lineHeight:"1.6",marginBottom:"6px"}}>{f.detail}</div>
                            <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                              {f.source_doc&&<span style={{fontSize:"10px",color:P.textTert}}>Source: {f.source_doc}</span>}
                              {f.artifact_ref&&<span style={{fontSize:"10px",fontFamily:"monospace",color:P.blue}}>Artifact: {f.artifact_ref}</span>}
                              <span style={{fontSize:"10px",color:P.textTert}}>{new Date(f.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {f.status==="Open"&&<button onClick={()=>resolveFinding(f.id)} style={{fontSize:"11px",padding:"5px 12px",background:P.successLight,color:P.success,border:`0.5px solid #A7F3D0`,borderRadius:"6px",cursor:"pointer",flexShrink:0}}>Resolve</button>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {panel==="briefing"&&(
        <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
          <div style={{maxWidth:"800px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <h2 style={{fontSize:"16px",fontWeight:"700",color:P.text}}>Daily Briefing</h2>
                <p style={{fontSize:"12px",color:P.textTert,marginTop:"3px"}}>{activeStudy?.study_id} · {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
              </div>
              <button onClick={generateBriefing} disabled={briefingLoading} style={{fontSize:"12px",padding:"8px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",opacity:briefingLoading?0.6:1}}>
                {briefingLoading?<i className="ti ti-loader" style={{fontSize:"13px",animation:"spin 1s linear infinite"}}/>:<i className="ti ti-refresh" style={{fontSize:"13px"}}/>}
                {briefingLoading?"Generating...":"Refresh"}
              </button>
            </div>
            {briefingLoading&&!briefing&&<div style={{textAlign:"center",padding:"3rem",color:P.textTert}}><div style={{fontSize:"13px"}}>Trinity is generating your briefing...</div></div>}
            {briefing&&(
              <>
                <div style={{background:"linear-gradient(135deg,#0F1E3D 0%,#1E3A5F 100%)",borderRadius:"14px",padding:"20px 24px",color:"#fff"}}>
                  <div style={{fontSize:"11px",fontWeight:"600",color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"8px"}}>Morning Summary</div>
                  <div style={{fontSize:"14px",lineHeight:"1.7",color:"rgba(255,255,255,0.9)"}}>{briefing.summary}</div>
                  {briefing.vault_insight&&<div style={{marginTop:"12px",padding:"10px 14px",background:"rgba(249,115,22,0.2)",borderRadius:"8px",fontSize:"12px",color:"rgba(255,255,255,0.85)",borderLeft:"3px solid #F97316"}}><strong>From your vault:</strong> {briefing.vault_insight}</div>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"10px"}}>
                  {[{val:`${briefing.stats?.completeness||donePct}%`,label:"Completeness",color:P.blue},{val:briefing.stats?.missing||missing,label:"Missing",color:P.danger},{val:briefing.stats?.pending||pending,label:"Pending review",color:P.warning},{val:briefing.stats?.expiring||expiring,label:"Expiring (90d)",color:P.warning},{val:`${briefing.stats?.ri||ri}/100`,label:"Readiness",color:ri>=80?P.success:ri>=50?P.primary:P.danger}].map((s,i)=>(
                    <div key={i} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px",textAlign:"center"}}>
                      <div style={{fontSize:"22px",fontWeight:"700",color:s.color}}>{s.val}</div>
                      <div style={{fontSize:"10px",color:P.textSec,marginTop:"3px"}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {briefing.priority_actions?.length>0&&(
                  <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px 20px"}}>
                    <h3 style={{fontSize:"13px",fontWeight:"600",marginBottom:"12px"}}>Priority Actions</h3>
                    <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                      {briefing.priority_actions.map((a:any,i:number)=>{
                        const urg=a.urgency==="High"?{bg:P.dangerLight,color:P.danger,border:"#FECACA"}:a.urgency==="Medium"?{bg:P.warningLight,color:P.warning,border:"#FDE68A"}:{bg:P.blueLight,color:P.blue,border:"#BFDBFE"};
                        return(
                          <div key={i} style={{display:"flex",gap:"10px",padding:"10px 12px",background:urg.bg,borderRadius:"8px",border:`0.5px solid ${urg.border}`}}>
                            <span style={{fontSize:"14px",flexShrink:0}}>{a.urgency==="High"?"🔴":a.urgency==="Medium"?"🟡":"🔵"}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:"12px",fontWeight:"600",color:P.text}}>{a.action}</div>
                              <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{a.reason}</div>
                            </div>
                            <span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"20px",background:"rgba(255,255,255,0.7)",color:urg.color,fontWeight:"600",flexShrink:0,alignSelf:"flex-start"}}>{a.urgency}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{textAlign:"center",fontSize:"11px",color:P.textTert}}>
                  Briefing generated by Trinity at {new Date().toLocaleTimeString()} · Based on live TMF data{vaultDocs.length>0?` + ${vaultDocs.length} vault document${vaultDocs.length!==1?"s":""}`:""} 
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}