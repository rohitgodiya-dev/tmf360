"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

const TMF = [
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.04",an:"List of SOPs Current During Trial",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.08",an:"Monitoring Plan",cl:"Core",iso:"6.7, 7.3, 9.2.4.1"},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.01",an:"Delegation of Authority Log",cl:"Core",iso:"6.2, 9.2"},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.02",an:"Staff CVs and Training Records",cl:"Core",iso:"6.2"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Agreements",a:"01.03.01",an:"CRO Agreement",cl:"Core",iso:"6.1"},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Monitoring",a:"01.04.01",an:"Monitoring Visit Report",cl:"Core",iso:"9.2.4"},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"Risk Management",a:"01.05.01",an:"Risk Assessment",cl:"Core",iso:"9.1"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Protocol",a:"02.01.01",an:"Protocol",cl:"Core",iso:"7.2, Annex A"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Protocol",a:"02.01.02",an:"Protocol Amendment",cl:"Core",iso:"7.2.10"},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Informed Consent",a:"02.02.01",an:"Informed Consent Form (Master)",cl:"Core",iso:"7.4, 4.1"},
  {z:"2",zn:"Central Trial Documents",s:"2.03",sn:"Device Description",a:"02.03.01",an:"Investigator Brochure / Device Description",cl:"Core",iso:"7.3"},
  {z:"2",zn:"Central Trial Documents",s:"2.04",sn:"CRFs",a:"02.04.01",an:"Case Report Form (Blank)",cl:"Core",iso:"7.8"},
  {z:"2",zn:"Central Trial Documents",s:"2.05",sn:"SAP",a:"02.05.01",an:"Statistical Analysis Plan",cl:"Core",iso:"7.9"},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Regulatory Applications",a:"03.01.01",an:"Regulatory Submission",cl:"Core",iso:"9.3"},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Regulatory Applications",a:"03.01.02",an:"Regulatory Approval / Authorization",cl:"Core",iso:"9.3"},
  {z:"3",zn:"Regulatory",s:"3.02",sn:"Correspondence",a:"03.02.01",an:"Regulatory Correspondence",cl:"Core",iso:"9.3"},
  {z:"3",zn:"Regulatory",s:"3.03",sn:"Progress Reports",a:"03.03.01",an:"Annual / Progress Report to Regulatory Authority",cl:"Core",iso:"9.4"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.01",an:"IRB / IEC Submission",cl:"Core",iso:"9.5"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.02",an:"IRB / IEC Approval",cl:"Core",iso:"4.1.3, 9.5.1"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.03",an:"IRB / IEC Continuing Review",cl:"Core",iso:"9.5.3"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.04",an:"IRB / IEC Correspondence",cl:"Core",iso:"9.5"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.01",an:"Site Selection and Qualification Report",cl:"Core",iso:"6.5, 9.2.1"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.02",an:"Investigator / Site Qualification Questionnaire",cl:"Core",iso:"6.5"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.01",an:"Site Initiation Visit Report",cl:"Core",iso:"9.2.2"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.02",an:"Training Materials",cl:"Core",iso:"9.2.2"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.03",an:"Site Training Records",cl:"Core",iso:"9.2.2"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.01",an:"Investigator Agreement / Signed Protocol",cl:"Core",iso:"6.4, 9.2.3.1"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.02",an:"Principal Investigator CV",cl:"Core",iso:"6.4.1"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.03",an:"Sub-Investigator CVs",cl:"Core",iso:"6.4.1"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.04",an:"Investigator / Staff Delegation Log",cl:"Core",iso:"6.4.2"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.05",an:"Medical Licenses",cl:"Core",iso:"6.4.1"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Facilities",a:"05.04.01",an:"Normal Value Ranges (Lab)",cl:"Core",iso:"7.5.4"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Facilities",a:"05.04.02",an:"Laboratory Certification / Accreditation",cl:"Core",iso:"7.5.4"},
  {z:"5",zn:"Site Management",s:"5.05",sn:"Clinical Trial Agreement",a:"05.05.01",an:"Clinical Trial Agreement (Site)",cl:"Core",iso:"6.4.4"},
  {z:"5",zn:"Site Management",s:"5.06",sn:"Informed Consent",a:"05.06.01",an:"Signed Informed Consent Forms",cl:"Core",iso:"4.1, 7.4"},
  {z:"5",zn:"Site Management",s:"5.07",sn:"Screening",a:"05.07.01",an:"Screening / Enrollment Log",cl:"Core",iso:"8.3"},
  {z:"5",zn:"Site Management",s:"5.07",sn:"Screening",a:"05.07.02",an:"Subject Identification Code List",cl:"Core",iso:"8.3"},
  {z:"5",zn:"Site Management",s:"5.08",sn:"Protocol Deviations",a:"05.08.01",an:"Protocol Deviation Log",cl:"Core",iso:"8.2.4"},
  {z:"5",zn:"Site Management",s:"5.08",sn:"Protocol Deviations",a:"05.08.02",an:"Protocol Deviation Report",cl:"Core",iso:"8.2.4"},
  {z:"5",zn:"Site Management",s:"5.09",sn:"Site Closure",a:"05.09.01",an:"Site Closure Visit Report",cl:"Core",iso:"9.2.5"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"Investigational Device",a:"06.01.01",an:"Device Accountability Log",cl:"Core",iso:"8.6"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"Investigational Device",a:"06.01.02",an:"Device Shipping and Receipt Records",cl:"Core",iso:"8.6"},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.01",an:"Adverse Event Log",cl:"Core",iso:"8.5"},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.02",an:"Serious Adverse Event Reports (SAE)",cl:"Core",iso:"8.5.4, 8.5.5"},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.03",an:"Device Deficiency Reports",cl:"Core",iso:"8.5.6"},
  {z:"7",zn:"Safety Reporting",s:"7.02",sn:"Safety Reports",a:"07.02.01",an:"UADE / Safety Reports to Regulatory Authority",cl:"Core",iso:"8.5.4"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Lab and Imaging",a:"08.01.01",an:"Central Lab Manual",cl:"Core",iso:"7.5"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Lab and Imaging",a:"08.01.02",an:"Imaging Manual",cl:"Recommended",iso:""},
  {z:"9",zn:"Third Parties",s:"9.01",sn:"Third Party Agreements",a:"09.01.01",an:"Third Party Agreement",cl:"Core",iso:"6.1"},
  {z:"10",zn:"Data Management",s:"10.01",sn:"Data Management Plan",a:"10.01.01",an:"Data Management Plan",cl:"Core",iso:"7.8, 7.9"},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Database",a:"10.02.01",an:"Database Validation Documentation",cl:"Core",iso:"7.8.4"},
  {z:"11",zn:"Statistics",s:"11.01",sn:"Statistical Analysis",a:"11.01.01",an:"Statistical Analysis Plan",cl:"Core",iso:"7.9"},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Analysis Outputs",a:"11.02.01",an:"Statistical Analysis Output",cl:"Core",iso:"7.9"},
];

const ZONES = [...new Set(TMF.map(a=>a.z))].map(z=>({z,zn:TMF.find(a=>a.z===z)!.zn}));
const ZONE_WEIGHT:Record<string,number>={"3":3,"4":3,"5":3,"1":2,"2":2,"7":2,"6":1,"8":1,"9":1,"10":1,"11":1};
const ZONE_COLORS:Record<string,string>={"1":"#8B5CF6","2":"#6366F1","3":"#EF4444","4":"#F59E0B","5":"#10B981","6":"#3B82F6","7":"#EC4899","8":"#06B6D4","9":"#6B7280","10":"#8B5CF6","11":"#6366F1"};

const FILE_ICONS:Record<string,string>={"pdf":"📄","doc":"📝","docx":"📝","xls":"📊","xlsx":"📊","ppt":"📋","pptx":"📋","png":"🖼","jpg":"🖼","jpeg":"🖼","tiff":"🖼","tif":"🖼","gif":"🖼","zip":"🗜","csv":"📊","txt":"📄"};
function fileIcon(n:string){return FILE_ICONS[n.split(".").pop()?.toLowerCase()||""]||"📎";}
function canPreview(n:string){return ["pdf","png","jpg","jpeg","gif","webp","tiff","tif"].includes(n.split(".").pop()?.toLowerCase()||"");}
function formatSize(b:number){if(b<1024)return b+" B";if(b<1024*1024)return (b/1024).toFixed(1)+" KB";return (b/(1024*1024)).toFixed(1)+" MB";}

interface Study{id?:string;study_id:string;protocol:string;phase:string;status:string;sponsor:string;user_id?:string;}
interface Doc{id?:string;study_id:string;artifact_num:string;artifact_name:string;zone:string;version:string;status:string;owner:string;effective_date:string;expiry_date:string;file_path?:string;file_name?:string;custom_file_name?:string;file_type?:string;file_size?:number;comments?:string;user_id?:string;approved_by?:string;approved_at?:string;signature_reason?:string;rejection_reason?:string;rejected_by?:string;rejected_at?:string;appeal_reason?:string;submission_reason?:string;}

export default function TMF360(){
  const [panel,setPanel]=useState("auth");
  const [user,setUser]=useState<any>(null);
  const [currentUserRole,setCurrentUserRole]=useState<string>("");

  const [authMode,setAuthMode]=useState<"login"|"signup">("login");
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [authError,setAuthError]=useState("");
  const [studies,setStudies]=useState<Study[]>([]);

  const [docs,setDocs]=useState<Doc[]>([]);
  const [activeStudy,setActiveStudy]=useState<Study|null>(null);
  const [docFilter,setDocFilter]=useState("all");
  const [docSearch,setDocSearch]=useState("");
  const [artSearch,setArtSearch]=useState("");const [artZone,setArtZone]=useState("");const [artCl,setArtCl]=useState("");
  const [gapZone,setGapZone]=useState("");
  const [expandedArt,setExpandedArt]=useState<string|null>(null);
  const [showStudyModal,setShowStudyModal]=useState(false);
  const [showDocModal,setShowDocModal]=useState(false);
  const [showApproveModal,setShowApproveModal]=useState(false);
  const [showSubmitModal,setShowSubmitModal]=useState(false);
  const [submissionReason,setSubmissionReason]=useState("");
  const [showCommentModal,setShowCommentModal]=useState(false);
  const [selectedDoc,setSelectedDoc]=useState<Doc|null>(null);
  const [previewUrl,setPreviewUrl]=useState<string|null>(null);
  const [previewName,setPreviewName]=useState("");
  const [uploading,setUploading]=useState(false);
  const [uploadProgress,setUploadProgress]=useState("");
  const [dragOver,setDragOver]=useState(false);
  const [chatMessages,setChatMessages]=useState([{role:"ai",text:"Hello! I'm your TMF360 AI Specialist — trained on DIA TMF Reference Model v3.3.1, ISO 14155:2020, ICH E6(R3), and 21 CFR Part 11. Ask me anything about TMF filing, gaps, inspection readiness, or document drafting."}]);
  const [chatInput,setChatInput]=useState("");const [chatLoading,setChatLoading]=useState(false);
  const chatHistory=useRef<{role:string;content:string}[]>([]);
  const messagesEnd=useRef<HTMLDivElement>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);

  // Form state
  const [fId,setFId]=useState("");const [fProtocol,setFProtocol]=useState("");const [fPhase,setFPhase]=useState("Phase I");const [fStatus,setFStatus]=useState("Startup");const [fSponsor,setFSponsor]=useState("");
  const [fZone,setFZone]=useState(TMF[0].z);
  const [fArtifact,setFArtifact]=useState(TMF[0].a+"|"+TMF[0].an+"|"+TMF[0].z);
  const [fCustomName,setFCustomName]=useState("");
  const [fVersion,setFVersion]=useState("");const [fDocStatus,setFDocStatus]=useState("Draft");const [fOwner,setFOwner]=useState("");const [fEff,setFEff]=useState("");const [fExp,setFExp]=useState("");const [fComments,setFComments]=useState("");
  const [selectedFile,setSelectedFile]=useState<File|null>(null);
  const [pendingFilePath,setPendingFilePath]=useState("");
  const [pendingFileName,setPendingFileName]=useState("");
  const [pendingFileType,setPendingFileType]=useState("");
  const [pendingFileSize,setPendingFileSize]=useState(0);

  // Approval modal state
  const [approvePassword,setApprovePassword]=useState("");
  const [approveReason,setApproveReason]=useState("");
  const [approveError,setApproveError]=useState("");

  // Comment modal state
  const [commentText,setCommentText]=useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){setUser(session.user);setPanel("dashboard");loadStudies(session.user.id);loadUserRole(session.user.id);}
    });
    supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user){setUser(session.user);setPanel("dashboard");loadStudies(session.user.id);loadUserRole(session.user.id);}
      else{setUser(null);setPanel("auth");setStudies([]);setDocs([]);setActiveStudy(null);}
    });
  },[]);

  useEffect(()=>{messagesEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMessages]);

  async function loadUserRole(uid:string){
    const{data}=await supabase.from("user_roles").select("role").eq("user_id",uid).single();
    if(data)setCurrentUserRole(data.role);
  }
  async function loadStudies(uid:string){
    const{data}=await supabase.from("studies").select("*").order("created_at",{ascending:false});
    if(data&&data.length>0){setStudies(data);setActiveStudy(data[0]);loadDocs(data[0].study_id,uid);}
  }

  async function loadDocs(studyId:string,uid:string){
    const{data}=await supabase.from("documents").select("*").eq("study_id",studyId).order("created_at",{ascending:false});
    if(data)setDocs(data);
  }

  async function logAudit(action:string,docId:string|undefined,studyId:string,field:string,oldVal:string,newVal:string,sigReason:string=""){
    await supabase.from("audit_trail").insert([{
      user_id:user.id,user_email:user.email,action,document_id:docId,
      study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,
      signature_reason:sigReason,created_at:new Date().toISOString()
    }]);
  }

  async function handleAuth(){
    setAuthError("");
    if(authMode==="signup"){
      const{error}=await supabase.auth.signUp({email,password});
      if(error)setAuthError(error.message);
      else setAuthError("Check your email to confirm your account, then log in.");
    }else{
      const{error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setAuthError(error.message);
    }
  }

  async function handleSignOut(){await supabase.auth.signOut();}

  async function createStudy(){
    if(!fId.trim()||!user)return;
    const s:Study={study_id:fId,protocol:fProtocol,phase:fPhase,status:fStatus,sponsor:fSponsor,user_id:user.id};
    const{data,error}=await supabase.from("studies").insert([s]).select();
    if(!error&&data){const ns=data[0];setStudies(prev=>[ns,...prev]);setActiveStudy(ns);setDocs([]);}
    setShowStudyModal(false);setFId("");setFProtocol("");setFSponsor("");
    setPanel("dashboard");
  }

  async function handleFileUpload(file:File){
    if(!user||!activeStudy)return;
    setUploading(true);setUploadProgress("Uploading...");
    const path=`${user.id}/${activeStudy.study_id}/${Date.now()}_${file.name}`;
    const{error:upErr}=await supabase.storage.from("Documents").upload(path,file);
    if(upErr){setUploadProgress("Upload failed: "+upErr.message);setUploading(false);return;}
    setPendingFilePath(path);setPendingFileName(file.name);setPendingFileType(file.type);setPendingFileSize(file.size);
    setSelectedFile(file);
    if(!fCustomName)setFCustomName(file.name.replace(/\.[^/.]+$/,""));
    setUploadProgress("✓ "+file.name+" ready");
    setUploading(false);
  }

  async function addDocument(){
    if(!user||!activeStudy)return;
    const[artNum,an,zone]=fArtifact.split("|");
    const d:Doc={
      study_id:activeStudy.study_id,user_id:user.id,
      artifact_num:artNum,artifact_name:an,zone,
      version:fVersion,status:fDocStatus,owner:fOwner,
      effective_date:fEff,expiry_date:fExp,comments:fComments,
      file_path:pendingFilePath,file_name:pendingFileName,
      custom_file_name:fCustomName,file_type:pendingFileType,file_size:pendingFileSize,
    };
    const{data,error}=await supabase.from("documents").insert([d]).select();
    if(!error&&data){
      setDocs(prev=>[data[0],...prev]);
      await logAudit("Document uploaded",data[0].id,activeStudy.study_id,"status","",fDocStatus);
      fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"document_uploaded",document_name:fCustomName||pendingFileName||an,artifact_name:an,zone:zone,study_id:activeStudy.study_id,uploaded_by:user.email})});
    }
    setShowDocModal(false);setSelectedFile(null);setPendingFilePath("");setPendingFileName("");setFCustomName("");
    setFVersion("");setFOwner("");setFEff("");setFExp("");setFComments("");
  }

  async function handleApprove(){
    if(!selectedDoc||!user||!activeStudy)return;
    setApproveError("");
    if(!approvePassword){setApproveError("Password required for electronic signature");return;}
    if(!approveReason){setApproveError("Signature reason required (21 CFR Part 11)");return;}
    const{error:authErr}=await supabase.auth.signInWithPassword({email:user.email,password:approvePassword});
    if(authErr){setApproveError("Incorrect password — signature rejected");return;}
    const now=new Date().toISOString();
    const{error}=await supabase.from("documents").update({
      status:"Approved",approved_by:user.email,approved_at:now,signature_reason:approveReason
    }).eq("id",selectedDoc.id);
    if(!error){
      await logAudit("Document approved",selectedDoc.id,activeStudy.study_id,"status",selectedDoc.status||"","Approved",approveReason);
      setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,status:"Approved",approved_by:user.email,approved_at:now,signature_reason:approveReason}:d));
    }
    setShowApproveModal(false);setApprovePassword("");setApproveReason("");setSelectedDoc(null);
  }

  async function handleAddComment(){
    if(!selectedDoc||!user)return;
    const existing=selectedDoc.comments||"";
    const newComment=`${existing}${existing?"\n":""}[${new Date().toLocaleString()} - ${user.email}]: ${commentText}`;
    const{error}=await supabase.from("documents").update({comments:newComment}).eq("id",selectedDoc.id);
    if(!error){
      setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,comments:newComment}:d));
      await logAudit("Comment added",selectedDoc.id,activeStudy?.study_id||"","comments","",commentText);
    }
    setShowCommentModal(false);setCommentText("");setSelectedDoc(null);
  }

  function openPreview(doc:Doc){
    if(!doc.file_path)return;
    const{data}=supabase.storage.from("Documents").getPublicUrl(doc.file_path);
    setPreviewUrl(data.publicUrl);setPreviewName(doc.custom_file_name||doc.file_name||doc.artifact_name);
  }

  const studyDocs=docs;
  const filedNames=studyDocs.map(d=>d.artifact_name.toLowerCase());
  const coreArts=TMF.filter(a=>a.cl==="Core");
  const donePct=activeStudy?Math.round(coreArts.filter(a=>filedNames.some(f=>a.an.toLowerCase().includes(f)||f.includes(a.an.toLowerCase()))).length/coreArts.length*100):0;
  const missing=Math.max(0,coreArts.length-studyDocs.filter(d=>d.status==="Approved").length);
  const expiring=studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).length;
  const pending=studyDocs.filter(d=>["Draft","Under Review"].includes(d.status)).length;

  function zoneComp(z:string){
    const core=TMF.filter(a=>a.cl==="Core"&&a.z===z);
    if(!core.length)return 100;
    const done=core.filter(a=>filedNames.some(f=>a.an.toLowerCase().includes(f)||f.includes(a.an.toLowerCase())));
    return Math.round(done.length/core.length*100);
  }

  function riScore(){let w=0,t=0;ZONES.forEach(({z})=>{const wt=ZONE_WEIGHT[z]||1;w+=zoneComp(z)*wt;t+=100*wt;});return t?Math.round(w/t*100):0;}
  function gapFindings(){
    const gaps:{crit:any[],major:any[],minor:any[]}={crit:[],major:[],minor:[]};
    coreArts.forEach(a=>{
      const found=filedNames.some(f=>a.an.toLowerCase().includes(f)||f.includes(a.an.toLowerCase()));
      if(!found){const e={an:a.an,a:a.a,z:a.z,zn:a.zn,iso:a.iso};
        if(["3","4","5"].includes(a.z))gaps.crit.push(e);
        else if(["1","2","7"].includes(a.z))gaps.major.push(e);
        else gaps.minor.push(e);}
    });
    return gaps;
  }

  const ri=activeStudy?riScore():0;
  const gaps=activeStudy?gapFindings():{crit:[],major:[],minor:[]};
  const scoreColor=(s:number)=>s>=80?"#10B981":s>=60?"#F59E0B":"#EF4444";

  const filteredDocs=studyDocs.filter(d=>{
    if(docFilter!=="all"&&d.status!==docFilter)return false;
    if(docSearch){
      const q=docSearch.toLowerCase();
      return (d.artifact_name+d.zone+d.status+d.owner+(d.custom_file_name||"")+(d.file_name||"")).toLowerCase().includes(q);
    }
    return true;
  });

  const filteredArts=TMF.filter(a=>{
    if(artZone&&a.z!==artZone)return false;
    if(artCl&&a.cl!==artCl)return false;
    if(artSearch&&!(a.an+a.sn+a.zn).toLowerCase().includes(artSearch.toLowerCase()))return false;
    return true;
  });

  const zoneArts=fZone?TMF.filter(a=>a.z===fZone):TMF;

  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return;
    const msg=chatInput.trim();setChatInput("");
    setChatMessages(prev=>[...prev,{role:"user",text:msg}]);
    chatHistory.current.push({role:"user",content:msg});
    setChatLoading(true);
    const ctx=activeStudy?`Active study: ${activeStudy.study_id} (${activeStudy.protocol}), Phase: ${activeStudy.phase}. TMF completeness: ${donePct}%. Readiness: ${ri}. Filed: ${studyDocs.map(d=>d.artifact_name).join(", ")||"none"}.`:"No study selected.";
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-6",max_tokens:1000,
        system:`You are TMF360 AI Specialist — expert in DIA TMF Reference Model v3.3.1, ISO 14155:2020, ICH E6(R3), 21 CFR Part 11, and ALCOA+.\n\nContext: ${ctx}\n\nAlways cite artifact numbers and ISO 14155 sections. Be concise and direct.`,
        messages:chatHistory.current
      })});
      const data=await res.json();
      const reply=data.content?.map((b:any)=>b.text||"").join("")||"Could not get a response.";
      setChatMessages(prev=>[...prev,{role:"ai",text:reply}]);
      chatHistory.current.push({role:"assistant",content:reply});
    }catch{setChatMessages(prev=>[...prev,{role:"ai",text:"Connection error. Please try again."}]);}
    setChatLoading(false);
  }

  // Purple theme colors
  const P={
    primary:"#6366F1",primaryDark:"#4F46E5",primaryLight:"#EEF2FF",
    text:"#111827",textSec:"#6B7280",textTert:"#9CA3AF",
    bg:"#FFFFFF",bgSec:"#F9FAFB",bgTert:"#F3F4F6",
    border:"#E5E7EB",borderSec:"#D1D5DB",
    success:"#10B981",successLight:"#ECFDF5",
    danger:"#EF4444",dangerLight:"#FEF2F2",
    warning:"#F59E0B",warningLight:"#FFFBEB",
    blue:"#3B82F6",blueLight:"#EFF6FF",
  };

  const navItem=(id:string,label:string,icon:string)=>(
    <button onClick={()=>{setPanel(id);if(activeStudy&&user)loadDocs(activeStudy.study_id,user.id);}}
      style={{width:"100%",textAlign:"left",padding:"6px 12px",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",borderRadius:"6px",transition:"all 0.1s",background:panel===id?P.primaryLight:"transparent",color:panel===id?P.primary:P.textSec,fontWeight:panel===id?"500":"400",border:"none",borderLeft:panel===id?`2px solid ${P.primary}`:"2px solid transparent"}}>
      <i className={`ti ${icon}`} aria-hidden="true" style={{fontSize:"14px"}}></i>{label}
    </button>
  );

  const statusBadge=(s:string)=>{
    const styles:Record<string,any>={
      "Approved":{background:P.successLight,color:"#065F46"},"Under Review":{background:P.blueLight,color:"#1E40AF"},
      "Draft":{background:P.warningLight,color:"#92400E"},"Archived":{background:P.bgTert,color:P.textSec},
      "Missing":{background:P.dangerLight,color:"#991B1B"}
    };
    const st=styles[s]||styles["Draft"];
    return <span style={{...st,fontSize:"10px",padding:"2px 8px",borderRadius:"10px",whiteSpace:"nowrap" as const}}>{s}</span>;
  };

  if(panel==="auth")return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg, ${P.primaryLight} 0%, #fff 50%, ${P.primaryLight} 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"380px",boxShadow:"0 4px 24px rgba(99,102,241,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:"24px",fontWeight:"500",color:P.text}}>TMF<span style={{color:P.primary}}>360</span></div>
          <div style={{fontSize:"12px",color:P.textTert,marginTop:"4px"}}>Trial Master File Platform · Free for clinical research</div>
          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>DIA TMF Reference Model v3.3.1 · ISO 14155 · 21 CFR Part 11</div>
        </div>
        <div style={{display:"flex",gap:"6px",marginBottom:"1.25rem"}}>
          {(["login","signup"] as const).map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{flex:1,padding:"7px",fontSize:"12px",borderRadius:"8px",border:`0.5px solid ${m===authMode?P.primary:P.border}`,background:m===authMode?P.primary:"transparent",color:m===authMode?"#fff":P.textSec,cursor:"pointer",fontWeight:m===authMode?"500":"400"}}>
              {m==="login"?"Log in":"Sign up"}
            </button>
          ))}
        </div>
        <div style={{marginBottom:"12px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@organization.com" style={{width:"100%",fontSize:"12px",padding:"8px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}}/></div>
        <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" style={{width:"100%",fontSize:"12px",padding:"8px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/></div>
        {authError&&<div style={{fontSize:"11px",marginBottom:"12px",padding:"8px 10px",borderRadius:"8px",background:authError.includes("Check")?P.successLight:P.dangerLight,color:authError.includes("Check")?"#065F46":"#991B1B"}}>{authError}</div>}
        <button onClick={handleAuth} style={{width:"100%",padding:"9px",background:P.primary,color:"#fff",fontSize:"12px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"500"}}>{authMode==="login"?"Log in":"Create account"}</button>
        <p style={{fontSize:"10px",color:P.textTert,textAlign:"center",marginTop:"1rem"}}>Free forever · No credit card · 21 CFR Part 11 compliant</p>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:P.bgSec,color:P.text,fontFamily:"var(--font-sans)"}}>
      {/* Header */}
      <header style={{display:"flex",alignItems:"center",gap:"12px",padding:"0 1.25rem",height:"52px",borderBottom:`0.5px solid ${P.border}`,background:P.bg,flexShrink:0}}>
        <span style={{fontSize:"16px",fontWeight:"500"}}>TMF<span style={{color:P.primary}}>360</span></span>
        <span style={{fontSize:"11px",color:P.textTert}}>Trial Master File Platform · DIA v3.3.1 · ISO 14155 · 21 CFR Part 11</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
          {studies.length>0&&(
            <select value={activeStudy?.study_id||""} onChange={e=>{const s=studies.find(s=>s.study_id===e.target.value);if(s){setActiveStudy(s);loadDocs(s.study_id,user.id);}}} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"4px 8px",background:P.bgSec,color:P.text}}>
              {studies.map(s=><option key={s.study_id} value={s.study_id}>{s.study_id}</option>)}
            </select>
          )}
          {activeStudy&&<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"10px",fontWeight:"500",background:donePct>=80?P.successLight:donePct>=60?P.warningLight:P.dangerLight,color:donePct>=80?"#065F46":donePct>=60?"#92400E":"#991B1B"}}>{donePct}% complete</span>}
          <span style={{fontSize:"11px",color:P.textTert}}>{user?.email}</span>
          <button onClick={handleSignOut} style={{fontSize:"11px",color:P.textTert,background:"none",border:"none",cursor:"pointer"}}>Sign out</button>
        </div>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <aside style={{width:"192px",borderRight:`0.5px solid ${P.border}`,background:P.bg,display:"flex",flexDirection:"column",padding:"8px",gap:"2px",flexShrink:0,overflowY:"auto"}}>
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"8px 10px 3px",letterSpacing:".08em",textTransform:"uppercase" as const}}>Overview</p>
          {navItem("dashboard","Dashboard","ti-layout-dashboard")}
          {navItem("studies","Studies","ti-flask")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 3px",letterSpacing:".08em",textTransform:"uppercase" as const}}>TMF</p>
          {navItem("documents","Documents","ti-files")}
          {navItem("artifacts","Artifact browser","ti-layout-grid")}
          {navItem("gap","Gap analysis","ti-clipboard-check")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 3px",letterSpacing:".08em",textTransform:"uppercase" as const}}>Intelligence</p>
          {navItem("readiness","Inspection readiness","ti-shield-check")}
          {navItem("chat","AI specialist","ti-message-circle")}
          {navItem("audit","Audit trail","ti-lock")}
          {navItem("quality","Quality checks","ti-clipboard-list")}
          {navItem("users","User management","ti-users")}
        </aside>
        <main style={{flex:1,overflowY:"auto",padding:"1.25rem"}}>
          {/* DASHBOARD */}
          {(panel==="completeness-detail")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>TMF completeness — {activeStudy?.study_id}</h1>
    </div>
    <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#1E40AF"}}>
      Showing all Core artifacts. Green = approved document filed. Red = missing. Download available for approved documents.
    </div>
    {ZONES.map(({z,zn})=>{
      const zoneArtsAll=TMF.filter(a=>a.cl==="Core"&&a.z===z);
      const zoneApproved=studyDocs.filter(d=>d.status==="Approved"&&zoneArtsAll.some(a=>a.a===d.artifact_num||a.an.toLowerCase()===d.artifact_name.toLowerCase()));
      const pct=zoneComp(z);
      return(
        <div key={z} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderBottom:`0.5px solid ${P.border}`,background:P.bgSec}}>
            <span style={{fontSize:"12px",fontWeight:"500"}}>Zone {z} — {zn}</span>
            <div style={{flex:1,height:"4px",background:P.bgTert,borderRadius:"4px",overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:ZONE_COLORS[z]||P.primary,borderRadius:"4px"}}/></div>
            <span style={{fontSize:"11px",fontWeight:"500",color:ZONE_COLORS[z]||P.primary}}>{pct}%</span>
          </div>
          {zoneArtsAll.map(a=>{
            const filed=studyDocs.find(d=>d.artifact_num===a.a&&d.status==="Approved");
            return(
              <div key={a.a} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 14px",borderBottom:`0.5px solid ${P.bgTert}`}}>
                <span style={{fontSize:"14px"}}>{filed?"✅":"❌"}</span>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert,flexShrink:0}}>{a.a}</span>
                <span style={{fontSize:"11px",flex:1,color:filed?P.text:P.textSec}}>{a.an}</span>
                {filed&&filed.file_path&&(
                  <a href={supabase.storage.from("Documents").getPublicUrl(filed.file_path).data.publicUrl} download={filed.custom_file_name||filed.file_name} style={{fontSize:"9px",padding:"3px 8px",background:P.successLight,color:"#065F46",borderRadius:"6px",textDecoration:"none",flexShrink:0}}>⬇ Download</a>
                )}
                {filed&&<span style={{fontSize:"9px",color:"#065F46",flexShrink:0}}>v{filed.version} · {filed.approved_by}</span>}
                {!filed&&<span style={{fontSize:"9px",padding:"2px 7px",background:"#FEF2F2",color:"#991B1B",borderRadius:"6px",flexShrink:0}}>{["3","4","5"].includes(a.z)?"CRITICAL":["1","2","7"].includes(a.z)?"MAJOR":"MINOR"}</span>}
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
)}

{(panel==="missing-detail")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Missing documents — {activeStudy?.study_id}</h1>
    </div>
    <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>
      These Core artifacts have no document filed. CRITICAL gaps in Zones 3, 4, 5 are immediate audit risk.
    </div>
    {["CRITICAL","MAJOR","MINOR"].map(sev=>{
      const sevZones=sev==="CRITICAL"?["3","4","5"]:sev==="MAJOR"?["1","2","7"]:["6","8","9","10","11"];
      const items=TMF.filter(a=>a.cl==="Core"&&sevZones.includes(a.z)&&!filedNames.some(f=>a.an.toLowerCase().includes(f)||f.includes(a.an.toLowerCase())));
      if(!items.length)return null;
      const colors:Record<string,any>={CRITICAL:{bg:"#FEF2F2",color:"#991B1B",border:"#FECACA"},MAJOR:{bg:"#FFFBEB",color:"#92400E",border:"#FDE68A"},MINOR:{bg:P.primaryLight,color:"#3730A3",border:"#C7D2FE"}};
      const c=colors[sev];
      return(
        <div key={sev} style={{border:`0.5px solid ${c.border}`,borderRadius:"12px",overflow:"hidden"}}>
          <div style={{background:c.bg,color:c.color,padding:"8px 14px",fontSize:"11px",fontWeight:"500"}}>{sev} — {items.length} missing artifact{items.length!==1?"s":""}</div>
          {items.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 14px",borderTop:`0.5px solid ${P.bgTert}`,background:P.bg}}>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert,flexShrink:0}}>{a.a}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"11px",fontWeight:"500"}}>{a.an}</div>
                <div style={{fontSize:"10px",color:P.textTert}}>Zone {a.z} — {a.zn}{a.iso?` · ISO 14155: ${a.iso}`:""}</div>
              </div>
              <button onClick={()=>{setFZone(a.z);setFArtifact(a.a+"|"+a.an+"|"+a.z);setShowDocModal(true);}} style={{fontSize:"9px",padding:"3px 8px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer",flexShrink:0}}>+ Upload</button>
            </div>
          ))}
        </div>
      );
    })}
  </div>
)}

{(panel==="notapproved-detail")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Not approved — {activeStudy?.study_id}</h1>
    </div>
    <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>
      These documents were rejected. Review the rejection reason and appeal if needed.
    </div>
    {studyDocs.filter(d=>d.status==="Draft"&&d.rejection_reason).length===0?(
      <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No rejected documents.</div>
    ):studyDocs.filter(d=>d.status==="Draft"&&(d as any).rejection_reason).map((d,i)=>(
      <div key={i} style={{background:P.bg,border:`0.5px solid #FECACA`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
              <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
              {statusBadge(d.status)}
            </div>
            <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} · {d.owner||"—"} · v{d.version||"—"}</div>
          </div>
          {d.file_path&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"10px",padding:"4px 10px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none",flexShrink:0}}>⬇ Download</a>}
        </div>
        <div style={{background:"#FEF2F2",borderRadius:"8px",padding:"10px 12px"}}>
          <div style={{fontSize:"10px",fontWeight:"500",color:"#991B1B",marginBottom:"3px"}}>❌ Rejected by {(d as any).rejected_by} · {(d as any).rejected_at?new Date((d as any).rejected_at).toLocaleString():""}</div>
          <div style={{fontSize:"11px",color:"#7F1D1D"}}>{(d as any).rejection_reason}</div>
        </div>
        {(d as any).appeal_reason&&(
          <div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}>
            <div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>📤 Appeal submitted</div>
            <div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div>
          </div>
        )}
        {!(d as any).appeal_reason&&(
          <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Appeal reason — explain why this should be approved</label>
              <textarea id={`appeal-${d.id}`} placeholder="Provide justification for approval..." rows={2} style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",resize:"vertical" as const}}/>
            </div>
            <button onClick={async()=>{
              const ta=document.getElementById(`appeal-${d.id}`) as HTMLTextAreaElement;
              if(!ta?.value.trim())return;
              const{error}=await supabase.from("documents").update({status:"Under Review",appeal_reason:ta.value.trim()}).eq("id",d.id);
              if(!error){
                await supabase.from("audit_trail").insert([{user_id:user.id,user_email:user.email,action:"Appeal submitted",document_id:d.id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"Draft",new_value:"Under Review",signature_reason:ta.value.trim(),created_at:new Date().toISOString()}]);
                setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Under Review",appeal_reason:ta.value.trim()}:doc));
              }
            }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",flexShrink:0,marginBottom:"1px"}}>Submit appeal</button>
          </div>
        )}
      </div>
    ))}
  </div>
)}
{(panel==="notapproved-detail-OLD")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Not approved — {activeStudy?.study_id}</h1>
    </div>
    <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>
      These documents were rejected. Review the rejection reason and appeal if needed.
    </div>
    {studyDocs.filter(d=>d.status==="Draft"&&d.rejection_reason).length===0?(
      <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No rejected documents.</div>
    ):studyDocs.filter(d=>d.status==="Draft"&&(d as any).rejection_reason).map((d,i)=>(
      <div key={i} style={{background:P.bg,border:`0.5px solid #FECACA`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
              <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
              {statusBadge(d.status)}
            </div>
            <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} · {d.owner||"—"} · v{d.version||"—"}</div>
          </div>
          {d.file_path&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"10px",padding:"4px 10px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none",flexShrink:0}}>⬇ Download</a>}
        </div>
        <div style={{background:"#FEF2F2",borderRadius:"8px",padding:"10px 12px"}}>
          <div style={{fontSize:"10px",fontWeight:"500",color:"#991B1B",marginBottom:"3px"}}>❌ Rejected by {(d as any).rejected_by} · {(d as any).rejected_at?new Date((d as any).rejected_at).toLocaleString():""}</div>
          <div style={{fontSize:"11px",color:"#7F1D1D"}}>{(d as any).rejection_reason}</div>
        </div>
        {(d as any).appeal_reason&&(
          <div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}>
            <div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>📤 Appeal submitted</div>
            <div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div>
          </div>
        )}
        {!(d as any).appeal_reason&&(
          <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Appeal reason — explain why this should be approved</label>
              <textarea id={`appeal-${d.id}`} placeholder="Provide justification for approval..." rows={2} style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",resize:"vertical" as const}}/>
            </div>
            <button onClick={async()=>{
              const ta=document.getElementById(`appeal-${d.id}`) as HTMLTextAreaElement;
              if(!ta?.value.trim())return;
              const{error}=await supabase.from("documents").update({status:"Under Review",appeal_reason:ta.value.trim()}).eq("id",d.id);
              if(!error){
                await supabase.from("audit_trail").insert([{user_id:user.id,user_email:user.email,action:"Appeal submitted",document_id:d.id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"Draft",new_value:"Under Review",signature_reason:ta.value.trim(),created_at:new Date().toISOString()}]);
                setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Under Review",appeal_reason:ta.value.trim()}:doc));
              }
            }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",flexShrink:0,marginBottom:"1px"}}>Submit appeal</button>
          </div>
        )}
      </div>
    ))}
  </div>
)}
{(panel==="notapproved-detail-OLD")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Not approved — {activeStudy?.study_id}</h1>
    </div>
    <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>
      These documents were rejected. Review the rejection reason and appeal if needed.
    </div>
    {studyDocs.filter(d=>d.status==="Draft"&&d.rejection_reason).length===0?(
      <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No rejected documents.</div>
    ):studyDocs.filter(d=>d.status==="Draft"&&(d as any).rejection_reason).map((d,i)=>(
      <div key={i} style={{background:P.bg,border:`0.5px solid #FECACA`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
              <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
              {statusBadge(d.status)}
            </div>
            <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} · {d.owner||"—"} · v{d.version||"—"}</div>
          </div>
          {d.file_path&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"10px",padding:"4px 10px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none",flexShrink:0}}>⬇ Download</a>}
        </div>
        <div style={{background:"#FEF2F2",borderRadius:"8px",padding:"10px 12px"}}>
          <div style={{fontSize:"10px",fontWeight:"500",color:"#991B1B",marginBottom:"3px"}}>❌ Rejected by {(d as any).rejected_by} · {(d as any).rejected_at?new Date((d as any).rejected_at).toLocaleString():""}</div>
          <div style={{fontSize:"11px",color:"#7F1D1D"}}>{(d as any).rejection_reason}</div>
        </div>
        {(d as any).appeal_reason&&(
          <div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}>
            <div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>📤 Appeal submitted</div>
            <div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div>
          </div>
        )}
        {!(d as any).appeal_reason&&(
          <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Appeal reason — explain why this should be approved</label>
              <textarea id={`appeal-${d.id}`} placeholder="Provide justification for approval..." rows={2} style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",resize:"vertical" as const}}/>
            </div>
            <button onClick={async()=>{
              const ta=document.getElementById(`appeal-${d.id}`) as HTMLTextAreaElement;
              if(!ta?.value.trim())return;
              const{error}=await supabase.from("documents").update({status:"Under Review",appeal_reason:ta.value.trim()}).eq("id",d.id);
              if(!error){
                await supabase.from("audit_trail").insert([{user_id:user.id,user_email:user.email,action:"Appeal submitted",document_id:d.id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"Draft",new_value:"Under Review",signature_reason:ta.value.trim(),created_at:new Date().toISOString()}]);
                setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Under Review",appeal_reason:ta.value.trim()}:doc));
              }
            }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",flexShrink:0,marginBottom:"1px"}}>Submit appeal</button>
          </div>
        )}
      </div>
    ))}
  </div>
)}
{(panel==="notapproved-detail-OLD")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Not approved — {activeStudy?.study_id}</h1>
    </div>
    <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
      Documents filed but not yet approved. Use the Approve button to add an electronic signature (21 CFR Part 11).
    </div>
    {studyDocs.filter(d=>d.status!=="Approved"&&d.status!=="Archived").length===0?(
      <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>All filed documents are approved.</div>
    ):studyDocs.filter(d=>d.status!=="Approved"&&d.status!=="Archived").map((d,i)=>(
      <div key={i} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px 14px",display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
            <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
            <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
            {statusBadge(d.status)}
          </div>
          <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} · {d.owner||"No owner"} · v{d.version||"—"} · {d.effective_date||"No date"}</div>
          {d.custom_file_name&&<div style={{fontSize:"10px",color:P.textSec,marginTop:"2px"}}>📄 {d.custom_file_name}</div>}
        </div>
        <button onClick={()=>{setSelectedDoc(d);setShowApproveModal(true);}} style={{fontSize:"11px",padding:"6px 12px",background:P.successLight,color:"#065F46",border:"0.5px solid #6EE7B7",borderRadius:"8px",cursor:"pointer",flexShrink:0}}>Approve</button>
      </div>
    ))}
  </div>
)}

{(panel==="expiring-detail")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Expiring documents — {activeStudy?.study_id}</h1>
    </div>
    {studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).length===0?(
      <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents expiring in the next 90 days.</div>
    ):studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).sort((a,b)=>new Date(a.expiry_date).getTime()-new Date(b.expiry_date).getTime()).map((d,i)=>{
      const daysLeft=Math.ceil((new Date(d.expiry_date).getTime()-Date.now())/(86400000));
      const isExpired=daysLeft<0;
      const isCritical=daysLeft<=30;
      return(
        <div key={i} style={{background:P.bg,border:`0.5px solid ${isExpired?"#FECACA":isCritical?"#FDE68A":P.border}`,borderRadius:"10px",padding:"12px 14px",display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"60px",height:"60px",borderRadius:"10px",background:isExpired?"#FEF2F2":isCritical?"#FFFBEB":"#ECFDF5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:"18px",fontWeight:"500",color:isExpired?"#EF4444":isCritical?"#F59E0B":"#10B981"}}>{Math.abs(daysLeft)}</span>
            <span style={{fontSize:"8px",color:isExpired?"#EF4444":isCritical?"#F59E0B":"#10B981"}}>{isExpired?"days ago":"days left"}</span>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
              <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
              {statusBadge(d.status)}
            </div>
            <div style={{fontSize:"10px",color:P.textTert}}>Expires: <span style={{color:isExpired?"#EF4444":isCritical?"#F59E0B":"#10B981",fontWeight:"500"}}>{d.expiry_date}</span> · Owner: {d.owner||"—"} · v{d.version||"—"}</div>
            {d.custom_file_name&&<div style={{fontSize:"10px",color:P.textSec,marginTop:"2px"}}>📄 {d.custom_file_name}</div>}
          </div>
          {d.file_path&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"10px",padding:"5px 10px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none",flexShrink:0}}>⬇ Download</a>}
        </div>
      );
    })}
  </div>
)}

{(panel==="pending-detail")&&(
  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>← Back</button>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Pending review — {activeStudy?.study_id}</h1>
    </div>
    <div style={{background:P.primaryLight,border:`0.5px solid #C7D2FE`,borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#3730A3"}}>
      Review submitted documents. Approve with electronic signature or reject with a reason.
    </div>
    {studyDocs.filter(d=>d.status==="Under Review").length===0?(
      <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents pending review. Uploaders must submit documents for review first.</div>
    ):studyDocs.filter(d=>d.status==="Under Review").map((d,i)=>(
      <div key={i} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
              <span style={{fontSize:"13px",fontWeight:"500"}}>{d.artifact_name}</span>
              {statusBadge(d.status)}
            </div>
            <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} · Owner: {d.owner||"—"} · v{d.version||"—"} · Effective: {d.effective_date||"—"}</div>
            {d.custom_file_name&&<div style={{fontSize:"10px",color:P.textSec,marginTop:"2px"}}>📄 {d.custom_file_name}{d.file_size?` (${formatSize(d.file_size)})`:""}</div>}
          </div>
          <div style={{display:"flex",gap:"6px",flexShrink:0}}>
            {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"10px",padding:"5px 10px",background:"#EFF6FF",color:"#1E40AF",border:"none",borderRadius:"6px",cursor:"pointer"}}>Preview</button>}
            {d.file_path&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"10px",padding:"5px 10px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>⬇ Download</a>}
          </div>
        </div>
        {(d as any).submission_reason&&(
          <div style={{background:"#EFF6FF",borderRadius:"8px",padding:"10px 12px"}}>
            <div style={{fontSize:"10px",fontWeight:"500",color:"#1E40AF",marginBottom:"3px"}}>📤 Submitted by {d.owner} for review</div>
            <div style={{fontSize:"11px",color:"#1E3A5F"}}>{(d as any).submission_reason}</div>
          </div>
        )}
        {(d as any).appeal_reason&&(
          <div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}>
            <div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>🔄 Appeal from uploader</div>
            <div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div>
          </div>
        )}
        {d.comments&&(
          <div style={{background:P.bgSec,borderRadius:"8px",padding:"10px 12px",maxHeight:"100px",overflowY:"auto"}}>
            <div style={{fontSize:"10px",fontWeight:"500",color:P.textSec,marginBottom:"4px"}}>💬 Comments</div>
            {d.comments.split("\n").map((c,ci)=><div key={ci} style={{fontSize:"11px",color:P.textSec,marginBottom:"2px"}}>{c}</div>)}
          </div>
        )}
        <div style={{display:"flex",gap:"8px",alignItems:"flex-end",borderTop:`0.5px solid ${P.border}`,paddingTop:"10px"}}>
          <div style={{flex:1}}>
            <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reviewer comment (optional)</label>
            <textarea id={`review-comment-${d.id}`} placeholder="Add review notes before approving or rejecting..." rows={2} style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",resize:"vertical" as const}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column" as const,gap:"6px",flexShrink:0}}>
            <button onClick={async()=>{
              const ta=document.getElementById(`review-comment-${d.id}`) as HTMLTextAreaElement;
              if(ta?.value.trim()){
                const existing=d.comments||"";
                const newComment=`${existing}${existing?"\n":""}[${new Date().toLocaleString()} - ${user.email} (Reviewer)]: ${ta.value.trim()}`;
                await supabase.from("documents").update({comments:newComment}).eq("id",d.id);
                setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,comments:newComment}:doc));
                ta.value="";
              }
              setSelectedDoc(d);setShowApproveModal(true);
            }} style={{fontSize:"11px",padding:"7px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"500"}}>✓ Approve</button>
            <button onClick={async()=>{
              const ta=document.getElementById(`review-comment-${d.id}`) as HTMLTextAreaElement;
              const reason=ta?.value.trim();
              if(!reason){alert("Please add a rejection reason before rejecting.");return;}
              const now=new Date().toISOString();
              const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:reason,rejected_by:user.email,rejected_at:now,appeal_reason:""}).eq("id",d.id);
              if(!error){
                await supabase.from("audit_trail").insert([{user_id:user.id,user_email:user.email,action:"Document rejected",document_id:d.id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"Under Review",new_value:"Draft",signature_reason:reason,created_at:now}]);
                setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Draft",rejection_reason:reason,rejected_by:user.email,rejected_at:now,appeal_reason:""}:doc));
              }
            }} style={{fontSize:"11px",padding:"7px 14px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"8px",cursor:"pointer",fontWeight:"500"}}>✕ Reject</button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

{panel==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Dashboard {activeStudy?`— ${activeStudy.study_id}`:""}</h1>
                <button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ New study</button>
              </div>
              {!activeStudy?(
                <div style={{textAlign:"center",padding:"3rem",color:P.textTert}}>
                  <div style={{fontSize:"3rem",marginBottom:"12px"}}>📋</div>
                  <div style={{fontSize:"13px",fontWeight:"500",marginBottom:"6px",color:P.text}}>No studies yet</div>
                  <div style={{fontSize:"12px",marginBottom:"1rem"}}>Create your first study to start tracking your TMF</div>
                  <button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"8px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Create study</button>
                </div>
              ):(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
                    {[{val:`${donePct}%`,label:"TMF completeness",color:scoreColor(donePct),bg:donePct>=80?P.successLight:donePct>=60?P.warningLight:P.dangerLight,page:"completeness-detail"},
                      {val:missing,label:"Missing documents",color:"#EF4444",bg:"#FEF2F2",page:"missing-detail"},
                      {val:studyDocs.filter(d=>d.status!=="Approved"&&d.status!=="Archived").length,label:"Not approved",color:"#F59E0B",bg:"#FFFBEB",page:"notapproved-detail"},
                      {val:expiring,label:"Expiring (90 days)",color:"#EF4444",bg:"#FEF2F2",page:"expiring-detail"},
                      {val:pending,label:"Pending review",color:P.primary,bg:P.primaryLight,page:"pending-detail"}
                    ].map((m,i)=>(
                      <div key={i} onClick={()=>setPanel((m as any).page)} style={{background:`linear-gradient(135deg, ${m.bg}, #fff)`,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px",borderTop:`3px solid ${m.color}`,cursor:"pointer",transition:"transform 0.1s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.02)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                        <div style={{fontSize:"24px",fontWeight:"500",color:m.color}}>{m.val}</div>
                        <div style={{fontSize:"11px",color:P.textSec,marginTop:"3px"}}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                      <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"12px",color:P.textSec,textTransform:"uppercase" as const,letterSpacing:".06em"}}>TMF completeness by zone</h2>
                      {ZONES.map(({z,zn})=>{const p=zoneComp(z);return(
                        <div key={z} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                          <span style={{fontSize:"9px",color:P.textTert,width:"14px"}}>{z}</span>
                          <span style={{fontSize:"11px",color:P.textSec,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{zn}</span>
                          <div style={{width:"80px",height:"4px",background:P.bgTert,borderRadius:"4px",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:ZONE_COLORS[z]||P.primary,borderRadius:"4px"}}/></div>
                          <span style={{fontSize:"10px",fontWeight:"500",width:"28px",textAlign:"right",color:ZONE_COLORS[z]||P.primary}}>{p}%</span>
                        </div>
                      );})}
                    </div>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                      <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"12px",color:P.textSec,textTransform:"uppercase" as const,letterSpacing:".06em"}}>Inspection readiness</h2>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0 12px"}}>
                        <span style={{fontSize:"48px",fontWeight:"500",color:scoreColor(ri)}}>{ri}</span>
                        <span style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Readiness score</span>
                        <div style={{width:"100%",height:"6px",background:P.bgTert,borderRadius:"6px",marginTop:"12px",overflow:"hidden"}}><div style={{width:`${ri}%`,height:"100%",background:scoreColor(ri),borderRadius:"6px"}}/></div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                        {gaps.crit.slice(0,2).map((g,i)=><div key={i} style={{fontSize:"11px",background:P.dangerLight,color:"#991B1B",borderRadius:"6px",padding:"5px 8px"}}>⚠ CRITICAL — {g.an}</div>)}
                        {gaps.major.slice(0,2).map((g,i)=><div key={i} style={{fontSize:"11px",background:P.warningLight,color:"#92400E",borderRadius:"6px",padding:"5px 8px"}}>▲ MAJOR — {g.an}</div>)}
                        {gaps.crit.length===0&&gaps.major.length===0&&<div style={{fontSize:"11px",color:P.success,padding:"5px 8px"}}>✓ No critical or major findings</div>}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STUDIES */}
          {panel==="studies"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Studies</h1>
                <button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ New study</button>
              </div>
              {studies.length===0?<div style={{textAlign:"center",padding:"3rem",color:P.textTert,fontSize:"12px"}}>No studies yet.</div>:(
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                  {studies.map(s=>(
                    <div key={s.study_id} onClick={()=>{setActiveStudy(s);loadDocs(s.study_id,user.id);setPanel("dashboard");}} style={{border:`0.5px solid ${activeStudy?.study_id===s.study_id?P.primary:P.border}`,borderRadius:"12px",padding:"14px",cursor:"pointer",background:activeStudy?.study_id===s.study_id?P.primaryLight:P.bg,transition:"all 0.15s"}}>
                      <div style={{fontSize:"13px",fontWeight:"500"}}>{s.study_id}</div>
                      <div style={{fontSize:"11px",color:P.textSec,marginTop:"4px"}}>{s.protocol||"—"}</div>
                      <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Phase: {s.phase} · {s.sponsor||"—"}</div>
                      <span style={{display:"inline-block",marginTop:"8px",fontSize:"10px",padding:"2px 8px",borderRadius:"10px",background:s.status==="Active"?P.successLight:s.status==="Startup"?P.blueLight:P.bgTert,color:s.status==="Active"?"#065F46":s.status==="Startup"?"#1E40AF":P.textSec}}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS */}
          {panel==="documents"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Documents — {activeStudy?.study_id||"No study selected"}</h1>
                {activeStudy&&<button onClick={()=>setShowDocModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Add document</button>}
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const,alignItems:"center"}}>
                <input value={docSearch} onChange={e=>setDocSearch(e.target.value)} placeholder="Search documents..." style={{fontSize:"12px",padding:"6px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px",width:"220px"}}/>
                {["all","Approved","Under Review","Draft","Archived"].map(f=>(
                  <button key={f} onClick={()=>setDocFilter(f)} style={{fontSize:"11px",padding:"4px 12px",borderRadius:"20px",border:`0.5px solid ${docFilter===f?P.primary:P.border}`,background:docFilter===f?P.primary:"transparent",color:docFilter===f?"#fff":P.textSec,cursor:"pointer"}}>{f==="all"?"All":f}</button>
                ))}
              </div>
              <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
                <table style={{width:"100%",fontSize:"12px",borderCollapse:"collapse"}}>
                  <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
                    {["Artifact","Zone","File name","Version","Effective","Expiry","Status","Owner","Actions"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",fontWeight:"500",color:P.textTert}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredDocs.length===0?(
                      <tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No documents found.</td></tr>
                    ):filteredDocs.map((d,i)=>(
                      <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <td style={{padding:"8px 10px"}}><div style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</div><div style={{fontSize:"11px"}}>{d.artifact_name}</div></td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>Zone {d.zone}</td>
                        <td style={{padding:"8px 10px"}}>
                          {(d.custom_file_name||d.file_name)?(
                            <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                              <span>{fileIcon(d.file_name||"")}</span>
                              <span style={{fontSize:"11px",color:P.textSec,maxWidth:"100px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.custom_file_name||d.file_name}</span>
                            </div>
                          ):<span style={{color:P.textTert}}>—</span>}
                        </td>
                        <td style={{padding:"8px 10px",fontSize:"11px"}}>{d.version||"—"}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px"}}>{d.effective_date||"—"}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)?"#EF4444":"inherit"}}>{d.expiry_date||"—"}</td>
                        <td style={{padding:"8px 10px"}}>{statusBadge(d.status)}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.owner||"—"}</td>
                        <td style={{padding:"8px 10px"}}>
                          <div style={{display:"flex",gap:"4px",flexWrap:"wrap" as const}}>
                            {d.file_path&&canPreview(d.file_name||"")&&(
                              <button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.blueLight,color:"#1E40AF",border:"none",borderRadius:"4px",cursor:"pointer"}}>Preview</button>
                            )}
                            {d.file_path&&(
                              <a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>
                            )}
                            {d.status==="Draft"&&(
                              <button onClick={()=>{setSelectedDoc(d);setShowSubmitModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:"#EFF6FF",color:"#1E40AF",border:"none",borderRadius:"4px",cursor:"pointer"}}>Submit</button>
                            )}
{d.status==="Under Review"&&(
                              <button onClick={()=>{setSelectedDoc(d);setShowApproveModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:P.successLight,color:"#065F46",border:"none",borderRadius:"4px",cursor:"pointer"}}>Approve</button>
                            )}
                            <button onClick={()=>{setSelectedDoc(d);setCommentText("");setShowCommentModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:P.primaryLight,color:P.primary,border:"none",borderRadius:"4px",cursor:"pointer"}}>Comment</button>
                          </div>
                          {d.comments&&<div style={{fontSize:"9px",color:P.textTert,marginTop:"3px",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}} title={d.comments}>💬 {d.comments.split("\n").length} comment{d.comments.split("\n").length!==1?"s":""}</div>}
                          {d.approved_by&&<div style={{fontSize:"9px",color:"#065F46",marginTop:"2px"}}>✓ {d.approved_by}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ARTIFACT BROWSER */}
          {panel==="artifacts"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Artifact browser — DIA TMF Reference Model v3.3.1</h1>
              <div style={{display:"flex",gap:"8px"}}>
                <input value={artSearch} onChange={e=>setArtSearch(e.target.value)} placeholder="Search artifacts..." style={{flex:1,fontSize:"12px",padding:"6px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}}/>
                <select value={artZone} onChange={e=>setArtZone(e.target.value)} style={{fontSize:"12px",padding:"6px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}}>
                  <option value="">All zones</option>
                  {ZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} — {zn}</option>)}
                </select>
                <select value={artCl} onChange={e=>setArtCl(e.target.value)} style={{fontSize:"12px",padding:"6px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}}>
                  <option value="">Core + Recommended</option>
                  <option value="Core">Core only</option>
                  <option value="Recommended">Recommended only</option>
                </select>
              </div>
              <p style={{fontSize:"11px",color:P.textTert}}>{filteredArts.length} artifact{filteredArts.length!==1?"s":""}</p>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {filteredArts.map(a=>{
                  const approvedDocs=studyDocs.filter(d=>d.artifact_num===a.a&&d.status==="Approved");
                  return(
                    <div key={a.a} style={{background:P.bg,border:`0.5px solid ${approvedDocs.length>0?P.primary:P.border}`,borderRadius:"10px",overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 12px",cursor:"pointer"}} onClick={()=>setExpandedArt(expandedArt===a.a?null:a.a)}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert,flexShrink:0}}>{a.a}</span>
                        <span style={{fontSize:"12px",fontWeight:"500",flex:1}}>{a.an}</span>
                        {approvedDocs.length>0&&<span style={{fontSize:"9px",padding:"2px 6px",background:P.successLight,color:"#065F46",borderRadius:"8px"}}>✓ {approvedDocs.length} filed</span>}
                        <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"10px",background:a.cl==="Core"?P.primaryLight:P.warningLight,color:a.cl==="Core"?P.primary:"#92400E"}}>{a.cl}</span>
                      </div>
                      {expandedArt===a.a&&(
                        <div style={{borderTop:`0.5px solid ${P.border}`,padding:"10px 12px",background:P.bgSec}}>
                          {a.iso&&<div style={{fontSize:"11px",color:P.textTert,marginBottom:"8px"}}>ISO 14155: {a.iso}</div>}
                          {approvedDocs.length>0&&(
                            <div style={{marginBottom:"10px"}}>
                              <div style={{fontSize:"10px",fontWeight:"500",color:P.textSec,marginBottom:"6px"}}>Filed documents:</div>
                              {approvedDocs.map((d,i)=>(
                                <div key={i} style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 8px",background:P.bg,borderRadius:"6px",marginBottom:"4px",border:`0.5px solid ${P.border}`}}>
                                  <span>{fileIcon(d.file_name||"")}</span>
                                  <span style={{fontSize:"11px",flex:1}}>{d.custom_file_name||d.file_name||d.artifact_name}</span>
                                  <span style={{fontSize:"9px",color:P.textTert}}>{d.version}</span>
                                  {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.blueLight,color:"#1E40AF",border:"none",borderRadius:"4px",cursor:"pointer"}}>Preview</button>}
                                  {d.file_path&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={()=>{setFZone(a.z);setFArtifact(a.a+"|"+a.an+"|"+a.z);setShowDocModal(true);}} style={{fontSize:"10px",padding:"4px 10px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer"}}>+ Upload document to this artifact</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GAP ANALYSIS */}
          {panel==="gap"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Gap analysis — {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(
                <>
                  <p style={{fontSize:"12px",color:P.textSec}}>Comparing filed documents against Core artifacts in DIA TMF Reference Model v3.3.1</p>
                  <select value={gapZone} onChange={e=>setGapZone(e.target.value)} style={{fontSize:"12px",padding:"6px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px",width:"200px"}}>
                    <option value="">All zones</option>
                    {ZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} — {zn}</option>)}
                  </select>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                    {[{val:gaps.crit.length,label:"Critical",color:"#EF4444",bg:"#FEF2F2"},{val:gaps.major.length,label:"Major",color:"#F59E0B",bg:"#FFFBEB"},{val:gaps.minor.length,label:"Minor",color:P.primary,bg:P.primaryLight}].map((s,i)=>(
                      <div key={i} style={{background:s.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px",textAlign:"center"}}>
                        <div style={{fontSize:"28px",fontWeight:"500",color:s.color}}>{s.val}</div>
                        <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {[{items:gaps.crit.filter((g:any)=>!gapZone||g.z===gapZone),label:"CRITICAL",color:"#991B1B",bg:"#FEF2F2",border:"#FECACA"},
                    {items:gaps.major.filter((g:any)=>!gapZone||g.z===gapZone),label:"MAJOR",color:"#92400E",bg:"#FFFBEB",border:"#FDE68A"},
                    {items:gaps.minor.filter((g:any)=>!gapZone||g.z===gapZone),label:"MINOR",color:"#1E40AF",bg:P.primaryLight,border:"#C7D2FE"}
                  ].map(({items,label,color,bg,border})=>items.length>0&&(
                    <div key={label} style={{border:`0.5px solid ${border}`,borderRadius:"10px",overflow:"hidden"}}>
                      <div style={{background:bg,color,padding:"8px 12px",fontSize:"11px",fontWeight:"500"}}>{label} — {items.length} gap{items.length!==1?"s":""}</div>
                      {items.map((g:any,i:number)=>(
                        <div key={i} style={{borderTop:`0.5px solid ${P.bgTert}`,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",background:P.bg}}>
                          <div><div style={{fontSize:"12px",fontWeight:"500"}}>{g.an}</div><div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>Zone {g.z} — {g.zn}</div></div>
                          <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{g.a}</div>{g.iso&&<div style={{fontFamily:"monospace",fontSize:"10px",color:P.blue}}>{g.iso}</div>}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* INSPECTION READINESS */}
          {panel==="readiness"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection readiness — {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:"12px"}}>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <span style={{fontSize:"52px",fontWeight:"500",color:scoreColor(ri)}}>{ri}</span>
                      <span style={{fontSize:"11px",color:P.textTert,marginTop:"4px"}}>Readiness score</span>
                      <div style={{width:"100%",height:"6px",background:P.bgTert,borderRadius:"6px",marginTop:"12px",overflow:"hidden"}}><div style={{width:`${ri}%`,height:"100%",background:scoreColor(ri),borderRadius:"6px"}}/></div>
                    </div>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                      <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"10px",color:P.textSec}}>Top findings</h2>
                      <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                        {gaps.crit.slice(0,4).map((g:any,i:number)=><div key={i} style={{fontSize:"11px",background:"#FEF2F2",color:"#991B1B",borderRadius:"6px",padding:"6px 10px"}}>⚠ CRITICAL — {g.an} <span style={{fontFamily:"monospace",fontSize:"9px"}}>({g.a})</span></div>)}
                        {gaps.major.slice(0,3).map((g:any,i:number)=><div key={i} style={{fontSize:"11px",background:"#FFFBEB",color:"#92400E",borderRadius:"6px",padding:"6px 10px"}}>▲ MAJOR — {g.an} <span style={{fontFamily:"monospace",fontSize:"9px"}}>({g.a})</span></div>)}
                        {gaps.crit.length===0&&gaps.major.length===0&&<div style={{fontSize:"11px",color:P.success}}>✓ No critical or major findings</div>}
                      </div>
                    </div>
                  </div>
                  <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                    <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"12px",color:P.textSec}}>Zone readiness breakdown</h2>
                    {ZONES.map(({z,zn})=>{const p=zoneComp(z);return(
                      <div key={z} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                        <span style={{fontSize:"9px",color:P.textTert,width:"14px"}}>{z}</span>
                        <span style={{fontSize:"11px",color:P.textSec,width:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{zn}</span>
                        <div style={{flex:1,height:"5px",background:P.bgTert,borderRadius:"5px",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:ZONE_COLORS[z]||P.primary,borderRadius:"5px"}}/></div>
                        <span style={{fontSize:"11px",fontWeight:"500",width:"32px",textAlign:"right",color:scoreColor(p)}}>{p}%</span>
                      </div>
                    );})}
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI CHAT */}
          {panel==="chat"&&(
            <div style={{display:"flex",flexDirection:"column",height:"100%",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>TMF AI specialist</h1>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                {["Where does a CTA go in the TMF?","Core docs before first patient?","Draft a Note to File for late IRB filing","What is Zone 5?","Explain ALCOA+","What is 21 CFR Part 11?"].map(q=>(
                  <button key={q} onClick={()=>setChatInput(q)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"20px",padding:"4px 10px",color:P.textSec,background:P.bg,cursor:"pointer"}}>{q}</button>
                ))}
              </div>
              <div style={{flex:1,background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",display:"flex",flexDirection:"column",overflow:"hidden",minHeight:"360px"}}>
                <div style={{flex:1,overflowY:"auto",padding:"1rem",display:"flex",flexDirection:"column",gap:"10px"}}>
                  {chatMessages.map((m,i)=>(
                    <div key={i} style={{display:"flex",gap:"8px",flexDirection:m.role==="user"?"row-reverse":"row"}}>
                      <div style={{width:"24px",height:"24px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:"500",flexShrink:0,background:m.role==="ai"?P.primaryLight:"#6366F1",color:m.role==="ai"?P.primary:"#fff"}}>{m.role==="ai"?"AI":"You"}</div>
                      <div style={{maxWidth:"85%",fontSize:"12px",borderRadius:"10px",padding:"8px 12px",lineHeight:"1.6",whiteSpace:"pre-wrap" as const,background:m.role==="ai"?P.bgSec:"#6366F1",color:m.role==="ai"?P.text:"#fff"}}>{m.text}</div>
                    </div>
                  ))}
                  {chatLoading&&(
                    <div style={{display:"flex",gap:"8px"}}>
                      <div style={{width:"24px",height:"24px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",background:P.primaryLight,color:P.primary}}>AI</div>
                      <div style={{background:P.bgSec,borderRadius:"10px",padding:"8px 12px",display:"flex",gap:"4px",alignItems:"center"}}>
                        {[0,1,2].map(i=><span key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:P.primary,display:"inline-block",animation:"bounce 0.9s infinite",animationDelay:`${i*0.15}s`}}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEnd}/>
                </div>
                <div style={{borderTop:`0.5px solid ${P.border}`,padding:"10px 12px",display:"flex",gap:"8px"}}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about your TMF, ISO 14155, gaps, document drafting..." style={{flex:1,fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/>
                  <button onClick={sendChat} disabled={chatLoading} style={{fontSize:"12px",padding:"7px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:chatLoading?0.5:1}}>Send</button>
                </div>
              </div>
            </div>
          )}

          {/* QUALITY CHECKS */}
          {panel==="quality"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Quality checks — {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(<QualityPanel docs={studyDocs} P={P} supabase={supabase} setDocs={setDocs}/>)}
            </div>
          )}

          {/* USERS */}
          {panel==="users"&&(
            <UserManagementPanel user={user} P={P} supabase={supabase}/>
          )}

          {/* AUDIT TRAIL */}
          {panel==="audit"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Audit trail — 21 CFR Part 11 compliant</h1>
              <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
                ⚠ This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions, electronic signatures, and approvals are permanently recorded.
              </div>
              <AuditTrail user={user} activeStudy={activeStudy} P={P}/>
            </div>
          )}

        </main>
      </div>

      {/* Study Modal */}
      {showStudyModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"380px",border:`0.5px solid ${P.border}`,boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>New study</h2>
            {[{l:"Study ID",v:fId,s:setFId,p:"e.g. OIL-BR-US-10"},{l:"Protocol title",v:fProtocol,s:setFProtocol,p:"e.g. CLE Imaging of Breast Tissue"},{l:"Sponsor",v:fSponsor,s:setFSponsor,p:"e.g. Optiscan Imaging Ltd."}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Phase</label><select value={fPhase} onChange={e=>setFPhase(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Phase I","Phase II","Phase III","Observational","Feasibility"].map(p=><option key={p}>{p}</option>)}</select></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Status</label><select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Startup","Active","Closed","On Hold"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowStudyModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={createStudy} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Create study</button>
            </div>
          </div>
        </div>
      )}

      {/* Doc Modal */}
      {showDocModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"500px",border:`0.5px solid ${P.border}`,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add document</h2>

            {/* Step 1: Select Zone */}
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Step 1 — Select zone</label>
              <select value={fZone} onChange={e=>{setFZone(e.target.value);const arts=TMF.filter(a=>a.z===e.target.value);if(arts.length>0)setFArtifact(arts[0].a+"|"+arts[0].an+"|"+arts[0].z);}} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {ZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} — {zn}</option>)}
              </select>
            </div>

            {/* Step 2: Select Artifact */}
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Step 2 — Select artifact</label>
              <select value={fArtifact} onChange={e=>setFArtifact(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {zoneArts.map(a=><option key={a.a} value={`${a.a}|${a.an}|${a.z}`}>{a.a} — {a.an}</option>)}
              </select>
            </div>

            {/* Step 3: Upload File */}
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px"}}>Step 3 — Upload file</label>
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFileUpload(f);}} onClick={()=>fileInputRef.current?.click()} style={{border:`2px dashed ${dragOver?P.primary:P.borderSec}`,borderRadius:"10px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:dragOver?P.primaryLight:"transparent",transition:"all 0.15s"}}>
                <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileUpload(f);}}/>
                {uploading?<div style={{fontSize:"12px",color:P.primary}}>{uploadProgress}</div>
                :selectedFile?<div style={{fontSize:"12px"}}><div style={{fontSize:"1.5rem",marginBottom:"4px"}}>{fileIcon(selectedFile.name)}</div><div style={{fontWeight:"500"}}>{selectedFile.name}</div><div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>{formatSize(selectedFile.size)} · {uploadProgress}</div><button onClick={e=>{e.stopPropagation();setSelectedFile(null);setPendingFilePath("");}} style={{marginTop:"6px",fontSize:"10px",color:"#EF4444",background:"none",border:"none",cursor:"pointer"}}>Remove</button></div>
                :<div style={{fontSize:"12px",color:P.textTert}}><div style={{fontSize:"2rem",marginBottom:"6px"}}>📎</div><div>Drag & drop or click to browse</div><div style={{fontSize:"10px",marginTop:"4px"}}>PDF · Word · Excel · PowerPoint · Images · Any file type</div></div>}
              </div>
            </div>

            {/* Step 4: Name the file */}
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Step 4 — Document name (custom)</label>
              <input value={fCustomName} onChange={e=>setFCustomName(e.target.value)} placeholder="e.g. Protocol v3.0 - OIL-BR-US-10" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/>
            </div>

            {[{l:"Version",v:fVersion,s:setFVersion,p:"e.g. v1.0"},{l:"Owner",v:fOwner,s:setFOwner,p:"e.g. Jane Smith, CRA"}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Status</label><select value={fDocStatus} onChange={e=>setFDocStatus(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Draft","Under Review","Approved","Archived"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
              <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Effective date</label><input type="date" value={fEff} onChange={e=>setFEff(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
              <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Expiry date</label><input type="date" value={fExp} onChange={e=>setFExp(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            </div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Comments / notes</label><textarea value={fComments} onChange={e=>setFComments(e.target.value)} placeholder="Any notes about this document..." rows={2} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px",resize:"vertical" as const}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowDocModal(false);setSelectedFile(null);setPendingFilePath("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addDocument} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add document</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit for Review Modal */}
      {showSubmitModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Submit for review</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{selectedDoc.artifact_name}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for submission</label>
              <textarea value={submissionReason} onChange={e=>setSubmissionReason(e.target.value)} placeholder="Explain why this document is ready for review..." rows={3} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px",resize:"vertical" as const}}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowSubmitModal(false);setSubmissionReason("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={async()=>{
                if(!submissionReason.trim()){alert("Please add a reason for submission.");return;}
                const{error}=await supabase.from("documents").update({status:"Under Review",submission_reason:submissionReason}).eq("id",selectedDoc.id);
                if(!error){
                  await supabase.from("audit_trail").insert([{user_id:user.id,user_email:user.email,action:"Submitted for review",document_id:selectedDoc.id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"Draft",new_value:"Under Review",signature_reason:submissionReason,created_at:new Date().toISOString()}]);
                  setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,status:"Under Review",submission_reason:submissionReason}:d));
                }
                setShowSubmitModal(false);setSubmissionReason("");setSelectedDoc(null);
              }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Submit for review</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal — 21 CFR Part 11 Electronic Signature */}
      {showApproveModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`,boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Electronic signature</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>21 CFR Part 11 compliant approval — {selectedDoc.artifact_name}</p>
            <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"8px",padding:"10px 12px",marginBottom:"1rem",fontSize:"11px",color:"#1E40AF"}}>
              <strong>Approver:</strong> {user?.email}<br/>
              <strong>Timestamp:</strong> {new Date().toLocaleString()}<br/>
              <strong>Document:</strong> {selectedDoc.custom_file_name||selectedDoc.file_name||selectedDoc.artifact_name}<br/>
              <strong>Meaning:</strong> I approve this document as accurate and complete
            </div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Re-enter your password to sign</label><input type="password" value={approvePassword} onChange={e=>setApprovePassword(e.target.value)} placeholder="••••••••" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for signature (required)</label><select value={approveReason} onChange={e=>setApproveReason(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
              <option value="">Select reason...</option>
              <option>Reviewed and approved — document is accurate and complete</option>
              <option>QC review complete — no findings</option>
              <option>Regulatory review complete</option>
              <option>Final approval for TMF filing</option>
            </select></div>
            {approveError&&<div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",borderRadius:"8px",padding:"8px 10px",marginBottom:"10px"}}>{approveError}</div>}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowApproveModal(false);setApprovePassword("");setApproveReason("");setApproveError("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={handleApprove} style={{fontSize:"11px",padding:"6px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Sign & approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Add comment</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{selectedDoc.artifact_name}</p>
            {selectedDoc.comments&&(
              <div style={{background:P.bgSec,borderRadius:"8px",padding:"10px 12px",marginBottom:"12px",maxHeight:"120px",overflowY:"auto"}}>
                {selectedDoc.comments.split("\n").map((c,i)=><div key={i} style={{fontSize:"11px",color:P.textSec,marginBottom:"4px"}}>{c}</div>)}
              </div>
            )}
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New comment</label><textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add your comment..." rows={3} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px",resize:"vertical" as const}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowCommentModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={handleAddComment} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Save comment</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}} onClick={()=>setPreviewUrl(null)}>
          <div style={{background:P.bg,borderRadius:"16px",overflow:"hidden",maxWidth:"900px",width:"100%",margin:"1rem",maxHeight:"90vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`0.5px solid ${P.border}`}}>
              <span style={{fontSize:"13px",fontWeight:"500"}}>{previewName}</span>
              <div style={{display:"flex",gap:"8px"}}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"6px",textDecoration:"none",color:P.text}}>Open in new tab</a>
                <a href={previewUrl} download style={{fontSize:"11px",padding:"5px 12px",background:P.primary,color:"#fff",borderRadius:"6px",textDecoration:"none"}}>Download</a>
                <button onClick={()=>setPreviewUrl(null)} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:"transparent",cursor:"pointer"}}>Close</button>
              </div>
            </div>
            <div style={{flex:1,overflow:"auto"}}>
              {previewName.match(/\.(png|jpg|jpeg|gif|webp|tiff|tif)$/i)?<img src={previewUrl} alt={previewName} style={{maxWidth:"100%",margin:"0 auto",display:"block"}}/>:<iframe src={previewUrl} style={{width:"100%",height:"75vh",border:"none"}} title={previewName}/>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
            {["Name / Email","Role","Status","Added","Notifications","Doc Access","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
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
