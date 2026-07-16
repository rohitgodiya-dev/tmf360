"use client";
import{useState,useEffect,useRef}from"react";
import{supabase}from"../../lib/supabase";

const TMF=[
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.04",an:"List of SOPs Current During Trial",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.08",an:"Monitoring Plan",cl:"Core",iso:"6.7, 7.3, 9.2.4.1"},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.01",an:"Delegation of Authority Log",cl:"Core",iso:"6.2, 9.2"},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.02",an:"Staff CVs and Training Records",cl:"Core",iso:"6.2"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Agreements",a:"01.03.01",an:"CRO Agreement",cl:"Core",iso:"6.1"},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Monitoring",a:"01.04.01",an:"Monitoring Visit Report",cl:"Core",iso:"9.2.4"},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Monitoring",a:"01.04.02",an:"Follow-Up Letter",cl:"Core",iso:"9.2.4"},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"Risk Management",a:"01.05.01",an:"Risk Management Plan",cl:"Core",iso:"5.1"},
  {z:"1",zn:"Trial Management",s:"1.06",sn:"Trial Status",a:"01.06.01",an:"Trial Status Report",cl:"Recommended",iso:""},
  {z:"2",zn:"Central Trial Team & Investigator",s:"2.01",sn:"Investigator",a:"02.01.01",an:"Investigator CV",cl:"Core",iso:"6.2"},
  {z:"2",zn:"Central Trial Team & Investigator",s:"2.01",sn:"Investigator",a:"02.01.02",an:"Investigator Licence / GCP Certificate",cl:"Core",iso:"6.2"},
  {z:"2",zn:"Central Trial Team & Investigator",s:"2.02",sn:"Sub-Investigators",a:"02.02.01",an:"Sub-Investigator CVs",cl:"Core",iso:"6.2"},
  {z:"2",zn:"Central Trial Team & Investigator",s:"2.03",sn:"Financial Disclosure",a:"02.03.01",an:"Financial Disclosure Form",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Application",a:"03.01.01",an:"IDE/IND Application",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Application",a:"03.01.02",an:"Regulatory Authority Approval",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.02",sn:"Protocol",a:"03.02.01",an:"Protocol",cl:"Core",iso:"3.1"},
  {z:"3",zn:"Regulatory",s:"3.02",sn:"Protocol",a:"03.02.02",an:"Protocol Amendment",cl:"Core",iso:"3.1"},
  {z:"3",zn:"Regulatory",s:"3.03",sn:"Investigator Brochure",a:"03.03.01",an:"Investigator Brochure",cl:"Core",iso:"6.7"},
  {z:"3",zn:"Regulatory",s:"3.04",sn:"Device Information",a:"03.04.01",an:"Device Description",cl:"Core",iso:"3.6"},
  {z:"3",zn:"Regulatory",s:"3.04",sn:"Device Information",a:"03.04.02",an:"Instructions for Use",cl:"Core",iso:"3.6"},
  {z:"3",zn:"Regulatory",s:"3.05",sn:"Labelling",a:"03.05.01",an:"Device Labelling",cl:"Core",iso:"3.7"},
  {z:"4",zn:"IRB/IEC",s:"4.01",sn:"Submission",a:"04.01.01",an:"IRB/IEC Submission",cl:"Core",iso:""},
  {z:"4",zn:"IRB/IEC",s:"4.01",sn:"Submission",a:"04.01.02",an:"IRB/IEC Approval Letter",cl:"Core",iso:""},
  {z:"4",zn:"IRB/IEC",s:"4.02",sn:"Continuing Review",a:"04.02.01",an:"Continuing Review Approval",cl:"Core",iso:""},
  {z:"4",zn:"IRB/IEC",s:"4.03",sn:"Amendments",a:"04.03.01",an:"IRB/IEC Amendment Approval",cl:"Core",iso:""},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.01",an:"Site Feasibility Questionnaire",cl:"Core",iso:"9.1"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.02",an:"Site Selection Visit Report",cl:"Core",iso:"9.1"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.01",an:"Site Initiation Visit Report",cl:"Core",iso:"9.2"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.02",an:"Site Initiation Visit Certificate",cl:"Core",iso:"9.2"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Site Monitoring",a:"05.03.01",an:"Monitoring Visit Report",cl:"Core",iso:"9.2.4"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Site Monitoring",a:"05.03.02",an:"Site Monitoring Log",cl:"Core",iso:"9.2.4"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Closeout",a:"05.04.01",an:"Site Close-Out Visit Report",cl:"Core",iso:"9.3"},
  {z:"6",zn:"Informed Consent",s:"6.01",sn:"ICF",a:"06.01.01",an:"Informed Consent Form",cl:"Core",iso:"4.8, 9.2.3.6"},
  {z:"6",zn:"Informed Consent",s:"6.01",sn:"ICF",a:"06.01.02",an:"IRB-Approved ICF",cl:"Core",iso:"4.8"},
  {z:"6",zn:"Informed Consent",s:"6.02",sn:"Consent Process",a:"06.02.01",an:"Consent Log",cl:"Core",iso:"4.8"},
  {z:"7",zn:"Product Accountability",s:"7.01",sn:"Accountability",a:"07.01.01",an:"Device Accountability Log",cl:"Core",iso:"9.2.3.5"},
  {z:"7",zn:"Product Accountability",s:"7.01",sn:"Accountability",a:"07.01.02",an:"Device Shipping Records",cl:"Core",iso:""},
  {z:"7",zn:"Product Accountability",s:"7.02",sn:"Maintenance",a:"07.02.01",an:"Device Maintenance Log",cl:"Core",iso:""},
  {z:"8",zn:"Safety Reporting",s:"8.01",sn:"AE Reporting",a:"08.01.01",an:"Adverse Event Log",cl:"Core",iso:"8.1"},
  {z:"8",zn:"Safety Reporting",s:"8.01",sn:"AE Reporting",a:"08.01.02",an:"SAE Report",cl:"Core",iso:"8.2"},
  {z:"8",zn:"Safety Reporting",s:"8.02",sn:"DSMB",a:"08.02.01",an:"DSMB Charter",cl:"Recommended",iso:""},
  {z:"8",zn:"Safety Reporting",s:"8.02",sn:"DSMB",a:"08.02.02",an:"DSMB Meeting Minutes",cl:"Recommended",iso:""},
  {z:"9",zn:"Statistics",s:"9.01",sn:"Statistical Plan",a:"09.01.01",an:"Statistical Analysis Plan",cl:"Core",iso:""},
  {z:"9",zn:"Statistics",s:"9.01",sn:"Statistical Plan",a:"09.01.02",an:"Randomisation Procedure",cl:"Core",iso:""},
  {z:"9",zn:"Statistics",s:"9.02",sn:"Outputs",a:"09.02.01",an:"Statistical Analysis Report",cl:"Core",iso:""},
  {z:"10",zn:"Data Management",s:"10.01",sn:"Data Plan",a:"10.01.01",an:"Data Management Plan",cl:"Core",iso:""},
  {z:"10",zn:"Data Management",s:"10.01",sn:"Data Plan",a:"10.01.02",an:"CRF / eCRF",cl:"Core",iso:""},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Database",a:"10.02.01",an:"Database Lock Certificate",cl:"Core",iso:""},
  {z:"11",zn:"Central & Reference Labs",s:"11.01",sn:"Lab",a:"11.01.01",an:"Lab Certification / Accreditation",cl:"Core",iso:""},
  {z:"11",zn:"Central & Reference Labs",s:"11.01",sn:"Lab",a:"11.01.02",an:"Lab Normal Ranges",cl:"Core",iso:""},
];

const ZONES=[
  {z:"1",zn:"Trial Management"},{z:"2",zn:"Central Trial Team & Investigator"},
  {z:"3",zn:"Regulatory"},{z:"4",zn:"IRB/IEC"},{z:"5",zn:"Site Management"},
  {z:"6",zn:"Informed Consent"},{z:"7",zn:"Product Accountability"},
  {z:"8",zn:"Safety Reporting"},{z:"9",zn:"Statistics"},
  {z:"10",zn:"Data Management"},{z:"11",zn:"Central & Reference Labs"},
];

const ZONE_COLORS:Record<string,string>={
  "1":"#6366F1","2":"#8B5CF6","3":"#EF4444","4":"#F59E0B","5":"#10B981",
  "6":"#3B82F6","7":"#EC4899","8":"#F97316","9":"#14B8A6","10":"#84CC16","11":"#6B7280",
};

const FILE_ICONS:Record<string,string>={
  pdf:"PDF",doc:"DOC",docx:"DOC",xls:"XLS",xlsx:"XLS",ppt:"PPT",pptx:"PPT",
  png:"IMG",jpg:"IMG",jpeg:"IMG",gif:"IMG",mp4:"VID",zip:"ZIP",csv:"CSV",txt:"TXT",
};

interface Study{study_id:string;protocol:string;phase:string;status:string;sponsor:string;user_id:string;org_id?:string;}
interface Doc{id?:string;study_id:string;user_id:string;org_id?:string;artifact_num:string;artifact_name:string;zone:string;version:string;status:string;owner:string;effective_date:string;expiry_date:string;file_path:string;file_name:string;custom_file_name:string;file_type:string;file_size:number;comments:string;approved_by?:string;approved_at?:string;signature_reason?:string;submission_reason?:string;rejection_reason?:string;rejected_by?:string;rejected_at?:string;appeal_reason?:string;quality_score?:number;quality_flags?:string[];}

function fileIcon(n:string){return FILE_ICONS[n.split(".").pop()?.toLowerCase()||""]||"FILE";}
function canPreview(n:string){return["pdf","png","jpg","jpeg","gif","webp"].includes(n.split(".").pop()?.toLowerCase()||"");}
function formatSize(b:number){if(b<1024)return b+" B";if(b<1024*1024)return(b/1024).toFixed(1)+" KB";return(b/(1024*1024)).toFixed(1)+" MB";}
function scoreColor(s:number){return s>=80?"#10B981":s>=60?"#F59E0B":"#EF4444";}
function padZone(z:string){return z.padStart(2,"0");}
function formatSection(s:string){const parts=(s||"").split(".");if(parts.length<2)return s||"00.00";return `${parts[0].padStart(2,"0")}.${parts[1]}`;}

export default function Platform(){
  const[panel,setPanel]=useState("auth");
  const[user,setUser]=useState<any>(null);
  const[currentUserRole,setCurrentUserRole]=useState<string>("");
  const[canUploadDownload,setCanUploadDownload]=useState<boolean>(true);
  const[canDownload,setCanDownload]=useState<boolean>(true);
  const[orgId,setOrgId]=useState<string>("");
  const[authMode,setAuthMode]=useState<"login"|"signup">("login");
  const[showLoginPwd,setShowLoginPwd]=useState(false);
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[authError,setAuthError]=useState("");
  const[studies,setStudies]=useState<Study[]>([]);
  const[docs,setDocs]=useState<Doc[]>([]);
  const[activeStudy,setActiveStudy]=useState<Study|null>(null);
  const[docFilter,setDocFilter]=useState("all");
  const[docSearch,setDocSearch]=useState("");
  const[artSearch,setArtSearch]=useState("");
  const[artZone,setArtZone]=useState("");
  const[artCl,setArtCl]=useState("");
  const[gapZone,setGapZone]=useState("");
  const[expandedArt,setExpandedArt]=useState<string|null>(null);
  const[showStudyModal,setShowStudyModal]=useState(false);
  const[showDocModal,setShowDocModal]=useState(false);
  const[showSubmitModal,setShowSubmitModal]=useState(false);
  const[showApproveModal,setShowApproveModal]=useState(false);
  const[showCommentModal,setShowCommentModal]=useState(false);
  const[selectedDoc,setSelectedDoc]=useState<Doc|null>(null);
  const[fId,setFId]=useState("");
  const[fProtocol,setFProtocol]=useState("");
  const[fPhase,setFPhase]=useState("Phase I");
  const[fStatus,setFStatus]=useState("Startup");
  const[fSponsor,setFSponsor]=useState("");
  const[fZone,setFZone]=useState("1");
  const[fArtifact,setFArtifact]=useState("");
  const[fVersion,setFVersion]=useState("");
  const[fDocStatus,setFDocStatus]=useState("Draft");
  const[fOwner,setFOwner]=useState("");
  const[fEff,setFEff]=useState("");
  const[fExp,setFExp]=useState("");
  const[fComments,setFComments]=useState("");
  const[fCustomName,setFCustomName]=useState("");
  const[uploading,setUploading]=useState(false);
  const[uploadProgress,setUploadProgress]=useState("");
  const[dragOver,setDragOver]=useState(false);
  const[selectedFile,setSelectedFile]=useState<File|null>(null);
  const[pendingFilePath,setPendingFilePath]=useState("");
  const[pendingFileName,setPendingFileName]=useState("");
  const[pendingFileType,setPendingFileType]=useState("");
  const[pendingFileSize,setPendingFileSize]=useState(0);
  const[zoneArts,setZoneArts]=useState<any[]>([]);
  const[submissionReason,setSubmissionReason]=useState("");
  const[approvePassword,setApprovePassword]=useState("");
  const[approveReason,setApproveReason]=useState("");
  const[approveError,setApproveError]=useState("");
  const[commentText,setCommentText]=useState("");
  const[previewUrl,setPreviewUrl]=useState<string|null>(null);
  const[previewName,setPreviewName]=useState("");
  const[chatMessages,setChatMessages]=useState<{role:string;text:string;isHealthCard?:boolean;docId?:string;sourceTags?:string[];classification?:{zoneLine:string;confidence:number;warning?:{detail:string;action:string}}}[]>([{role:"ai",text:"Hi, I'm Trinity - your TMF AI specialist for this study. I can classify uploaded documents against the tracker, and answer questions about this study's trial master file."}]);
  const[chatInput,setChatInput]=useState("");
  const[chatLoading,setChatLoading]=useState(false);
const[chatDocAction,setChatDocAction]=useState<{msgIdx:number,stage:number,disabled:boolean}|null>(null);
const[flagComment,setFlagComment]=useState("");
const[flagStage,setFlagStage]=useState<"idle"|"form"|"done">("idle");
const[flagMsgIdx,setFlagMsgIdx]=useState<number|null>(null);
const[flagDocId,setFlagDocId]=useState<string|null>(null);
const[flagReason,setFlagReason]=useState("");
const[approveStage,setApproveStage]=useState<0|1|2|3>(0);
const[approveDocId,setApproveDocId]=useState<string|null>(null);
  const messagesEnd=useRef<HTMLDivElement>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const chatFileInputRef=useRef<HTMLInputElement>(null);

  const P={
    primary:"#6366F1",primaryLight:"#EEF2FF",primaryDark:"#4F46E5",
    text:"#111827",textSec:"#374151",textTert:"#6B7280",textMuted:"#9CA3AF",
    bg:"#FFFFFF",bgSec:"#F9FAFB",bgTert:"#F3F4F6",
    border:"#E5E7EB",borderSec:"#D1D5DB",
    success:"#10B981",successLight:"#ECFDF5",
    danger:"#EF4444",dangerLight:"#FEF2F2",
    warning:"#F59E0B",warningLight:"#FFFBEB",
    blue:"#3B82F6",blueLight:"#EFF6FF",
  };

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        setUser(session.user);
        supabase.from("user_roles").select("org_id").eq("user_id",session.user.id).single().then(({data})=>{
          if(!data||!data.org_id){window.location.href="/setup";}
          else{setPanel("dashboard");loadUserRole(session.user.id);}
        });
      }
    });
    supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user){
        setUser(session.user);
        supabase.from("user_roles").select("org_id").eq("user_id",session.user.id).single().then(({data})=>{
          if(!data||!data.org_id){window.location.href="/setup";}
          else{setPanel("dashboard");loadUserRole(session.user.id);}
        });
      }else{
        setUser(null);setPanel("auth");setStudies([]);setDocs([]);setActiveStudy(null);
      }
    });
  },[]);

  useEffect(()=>{messagesEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMessages]);

  async function loadUserRole(uid:string){
    const{data}=await supabase.from("user_roles").select("role,can_upload_download,can_download,org_id").eq("user_id",uid).single();
    if(data){
      setCurrentUserRole(data.role);
      setCanUploadDownload(data.can_upload_download!==false);
      setCanDownload(data.can_download!==false);
      if(data.org_id){setOrgId(data.org_id);loadStudiesWithOrg(data.org_id);}
    }
  }

  async function loadStudiesWithOrg(oid:string){
    const{data}=await supabase.from("studies").select("*").eq("org_id",oid).order("created_at",{ascending:false});
    if(data&&data.length>0){setStudies(data);setActiveStudy(data[0]);loadDocsWithOrg(data[0].study_id,oid);}
    else setStudies([]);
  }

  async function loadDocsWithOrg(studyId:string,oid:string){
    const{data}=await supabase.from("documents").select("*").eq("study_id",studyId).eq("org_id",oid).order("created_at",{ascending:false});
    if(data)setDocs(data);
  }

  function loadDocs(studyId:string,uid:string){
    if(orgId)loadDocsWithOrg(studyId,orgId);
  }

  async function handleAuth(){
    setAuthError("");
    if(authMode==="signup"){
      const{error}=await supabase.auth.signUp({email,password});
      if(error)setAuthError(error.message);
      else setAuthError("Account created! Check your email to confirm, then log in.");
    }else{
      const{error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setAuthError(error.message);
    }
  }

  async function handleSignOut(){
    await supabase.auth.signOut();
    setUser(null);setPanel("auth");setStudies([]);setDocs([]);setActiveStudy(null);
    setOrgId("");setCurrentUserRole("");
  }

  async function logAudit(action:string,docId:string|undefined,studyId:string,field:string,oldVal:string,newVal:string,sigReason:string=""){
    await supabase.from("audit_trail").insert([{
      user_id:user.id,user_email:user.email,action,document_id:docId,
      study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,
    }]);
  }

  async function createStudy(){
    if(!fId.trim()||!user||!orgId)return;
    const s={study_id:fId,protocol:fProtocol,phase:fPhase,status:fStatus,sponsor:fSponsor,user_id:user.id,org_id:orgId};
    const{data,error}=await supabase.from("studies").insert([s]).select();
    if(!error&&data){const ns=data[0];setStudies(prev=>[ns,...prev]);setActiveStudy(ns);setDocs([]);}
    setShowStudyModal(false);setFId("");setFProtocol("");setFSponsor("");setPanel("dashboard");
  }

  async function handleFileUpload(file:File){
    if(!user||!activeStudy)return;
    setUploading(true);setUploadProgress("Uploading...");
    const path=`${user.id}/${activeStudy.study_id}/${Date.now()}_${file.name}`;
    const{error:upErr}=await supabase.storage.from("Documents").upload(path,file);
    if(upErr){setUploadProgress("Upload failed: "+upErr.message);setUploading(false);return;}
    setPendingFilePath(path);setPendingFileName(file.name);setPendingFileType(file.type);setPendingFileSize(file.size);
    setSelectedFile(file);setUploadProgress("v "+file.name+" ready");setUploading(false);
  }

  async function addDocument(){
    if(!user||!activeStudy||!orgId)return;
    const[artNum,an,zone]=fArtifact.split("|");
    const d:Doc={
      study_id:activeStudy.study_id,user_id:user.id,org_id:orgId,
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
      fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"document_uploaded",document_name:fCustomName||pendingFileName||an,artifact_name:an,zone,study_id:activeStudy.study_id,uploaded_by:user.email})});
    }
    setShowDocModal(false);setFArtifact("");setFVersion("");setFOwner("");setFEff("");setFExp("");setFComments("");setFCustomName("");setPendingFilePath("");setPendingFileName("");setPendingFileType("");setPendingFileSize(0);setSelectedFile(null);setUploadProgress("");
  }

  async function handleApprove(){
    if(!selectedDoc||!user)return;
    setApproveError("");
    if(!approvePassword){setApproveError("Please enter your password.");return;}
    if(!approveReason){setApproveError("Please select a reason.");return;}
    const{error:signInErr}=await supabase.auth.signInWithPassword({email:user.email,password:approvePassword});
    if(signInErr){setApproveError("Incorrect password.");return;}
    const now=new Date().toISOString();
    const{error}=await supabase.from("documents").update({status:"Approved",approved_by:user.email,approved_at:now,signature_reason:approveReason}).eq("id",selectedDoc.id);
    if(!error){
      await logAudit("Document approved",selectedDoc.id,selectedDoc.study_id,"status","Under Review","Approved",approveReason);
      setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,status:"Approved",approved_by:user.email,approved_at:now,signature_reason:approveReason}:d));
      setChatMessages(prev=>[...prev,{role:"ai",text:`"${selectedDoc.custom_file_name||selectedDoc.artifact_name}" has been approved and filed. Audit trail entry recorded.`}]);
      setShowApproveModal(false);setApprovePassword("");setApproveReason("");setSelectedDoc(null);
    }
  }

  async function handleAddComment(){
    if(!selectedDoc||!commentText.trim())return;
    const existing=selectedDoc.comments||"";
    const newComment=`${existing}${existing?"\n":""}[${new Date().toLocaleString()} - ${user.email}]: ${commentText.trim()}`;
    const{error}=await supabase.from("documents").update({comments:newComment}).eq("id",selectedDoc.id);
    if(!error){
      await logAudit("Comment added",selectedDoc.id,selectedDoc.study_id,"comments","",commentText.trim());
      setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,comments:newComment}:d));
      setShowCommentModal(false);setCommentText("");setSelectedDoc(null);
    }
  }

  function openPreview(d:Doc){
    const url=supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl;
    setPreviewUrl(url);setPreviewName(d.custom_file_name||d.file_name||"Document");
  }

  function detectFlagReason(doc:Doc){
    if(!doc.version||doc.version.trim()===""){return "Missing version - no version number is on file for this document.";}
    if(doc.expiry_date&&new Date(doc.expiry_date)<new Date()){return `Document expired - the effective document expired on ${doc.expiry_date}.`;}
    return `Version mismatch - document version ${doc.version} does not match the current tracked version for this artifact.`;
  }

  function presentClassification(){
    if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Select a study first."}]);return;}
    const pendingDoc=studyDocs.find(d=>d.status==="Under Review");
    if(!pendingDoc){
      setChatMessages(prev=>[...prev,{role:"ai",text:`There are no documents currently under review in ${activeStudy.study_id}.`}]);
      return;
    }
    const art=TMF.find(a=>a.a===pendingDoc.artifact_num);
    const{score:confidence,flags}=calcQuality(pendingDoc);
    const zoneLine=`Zone ${padZone(pendingDoc.zone)} - Section ${formatSection(art?.s||"")} - ${art?.an||pendingDoc.artifact_name}`;
    const warning=flags.length>0?{detail:detectFlagReason(pendingDoc),action:"Request the current version from the site before filing, or flag this for reviewer follow-up."}:undefined;
    setChatMessages(prev=>{
      const idx=prev.length;
      setChatDocAction({msgIdx:idx,stage:0,disabled:false});
      return[...prev,{role:"ai",text:"I've classified this document and checked it against the version tracker.",docId:pendingDoc.id,classification:{zoneLine,confidence,warning}}];
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

    // TMF health / status snapshot
    if(activeStudy&&/(health|status|readiness|overview)/.test(lower)&&/(tmf|study|trial)/.test(lower)){
      const summary=`${donePct}% complete, with ${missing} core document${missing!==1?"s":""} still outstanding and ${pending} awaiting review. Inspection readiness is ${ri}/100 for ${activeStudy.study_id}.`;
      setChatMessages(prev=>[...prev,{role:"ai",text:summary,isHealthCard:true,sourceTags:["Gap analysis","Inspection readiness","Document tracker"]}]);
      setChatLoading(false);
      return;
    }

    // "Why was this flagged / rejected" lookups - scoped to the active study only
    if(activeStudy&&/why/.test(lower)&&/(flag|reject)/.test(lower)){
      const flaggedDoc=studyDocs.find(d=>d.status==="Draft"&&(d as any).rejection_reason);
      if(flaggedDoc){
        setChatMessages(prev=>[...prev,{role:"ai",text:`"${flaggedDoc.custom_file_name||flaggedDoc.artifact_name}" (${flaggedDoc.artifact_num}) was flagged for this reason:\n${(flaggedDoc as any).rejection_reason}`,sourceTags:["Document tracker","Audit trail"]}]);
      }else{
        setChatMessages(prev=>[...prev,{role:"ai",text:`There are no flagged documents in ${activeStudy.study_id} right now.`}]);
      }
      setChatLoading(false);
      return;
    }

    // Document review / approve / flag / upload intent
    if(activeStudy&&/(review|approve|classify|flag|upload)/.test(lower)&&/(doc|document|file|tracker)/.test(lower)){
      presentClassification();
      setChatLoading(false);
      return;
    }

    try{
      const studyContext=activeStudy?`Active study: ${activeStudy.study_id} (${activeStudy.protocol}). Documents filed: ${docs.length}. TMF completeness: ${donePct}%. Inspection readiness score: ${ri}. Missing core documents: ${missing}. Documents pending review: ${pending}.`:"No active study.";
      const recentTurns=chatMessages.slice(-6).map(m=>`${m.role==="user"?"User":"Trinity"}: ${m.text}`).join("\n");
      const scopeNote=activeStudy?`Only answer using data for study ${activeStudy.study_id}. Never reference other studies or organisation-wide data.`:"";
      const context=`${studyContext}\nRecent conversation:\n${recentTurns}\n${scopeNote}`;
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,context})});
      const data=await res.json();
      setChatMessages(prev=>[...prev,{role:"ai",text:data.response||"I couldn't process that request."}]);
    }catch{setChatMessages(prev=>[...prev,{role:"ai",text:"Error connecting to AI. Please try again."}]);}
    setChatLoading(false);
  }

  const studyDocs=docs;
  const filteredDocs=studyDocs.filter(d=>{
    if(docFilter!=="all"&&d.status!==docFilter)return false;
    if(docSearch&&!d.artifact_name?.toLowerCase().includes(docSearch.toLowerCase())&&!d.custom_file_name?.toLowerCase().includes(docSearch.toLowerCase()))return false;
    return true;
  });
  const filteredArts=TMF.filter(a=>{
    if(artZone&&a.z!==artZone)return false;
    if(artCl&&a.cl!==artCl)return false;
    if(artSearch&&!a.an.toLowerCase().includes(artSearch.toLowerCase())&&!a.a.includes(artSearch))return false;
    return true;
  });
  const filedNames=studyDocs.filter(d=>d.status==="Approved").map(d=>d.artifact_num);
  const zoneComp=(z:string)=>{
    const total=TMF.filter(a=>a.cl==="Core"&&a.z===z).length;
    const filed=studyDocs.filter(d=>d.status==="Approved"&&TMF.some(a=>a.a===d.artifact_num&&a.z===z)).length;
    return total?Math.round((filed/total)*100):0;
  };
  const coreArts=TMF.filter(a=>a.cl==="Core");
  const critZones=["3","4","5"];const majZones=["1","2","7"];
  const gaps={
    crit:coreArts.filter(a=>critZones.includes(a.z)&&!filedNames.includes(a.a)).map(a=>({...a,zn:ZONES.find(z=>z.z===a.z)?.zn||""})),
    major:coreArts.filter(a=>majZones.includes(a.z)&&!filedNames.includes(a.a)).map(a=>({...a,zn:ZONES.find(z=>z.z===a.z)?.zn||""})),
    minor:coreArts.filter(a=>!critZones.includes(a.z)&&!majZones.includes(a.z)&&!filedNames.includes(a.a)).map(a=>({...a,zn:ZONES.find(z=>z.z===a.z)?.zn||""})),
  };
  const totalCore=coreArts.length;
  const filedCore=coreArts.filter(a=>filedNames.includes(a.a)).length;
  const donePct=totalCore?Math.round((filedCore/totalCore)*100):0;
  const missing=gaps.crit.length+gaps.major.length+gaps.minor.length;
  const expiring=studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).length;
  const pending=studyDocs.filter(d=>d.status==="Under Review").length;

  const totalW=ZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+w;},[0] as any);
  const earnedW=ZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+(zoneComp(z)/100)*w;},[0] as any);
  const ri=totalW?Math.round((earnedW/totalW)*100):0;

  function statusBadge(s:string){
    const c:Record<string,any>={
      "Draft":{bg:"#F3F4F6",color:"#374151"},
      "Under Review":{bg:"#EFF6FF",color:"#1D4ED8"},
      "Approved":{bg:"#ECFDF5",color:"#065F46"},
      "Archived":{bg:"#F3F4F6",color:"#6B7280"},
    };
    const st=c[s]||c["Draft"];
    return<span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:st.bg,color:st.color,fontWeight:"500"}}>{s}</span>;
  }

  const navItem=(id:string,label:string,icon:string)=>(
    <button key={id} onClick={()=>{setPanel(id);if(activeStudy&&user&&orgId)loadDocsWithOrg(activeStudy.study_id,orgId);}}
      style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",border:"none",cursor:"pointer",width:"100%",textAlign:"left",fontSize:"12px",background:panel===id?P.primaryLight:"transparent",color:panel===id?P.primary:P.textSec,fontWeight:panel===id?"500":"400"}}>
      <i className={`ti ${icon}`} style={{fontSize:"15px"}}/>
      {label}
    </button>
  );

  if(panel==="auth")return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"360px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:"24px",fontWeight:"500",color:P.text}}>TMF<span style={{color:P.primary}}>360</span></div>
          <div style={{fontSize:"12px",color:P.textTert,marginTop:"4px"}}>Trial Master File Platform - Free for clinical research</div>
          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>DIA TMF Reference Model v3.3.1 - ISO 14155 - 21 CFR Part 11</div>
        </div>
        <div style={{display:"flex",gap:"6px",marginBottom:"1.25rem"}}>
          {(["login","signup"] as const).map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{flex:1,padding:"7px",fontSize:"12px",borderRadius:"8px",border:`0.5px solid ${authMode===m?P.primary:P.border}`,background:authMode===m?P.primaryLight:"transparent",color:authMode===m?P.primary:P.textSec,fontWeight:authMode===m?"500":"400",cursor:"pointer"}}>
              {m==="login"?"Log in":"Sign up"}
            </button>
          ))}
        </div>
        <div style={{marginBottom:"12px"}}>
          <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@organisation.com" style={{width:"100%",fontSize:"12px",padding:"8px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
        </div>
        <div style={{marginBottom:"1rem"}}>
          <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Password</label>
          <div style={{position:"relative" as const}}>
            <input value={password} onChange={e=>setPassword(e.target.value)} type={showLoginPwd?"text":"password"} placeholder="--------" style={{width:"100%",fontSize:"12px",padding:"8px 36px 8px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
            <button onClick={()=>setShowLoginPwd(!showLoginPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"14px",color:P.textTert}}>{showLoginPwd?"FILE":"FILE"}</button>
          </div>
        </div>
        {authError&&<div style={{fontSize:"11px",marginBottom:"12px",padding:"8px 10px",borderRadius:"8px",background:authError.includes("created")||authError.includes("Check")?P.successLight:P.dangerLight,color:authError.includes("created")||authError.includes("Check")?P.success:P.danger}}>{authError}</div>}
        <button onClick={handleAuth} style={{width:"100%",padding:"9px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:"500",cursor:"pointer"}}>
          {authMode==="login"?"Log in":"Create account"}
        </button>
        <p style={{fontSize:"10px",color:P.textTert,textAlign:"center",marginTop:"1rem"}}>Free forever - No credit card - 21 CFR Part 11 compliant</p>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:P.bgSec,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css"/>

      {/* Header */}
      <header style={{display:"flex",alignItems:"center",gap:"12px",padding:"0 1.25rem",height:"48px",borderBottom:`0.5px solid ${P.border}`,background:P.bg,flexShrink:0}}>
        <span style={{fontSize:"16px",fontWeight:"500"}}>TMF<span style={{color:P.primary}}>360</span></span>
        <span style={{fontSize:"11px",color:P.textTert}}>Trial Master File Platform - DIA TMF RM v3.3.1</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
          {studies.length>0&&(
            <select value={activeStudy?.study_id||""} onChange={e=>{const s=studies.find(x=>x.study_id===e.target.value);if(s){setActiveStudy(s);if(orgId)loadDocsWithOrg(s.study_id,orgId);}}} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"3px 8px",background:P.bg}}>
              {studies.map(s=><option key={s.study_id} value={s.study_id}>{s.study_id}</option>)}
            </select>
          )}
          {activeStudy&&<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",background:P.primaryLight,color:P.primary,fontWeight:"500"}}>{activeStudy.status}</span>}
          <span style={{fontSize:"11px",color:P.textTert}}>{user?.email}</span>
          <button onClick={handleSignOut} style={{fontSize:"11px",color:P.textTert,background:"transparent",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"3px 10px",cursor:"pointer"}}>Sign out</button>
        </div>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <aside style={{width:"192px",borderRight:`0.5px solid ${P.border}`,background:P.bg,overflowY:"auto",flexShrink:0,padding:"8px"}}>
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"8px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Overview</p>
          {navItem("dashboard","Dashboard","ti-layout-dashboard")}
          {navItem("studies","Studies","ti-flask")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>TMF</p>
          {navItem("documents","Documents","ti-files")}
          {navItem("artifacts","Artifact browser","ti-layout-grid")}
          {navItem("gap","Gap analysis","ti-clipboard-check")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Intelligence</p>
          {navItem("readiness","Inspection readiness","ti-shield-check")}
          {navItem("chat","AI specialist","ti-message-circle")}
          {navItem("audit","Audit trail","ti-lock")}
          {navItem("quality","Quality checks","ti-clipboard-list")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Team</p>
          {navItem("users","User management","ti-users")}
          {navItem("profile","My profile","ti-user-circle")}
          {navItem("messages","Messages","ti-message-2")}
        </aside>

        <main style={{flex:1,overflowY:"auto",padding:"1.25rem"}}>

          {/* DASHBOARD */}
          {panel==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Dashboard {activeStudy?`- ${activeStudy.study_id}`:""}</h1>
                {currentUserRole==="System Administrator"&&<button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ New study</button>}
              </div>
              {!activeStudy?(
                <div style={{textAlign:"center",padding:"3rem",color:P.textTert}}>
                  <div style={{fontSize:"3rem",marginBottom:"12px"}}>??</div>
                  <div style={{fontSize:"13px",fontWeight:"500",marginBottom:"6px",color:P.text}}>No studies yet</div>
                  <div style={{fontSize:"12px",marginBottom:"1rem"}}>Create your first study to get started.</div>
                  {currentUserRole==="System Administrator"&&<button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"8px 18px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Create first study</button>}
                </div>
              ):(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
                    {[
                      {val:`${donePct}%`,label:"TMF completeness",color:scoreColor(donePct),bg:P.bg,page:"completeness-detail"},
                      {val:missing,label:"Missing documents",color:"#EF4444",bg:"#FEF2F2",page:"missing-detail"},
                      {val:studyDocs.filter(d=>d.status!=="Approved"&&d.status!=="Archived").length,label:"Not approved",color:"#F59E0B",bg:"#FFFBEB",page:"notapproved-detail"},
                      {val:expiring,label:"Expiring (90 days)",color:"#EF4444",bg:"#FEF2F2",page:"expiring-detail"},
                      {val:pending,label:"Pending review",color:P.primary,bg:P.primaryLight,page:"pending-detail"},
                    ].map((m,i)=>(
                      <div key={i} onClick={()=>setPanel((m as any).page)} style={{background:m.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px",cursor:"pointer"}}>
                        <div style={{fontSize:"24px",fontWeight:"500",color:m.color}}>{m.val}</div>
                        <div style={{fontSize:"11px",color:P.textSec,marginTop:"3px"}}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                      <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"12px",color:P.textSec}}>TMF completeness by zone</h2>
                      {ZONES.map(({z,zn})=>{const p=zoneComp(z);return(
                        <div key={z} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                          <span style={{fontSize:"9px",color:P.textTert,width:"14px"}}>{z}</span>
                          <span style={{fontSize:"11px",color:P.textSec,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{zn}</span>
                          <div style={{width:"80px",height:"4px",background:P.bgTert,borderRadius:"4px",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:ZONE_COLORS[z]||P.primary,borderRadius:"4px"}}/></div>
                          <span style={{fontSize:"10px",fontWeight:"500",width:"28px",textAlign:"right",color:scoreColor(p)}}>{p}%</span>
                        </div>
                      );})}
                    </div>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                      <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"12px",color:P.textSec}}>Inspection readiness</h2>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:"16px"}}>
                        <span style={{fontSize:"48px",fontWeight:"500",color:scoreColor(ri)}}>{ri}</span>
                        <span style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Readiness score</span>
                        <div style={{width:"100%",height:"6px",background:P.bgTert,borderRadius:"6px",marginTop:"8px",overflow:"hidden"}}><div style={{width:`${ri}%`,height:"100%",background:scoreColor(ri),borderRadius:"6px"}}/></div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                        {gaps.crit.slice(0,2).map((g,i)=><div key={i} style={{fontSize:"11px",background:"#FEF2F2",color:"#991B1B",borderRadius:"6px",padding:"4px 8px"}}>? {g.an}</div>)}
                        {gaps.major.slice(0,2).map((g,i)=><div key={i} style={{fontSize:"11px",background:"#FFFBEB",color:"#92400E",borderRadius:"6px",padding:"4px 8px"}}>? {g.an}</div>)}
                        {gaps.crit.length===0&&gaps.major.length===0&&<div style={{fontSize:"11px",color:P.success}}>? No critical or major findings</div>}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* COMPLETENESS DETAIL */}
          {panel==="completeness-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>? Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>TMF completeness - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#1E40AF"}}>Showing all Core artifacts. Green = approved document filed. Red = missing.</div>
              {ZONES.map(({z,zn})=>{
                const zoneArtsAll=TMF.filter(a=>a.cl==="Core"&&a.z===z);
                const pct=zoneComp(z);
                return(
                  <div key={z} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderBottom:`0.5px solid ${P.border}`}}>
                      <span style={{fontSize:"12px",fontWeight:"500"}}>Zone {z} - {zn}</span>
                      <div style={{flex:1,height:"4px",background:P.bgTert,borderRadius:"4px",overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:ZONE_COLORS[z]||P.primary}}/></div>
                      <span style={{fontSize:"11px",fontWeight:"500",color:scoreColor(pct)}}>{pct}%</span>
                    </div>
                    {zoneArtsAll.map(a=>{
                      const filed=studyDocs.find(d=>d.artifact_num===a.a&&d.status==="Approved");
                      return(
                        <div key={a.a} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 14px",borderBottom:`0.5px solid ${P.bgTert}`}}>
                          <span style={{fontSize:"14px"}}>{filed?"?":"?"}</span>
                          <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert,flexShrink:0}}>{a.a}</span>
                          <span style={{fontSize:"11px",flex:1,color:filed?P.text:P.textSec}}>{a.an}</span>
                          {filed&&filed.file_path&&canDownload&&(
                            <a href={supabase.storage.from("Documents").getPublicUrl(filed.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>View</a>
                          )}
                          {filed&&<span style={{fontSize:"9px",color:"#065F46",flexShrink:0}}>v{filed.version||"1"}</span>}
                          {!filed&&canUploadDownload&&<button onClick={()=>{setFZone(a.z);setFArtifact(a.a+"|"+a.an+"|"+a.z);setShowDocModal(true);}} style={{fontSize:"9px",padding:"2px 8px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"4px",cursor:"pointer"}}>+ Upload</button>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* MISSING DETAIL */}
          {panel==="missing-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>? Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Missing documents - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>These Core artifacts have no document filed. CRITICAL gaps in Zones 3, 4, 5 are inspection risks.</div>
              {["CRITICAL","MAJOR","MINOR"].map(sev=>{
                const sevZones=sev==="CRITICAL"?["3","4","5"]:sev==="MAJOR"?["1","2","7"]:["6","8","9","10","11"];
                const items=TMF.filter(a=>a.cl==="Core"&&sevZones.includes(a.z)&&!filedNames.some(f=>f===a.a));
                if(!items.length)return null;
                const colors:Record<string,any>={CRITICAL:{bg:"#FEF2F2",color:"#991B1B",border:"#FECACA"},MAJOR:{bg:"#FFFBEB",color:"#92400E",border:"#FDE68A"},MINOR:{bg:"#F9FAFB",color:"#374151",border:"#E5E7EB"}};
                const c=colors[sev];
                return(
                  <div key={sev} style={{border:`0.5px solid ${c.border}`,borderRadius:"12px",overflow:"hidden"}}>
                    <div style={{background:c.bg,color:c.color,padding:"8px 14px",fontSize:"11px",fontWeight:"500"}}>{sev} - {items.length} gap{items.length!==1?"s":""}</div>
                    {items.map((a,i)=>(
                      <div key={i} style={{borderTop:`0.5px solid ${P.bgTert}`,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",background:P.bg}}>
                        <div><div style={{fontSize:"12px",fontWeight:"500"}}>{a.an}</div><div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>Zone {a.z} - {a.zn}</div></div>
                        <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{a.a}</div>{a.iso&&<div style={{fontFamily:"monospace",fontSize:"10px",color:P.blue}}>{a.iso}</div>}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* NOT APPROVED DETAIL */}
          {panel==="notapproved-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>? Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Not approved - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>These documents were rejected. Review the rejection reason and appeal if needed.</div>
              {studyDocs.filter(d=>d.status==="Draft"&&(d as any).rejection_reason).length===0?(
                <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No rejected documents.</div>
              ):studyDocs.filter(d=>d.status==="Draft"&&(d as any).rejection_reason).map((d,i)=>(
                <div key={i} style={{background:P.bg,border:`0.5px solid #FECACA`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
                        <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
                        {statusBadge(d.status)}
                      </div>
                      <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} - {d.owner||"-"}</div>
                    </div>
                    {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                  </div>
                  <div style={{background:"#FEF2F2",borderRadius:"8px",padding:"10px 12px"}}>
                    <div style={{fontSize:"10px",fontWeight:"500",color:"#991B1B",marginBottom:"3px"}}>Rejection reason:</div>
                    <div style={{fontSize:"11px",color:"#7F1D1D"}}>{(d as any).rejection_reason}</div>
                  </div>
                  {(d as any).appeal_reason?(
                    <div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}>
                      <div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>Appeal submitted:</div>
                      <div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
                      <div style={{flex:1}}>
                        <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Appeal justification</label>
                        <textarea id={`appeal-${d.id}`} placeholder="Provide justification for appeal..." style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"6px 8px",resize:"vertical" as const,minHeight:"60px"}}/>
                      </div>
                      <button onClick={async()=>{
                        const ta=document.getElementById(`appeal-${d.id}`) as HTMLTextAreaElement;
                        if(!ta?.value.trim())return;
                        const{error}=await supabase.from("documents").update({status:"Under Review",appeal_reason:ta.value.trim()}).eq("id",d.id);
                        if(!error){await logAudit("Appeal submitted",d.id,d.study_id,"appeal_reason","",ta.value.trim());setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Under Review",appeal_reason:ta.value.trim()} as any:doc));}
                      }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Submit Appeal</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* EXPIRING DETAIL */}
          {panel==="expiring-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>? Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Expiring documents - {activeStudy?.study_id}</h1>
              </div>
              {studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).length===0?(
                <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents expiring within 90 days.</div>
              ):studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).map((d,i)=>{
                const daysLeft=Math.ceil((new Date(d.expiry_date).getTime()-Date.now())/(86400000));
                const isExpired=daysLeft<0;const isCritical=daysLeft<=30;
                return(
                  <div key={i} style={{background:P.bg,border:`0.5px solid ${isExpired?"#FECACA":isCritical?"#FDE68A":P.border}`,borderRadius:"10px",padding:"14px",display:"flex",gap:"14px",alignItems:"center"}}>
                    <div style={{width:"60px",height:"60px",borderRadius:"10px",background:isExpired?"#FEF2F2":isCritical?"#FFFBEB":"#F0FDF4",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:"18px",fontWeight:"500",color:isExpired?"#EF4444":isCritical?"#F59E0B":"#10B981"}}>{isExpired?"EXP":daysLeft}</span>
                      <span style={{fontSize:"8px",color:isExpired?"#EF4444":isCritical?"#F59E0B":"#10B981"}}>{isExpired?"expired":"days"}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
                        <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
                        {statusBadge(d.status)}
                      </div>
                      <div style={{fontSize:"10px",color:P.textTert}}>Expires: <span style={{color:isExpired?"#EF4444":"inherit"}}>{d.expiry_date}</span></div>
                    </div>
                    {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                  </div>
                );
              })}
            </div>
          )}

          {/* PENDING DETAIL */}
          {panel==="pending-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>? Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Pending review - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:P.primaryLight,border:`0.5px solid #C7D2FE`,borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#3730A3"}}>Review submitted documents. Approve with electronic signature or reject with a reason.</div>
              {studyDocs.filter(d=>d.status==="Under Review").length===0?(
                <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents pending review.</div>
              ):studyDocs.filter(d=>d.status==="Under Review").map((d,i)=>(
                <div key={i} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
                        <span style={{fontSize:"13px",fontWeight:"500"}}>{d.artifact_name}</span>
                        {statusBadge(d.status)}
                      </div>
                      <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} - Owner: {d.owner||"-"}</div>
                    </div>
                    <div style={{display:"flex",gap:"6px"}}>
                      {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"3px 8px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}
                      {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"3px 8px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                    </div>
                  </div>
                  {(d as any).submission_reason&&<div style={{background:"#EFF6FF",borderRadius:"8px",padding:"10px 12px"}}><div style={{fontSize:"10px",fontWeight:"500",color:"#1E40AF",marginBottom:"3px"}}>Submission reason:</div><div style={{fontSize:"11px",color:"#1E3A5F"}}>{(d as any).submission_reason}</div></div>}
                  {(d as any).appeal_reason&&<div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}><div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>Appeal reason:</div><div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div></div>}
                  <div style={{display:"flex",gap:"8px",alignItems:"flex-end",borderTop:`0.5px solid ${P.border}`,paddingTop:"10px"}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Review notes</label>
                      <textarea id={`review-comment-${d.id}`} placeholder="Add review notes before approving or rejecting..." style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"6px 8px",resize:"vertical" as const,minHeight:"50px"}}/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column" as const,gap:"6px",flexShrink:0}}>
                      <button onClick={async()=>{
                        const ta=document.getElementById(`review-comment-${d.id}`) as HTMLTextAreaElement;
                        if(ta?.value.trim()){const existing=d.comments||"";const newComment=`${existing}${existing?"\n":""}[${new Date().toLocaleString()} - ${user.email}]: ${ta.value.trim()}`;await supabase.from("documents").update({comments:newComment}).eq("id",d.id);setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,comments:newComment}:doc));ta.value="";}
                        setSelectedDoc(d);setShowApproveModal(true);
                      }} style={{fontSize:"11px",padding:"7px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>? Approve</button>
                      <button onClick={async()=>{
                        const ta=document.getElementById(`review-comment-${d.id}`) as HTMLTextAreaElement;
                        const reason=ta?.value.trim();
                        if(!reason){alert("Please add a rejection reason before rejecting.");return;}
                        const now=new Date().toISOString();
                        const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:reason,rejected_by:user.email,rejected_at:now}).eq("id",d.id);
                        if(!error){await logAudit("Document rejected",d.id,d.study_id,"status","Under Review","Draft",reason);setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Draft",rejection_reason:reason,rejected_by:user.email,rejected_at:now} as any:doc));}
                      }} style={{fontSize:"11px",padding:"7px 14px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"8px",cursor:"pointer"}}>? Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STUDIES */}
          {panel==="studies"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Studies</h1>
                {currentUserRole==="System Administrator"&&<button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ New study</button>}
              </div>
              {studies.length===0?<div style={{textAlign:"center",padding:"3rem",color:P.textTert,fontSize:"12px"}}>No studies yet. Create your first study.</div>:(
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                  {studies.map(s=>(
                    <div key={s.study_id} onClick={()=>{setActiveStudy(s);if(orgId)loadDocsWithOrg(s.study_id,orgId);}} style={{background:P.bg,border:`0.5px solid ${activeStudy?.study_id===s.study_id?P.primary:P.border}`,borderRadius:"12px",padding:"16px",cursor:"pointer"}}>
                      <div style={{fontSize:"13px",fontWeight:"500"}}>{s.study_id}</div>
                      <div style={{fontSize:"11px",color:P.textSec,marginTop:"4px"}}>{s.protocol}</div>
                      <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Phase: {s.phase}</div>
                      <span style={{display:"inline-block",marginTop:"8px",fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.primaryLight,color:P.primary}}>{s.status}</span>
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
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Documents - {activeStudy?.study_id||"No study selected"}</h1>
                {activeStudy&&canUploadDownload&&<button onClick={()=>setShowDocModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Add document</button>}
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const,alignItems:"center"}}>
                <input value={docSearch} onChange={e=>setDocSearch(e.target.value)} placeholder="Search documents..." style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",width:"200px"}}/>
                {["all","Approved","Under Review","Draft","Archived"].map(f=>(
                  <button key={f} onClick={()=>setDocFilter(f)} style={{fontSize:"11px",padding:"5px 12px",borderRadius:"20px",border:`0.5px solid ${docFilter===f?P.primary:P.border}`,background:docFilter===f?P.primaryLight:"transparent",color:docFilter===f?P.primary:P.textSec,cursor:"pointer"}}>{f==="all"?"All":f}</button>
                ))}
              </div>
              <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
                <table style={{width:"100%",fontSize:"12px",borderCollapse:"collapse"}}>
                  <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
                    {["Artifact","Zone","File name","Version","Effective","Expiry","Status","Owner","Actions"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredDocs.length===0?(
                      <tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents yet.</td></tr>
                    ):filteredDocs.map((d,i)=>(
                      <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <td style={{padding:"8px 10px"}}><div style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</div><div style={{fontSize:"11px",fontWeight:"500",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.artifact_name}</div></td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.zone}</td>
                        <td style={{padding:"8px 10px"}}>
                          {(d.custom_file_name||d.file_name)?(
                            <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                              <span>{fileIcon(d.file_name||"")}</span>
                              <span style={{fontSize:"11px",color:P.textSec,maxWidth:"100px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.custom_file_name||d.file_name}</span>
                            </div>
                          ):<span style={{color:P.textTert}}>-</span>}
                        </td>
                        <td style={{padding:"8px 10px",fontSize:"11px"}}>{d.version||"-"}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px"}}>{d.effective_date||"-"}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:d.expiry_date&&new Date(d.expiry_date)<new Date()?"#EF4444":"inherit"}}>{d.expiry_date||"-"}</td>
                        <td style={{padding:"8px 10px"}}>{statusBadge(d.status)}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.owner||"-"}</td>
                        <td style={{padding:"8px 10px"}}>
                          <div style={{display:"flex",gap:"4px",flexWrap:"wrap" as const}}>
                            {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}
                            {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                            {d.status==="Draft"&&<button onClick={()=>{setSelectedDoc(d);setShowSubmitModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:"#EFF6FF",color:"#1D4ED8",border:"0.5px solid #BFDBFE",borderRadius:"4px",cursor:"pointer"}}>Submit</button>}
                            {d.status==="Under Review"&&<button onClick={()=>{setSelectedDoc(d);setShowApproveModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:"#ECFDF5",color:"#065F46",border:"0.5px solid #A7F3D0",borderRadius:"4px",cursor:"pointer"}}>Review</button>}
                            <button onClick={()=>{setSelectedDoc(d);setCommentText("");setShowCommentModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Comment</button>
                          </div>
                          {d.comments&&<div style={{fontSize:"9px",color:P.textTert,marginTop:"3px"}}>?? Has comments</div>}
                          {d.approved_by&&<div style={{fontSize:"9px",color:"#065F46",marginTop:"2px"}}>? {d.approved_by}</div>}
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
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Artifact browser - DIA TMF Reference Model v3.3.1</h1>
              <div style={{display:"flex",gap:"8px"}}>
                <input value={artSearch} onChange={e=>setArtSearch(e.target.value)} placeholder="Search artifacts..." style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",flex:1}}/>
                <select value={artZone} onChange={e=>setArtZone(e.target.value)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px"}}>
                  <option value="">All zones</option>
                  {ZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                </select>
                <select value={artCl} onChange={e=>setArtCl(e.target.value)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px"}}>
                  <option value="">Core + Recommended</option>
                  <option value="Core">Core only</option>
                  <option value="Recommended">Recommended only</option>
                </select>
              </div>
              <p style={{fontSize:"11px",color:P.textTert}}>{filteredArts.length} artifacts</p>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {filteredArts.map(a=>{
                  const approvedDocs=studyDocs.filter(d=>d.artifact_num===a.a&&d.status==="Approved");
                  return(
                    <div key={a.a} style={{background:P.bg,border:`0.5px solid ${approvedDocs.length>0?P.success:P.border}`,borderRadius:"10px",overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",cursor:"pointer"}} onClick={()=>setExpandedArt(expandedArt===a.a?null:a.a)}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert,flexShrink:0}}>{a.a}</span>
                        <span style={{fontSize:"12px",fontWeight:"500",flex:1}}>{a.an}</span>
                        {approvedDocs.length>0&&<span style={{fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:"#ECFDF5",color:"#065F46",fontWeight:"500"}}>? Filed</span>}
                        <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"10px",background:a.cl==="Core"?P.dangerLight:"#F3F4F6",color:a.cl==="Core"?"#991B1B":P.textTert}}>{a.cl}</span>
                      </div>
                      {expandedArt===a.a&&(
                        <div style={{borderTop:`0.5px solid ${P.border}`,padding:"10px 14px"}}>
                          {a.iso&&<div style={{fontSize:"11px",color:P.textTert,marginBottom:"8px"}}>ISO 14155: {a.iso}</div>}
                          {approvedDocs.length>0&&(
                            <div style={{marginBottom:"10px"}}>
                              <div style={{fontSize:"10px",fontWeight:"500",color:P.textSec,marginBottom:"6px"}}>Filed documents:</div>
                              {approvedDocs.map((d,i)=>(
                                <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 8px",background:P.bgSec,borderRadius:"6px",marginBottom:"4px"}}>
                                  <span>{fileIcon(d.file_name||"")}</span>
                                  <span style={{fontSize:"11px",flex:1}}>{d.custom_file_name||d.file_name}</span>
                                  <span style={{fontSize:"9px",color:P.textTert}}>v{d.version||"1"}</span>
                                  {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}
                                  {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                                </div>
                              ))}
                            </div>
                          )}
                          {canUploadDownload&&<button onClick={()=>{setFZone(a.z);setFArtifact(a.a+"|"+a.an+"|"+a.z);setShowDocModal(true);}} style={{fontSize:"10px",padding:"4px 10px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer"}}>+ Upload document to this artifact</button>}
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
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Gap analysis - {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(
                <>
                  <p style={{fontSize:"12px",color:P.textSec}}>Comparing filed documents against all Core artifacts in DIA TMF Reference Model v3.3.1</p>
                  <select value={gapZone} onChange={e=>setGapZone(e.target.value)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",width:"220px"}}>
                    <option value="">All zones</option>
                    {ZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                  </select>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                    {[{val:gaps.crit.length,label:"Critical",color:"#EF4444",bg:"#FEF2F2"},{val:gaps.major.length,label:"Major",color:"#F59E0B",bg:"#FFFBEB"},{val:gaps.minor.length,label:"Minor",color:P.textSec,bg:P.bgSec}].map((s,i)=>(
                      <div key={i} style={{background:s.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                        <div style={{fontSize:"28px",fontWeight:"500",color:s.color}}>{s.val}</div>
                        <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{s.label} gaps</div>
                      </div>
                    ))}
                  </div>
                  {[{items:gaps.crit.filter((g:any)=>!gapZone||g.z===gapZone),label:"CRITICAL",color:"#991B1B",bg:"#FEF2F2",border:"#FECACA"},
                    {items:gaps.major.filter((g:any)=>!gapZone||g.z===gapZone),label:"MAJOR",color:"#92400E",bg:"#FFFBEB",border:"#FDE68A"},
                    {items:gaps.minor.filter((g:any)=>!gapZone||g.z===gapZone),label:"MINOR",color:"#374151",bg:"#F9FAFB",border:"#E5E7EB"},
                  ].map(({items,label,color,bg,border})=>items.length>0&&(
                    <div key={label} style={{border:`0.5px solid ${border}`,borderRadius:"12px",overflow:"hidden"}}>
                      <div style={{background:bg,color,padding:"8px 12px",fontSize:"11px",fontWeight:"500"}}>{label} - {items.length} gap{items.length!==1?"s":""}</div>
                      {items.map((g:any,i:number)=>(
                        <div key={i} style={{borderTop:`0.5px solid ${P.bgTert}`,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",background:P.bg}}>
                          <div><div style={{fontSize:"12px",fontWeight:"500"}}>{g.an}</div><div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>Zone {g.z} - {g.zn}</div></div>
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
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection readiness - {activeStudy?.study_id||"No study selected"}</h1>
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
                        {gaps.crit.slice(0,4).map((g:any,i:number)=><div key={i} style={{fontSize:"11px",background:"#FEF2F2",color:"#991B1B",borderRadius:"6px",padding:"6px 10px"}}>? CRITICAL - {g.an}</div>)}
                        {gaps.major.slice(0,3).map((g:any,i:number)=><div key={i} style={{fontSize:"11px",background:"#FFFBEB",color:"#92400E",borderRadius:"6px",padding:"6px 10px"}}>? MAJOR - {g.an}</div>)}
                        {gaps.crit.length===0&&gaps.major.length===0&&<div style={{fontSize:"11px",color:P.success}}>? No critical or major findings</div>}
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
            <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 64px)",gap:"0px",margin:"-1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",height:"52px",padding:"0 1.25rem",borderBottom:`0.5px solid ${P.border}`,background:P.bg,flexShrink:0}}>
                <span style={{width:"22px",height:"22px",borderRadius:"50%",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,flexShrink:0}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>
                </span>
                <span style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Trinity</span>
                {activeStudy&&<span style={{fontSize:"12px",color:P.textTert}}>- {activeStudy.study_id}</span>}
                <span style={{marginLeft:"auto",fontSize:"10.5px",padding:"3px 10px",borderRadius:"20px",background:P.bgTert,color:P.textTert}}>Scoped to this study only</span>
              </div>

              <div style={{padding:"10px 1.25rem",display:"flex",gap:"6px",flexWrap:"wrap" as const,borderBottom:`0.5px solid ${P.border}`,background:P.bg}}>
                {["What's my TMF health?","Review a pending document","Where does a CTA go in the TMF?","What normally goes in TMF Zone 8?","Explain ALCOA+","What is 21 CFR Part 11?"].map(q=>(
                  <button key={q} onClick={()=>setChatInput(q)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"20px",padding:"4px 10px",color:P.textSec,background:P.bg,cursor:"pointer"}}>{q}</button>
                ))}
              </div>

              <div style={{flex:1,overflowY:"auto",background:"linear-gradient(135deg,#E9ECFB 0%,#F5F6FC 45%,#FFFFFF 100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0 8px"}}>
                <div style={{width:"100%",maxWidth:"760px",padding:"0 24px",display:"flex",flexDirection:"column",gap:"16px"}}>
                  {chatMessages.map((m,i)=>(
                    <div key={i} style={{display:"flex",gap:"10px",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                      {m.role==="ai"&&(
                        <span style={{width:"26px",height:"26px",borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${P.primaryLight},#fff)`,border:`0.5px solid ${P.primaryLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>
                        </span>
                      )}
                      <div style={{maxWidth:"78%",display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                        {m.role==="ai"&&<div style={{fontSize:"10.5px",color:P.textTert,fontWeight:"600",paddingLeft:"2px"}}>Trinity</div>}
                        <div style={{fontSize:"12.8px",borderRadius:m.role==="ai"?"10px 10px 10px 4px":"10px 10px 4px 10px",padding:"10px 14px",lineHeight:"1.6",whiteSpace:"pre-wrap" as const,background:m.role==="ai"?P.bg:P.bgTert,border:m.role==="ai"?`0.5px solid ${P.border}`:"none",color:P.text}}>{m.text}</div>

                        {m.classification&&(
                          <>
                            <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px 14px",background:P.bg}}>
                              <div style={{fontSize:"13px",fontWeight:"600",color:P.text,marginBottom:"4px"}}>{m.classification.zoneLine}</div>
                              <span style={{display:"inline-block",fontSize:"10.5px",fontWeight:"600",padding:"2px 9px",borderRadius:"20px",background:m.classification.confidence>=80?P.successLight:P.warningLight,color:m.classification.confidence>=80?P.success:P.warning}}>Confidence {m.classification.confidence}%</span>
                            </div>
                            {m.classification.warning&&(
                              <div style={{border:"0.5px solid #f3d9a6",background:P.warningLight,borderRadius:"10px",padding:"11px 14px",display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                                <div style={{fontSize:"11.5px",fontWeight:"600",color:P.warning,display:"flex",alignItems:"center",gap:"6px"}}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>
                                  Version mismatch detected
                                </div>
                                <div style={{fontSize:"12px",color:"#7a5205",lineHeight:"1.55"}}>{m.classification.warning.detail}</div>
                                <div style={{fontSize:"11.5px",color:"#7a5205",background:"#fff",border:"0.5px solid #f3d9a6",borderRadius:"7px",padding:"7px 10px"}}>Suggested action: {m.classification.warning.action}</div>
                              </div>
                            )}
                          </>
                        )}

                        {m.isHealthCard&&activeStudy&&(
                          <>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                              {[
                                {val:`${donePct}%`,label:"TMF completeness",color:scoreColor(donePct)},
                                {val:missing,label:"Missing documents",color:"#EF4444"},
                                {val:`${ri}`,label:"Readiness score",color:scoreColor(ri)},
                              ].map((s,si)=>(
                                <div key={si} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}>
                                  <div style={{fontSize:"16px",fontWeight:"500",color:s.color}}>{s.val}</div>
                                  <div style={{fontSize:"10px",color:P.textSec}}>{s.label}</div>
                                </div>
                              ))}
                            </div>
                            {m.sourceTags&&(
                              <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                                {m.sourceTags.map((t,ti)=>(
                                  <span key={ti} style={{fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:P.bgTert,color:P.textTert}}>{t}</span>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {chatDocAction&&chatDocAction.msgIdx===i&&!chatDocAction.disabled&&(
                          <div style={{display:"flex",gap:"8px"}}>
                            <button onClick={()=>{
                              const doc=studyDocs.find(d=>d.id===m.docId);
                              if(!doc)return;
                              const zoneInfo=ZONES.find(z=>z.z===doc.zone);
                              setApproveDocId(doc.id||null);setApproveStage(1);
                              setChatMessages(prev=>[...prev,{role:"ai",text:`Zone ${padZone(doc.zone)} - ${zoneInfo?.zn||"Unclassified zone"}\nConfirm this is the correct zone for filing.`}]);
                              setChatDocAction(prev=>prev?{...prev,disabled:true}:null);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Approve</button>
                            <button onClick={()=>{
                              const doc=studyDocs.find(d=>d.id===m.docId);
                              if(!doc)return;
                              setFlagDocId(doc.id||null);setFlagReason(detectFlagReason(doc));setFlagStage("form");setFlagMsgIdx(i);
                              setChatMessages(prev=>[...prev,{role:"ai",text:"Flag initiated. Review the detected reason below and add context before submitting."}]);
                              setChatDocAction(prev=>prev?{...prev,disabled:true}:null);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Flag</button>
                          </div>
                        )}

                        {approveStage===1&&i===chatMessages.length-1&&m.text.startsWith("Zone ")&&(
                          <div style={{display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                            <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",background:P.bg}}>
                              <div style={{fontSize:"12.8px",fontWeight:"600"}}>{m.text.split("\n")[0]}</div>
                              <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Confirm this is the correct zone for filing.</div>
                            </div>
                            <button onClick={()=>{
                              const doc=studyDocs.find(d=>d.id===approveDocId);
                              if(!doc)return;
                              const art=TMF.find(a=>a.a===doc.artifact_num);
                              setApproveStage(2);
                              setChatMessages(prev=>[...prev,{role:"ai",text:`Artifact - ${art?.an||doc.artifact_name}\nConfirm this is the correct artifact type.`}]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start" as const}}>Approve</button>
                          </div>
                        )}

                        {approveStage===2&&i===chatMessages.length-1&&m.text.startsWith("Artifact -")&&(
                          <div style={{display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                            <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",background:P.bg}}>
                              <div style={{fontSize:"12.8px",fontWeight:"600"}}>{m.text.split("\n")[0]}</div>
                              <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Confirm this is the correct artifact type.</div>
                            </div>
                            <button onClick={async()=>{
                              const doc=studyDocs.find(d=>d.id===approveDocId);
                              if(!doc)return;
                              const art=TMF.find(a=>a.a===doc.artifact_num);
                              const now=new Date().toISOString();
                              const{error}=await supabase.from("documents").update({status:"Approved",approved_by:user.email,approved_at:now,signature_reason:"Approved via Trinity AI specialist"}).eq("id",doc.id);
                              if(!error){
                                await logAudit("Document approved via Trinity",doc.id,doc.study_id,"status",doc.status,"Approved","Approved via Trinity AI specialist");
                                setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,status:"Approved",approved_by:user.email,approved_at:now,signature_reason:"Approved via Trinity AI specialist"}:d));
                              }
                              setChatMessages(prev=>[...prev,
                                {role:"ai",text:`__FILED__Filed to Zone ${padZone(doc.zone)} - Section ${formatSection(art?.s||"")}\nAudit trail entry recorded.`},
                                {role:"ai",text:"Your document has been successfully filed."}
                              ]);
                              setApproveStage(0);setApproveDocId(null);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start" as const}}>Approve</button>
                          </div>
                        )}

                        {m.text.startsWith("__FILED__")&&(
                          <div style={{display:"flex",alignItems:"flex-start",gap:"9px",border:"0.5px solid #bfe6d4",background:P.successLight,borderRadius:"10px",padding:"11px 14px"}}>
                            <span style={{color:P.success,flexShrink:0,marginTop:"1px"}}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5 5.5-6"/></svg>
                            </span>
                            <div style={{display:"flex",flexDirection:"column" as const,gap:"2px"}}>
                              <div style={{fontSize:"12.5px",fontWeight:"600",color:"#0a6b4f"}}>{m.text.replace("__FILED__","").split("\n")[0]}</div>
                              <div style={{fontSize:"11.5px",color:"#0a6b4f",opacity:0.85}}>{m.text.replace("__FILED__","").split("\n")[1]}</div>
                            </div>
                          </div>
                        )}

                        {flagStage==="form"&&i===chatMessages.length-1&&m.text.includes("Flag initiated")&&(
                          <div style={{background:P.dangerLight,border:"0.5px solid #f3c9c7",borderRadius:"10px",padding:"12px 14px",display:"flex",flexDirection:"column" as const,gap:"10px"}}>
                            <div>
                              <div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase" as const,letterSpacing:".03em"}}>Reason for flag (auto-generated)</div>
                              <div style={{fontSize:"12px",background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",color:P.textSec}}>{flagReason}</div>
                            </div>
                            <div>
                              <div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase" as const,letterSpacing:".03em"}}>Your comment</div>
                              <textarea value={flagComment} onChange={e=>setFlagComment(e.target.value)} rows={2} placeholder="Add context for the reviewer..." style={{width:"100%",fontSize:"12.5px",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",resize:"vertical" as const,background:"#fff"}}/>
                            </div>
                            <button disabled={flagComment.trim().length===0} onClick={async()=>{
                              if(!flagDocId)return;
                              const doc=studyDocs.find(d=>d.id===flagDocId);
                              if(!doc)return;
                              const now=new Date().toISOString();
                              const comment=flagComment.trim();
                              const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:flagReason,rejected_by:user.email,rejected_at:now}).eq("id",doc.id);
                              if(!error){
                                await logAudit("Document flagged via Trinity",doc.id,doc.study_id,"status",doc.status,"Draft",flagReason);
                                setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,status:"Draft",rejection_reason:flagReason,rejected_by:user.email,rejected_at:now} as any:d));
                              }
                              setChatMessages(prev=>[...prev,{role:"ai",text:`Moved to Flagged on the dashboard.\nReason and your comment are attached for the reviewer.\nComment: ${comment}`}]);
                              setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:flagComment.trim().length===0?"not-allowed":"pointer",alignSelf:"flex-start" as const,opacity:flagComment.trim().length===0?0.5:1}}>Submit flag</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading&&(
                    <div style={{display:"flex",gap:"10px"}}>
                      <span style={{width:"26px",height:"26px",borderRadius:"50%",background:`linear-gradient(135deg,${P.primaryLight},#fff)`,border:`0.5px solid ${P.primaryLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/></svg>
                      </span>
                      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",display:"flex",gap:"4px",alignItems:"center"}}>
                        {[0,1,2].map(i=><span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:P.textTert,display:"inline-block",animation:"bounce 0.9s infinite",animationDelay:`${i*0.15}s`}}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEnd}/>
                </div>
              </div>

              <div style={{display:"flex",justifyContent:"center",padding:"14px 0 18px",background:"linear-gradient(135deg,#E9ECFB 0%,#F5F6FC 45%,#FFFFFF 100%)",flexShrink:0}}>
                <div style={{width:"100%",maxWidth:"760px",margin:"0 24px",display:"flex",alignItems:"center",gap:"8px",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"26px",padding:"6px 8px 6px 14px"}}>
                  <input ref={chatFileInputRef} type="file" style={{display:"none"}} onChange={()=>{
                    setChatMessages(prev=>[...prev,{role:"user",text:"Uploaded a document and this month's version tracker"}]);
                    presentClassification();
                    if(chatFileInputRef.current)chatFileInputRef.current.value="";
                  }}/>
                  <button aria-label="Attach document or version tracker" onClick={()=>chatFileInputRef.current?.click()} style={{width:"32px",height:"32px",borderRadius:"50%",border:"none",background:"transparent",color:P.textTert,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>
                  </button>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask Trinity or drop a document" aria-label="Message Trinity" style={{flex:1,border:"none",outline:"none",fontSize:"13px",background:"transparent",color:P.text,padding:"8px 2px"}}/>
                  <button aria-label="Send message" onClick={sendChat} disabled={chatLoading} style={{width:"32px",height:"32px",borderRadius:"50%",flexShrink:0,background:chatLoading?P.bgTert:P.primary,border:"none",color:chatLoading?P.textTert:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:chatLoading?"not-allowed":"pointer"}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AUDIT TRAIL */}
          {panel==="audit"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Audit trail - 21 CFR Part 11 compliant</h1>
              <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
                ?? This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions, electronic signatures, and approvals are permanently recorded.
              </div>
              <AuditTrail user={user} activeStudy={activeStudy} P={P}/>
            </div>
          )}

          {/* QUALITY CHECKS */}
          {panel==="quality"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Quality checks - {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(<QualityPanel docs={studyDocs} P={P} supabase={supabase} setDocs={setDocs}/>)}
            </div>
          )}

          {/* MESSAGES */}
          {panel==="messages"&&(
            <MessagesPanel user={user} P={P} supabase={supabase} activeStudy={activeStudy}/>
          )}

          {/* USER MANAGEMENT */}
          {panel==="users"&&(
            <UserManagementPanel user={user} P={P} supabase={supabase}/>
          )}

          {/* MY PROFILE */}
          {panel==="profile"&&(
            <ProfilePanel user={user} P={P} supabase={supabase}/>
          )}

        </main>
      </div>

      {/* Study Modal */}
      {showStudyModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"380px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>New study</h2>
            {[{l:"Study ID",v:fId,s:setFId,p:"e.g. OIL-BR-US-10"},{l:"Protocol title",v:fProtocol,s:setFProtocol,p:"e.g. A Phase I Study of..."},{l:"Sponsor",v:fSponsor,s:setFSponsor,p:"e.g. Optiscan Imaging Ltd."}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Phase</label><select value={fPhase} onChange={e=>setFPhase(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Phase I","Phase II","Phase III","Phase IV","Observational","Feasibility"].map(p=><option key={p}>{p}</option>)}</select></div>
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
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"500px",border:`0.5px solid ${P.border}`,maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add document</h2>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Zone</label>
              <select value={fZone} onChange={e=>{setFZone(e.target.value);const arts=TMF.filter(a=>a.z===e.target.value);setZoneArts(arts);setFArtifact(arts[0]?`${arts[0].a}|${arts[0].an}|${arts[0].z}`:"");}} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {ZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Artifact</label>
              <select value={fArtifact} onChange={e=>setFArtifact(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {(zoneArts.length>0?zoneArts:TMF.filter(a=>a.z===fZone)).map(a=><option key={a.a} value={`${a.a}|${a.an}|${a.z}`}>{a.a} - {a.an}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>File</label>
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFileUpload(f);}} onClick={()=>fileInputRef.current?.click()} style={{border:`1.5px dashed ${dragOver?P.primary:P.border}`,borderRadius:"10px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:dragOver?P.primaryLight:P.bgSec}}>
                <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileUpload(f);}}/>
                {uploading?<div style={{fontSize:"12px",color:P.primary}}>{uploadProgress}</div>
                :selectedFile?<div style={{fontSize:"12px"}}><div style={{fontSize:"1.5rem",marginBottom:"4px"}}>{fileIcon(selectedFile.name)}</div><div style={{fontWeight:"500"}}>{selectedFile.name}</div><div style={{color:P.textTert,fontSize:"11px"}}>{formatSize(selectedFile.size)} - {uploadProgress}</div></div>
                :<div style={{fontSize:"12px",color:P.textTert}}><div style={{fontSize:"1.5rem",marginBottom:"4px"}}>??</div>Drag & drop or click to browse</div>}
              </div>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Document name</label>
              <input value={fCustomName} onChange={e=>setFCustomName(e.target.value)} placeholder="Custom name for this document" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/>
            </div>
            {[{l:"Version",v:fVersion,s:setFVersion,p:"e.g. v1.0"},{l:"Owner",v:fOwner,s:setFOwner,p:"e.g. Jane Smith"}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Status</label><select value={fDocStatus} onChange={e=>setFDocStatus(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Draft","Under Review","Approved","Archived"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
              <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Effective date</label><input type="date" value={fEff} onChange={e=>setFEff(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
              <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Expiry date</label><input type="date" value={fExp} onChange={e=>setFExp(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            </div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Comments</label><textarea value={fComments} onChange={e=>setFComments(e.target.value)} placeholder="Optional comments..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px",resize:"vertical" as const,minHeight:"60px"}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowDocModal(false);setSelectedFile(null);setPendingFilePath("");setUploadProgress("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addDocument} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add document</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Submit for review</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{selectedDoc.artifact_name}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for submission</label>
              <textarea value={submissionReason} onChange={e=>setSubmissionReason(e.target.value)} placeholder="Describe why this document is ready for review..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,minHeight:"80px"}}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowSubmitModal(false);setSubmissionReason("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={async()=>{
                if(!submissionReason.trim()){alert("Please add a reason for submission.");return;}
                const{error}=await supabase.from("documents").update({status:"Under Review",submission_reason:submissionReason}).eq("id",selectedDoc.id);
                if(!error){await logAudit("Document submitted for review",selectedDoc.id,selectedDoc.study_id,"status","Draft","Under Review");setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,status:"Under Review",submission_reason:submissionReason} as any:d));}
                setShowSubmitModal(false);setSubmissionReason("");setSelectedDoc(null);
              }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Submit for review</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Electronic signature - 21 CFR Part 11</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>21 CFR Part 11 requires identity verification before approval.</p>
            <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"8px",padding:"10px 12px",marginBottom:"1rem",fontSize:"11px",color:"#1E40AF"}}>
              <strong>Approver:</strong> {user?.email}<br/>
              <strong>Timestamp:</strong> {new Date().toLocaleString()}<br/>
              <strong>Document:</strong> {selectedDoc.custom_file_name||selectedDoc.file_name||selectedDoc.artifact_name}<br/>
              <strong>Meaning:</strong> I approve this document as accurate and complete
            </div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Enter your password to sign</label><input type="password" value={approvePassword} onChange={e=>setApprovePassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for approval</label>
              <select value={approveReason} onChange={e=>setApproveReason(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                <option value="">Select reason...</option>
                <option>Reviewed and approved - document is accurate and complete</option>
                <option>QC review complete - no findings</option>
                <option>Regulatory review complete</option>
                <option>Final approval for TMF filing</option>
              </select>
            </div>
            {approveError&&<div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",padding:"8px 10px",borderRadius:"6px",marginBottom:"10px"}}>{approveError}</div>}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowApproveModal(false);setApprovePassword("");setApproveReason("");setApproveError("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={handleApprove} style={{fontSize:"11px",padding:"6px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Sign & Approve</button>
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
              <div style={{background:P.bgSec,borderRadius:"8px",padding:"10px 12px",marginBottom:"1rem",maxHeight:"120px",overflowY:"auto"}}>
                {selectedDoc.comments.split("\n").map((c,i)=><div key={i} style={{fontSize:"11px",color:P.textSec,marginBottom:"4px"}}>{c}</div>)}
              </div>
            )}
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New comment</label><textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add your comment..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,minHeight:"80px"}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowCommentModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={handleAddComment} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add comment</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",overflow:"hidden",maxWidth:"90vw",width:"800px",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`0.5px solid ${P.border}`}}>
              <span style={{fontSize:"13px",fontWeight:"500"}}>{previewName}</span>
              <div style={{display:"flex",gap:"8px"}}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Open</a>
                <a href={previewUrl} download style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Download</a>
                <button onClick={()=>setPreviewUrl(null)} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>? Close</button>
              </div>
            </div>
            <div style={{flex:1,overflow:"auto"}}>
              {previewName.match(/\.(png|jpg|jpeg|gif|webp)$/i)?<img src={previewUrl} alt={previewName} style={{maxWidth:"100%",height:"auto"}}/>:<iframe src={previewUrl} style={{width:"100%",height:"70vh",border:"none"}}/>}
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
            <span style={{fontSize:"11px",fontWeight:"500",color:f.color,flexShrink:0}}>-{flag==="NO_FILE"?20:flag==="EXPIRED"?15:flag==="DUPLICATE"?15:flag==="VERSION_CONFLICT"?10:flag==="MISSING_CUSTOM_NAME"?5:10} pts each</span>
          </div>
        );
      })}

      {/* Document list */}
      <div style={{background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${P.border}`,fontSize:"11px",fontWeight:"500",color:P.textSec}}>All documents - sorted by quality score</div>
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
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.file_name?`${fileIcon(d.file_name)} ${d.file_name}`:"-"}</td>
                <td style={{padding:"8px 10px"}}>
                  {d.qualityFlags.length===0?(
                    <span style={{fontSize:"10px",color:"#10B981"}}>? No issues</span>
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
              <td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.document_id?.slice(0,8)||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textTert}}>{l.field_changed||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textTert}}>{l.old_value||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textSec}}>{l.new_value||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.signature_reason||"-"}</td>
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
                <td style={{padding:"10px 14px"}}><div style={{fontWeight:"500"}}>{u.full_name||"-"}</div><div style={{fontSize:"11px",color:P.textSec}}>{u.email}</div></td>
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
            <div style={{position:"relative" as const}}><input type={showCurrentPwd?"text":"password"} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowCurrentPwd(!showCurrentPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showCurrentPwd?"FILE":"FILE"}</button></div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>New Password</label>
            <div style={{position:"relative" as const}}><input type={showNewPwd?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowNewPwd(!showNewPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showNewPwd?"FILE":"FILE"}</button></div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Confirm New Password</label>
            <div style={{position:"relative" as const}}><input type={showConfirmPwd?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowConfirmPwd(!showConfirmPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showConfirmPwd?"FILE":"FILE"}</button></div>
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
          <div style={{fontSize:"2rem"}}>??</div>
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
              <div style={{fontSize:"10px",color:P.textTert}}>{activeConv.is_group?"Group chat":"Direct message"} - {activeStudy?.study_id}</div>
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
                          ?? {att.file_name}
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
            <button onClick={()=>fileInputRef.current?.click()} style={{padding:"8px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"8px",cursor:"pointer",fontSize:"14px"}}>??</button>
            <div style={{flex:1}}>
              {selectedFile&&<div style={{fontSize:"10px",color:P.primary,marginBottom:"4px",padding:"3px 8px",background:P.primaryLight,borderRadius:"4px",display:"flex",justifyContent:"space-between"}}>
                ?? {selectedFile.name} <button onClick={()=>setSelectedFile(null)} style={{background:"none",border:"none",cursor:"pointer",color:P.danger,fontSize:"10px"}}>?</button>
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
                  <div><div style={{fontSize:"12px",fontWeight:"500"}}>{u.full_name||"-"}</div><div style={{fontSize:"10px",color:P.textSec}}>{u.email}</div></div>
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
                      {selectedUsers.includes(u.user_id)?"?":""}
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



