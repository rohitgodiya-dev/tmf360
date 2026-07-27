"use client";
import{useState,useEffect,useRef}from"react";
import{supabase}from"../../lib/supabase";

const P={
  primary:"#F97316",primaryLight:"#FFEDD5",
  text:"#111827",textSec:"#374151",textTert:"#6B7280",textMuted:"#9CA3AF",
  bg:"#FFFFFF",bgSec:"#F9FAFB",bgTert:"#F3F4F6",
  border:"#E5E7EB",
  success:"#10B981",successLight:"#ECFDF5",
  danger:"#EF4444",dangerLight:"#FEF2F2",
  warning:"#F59E0B",warningLight:"#FFFBEB",
  blue:"#3B82F6",blueLight:"#EFF6FF",
  purple:"#8B5CF6",purpleLight:"#F5F3FF",
  cyan:"#0891B2",cyanLight:"#ECFEFF",
  lavender:"#E9ECFB",
};

const DEFAULT_QUESTIONS=[
  {question_text:"Does the TMF index match the actual folder/document structure, with no orphaned or misfiled documents?",category:"TMF Structure",severity:"Critical",sort_order:1},
  {question_text:"Is every document's version number and effective date legible and consistent with the version referenced elsewhere in the TMF?",category:"Document Quality",severity:"Critical",sort_order:2},
  {question_text:"Are superseded documents clearly marked as superseded (not deleted), with the date of supersession recorded?",category:"Document Quality",severity:"Major",sort_order:3},
  {question_text:"Is the protocol filed with all amendments in sequence, and does each amendment have a clear effective date and corresponding IRB/EC approval?",category:"Protocol",severity:"Critical",sort_order:4},
  {question_text:"Does the IRB/EC approval date for the protocol/amendment precede the date any related activity (enrollment, procedure change) took place at site?",category:"IRB/EC",severity:"Critical",sort_order:5},
  {question_text:"Are all IRB/EC approved ICF versions filed, and do they match the version log used to track which subjects signed which version?",category:"IRB/EC",severity:"Critical",sort_order:6},
  {question_text:"Is there a document showing continuing review/renewal of IRB/EC approval before the previous approval expired (no lapse in coverage)?",category:"IRB/EC",severity:"Critical",sort_order:7},
  {question_text:"Are FDA Form 1572s signed, dated, and do the listed sub-investigators match the delegation log exactly?",category:"Investigator",severity:"Critical",sort_order:8},
  {question_text:"Does the delegation log show start and end dates for each team member's assigned tasks, with no unauthorized person having performed a delegated task before being added?",category:"Investigator",severity:"Critical",sort_order:9},
  {question_text:"Are CVs current (typically within 2 years) and do they cover the full period the individual was active on the study?",category:"Investigator",severity:"Major",sort_order:10},
  {question_text:"Are medical licenses current and non-expired for the full duration of each individual's involvement?",category:"Investigator",severity:"Major",sort_order:11},
  {question_text:"Is there documented evidence (certificate, sign-off log) that each staff member completed protocol-specific and GCP training before performing any study-related task?",category:"Training",severity:"Major",sort_order:12},
  {question_text:"Are financial disclosure forms collected for all applicable personnel, and updated if there was a status change during the study?",category:"Investigator",severity:"Major",sort_order:13},
  {question_text:"For every enrolled subject, is there a signed and dated ICF on file, and does the date precede the first study-specific procedure?",category:"Informed Consent",severity:"Critical",sort_order:14},
  {question_text:"If there were protocol amendments requiring re-consent, is there documentation that every affected subject was re-consented, with no gaps?",category:"Informed Consent",severity:"Critical",sort_order:15},
  {question_text:"Are assent forms (if applicable) present and correctly dated alongside parental/guardian consent?",category:"Informed Consent",severity:"Major",sort_order:16},
  {question_text:"Is there a monitoring visit report for every visit conducted, filed within the sponsor's SOP-defined timeline?",category:"Monitoring",severity:"Critical",sort_order:17},
  {question_text:"Do monitoring visit reports show follow-up items, and is there evidence those items were closed out (not just raised)?",category:"Monitoring",severity:"Major",sort_order:18},
  {question_text:"Are monitoring visit report findings consistent with what's reflected in the protocol deviation log (no discrepancies between what was found and what was logged)?",category:"Monitoring",severity:"Major",sort_order:19},
  {question_text:"Is the current monitoring plan on file, and does it match the actual monitoring frequency/method being used?",category:"Monitoring",severity:"Major",sort_order:20},
  {question_text:"Are SAE/AE reports filed with documented submission dates, and do those dates meet required reporting timelines (e.g., 24 hours for SAEs)?",category:"Safety Reporting",severity:"Critical",sort_order:21},
  {question_text:"Is there evidence of IRB/EC acknowledgment or receipt of safety reports?",category:"Safety Reporting",severity:"Major",sort_order:22},
  {question_text:"Are SUSARs and IND safety reports filed with proof of distribution to all relevant sites/investigators?",category:"Safety Reporting",severity:"Critical",sort_order:23},
  {question_text:"Are device/drug/material shipment records complete, with receipt confirmation signed and dated by site staff?",category:"Drug/Device Accountability",severity:"Critical",sort_order:24},
  {question_text:"Do accountability logs reconcile (units received = units used + units returned/destroyed, with no unexplained variance)?",category:"Drug/Device Accountability",severity:"Critical",sort_order:25},
  {question_text:"If temperature-sensitive materials are involved, are temperature logs continuous with no unexplained gaps, and are excursions documented with a corrective action?",category:"Drug/Device Accountability",severity:"Major",sort_order:26},
  {question_text:"Is the protocol deviation/violation log complete, with each entry classified by severity and a CAPA documented where required?",category:"Protocol Deviations",severity:"Critical",sort_order:27},
  {question_text:"Are deviations mentioned in monitoring reports, safety reports, or correspondence but missing from the deviation log (a common audit finding)?",category:"Protocol Deviations",severity:"Critical",sort_order:28},
  {question_text:"Is there a communication log or correspondence file capturing key sponsor-site decisions, not just left in informal/unfiled emails?",category:"Correspondence",severity:"Major",sort_order:29},
  {question_text:"Are audit or inspection findings (internal or regulatory) filed along with CAPA plans and evidence of CAPA closure?",category:"Audit/Inspection",severity:"Critical",sort_order:30},
  {question_text:"For a sample of subjects, does the document trail move logically in sequence — consent, screening, enrollment, visit records, AE reporting, discontinuation/completion — with no missing steps?",category:"Subject Records",severity:"Critical",sort_order:31},
  {question_text:"Do dates in the TMF documents align with dates in source documents/EDC audit trail, with no logical impossibilities (e.g., procedure dated before consent)?",category:"Subject Records",severity:"Critical",sort_order:32},
  {question_text:"Are electronic signatures timestamped, attributable to a specific individual, and compliant with 21 CFR Part 11 where applicable?",category:"Electronic Records",severity:"Critical",sort_order:33},
  {question_text:"If a subject withdrew or was discontinued, is there documentation of the reason, the date, and any required follow-up (e.g., safety follow-up)?",category:"Subject Records",severity:"Major",sort_order:34},
  {question_text:"Is the close-out visit report filed, and does it confirm final drug/device accountability and final query resolution?",category:"Close-Out",severity:"Major",sort_order:35},
  {question_text:"Is there a final IRB/EC notification of study closure on file?",category:"Close-Out",severity:"Major",sort_order:36},
  {question_text:"Is there a documented archive and retention plan naming responsible parties and retention duration?",category:"Archive",severity:"Major",sort_order:37},
  {question_text:"Are any documents missing signatures, dates, or have illegible/handwritten corrections without initials and dates (GCP documentation standard)?",category:"Document Quality",severity:"Critical",sort_order:38},
];

const SEVERITY_COLOR=(s:string)=>s==="Critical"?P.danger:s==="Major"?P.warning:P.blue;
const SEVERITY_BG=(s:string)=>s==="Critical"?P.dangerLight:s==="Major"?P.warningLight:P.blueLight;
const VAULT_DOC_TYPES=["Protocol","Protocol Amendment","Investigator's Brochure","Statistical Analysis Plan","Monitoring Plan","Medical Monitoring Plan","IRB / IEC Decision","Regulatory Authority Decision","Clinical Trial Agreement","Informed Consent Form","Risk Management Plan","Quality Plan","Data Management Plan","Safety Management Plan","Other"];

const Ico={
  star:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>,
  chat:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  db:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  alert:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  sun:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  shield:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  brain:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.14Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.14Z"/></svg>,
  refresh:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  loader:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 1s linear infinite"}}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  check:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  up:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  clip:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>,
  circleCheck:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>,
  search:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  memory:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  download:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  chevDown:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  lightning:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  menu:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  back:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  trash:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
};

interface ChatMsg{role:"ai"|"user";text:string;isHealthCard?:boolean;sourceTags?:string[];classification?:{zoneLine:string;confidence:number;warning?:{detail:string;action:string}};pendingClassification?:any;classStage?:string;validation?:any;}
interface VaultDoc{id:string;file_name:string;custom_name:string;document_type:string;file_path:string;file_size:number;extracted_text:string;uploaded_by:string;uploaded_at:string;is_active:boolean;}

interface ChatSession{id:string;title:string;messages:ChatMsg[];is_pinned:boolean;created_at:string;updated_at:string;}
interface Memory{id:string;memory_text:string;created_at:string;}

interface InspectionQuestion{id:string;question_text:string;category:string;severity:string;is_active:boolean;sort_order:number;}

function SessionRow({s,active,onLoad,onPin,onDelete}:{s:ChatSession;active:boolean;onLoad:(s:ChatSession)=>void;onPin:(id:string,pinned:boolean)=>void;onDelete:(id:string)=>void}){
  const[hover,setHover]=useState(false);
  return(
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>onLoad(s)} style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 10px",borderRadius:"7px",cursor:"pointer",background:active?"#FFF7ED":hover?"#F9FAFB":"transparent",margin:"0 6px 1px",borderLeft:active?"2px solid #F97316":"2px solid transparent"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"12px",color:active?"#F97316":"#374151",fontWeight:active?"600":"400",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title||"New conversation"}</div>
        <div style={{fontSize:"10px",color:"#9CA3AF",marginTop:"1px"}}>{new Date(s.updated_at).toLocaleDateString()}</div>
      </div>
      {hover&&(
        <div style={{display:"flex",gap:"2px",flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();onPin(s.id,s.is_pinned);}} style={{background:"none",border:"none",cursor:"pointer",color:s.is_pinned?"#F97316":"#9CA3AF",padding:"2px"}}><Ico.memory/></button>
          <button onClick={e=>{e.stopPropagation();onDelete(s.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:"2px"}}><Ico.x/></button>
        </div>
      )}
    </div>
  );
}

export default function TrinityPage(){
  const[user,setUser]=useState<any>(null);
  const[orgId,setOrgId]=useState("");
  const[studies,setStudies]=useState<any[]>([]);
  const[activeStudy,setActiveStudy]=useState<any>(null);
  const[userFullName,setUserFullName]=useState("");
  const[panel,setPanel]=useState<"chat"|"vault"|"inspection">("chat");
  const[loading,setLoading]=useState(true);
  const[docs,setDocs]=useState<any[]>([]);
  const[tmfConfig,setTmfConfig]=useState<any[]>([]);
  const[chatMessages,setChatMessages]=useState<ChatMsg[]>([{role:"ai",text:"Hi, I'm Trinity — your AI TMF Specialist. Start a conversation or upload a document to classify it."}]);
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
  const[sessions,setSessions]=useState<ChatSession[]>([]);
  const[activeSessionId,setActiveSessionId]=useState<string|null>(null);
  const[chatSearch,setChatSearch]=useState("");
  const[showSearch,setShowSearch]=useState(false);
  const saveTimer=useRef<any>(null);
  const[vaultDocs,setVaultDocs]=useState<VaultDoc[]>([]);
  const[vaultUploading,setVaultUploading]=useState(false);
  const[vaultProgress,setVaultProgress]=useState("");
  const[vaultDocType,setVaultDocType]=useState("Protocol");
  const[vaultCustomName,setVaultCustomName]=useState("");
  const[vaultFile,setVaultFile]=useState<File|null>(null);
  const vaultFileInput=useRef<HTMLInputElement>(null);

  const[studyIdentity,setStudyIdentity]=useState<any>(null);
  const[inspectionReport,setInspectionReport]=useState<any>(null);
  const[inspectionLoading,setInspectionLoading]=useState(false);
  const[inspectionQuestions,setInspectionQuestions]=useState<InspectionQuestion[]>([]);
  const[showAddQuestion,setShowAddQuestion]=useState(false);
  const[newQuestionText,setNewQuestionText]=useState("");
  const[newQuestionCategory,setNewQuestionCategory]=useState("General");
  const[newQuestionSeverity,setNewQuestionSeverity]=useState("Major");
  const[inspectionTab,setInspectionTab]=useState<"questions"|"report">("questions");
  const[memories,setMemories]=useState<Memory[]>([]);
  const[showMemory,setShowMemory]=useState(false);
  const[sidebarCollapsed,setSidebarCollapsed]=useState(false);

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{if(session?.user){setUser(session.user);loadUserContext(session.user.id);}else{window.location.href="/platform";}});},[]);
  useEffect(()=>{messagesEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMessages]);

  async function loadUserContext(uid:string){
    const{data}=await supabase.from("user_roles").select("role,org_id,full_name").eq("user_id",uid).single();
    if(!data){window.location.href="/platform";return;}
    setOrgId(data.org_id);setUserFullName(data.full_name||"");
    const savedStudyId=localStorage.getItem("tmf_active_study")||"";
    const{data:studyData}=await supabase.from("studies").select("*").eq("org_id",data.org_id).order("created_at",{ascending:false});
    if(studyData&&studyData.length>0){
      setStudies(studyData);
      const active=savedStudyId?studyData.find((s:any)=>s.study_id===savedStudyId)||studyData[0]:studyData[0];
      setActiveStudy(active);
      await loadStudyData(active.study_id,data.org_id,uid);
      await loadSessions(active.study_id,data.org_id,uid);
      await loadMemories(active.study_id,data.org_id,uid);
      await loadInspectionQuestions(data.org_id);
    }
    setLoading(false);
  }

  async function loadStudyData(studyId:string,oid:string,uid?:string){
    const[{data:docData},{data:configData},{data:vaultData}]=await Promise.all([
      supabase.from("documents").select("*").eq("study_id",studyId).eq("org_id",oid).order("created_at",{ascending:false}),
      supabase.from("tmf_config").select("*").eq("org_id",oid).eq("study_id",studyId).eq("is_enabled",true),
      supabase.from("study_vault").select("*").eq("org_id",oid).eq("study_id",studyId).eq("is_active",true).order("uploaded_at",{ascending:false}),

    ]);
    if(docData)setDocs(docData);
    if(configData)setTmfConfig(configData);
    if(vaultData)setVaultDocs(vaultData as VaultDoc[]);

    const{data:identityData}=await supabase.from("study_identity").select("*").eq("org_id",oid).eq("study_id",studyId).eq("is_active",true).order("extracted_at",{ascending:false}).limit(1).maybeSingle();
    if(identityData)setStudyIdentity(identityData);
  }

  async function loadInspectionQuestions(oid:string){
    const{data}=await supabase.from("inspection_questions").select("*").eq("org_id",oid).eq("is_active",true).order("sort_order",{ascending:true});
    if(data&&data.length>0){setInspectionQuestions(data as InspectionQuestion[]);}
    else{
      const toInsert=DEFAULT_QUESTIONS.map(q=>({...q,org_id:oid,is_active:true,is_default:true}));
      const{data:inserted}=await supabase.from("inspection_questions").insert(toInsert).select();
      if(inserted)setInspectionQuestions(inserted as InspectionQuestion[]);
    }
  }

  async function addInspectionQuestion(){
    if(!newQuestionText.trim()||!orgId)return;
    const maxOrder=inspectionQuestions.reduce((m,q)=>Math.max(m,q.sort_order),0);
    const{data}=await supabase.from("inspection_questions").insert([{org_id:orgId,question_text:newQuestionText.trim(),category:newQuestionCategory,severity:newQuestionSeverity,is_active:true,is_default:false,sort_order:maxOrder+1}]).select().single();
    if(data)setInspectionQuestions(prev=>[...prev,data as InspectionQuestion]);
    setNewQuestionText("");setShowAddQuestion(false);
  }

  async function removeInspectionQuestion(id:string){
    await supabase.from("inspection_questions").update({is_active:false}).eq("id",id);
    setInspectionQuestions(prev=>prev.filter(q=>q.id!==id));
  }

  async function loadSessions(studyId:string,oid:string,uid:string){
    const{data}=await supabase.from("trinity_chats").select("*").eq("org_id",oid).eq("study_id",studyId).eq("user_id",uid).eq("is_active",true).order("updated_at",{ascending:false}).limit(50);
    if(data){
      setSessions(data as ChatSession[]);
      if(data.length>0){const latest=data[0] as ChatSession;setActiveSessionId(latest.id);if(latest.messages&&latest.messages.length>0)setChatMessages(latest.messages);}
      else{await createNewSession(studyId,oid,uid);}
    }
  }

  async function loadMemories(studyId:string,oid:string,uid:string){
    const{data}=await supabase.from("trinity_memory").select("*").eq("org_id",oid).eq("study_id",studyId).eq("user_id",uid).eq("is_active",true).order("created_at",{ascending:false}).limit(20);
    if(data)setMemories(data as Memory[]);
  }

  async function createNewSession(studyId:string,oid:string,uid:string):Promise<string|null>{
    const initMsg:ChatMsg={role:"ai",text:"Hi, I'm Trinity — your AI TMF Specialist. Start a conversation or upload a document to classify it."};
    const{data}=await supabase.from("trinity_chats").insert([{org_id:oid,study_id:studyId,user_id:uid,title:"New conversation",messages:[initMsg],is_pinned:false,is_active:true}]).select().single();
    if(data){setSessions(prev=>[data as ChatSession,...prev]);setActiveSessionId(data.id);setChatMessages([initMsg]);return data.id;}
    return null;
  }

  async function startNewChat(){if(!activeStudy||!user||!orgId)return;await createNewSession(activeStudy.study_id,orgId,user.id);}

  async function loadSession(session:ChatSession){
    setActiveSessionId(session.id);
    setChatMessages(session.messages||[{role:"ai",text:"Hi, I'm Trinity — your AI TMF Specialist."}]);
    setPanel("chat");setChatDocAction(null);setFlagStage("idle");setApproveStage(0);
  }

  function scheduleSave(msgs:ChatMsg[],sid?:string){
    if(saveTimer.current)clearTimeout(saveTimer.current);
    const sessionId=sid||activeSessionId;
    saveTimer.current=setTimeout(async()=>{
      if(!sessionId)return;
      await supabase.from("trinity_chats").update({messages:msgs,updated_at:new Date().toISOString()}).eq("id",sessionId);
      setSessions(prev=>prev.map(s=>s.id===sessionId?{...s,messages:msgs,updated_at:new Date().toISOString()}:s));
    },1500);
  }

  async function autoTitle(msgs:ChatMsg[],sessionId:string){
    const userMsgs=msgs.filter(m=>m.role==="user"&&m.text&&m.text.length>2);
    if(userMsgs.length===0)return;
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Generate a short 4-6 word title for a clinical trial TMF conversation that starts with: "${userMsgs[0].text.slice(0,100)}". Return ONLY the title text, no quotes, no punctuation at end.`,context:"You generate short conversation titles for a clinical trial management platform. Return only the title."})});
      const data=await res.json();
      const title=(data.response||"").trim().replace(/^["']|["']$/g,"").slice(0,60);
      if(title&&title.length>3){
        await supabase.from("trinity_chats").update({title}).eq("id",sessionId);
        setSessions(prev=>prev.map(s=>s.id===sessionId?{...s,title}:s));
      }
    }catch{}
  }

  async function togglePin(sessionId:string,pinned:boolean){
    await supabase.from("trinity_chats").update({is_pinned:!pinned}).eq("id",sessionId);
    setSessions(prev=>prev.map(s=>s.id===sessionId?{...s,is_pinned:!pinned}:s));
  }

  async function deleteSession(sessionId:string){
    if(!confirm("Delete this conversation?"))return;
    await supabase.from("trinity_chats").update({is_active:false}).eq("id",sessionId);
    setSessions(prev=>prev.filter(s=>s.id!==sessionId));
    if(activeSessionId===sessionId){const remaining=sessions.filter(s=>s.id!==sessionId);if(remaining.length>0)loadSession(remaining[0]);else await startNewChat();}
  }

  async function extractMemories(msgs:ChatMsg[]){
    if(!activeStudy||!user||!orgId)return;
    const recentAI=msgs.filter(m=>m.role==="ai"&&m.text&&m.text.length>50).slice(-3).map(m=>m.text).join("\n");
    if(!recentAI)return;
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Extract 1-3 key factual statements worth remembering. Only concrete facts. Return JSON array: ["fact1"]. If nothing, return []. Text:\n${recentAI}`,context:"Return only valid JSON array."})});
      const data=await res.json();
      const facts:string[]=JSON.parse((data.response||"[]").replace(/```json|```/g,"").trim());
      if(facts.length>0){
        const toInsert=facts.map(f=>({org_id:orgId,study_id:activeStudy.study_id,user_id:user.id,memory_text:f,source_chat_id:activeSessionId,is_active:true}));
        const{data:saved}=await supabase.from("trinity_memory").insert(toInsert).select();
        if(saved)setMemories(prev=>[...(saved as Memory[]),...prev]);
      }
    }catch{}
  }

  async function deleteMemory(id:string){
    await supabase.from("trinity_memory").update({is_active:false}).eq("id",id);
    setMemories(prev=>prev.filter(m=>m.id!==id));
  }



  async function exportChatAsPDF(){
    if(!activeSessionId)return;
    const session=sessions.find(s=>s.id===activeSessionId);if(!session)return;
    const msgs=session.messages||chatMessages;
    const hash=btoa(JSON.stringify(msgs)).slice(0,32);
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Trinity Chat Export</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:30px;color:#111}h1{color:#F97316}.msg{margin:10px 0;padding:8px 12px;border-radius:6px}.user{background:#F3F4F6}.ai{background:#EFF6FF;border-left:3px solid #F97316}.footer{margin-top:30px;font-size:9px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:10px}</style></head><body><h1>Trinity AI Chat Export</h1><p><strong>Study:</strong> ${activeStudy?.study_id||""} &nbsp;<strong>User:</strong> ${user?.email||""} &nbsp;<strong>Exported:</strong> ${new Date().toLocaleString()}</p><p><strong>Session:</strong> ${session.title||"Untitled"}</p><hr/>${msgs.map(m=>`<div class="msg ${m.role}">${m.role==="user"?"<strong>User</strong>":"<strong>Trinity AI</strong>"}: ${m.text||"[Action card]"}</div>`).join("")}<div class="footer">Hash: ${hash} · TMF360 Trinity AI · ${new Date().toISOString()}</div></body></html>`;
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}
  }

  function switchStudy(studyId:string){
    const s=studies.find(x=>x.study_id===studyId);
    if(s&&user&&orgId){
      setActiveStudy(s);localStorage.setItem("tmf_active_study",studyId);
      setDocs([]);setVaultDocs([]);setMemories([]);setStudyIdentity(null);setInspectionReport(null);
      loadStudyData(studyId,orgId,user.id);loadSessions(studyId,orgId,user.id);loadMemories(studyId,orgId,user.id);
    }
  }

  const activeTMF=tmfConfig.filter(c=>c.type==="artifact").map(c=>({z:c.zone_num,zn:c.zone_name||"",s:c.section_num||"",a:c.artifact_num,an:c.artifact_name,cl:c.classification||"Core"}));
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
  const gaps={crit:activeTMF.filter(a=>a.cl==="Core"&&critZones.includes(a.z)&&!filedNums.includes(a.a)),major:activeTMF.filter(a=>a.cl==="Core"&&majZones.includes(a.z)&&!filedNums.includes(a.a)),minor:activeTMF.filter(a=>a.cl==="Core"&&!critZones.includes(a.z)&&!majZones.includes(a.z)&&!filedNums.includes(a.a))};
  const totalW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+w;},0);
  const zoneComp=(z:string)=>{const t=activeTMF.filter(a=>a.cl==="Core"&&a.z===z).length;const f=docs.filter(d=>d.status==="Approved"&&activeTMF.some(a=>a.a===d.artifact_num&&a.z===z)).length;return t?Math.round((f/t)*100):0;};
  const earnedW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+(zoneComp(z)/100)*w;},0);
  const ri=totalW?Math.round((earnedW/totalW)*100):0;

  function padZone(z:string){return z.padStart(2,"0");}
  function formatSection(s:string){const p=(s||"").split(".");if(p.length<2)return s||"00.00";return`${p[0].padStart(2,"0")}.${p[1]}`;}
  function detectFlagReason(doc:any){if(!doc.version||doc.version.trim()==="")return"Missing version.";if(doc.expiry_date&&new Date(doc.expiry_date)<new Date())return`Document expired on ${doc.expiry_date}.`;return`Version mismatch.`;}
  function buildVaultContext(){if(vaultDocs.length===0)return"No vault documents uploaded.";return vaultDocs.map(d=>`[${d.document_type} - ${d.custom_name}]:\n${d.extracted_text?.slice(0,3000)||"No text extracted"}`).join("\n\n---\n\n");}

  function presentClassification(){
    if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Select a study first."}]);return;}
    const pendingDoc=docs.find(d=>d.status==="Under Review");
    if(!pendingDoc){setChatMessages(prev=>[...prev,{role:"ai",text:`No documents currently under review in ${activeStudy.study_id}.`}]);return;}
    const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);
    const zoneLine=`Zone ${padZone(pendingDoc.zone)} — Section ${formatSection(art?.s||"")} — ${art?.an||pendingDoc.artifact_name}`;
    const flags:string[]=[];
    if(!pendingDoc.version)flags.push("missing version");
    if(pendingDoc.expiry_date&&new Date(pendingDoc.expiry_date)<new Date())flags.push("expired");
    const warning=flags.length>0?{detail:detectFlagReason(pendingDoc),action:"Request the current version before filing."}:undefined;
    const confidence=flags.length>0?65:88;
    setChatMessages(prev=>{const idx=prev.length;setChatDocAction({msgIdx:idx,stage:0,disabled:false});return[...prev,{role:"ai",text:"I've classified this document and checked it against the version tracker.",classification:{zoneLine,confidence,warning}}];});
  }

  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return;
    const userMsg=chatInput.trim();setChatInput("");
    const newMsgs:ChatMsg[]=[...chatMessages,{role:"user",text:userMsg}];
    setChatMessages(newMsgs);
    setChatDocAction(null);setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");setApproveStage(0);setApproveDocId(null);
    setChatLoading(true);
    const lower=userMsg.toLowerCase();
    if(activeStudy&&/(health|status|readiness|overview)/.test(lower)&&/(tmf|study|trial)/.test(lower)){
      const aiMsg:ChatMsg={role:"ai",text:`${donePct}% complete, with ${missing} core documents outstanding and ${pending} awaiting review. Inspection readiness is ${ri}/100 for ${activeStudy.study_id}.`,isHealthCard:true,sourceTags:["Gap analysis","Inspection readiness","Document tracker"]};
      const final=[...newMsgs,aiMsg];setChatMessages(final);scheduleSave(final);setChatLoading(false);return;
    }
    if(activeStudy&&/(review|approve|classify|flag|upload)/.test(lower)&&/(doc|document|file|tracker)/.test(lower)){presentClassification();setChatLoading(false);return;}
    try{
      const vaultCtx=buildVaultContext();
      const memCtx=memories.length>0?`\n\nTRINITY MEMORY:\n${memories.map(m=>m.memory_text).join("\n")}`:"";
      const missingList=gaps.crit.concat(gaps.major).concat(gaps.minor).map((g:any)=>`${g.a} - ${g.an} (Zone ${g.z})`).join("\n");
      const studyContext=activeStudy?`Active study: ${activeStudy.study_id}. Sponsor: ${activeStudy.sponsor||""}. Phase: ${activeStudy.phase||""}.\nTMF completeness: ${donePct}%. Inspection readiness: ${ri}/100. Missing (${missing} total):\n${missingList}\nPending: ${pending}. Expiring 90d: ${expiring}.`:"No active study.";
      const recentTurns=chatMessages.slice(-6).map(m=>`${m.role==="user"?"User":"Trinity"}: ${m.text}`).join("\n");
      const context=`${studyContext}${memCtx}\n\nVAULT:\n${vaultCtx}\n\nRecent:\n${recentTurns}\n\nOnly answer for study ${activeStudy?.study_id||""}.`;
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,context})});
      const data=await res.json();
      const aiMsg:ChatMsg={role:"ai",text:data.response||"I couldn't process that request."};
      const final=[...newMsgs,aiMsg];
      setChatMessages(final);
      const currentSessionId=activeSessionId;
      scheduleSave(final,currentSessionId||undefined);
      const userMsgCount=final.filter(m=>m.role==="user").length;
      if(userMsgCount===1&&currentSessionId)setTimeout(()=>autoTitle(final,currentSessionId),800);
      if(final.length%10===0)extractMemories(final);
    }catch{
      const errMsg:ChatMsg={role:"ai",text:"Error connecting. Please try again."};
      const final=[...newMsgs,errMsg];setChatMessages(final);scheduleSave(final);
    }
    setChatLoading(false);
  }

  async function fileDocument(cl:any,validationResult:any){
    setChatLoading(true);
    try{
      const byteString=atob(cl.base64);const ab=new ArrayBuffer(byteString.length);const ia=new Uint8Array(ab);for(let j=0;j<byteString.length;j++)ia[j]=byteString.charCodeAt(j);
      const blob=new Blob([ab],{type:"application/pdf"});
      const filePath=`${user?.id}/${activeStudy?.study_id}/${Date.now()}_${cl.fileName}`;
      const{error:upErr}=await supabase.storage.from("Documents").upload(filePath,blob);
      if(upErr)throw new Error(upErr.message);
      const hardFails=(validationResult?.identity_checks||[]).filter((c:any)=>c.hard&&!c.pass);
      const hasHardFail=hardFails.length>0;
      const hasIssues=hasHardFail||validationResult?.overall==="fail"||(cl.issues?.length>0);
      const docStatus=hasIssues?"Draft":"Under Review";
      const rejReason=hasIssues?[validationResult?.audit_narrative,...(cl.issues||[])].filter(Boolean).join("; "):undefined;
      const{data:docData,error:docErr}=await supabase.from("documents").insert([{study_id:activeStudy?.study_id,user_id:user?.id,org_id:orgId,artifact_num:cl.artifact_num,artifact_name:cl.artifact_name,zone:cl.zone_num,version:"",status:docStatus,owner:userFullName||user?.email,file_path:filePath,file_name:cl.fileName,custom_file_name:cl.fileName,file_type:cl.fileType||"application/pdf",file_size:0,comments:"Auto-classified by Trinity AI.",rejection_reason:rejReason||null}]).select();
      if(docErr)throw new Error(docErr.message);
      setDocs(prev=>[docData[0],...prev]);
      await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document classified and vault-validated by Trinity",document_id:docData[0].id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"",new_value:docStatus,signature_reason:"Trinity AI",document_name:cl.fileName}]);
      if(validationResult)await supabase.from("document_validations").insert([{org_id:orgId,study_id:activeStudy?.study_id,document_id:docData[0].id,document_name:cl.fileName,artifact_num:cl.artifact_num,zone:cl.zone_num,identity_checks:validationResult.identity_checks||[],quality_checks:validationResult.quality_checks||[],consistency_checks:validationResult.consistency_checks||[],overall_result:validationResult.overall,audit_narrative:validationResult.audit_narrative,validated_by:user?.email,hash:validationResult.hash}]);
      const aiMsg:ChatMsg={role:"ai",text:hasHardFail?`REJECTED — Identity verification failed.\n${hardFails.map((c:any)=>c.detail).join("\n")}\n\nThis document cannot be filed into ${activeStudy?.study_id}.`:hasIssues?`Filed to Draft — issues detected:\n${rejReason}`:`__FILED__Filed to Zone ${cl.zone_num} — ${cl.artifact_name}\nIdentity verified, vault-validated, audit trail recorded.`};
      const final=[...chatMessages,aiMsg];setChatMessages(final);scheduleSave(final);
    }catch(err:any){const errMsg:ChatMsg={role:"ai",text:"Filing error: "+err.message};const final=[...chatMessages,errMsg];setChatMessages(final);scheduleSave(final);}
    setChatLoading(false);
  }

  async function uploadVaultDoc(){
    if(!vaultFile||!activeStudy||!orgId)return;
    setVaultUploading(true);setVaultProgress("Uploading...");
    const path=`vault/${orgId}/${activeStudy.study_id}/${Date.now()}_${vaultFile.name}`;
    const{error:upErr}=await supabase.storage.from("Documents").upload(path,vaultFile);
    if(upErr){setVaultProgress("Upload failed: "+upErr.message);setVaultUploading(false);return;}
    setVaultProgress("Extracting text...");
    let extractedText="";
    try{const reader=new FileReader();const base64=await new Promise<string>((res,rej)=>{reader.onload=()=>res((reader.result as string).split(",")[1]);reader.onerror=rej;reader.readAsDataURL(vaultFile);});const resp=await fetch("/api/vault/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:vaultFile.name})});const data=await resp.json();extractedText=data.text||"";}catch{extractedText="";}
    setVaultProgress("Saving...");
    const{data:inserted}=await supabase.from("study_vault").insert([{org_id:orgId,study_id:activeStudy.study_id,file_name:vaultFile.name,custom_name:vaultCustomName||vaultFile.name,document_type:vaultDocType,file_path:path,file_size:vaultFile.size,extracted_text:extractedText,uploaded_by:user?.email,is_active:true}]).select();
    if(inserted){
      setVaultDocs(prev=>[inserted[0] as VaultDoc,...prev]);
      setVaultProgress("Done!");
      if(vaultDocType==="Protocol"){
        setVaultProgress("Extracting study identity profile...");
        try{
          const reader2=new FileReader();
          const base64=await new Promise<string>((res,rej)=>{reader2.onload=()=>res((reader2.result as string).split(",")[1]);reader2.onerror=rej;reader2.readAsDataURL(vaultFile);});
          const idRes=await fetch("/api/trinity/extract-identity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:vaultFile.name,orgId,studyId:activeStudy.study_id,vaultDocId:inserted[0].id})});
          const idData=await idRes.json();
          if(idData.identity&&Object.keys(idData.identity).length>0){
            await supabase.from("study_identity").update({is_active:false}).eq("org_id",orgId).eq("study_id",activeStudy.study_id);
            const{data:savedIdentity}=await supabase.from("study_identity").insert([{org_id:orgId,study_id:activeStudy.study_id,protocol_number:idData.identity.protocol_number,sponsor_name:idData.identity.sponsor_name,study_title:idData.identity.study_title,phase:idData.identity.phase,imp_name:idData.identity.imp_name,indication:idData.identity.indication,sites:idData.identity.planned_sites||[],countries:idData.identity.countries||[],primary_endpoint:idData.identity.primary_endpoint,study_duration:idData.identity.study_duration,irb_names:idData.identity.irb_names||[],key_milestones:idData.identity.key_milestones||[],expected_documents:idData.identity.expected_documents||[],source_vault_doc_id:inserted[0].id,is_active:true}]).select().maybeSingle();
            if(savedIdentity)setStudyIdentity(savedIdentity);
            setVaultProgress("Done! Study identity profile extracted.");
          }
        }catch{setVaultProgress("Done!");}
      }
      setTimeout(()=>{setVaultFile(null);setVaultCustomName("");setVaultProgress("");},3000);
    }
    setVaultUploading(false);
  }

  async function deleteVaultDoc(id:string){if(!confirm("Remove?"))return;await supabase.from("study_vault").update({is_active:false}).eq("id",id);setVaultDocs(prev=>prev.filter(d=>d.id!==id));}



  async function generateInspectionReport(){
    if(!activeStudy||inspectionQuestions.length===0)return;
    setInspectionLoading(true);
    try{
      // ONLY approved documents count — this mirrors exactly what is visible in the TMF Auditor
      const approvedDocs=docs.filter(d=>d.status==="Approved");
      const approvedCount=approvedDocs.length;
      const approvedList=approvedDocs.map(d=>`${d.artifact_num} — ${d.artifact_name} | File: ${d.custom_file_name||d.file_name} | Zone: ${d.zone} | Approved: ${d.approved_at||""}`).join("\n");
      const underReviewList=docs.filter(d=>d.status==="Under Review").map(d=>`${d.artifact_num} — ${d.artifact_name} (UNDER REVIEW — not yet filed)`).join("\n");
      const draftList=docs.filter(d=>d.status==="Draft").map(d=>`${d.artifact_num} — ${d.artifact_name} (DRAFT — rejected or incomplete)`).join("\n");
      const missingList=gaps.crit.concat(gaps.major).concat(gaps.minor).map((g:any)=>`Zone ${g.z} — ${g.a} — ${g.an} [${g.cl}] — MISSING`).join("\n");
      const questionsList=inspectionQuestions.map((q,i)=>`${i+1}. [${q.severity}][${q.category}] ${q.question_text}`).join("\n");

      const prompt=`You are a senior FDA/EMA TMF auditor inspecting a live Trial Master File system.

YOUR ONLY SOURCE OF TRUTH is the APPROVED DOCUMENTS list below. This is the TMF Auditor view — only approved documents are considered filed. Draft and Under Review documents do not exist for inspection purposes.

ABSOLUTE RULES:
1. "Pass" = document is explicitly in the APPROVED list AND directly satisfies the question. State the exact artifact number.
2. "Fail" = document required by this question is NOT in the approved list (whether missing, draft, or under review). Missing = Fail. Draft = Fail. Under Review = Fail.
3. "Partial" = question is partially satisfied by approved documents but not fully (e.g. protocol approved but no amendments).
4. "Unable to Verify" = question asks about document CONTENT (signatures, dates, internal consistency) that cannot be assessed from the artifact name alone — but only use this if the document IS approved. If the document is missing, it is still Fail.
5. A TMF with ${approvedCount} approved documents CANNOT score above ${Math.min(100, approvedCount===0?0:Math.round((approvedCount/Math.max(totalCore,1))*100)+20)}/100. Calibrate accordingly.
6. Never assume a document exists. Never give benefit of the doubt.

STUDY: ${activeStudy.study_id} | SPONSOR: ${activeStudy.sponsor||"Unknown"} | PHASE: ${activeStudy.phase||"Unknown"}
TMF COMPLETENESS: ${donePct}% (${approvedCount} approved of ${totalCore} core required)

=== APPROVED DOCUMENTS — only these can support a Pass (${approvedCount} total) ===
${approvedList||"NO APPROVED DOCUMENTS. Every question about document presence must be Fail."}

=== UNDER REVIEW — cannot support Pass, at most Partial ===
${underReviewList||"None"}

=== DRAFT / REJECTED — cannot support Pass or Partial ===
${draftList||"None"}

=== MISSING CORE ARTIFACTS — not filed at all, auto-Fail for any question about these ===
${missingList||"No missing core documents"}

=== INSPECTION QUESTIONS ===
${questionsList}

Evaluate each question. Reference exact artifact numbers. Return JSON array only:
[{"question_number":1,"question_text":"exact text","category":"category","severity":"Critical|Major|Minor","verdict":"Pass|Fail|Partial|Unable to Verify","finding":"precise finding citing artifact numbers or naming what is absent","evidence":"artifact numbers from approved list that support verdict, or what is missing","regulatory_ref":"specific ICH E6(R3) section or 21 CFR Part 11 subsection","recommendation":"exact corrective action with suggested timeline if not Pass"}]

Return ONLY valid JSON array.`;

      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,context:`You are a strict FDA/EMA TMF auditor. The TMF has ${approvedCount} approved documents. You ONLY award Pass for documents explicitly in the approved list. ${approvedCount===0?"There are zero approved documents — every document-presence question is Fail.":""} Return only valid JSON array, no other text.`})});
      const data=await res.json();
      let results:any[]=[];
      try{results=JSON.parse((data.response||"[]").replace(/```json|```/g,"").trim());}catch{results=[];}

      // Post-process: enforce hard rules the AI may have missed
      results=results.map((r:any)=>{
        // If AI gave Pass but no approved document exists at all, downgrade to Fail
        if(r.verdict==="Pass"&&approvedCount===0){
          return{...r,verdict:"Fail",finding:(r.finding||"")+" [Auto-downgraded: no approved documents in TMF]",evidence:"No approved documents exist"};
        }
        // If AI gave Pass but evidence doesn't reference any known approved artifact, downgrade to Unable to Verify
        if(r.verdict==="Pass"&&r.evidence){
          const evidenceLower=(r.evidence||"").toLowerCase();
          const hasRealEvidence=approvedDocs.some(d=>evidenceLower.includes(d.artifact_num?.toLowerCase()||"xxx")||evidenceLower.includes((d.artifact_name||"").toLowerCase().slice(0,8)));
          if(!hasRealEvidence&&approvedCount>0){
            return{...r,verdict:"Unable to Verify",finding:(r.finding||"")+" [Cannot confirm — no matching approved artifact found]"};
          }
        }
        return r;
      });

      const passing=results.filter((r:any)=>r.verdict==="Pass");
      const failing=results.filter((r:any)=>r.verdict==="Fail");
      const partial=results.filter((r:any)=>r.verdict==="Partial");
      const unverifiable=results.filter((r:any)=>r.verdict==="Unable to Verify");
      const criticalFails=failing.filter((r:any)=>r.severity==="Critical");
      const majorFails=[...failing.filter((r:any)=>r.severity==="Major"),...partial.filter((r:any)=>r.severity==="Critical"||r.severity==="Major")];
      const minorFails=failing.filter((r:any)=>r.severity==="Minor");
      // Score: start from passing only, penalise fails — unverifiable counts as neutral
      const baseScore=results.length>0?Math.round((passing.length/results.length)*100):0;
      const penalty=(criticalFails.length*15)+(majorFails.length*7)+(minorFails.length*3)+(partial.length*2);
      const riskScore=Math.max(0,Math.min(baseScore,100-penalty));
      const narrativePrompt=`Write a 3-4 sentence formal inspection readiness assessment in FDA Form 483 observation style for study ${activeStudy.study_id}. ${approvedCount} documents approved of ${totalCore} required (${donePct}% complete). ${criticalFails.length} critical failures, ${majorFails.length} major findings, ${passing.length} passing, ${unverifiable.length} unable to verify. Risk score: ${riskScore}/100. Be direct and use formal regulatory language.`;
      const narrativeRes=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:narrativePrompt,context:"You are a senior FDA auditor writing a formal inspection narrative."})});
      const narrativeData=await narrativeRes.json();
      setInspectionReport({questions:results,passing,failing,partial,unverifiable,critical_fails:criticalFails,major_fails:majorFails,risk_score:riskScore,inspection_ready:criticalFails.length===0&&majorFails.length<3,summary:narrativeData.response||"",generated_at:new Date().toISOString()});
    }catch{alert("Inspection simulation failed.");}
    setInspectionLoading(false);
  }


  const vaultHasProtocol=vaultDocs.some(d=>d.document_type==="Protocol");
  const pinnedSessions=sessions.filter(s=>s.is_pinned);
  const unpinnedSessions=sessions.filter(s=>!s.is_pinned);
  const filteredSessions=chatSearch?sessions.filter(s=>s.title?.toLowerCase().includes(chatSearch.toLowerCase())):null;
  const categories=["TMF Structure","Document Quality","Protocol","IRB/EC","Investigator","Training","Informed Consent","Monitoring","Safety Reporting","Drug/Device Accountability","Protocol Deviations","Correspondence","Audit/Inspection","Subject Records","Electronic Records","Close-Out","Archive","General"];

  const NAV=[
    {id:"chat",label:"Chat",Icon:Ico.chat,badge:null},
    {id:"vault",label:"Study Vault",Icon:Ico.db,badge:vaultDocs.length>0?vaultDocs.length:null},
    {id:"inspection",label:"Inspection Sim",Icon:Ico.shield,badge:null},
  ];

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F9FAFB",fontFamily:"system-ui"}}><div style={{textAlign:"center"}}><div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg,#FFEDD5,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",color:"#fff"}}><Ico.star/></div><div style={{fontSize:"14px",color:"#6B7280"}}>Loading Trinity...</div></div></div>);
  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F9FAFB",fontFamily:"system-ui"}}><div style={{textAlign:"center"}}><div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg,#FFEDD5,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",color:"#fff"}}><Ico.star/></div><div style={{fontSize:"14px",color:"#6B7280"}}>Loading Trinity...</div></div></div>);
  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",background:P.bg,overflow:"hidden"}}>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* SIDEBAR */}
      <div style={{width:sidebarCollapsed?"60px":"260px",background:"#FFFFFF",borderRight:"1px solid #E5E7EB",display:"flex",flexDirection:"column",flexShrink:0,transition:"width .2s ease",overflow:"hidden"}}>
        <div style={{padding:"16px 12px 12px",borderBottom:"1px solid #E5E7EB",display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
          <div style={{width:"28px",height:"28px",borderRadius:"8px",background:"linear-gradient(135deg,#F97316,#EA580C)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}><Ico.star/></div>
          {!sidebarCollapsed&&<div style={{flex:1,minWidth:0}}><div style={{fontSize:"13px",fontWeight:"700",color:"#111827"}}>Trinity</div><div style={{fontSize:"10px",color:"#9CA3AF"}}>AI Specialist</div></div>}
          <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:"2px",flexShrink:0,display:"flex"}}><Ico.menu/></button>
        </div>

        {!sidebarCollapsed&&(
          <div style={{padding:"10px 12px",borderBottom:"1px solid #E5E7EB",flexShrink:0}}>
            <div style={{fontSize:"9px",color:"#9CA3AF",textTransform:"uppercase",letterSpacing:".08em",marginBottom:"6px"}}>Active Study</div>
            <select value={activeStudy?.study_id||""} onChange={e=>switchStudy(e.target.value)} style={{width:"100%",fontSize:"11px",background:"#F9FAFB",color:"#111827",border:"1px solid #E5E7EB",borderRadius:"6px",padding:"6px 8px",fontFamily:"inherit"}}>
              {studies.map(s=><option key={s.study_id} value={s.study_id}>{s.study_id}</option>)}
            </select>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"6px"}}>
              <div style={{flex:1,height:"3px",background:"#F3F4F6",borderRadius:"3px",overflow:"hidden"}}><div style={{width:`${donePct}%`,height:"100%",background:donePct>=80?"#10B981":donePct>=50?"#F97316":"#EF4444",borderRadius:"3px"}}/></div>
              <span style={{fontSize:"10px",color:"#6B7280"}}>{donePct}%</span>
            </div>
          </div>
        )}

        {studyIdentity&&!sidebarCollapsed&&(
          <div style={{padding:"8px 12px",borderBottom:"1px solid #E5E7EB",flexShrink:0,background:"#ECFDF5"}}>
            <div style={{fontSize:"9px",color:"#10B981",textTransform:"uppercase",letterSpacing:".08em",marginBottom:"3px",fontWeight:"600"}}>Identity Verified</div>
            <div style={{fontSize:"10px",color:"#374151"}}>{studyIdentity.protocol_number||""} · {studyIdentity.phase||""}</div>
          </div>
        )}

        <div style={{padding:"8px 8px 0",flexShrink:0}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPanel(n.id as any)} style={{width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",borderRadius:"8px",border:"none",cursor:"pointer",background:panel===n.id?"#FFF7ED":"transparent",color:panel===n.id?"#F97316":"#374151",marginBottom:"2px",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
              <span style={{flexShrink:0}}><n.Icon/></span>
              {!sidebarCollapsed&&(<><span style={{fontSize:"12px",fontWeight:panel===n.id?"600":"400",flex:1}}>{n.label}</span>{n.badge&&<span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"20px",background:panel===n.id?"#FFEDD5":"#F3F4F6",color:panel===n.id?"#F97316":"#6B7280"}}>{n.badge}</span>}</>)}
            </button>
          ))}
        </div>

        {!sidebarCollapsed&&(
          <div style={{padding:"8px",borderTop:"1px solid #E5E7EB",marginTop:"4px",flexShrink:0}}>
            <button onClick={()=>{setPanel("inspection");setInspectionTab("report");generateInspectionReport();}} disabled={inspectionLoading} style={{width:"100%",fontSize:"10px",padding:"6px",background:"#0F172A",color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer",opacity:inspectionLoading?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>{inspectionLoading?<Ico.loader/>:<Ico.shield/>}{inspectionLoading?"...":"Run Inspection"}</button>
          </div>
        )}

        {!sidebarCollapsed&&memories.length>0&&(
          <div style={{padding:"0 8px 4px",flexShrink:0}}>
            <button onClick={()=>setShowMemory(!showMemory)} style={{width:"100%",display:"flex",alignItems:"center",gap:"8px",padding:"7px 8px",borderRadius:"8px",border:"none",cursor:"pointer",background:"transparent",color:"#6B7280",fontFamily:"inherit"}}>
              <Ico.memory/><span style={{fontSize:"11px",flex:1,textAlign:"left",color:"#374151"}}>Memory ({memories.length})</span><Ico.chevDown/>
            </button>
            {showMemory&&(<div style={{background:"#F9FAFB",borderRadius:"8px",padding:"8px",marginTop:"4px",border:"1px solid #E5E7EB",maxHeight:"160px",overflowY:"auto"}}>
              {memories.map(m=>(<div key={m.id} style={{display:"flex",gap:"6px",alignItems:"flex-start",marginBottom:"6px"}}><div style={{width:"4px",height:"4px",borderRadius:"50%",background:"#F97316",flexShrink:0,marginTop:"5px"}}/><div style={{flex:1,fontSize:"10px",color:"#374151",lineHeight:"1.5"}}>{m.memory_text}</div><button onClick={()=>deleteMemory(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:"0",flexShrink:0}}><Ico.x/></button></div>))}
            </div>)}
          </div>
        )}

        {!sidebarCollapsed&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",borderTop:"1px solid #E5E7EB"}}>
            <div style={{padding:"10px 12px 6px",display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
              <span style={{fontSize:"9px",color:"#9CA3AF",textTransform:"uppercase",letterSpacing:".08em",flex:1}}>Recent Chats</span>
              <button onClick={()=>setShowSearch(!showSearch)} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:"2px"}}><Ico.search/></button>
              <button onClick={startNewChat} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:"2px"}} title="New chat"><Ico.plus/></button>
            </div>
            {showSearch&&<div style={{padding:"0 8px 6px",flexShrink:0}}><input value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Search chats..." style={{width:"100%",fontSize:"11px",background:"#F9FAFB",color:"#111827",border:"1px solid #E5E7EB",borderRadius:"6px",padding:"5px 8px",fontFamily:"inherit",outline:"none"}}/></div>}
            <div style={{flex:1,overflowY:"auto"}}>
              {pinnedSessions.length>0&&!chatSearch&&<div><div style={{fontSize:"9px",color:"#9CA3AF",padding:"4px 12px",textTransform:"uppercase",letterSpacing:".06em"}}>Pinned</div>{pinnedSessions.map(s=><SessionRow key={s.id} s={s} active={activeSessionId===s.id} onLoad={loadSession} onPin={togglePin} onDelete={deleteSession}/>)}</div>}
              {(filteredSessions||unpinnedSessions).map(s=><SessionRow key={s.id} s={s} active={activeSessionId===s.id} onLoad={loadSession} onPin={togglePin} onDelete={deleteSession}/>)}
              {sessions.length===0&&<div style={{fontSize:"11px",color:"#9CA3AF",padding:"12px",textAlign:"center"}}>No conversations yet</div>}
            </div>
            <div style={{padding:"8px 12px",borderTop:"1px solid #E5E7EB",flexShrink:0}}>
              <a href="/platform" style={{display:"flex",alignItems:"center",gap:"6px",textDecoration:"none",color:"#6B7280",fontSize:"11px",padding:"6px 8px",borderRadius:"7px",background:"#F9FAFB",border:"1px solid #E5E7EB"}}>
                <Ico.back/><span>Back to TMF360</span>
              </a>
            </div>
          </div>
        )}

        {sidebarCollapsed&&(
          <div style={{marginTop:"auto",padding:"8px",borderTop:"1px solid #E5E7EB"}}>
            <a href="/platform" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px",borderRadius:"7px",background:"#F9FAFB",border:"1px solid #E5E7EB",color:"#6B7280",textDecoration:"none"}}><Ico.back/></a>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* TOP BAR */}
        <div style={{height:"48px",borderBottom:`1px solid ${P.border}`,background:P.bg,display:"flex",alignItems:"center",padding:"0 1.5rem",gap:"12px",flexShrink:0}}>
          <span style={{fontSize:"14px",fontWeight:"600",color:P.text}}>{NAV.find(n=>n.id===panel)?.label||"Trinity"}</span>
          {activeStudy&&<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",background:P.primaryLight,color:P.primary,fontWeight:"500"}}>{activeStudy.study_id}</span>}
          {studyIdentity&&<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",background:"#ECFDF5",color:"#10B981",fontWeight:"500"}}>Identity verified</span>}
          <div style={{marginLeft:"auto",display:"flex",gap:"8px",alignItems:"center"}}>
            {panel==="chat"&&<><button onClick={exportChatAsPDF} style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,border:`1px solid ${P.border}`,borderRadius:"6px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><Ico.download/>Export</button><button onClick={startNewChat} style={{fontSize:"11px",padding:"5px 12px",background:P.primaryLight,color:P.primary,border:"1px solid #FDBA74",borderRadius:"6px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><Ico.plus/>New Chat</button></>}
            <span style={{fontSize:"11px",color:P.textTert}}>{user?.email}</span>
          </div>
        </div>

        {/* CHAT PANEL */}
        {panel==="chat"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"8px 1.5rem",display:"flex",gap:"6px",flexWrap:"wrap",borderBottom:`1px solid ${P.border}`,background:P.bgSec,flexShrink:0}}>
              {["What's my TMF health?","What is the primary endpoint?","What documents are missing from Zone 3?","Summarise the Protocol","Review a pending document"].map(q=><button key={q} onClick={()=>setChatInput(q)} style={{fontSize:"11px",border:`1px solid ${P.border}`,borderRadius:"20px",padding:"4px 12px",color:P.textSec,background:P.bg,cursor:"pointer",whiteSpace:"nowrap"}}>{q}</button>)}
              {!vaultHasProtocol&&<span style={{fontSize:"11px",padding:"4px 12px",borderRadius:"20px",background:"#FFFBEB",color:"#92400E",border:"1px solid #FDE68A"}}>Upload Protocol to vault for full insights</span>}
            </div>
            <div style={{flex:1,overflowY:"auto",background:`linear-gradient(135deg,${P.lavender} 0%,#F5F6FC 45%,${P.bg} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0 8px"}}>
              <div style={{width:"100%",maxWidth:"820px",padding:"0 24px",display:"flex",flexDirection:"column",gap:"16px"}}>
                {chatMessages.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:"10px",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeIn .2s ease"}}>
                    {m.role==="ai"&&<span style={{width:"30px",height:"30px",borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,#FFEDD5,#fff)",border:"1px solid #FFEDD5",display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,marginTop:"2px"}}><Ico.star/></span>}
                    <div style={{maxWidth:"80%",display:"flex",flexDirection:"column",gap:"6px"}}>
                      {m.role==="ai"&&<div style={{fontSize:"11px",color:P.textTert,fontWeight:"600",paddingLeft:"2px"}}>Trinity</div>}
                      {m.text&&m.text!=="__VALIDATE__"&&!m.text.startsWith("__FILED__")&&!m.text.startsWith("__VALIDATE_DONE__")&&(
                        <div style={{fontSize:"13px",borderRadius:m.role==="ai"?"12px 12px 12px 4px":"12px 12px 4px 12px",padding:"11px 15px",lineHeight:"1.7",whiteSpace:"pre-wrap",background:m.role==="ai"?P.bg:"#F97316",border:m.role==="ai"?`1px solid ${P.border}`:"none",color:m.role==="ai"?P.text:"#fff",boxShadow:m.role==="ai"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{m.text}</div>
                      )}
                      {m.text?.startsWith("__FILED__")&&(
                        <div style={{display:"flex",alignItems:"flex-start",gap:"9px",border:"1px solid #A7F3D0",background:P.successLight,borderRadius:"12px",padding:"12px 15px"}}>
                          <span style={{color:P.success,flexShrink:0}}><Ico.circleCheck/></span>
                          <div><div style={{fontSize:"13px",fontWeight:"600",color:"#065F46"}}>{m.text.replace("__FILED__","").split("\n")[0]}</div><div style={{fontSize:"11px",color:"#065F46",opacity:.85,marginTop:"2px"}}>{m.text.replace("__FILED__","").split("\n")[1]}</div></div>
                        </div>
                      )}
                      {m.text==="__VALIDATE__"&&m.validation&&(
                        <div style={{border:`1px solid ${P.border}`,borderRadius:"12px",padding:"16px",background:P.bg,display:"flex",flexDirection:"column",gap:"10px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                          <div style={{fontSize:"13px",fontWeight:"700",color:P.text}}>Document Validation Report</div>
                          {m.validation.identity_checks?.length>0&&(<div><div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,textTransform:"uppercase",letterSpacing:".06em",marginBottom:"6px"}}>Identity Verification</div>{m.validation.identity_checks.map((c:any,ci:number)=>(<div key={ci} style={{display:"flex",alignItems:"flex-start",gap:"8px",padding:"8px 10px",borderRadius:"8px",background:c.pass?P.successLight:c.hard?P.dangerLight:P.warningLight,marginBottom:"4px"}}><span style={{flexShrink:0,color:c.pass?P.success:c.hard?P.danger:P.warning}}>{c.pass?<Ico.check/>:<Ico.x/>}</span><div style={{flex:1}}><div style={{fontSize:"11px",fontWeight:"600",color:P.text}}>{c.label}</div><div style={{fontSize:"10px",color:P.textSec,marginTop:"1px"}}>{c.detail}</div>{c.doc_value&&c.vault_value&&!c.pass&&<div style={{fontSize:"10px",color:P.danger,marginTop:"4px",fontFamily:"monospace"}}>Doc: {c.doc_value} | Study: {c.vault_value}</div>}</div>{c.hard&&!c.pass&&<span style={{fontSize:"9px",padding:"2px 6px",borderRadius:"20px",background:P.danger,color:"#fff",fontWeight:"700",flexShrink:0}}>HARD FAIL</span>}</div>))}</div>)}
                          {m.validation.quality_checks?.length>0&&(<div><div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,textTransform:"uppercase",letterSpacing:".06em",marginBottom:"6px"}}>Quality Checks</div>{m.validation.quality_checks.map((c:any,ci:number)=><div key={ci} style={{display:"flex",alignItems:"flex-start",gap:"8px",padding:"8px 10px",borderRadius:"8px",background:c.pass?P.successLight:P.warningLight,marginBottom:"4px"}}><span style={{flexShrink:0,color:c.pass?P.success:P.warning}}>{c.pass?<Ico.check/>:<Ico.alert/>}</span><div style={{flex:1}}><div style={{fontSize:"11px",fontWeight:"600",color:P.text}}>{c.label}</div><div style={{fontSize:"10px",color:P.textSec,marginTop:"1px"}}>{c.detail}</div></div></div>)}</div>)}
                          {m.validation.consistency_checks?.length>0&&(<div><div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,textTransform:"uppercase",letterSpacing:".06em",marginBottom:"6px"}}>Consistency Checks</div>{m.validation.consistency_checks.map((c:any,ci:number)=><div key={ci} style={{display:"flex",alignItems:"flex-start",gap:"8px",padding:"8px 10px",borderRadius:"8px",background:c.pass?P.successLight:P.warningLight,marginBottom:"4px"}}><span style={{flexShrink:0,color:c.pass?P.success:P.warning}}>{c.pass?<Ico.check/>:<Ico.alert/>}</span><div style={{flex:1}}><div style={{fontSize:"11px",fontWeight:"600",color:P.text}}>{c.label}</div><div style={{fontSize:"10px",color:P.textSec,marginTop:"1px"}}>{c.detail}</div></div></div>)}</div>)}
                          {m.validation.audit_narrative&&<div style={{padding:"10px 12px",borderRadius:"8px",background:P.bgSec,border:`1px solid ${P.border}`,fontSize:"10px",color:P.textSec,lineHeight:"1.6",fontStyle:"italic"}}>{m.validation.audit_narrative}</div>}
                          <div style={{padding:"10px 12px",borderRadius:"8px",background:m.validation.overall==="pass"?P.successLight:m.validation.overall==="fail"?P.dangerLight:P.warningLight,fontSize:"12px",color:m.validation.overall==="pass"?P.success:m.validation.overall==="fail"?P.danger:P.warning,fontWeight:"600"}}>{m.validation.overall==="fail"?"REJECTED — This document cannot be filed into this study":m.validation.overall==="warn"?"Issues detected — review before filing":"Passed — document is valid for this study"}</div>
                          {m.validation.overall!=="fail"&&<div style={{display:"flex",gap:"8px"}}><button onClick={async()=>{const cl=m.pendingClassification;setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,text:"__VALIDATE_DONE__"} as any:msg));await fileDocument(cl,m.validation);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><Ico.check/>Confirm & File</button><button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,text:"__VALIDATE_DONE__"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Filing cancelled."}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.bgTert,color:P.textSec,border:`1px solid ${P.border}`,borderRadius:"8px",cursor:"pointer"}}><Ico.x/>Cancel</button></div>}
                          {m.validation.overall==="fail"&&<button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,text:"__VALIDATE_DONE__"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Document rejected."}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>Dismiss</button>}
                        </div>
                      )}
                      {m.isHealthCard&&activeStudy&&(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                          {[{val:`${donePct}%`,label:"TMF completeness",color:P.blue},{val:missing,label:"Missing documents",color:P.danger},{val:`${ri}/100`,label:"Readiness score",color:ri>=80?P.success:ri>=50?P.primary:P.danger}].map((s,si)=><div key={si} style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"10px",padding:"12px 14px"}}><div style={{fontSize:"20px",fontWeight:"700",color:s.color}}>{s.val}</div><div style={{fontSize:"10px",color:P.textSec,marginTop:"2px"}}>{s.label}</div></div>)}
                        </div>
                      )}
                      {m.classification&&(<>
                        <div style={{border:`1px solid ${P.border}`,borderRadius:"12px",padding:"12px 15px",background:P.bg}}><div style={{fontSize:"13px",fontWeight:"600",color:P.text,marginBottom:"6px"}}>{m.classification.zoneLine}</div><span style={{fontSize:"11px",fontWeight:"600",padding:"3px 10px",borderRadius:"20px",background:m.classification.confidence>=80?P.successLight:P.warningLight,color:m.classification.confidence>=80?P.success:P.warning}}>Confidence {m.classification.confidence}%</span></div>
                        {m.classification.warning&&<div style={{border:"1px solid #FDE68A",background:P.warningLight,borderRadius:"12px",padding:"12px 15px"}}><div style={{fontSize:"12px",fontWeight:"600",color:P.warning,marginBottom:"4px"}}>Version mismatch detected</div><div style={{fontSize:"12px",color:"#7a5205",lineHeight:"1.6"}}>{m.classification.warning.detail}</div><div style={{fontSize:"12px",color:"#7a5205",background:"#fff",border:"1px solid #FDE68A",borderRadius:"8px",padding:"8px 10px",marginTop:"6px"}}>Suggested action: {m.classification.warning.action}</div></div>}
                      </>)}
                      {chatDocAction?.msgIdx===i&&!chatDocAction.disabled&&(
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={()=>{const pendingDoc=docs.find(d=>d.status==="Under Review");if(!pendingDoc)return;const zoneInfo=activeZONES.find(z=>z.z===pendingDoc.zone);setApproveDocId(pendingDoc.id||null);setApproveStage(1);setChatMessages(prev=>[...prev,{role:"ai",text:`Zone ${padZone(pendingDoc.zone)} - ${zoneInfo?.zn||"Unclassified zone"}\nConfirm this is the correct zone for filing.`}]);setChatDocAction(prev=>prev?{...prev,disabled:true}:null);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Approve</button>
                          <button onClick={()=>{const pendingDoc=docs.find(d=>d.status==="Under Review");if(!pendingDoc)return;setFlagDocId(pendingDoc.id||null);setFlagReason(detectFlagReason(pendingDoc));setFlagStage("form");setFlagMsgIdx(i);setChatMessages(prev=>[...prev,{role:"ai",text:"Flag initiated. Review the detected reason below and add context before submitting."}]);setChatDocAction(prev=>prev?{...prev,disabled:true}:null);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Flag</button>
                        </div>
                      )}
                      {approveStage===1&&i===chatMessages.length-1&&m.text.startsWith("Zone ")&&(
                        <button onClick={async()=>{const pendingDoc=docs.find(d=>d.id===approveDocId);if(!pendingDoc)return;const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);setApproveStage(2);setChatMessages(prev=>[...prev,{role:"ai",text:`Artifact - ${art?.an||pendingDoc.artifact_name}\nConfirm this is the correct artifact type.`}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>Approve Zone</button>
                      )}
                      {approveStage===2&&i===chatMessages.length-1&&m.text.startsWith("Artifact -")&&(
                        <button onClick={async()=>{const pendingDoc=docs.find(d=>d.id===approveDocId);if(!pendingDoc)return;const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Approved",approved_by:user?.email,approved_at:now,signature_reason:"Approved via Trinity AI"}).eq("id",pendingDoc.id);if(!error){await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document approved via Trinity",document_id:pendingDoc.id,study_id:pendingDoc.study_id,field_changed:"status",old_value:pendingDoc.status,new_value:"Approved",signature_reason:"Approved via Trinity AI",document_name:pendingDoc.custom_file_name||pendingDoc.artifact_name}]);setDocs(prev=>prev.map(d=>d.id===pendingDoc.id?{...d,status:"Approved",approved_by:user?.email,approved_at:now}:d));const filedMsg:ChatMsg={role:"ai",text:`__FILED__Filed to Zone ${padZone(pendingDoc.zone)} — Section ${formatSection(art?.s||"")}\nAudit trail entry recorded.`};const final=[...chatMessages,filedMsg];setChatMessages(final);scheduleSave(final);}setApproveStage(0);setApproveDocId(null);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>Approve & File</button>
                      )}
                      {flagStage==="form"&&i===chatMessages.length-1&&m.text.includes("Flag initiated")&&(
                        <div style={{background:P.dangerLight,border:"1px solid #FECACA",borderRadius:"12px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                          <div><div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase"}}>Auto-detected reason</div><div style={{fontSize:"12px",background:"#fff",border:`1px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",color:P.textSec}}>{flagReason}</div></div>
                          <div><div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase"}}>Your comment</div><textarea value={flagComment} onChange={e=>setFlagComment(e.target.value)} rows={2} placeholder="Add context for the reviewer..." style={{width:"100%",fontSize:"12px",border:`1px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical",background:"#fff",fontFamily:"inherit"}}/></div>
                          <button disabled={!flagComment.trim()} onClick={async()=>{if(!flagDocId)return;const doc=docs.find(d=>d.id===flagDocId);if(!doc)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:flagReason,rejected_by:user?.email,rejected_at:now}).eq("id",doc.id);if(!error){await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document flagged via Trinity",document_id:doc.id,study_id:doc.study_id,field_changed:"status",old_value:doc.status,new_value:"Draft",signature_reason:flagReason,document_name:doc.custom_file_name||doc.artifact_name}]);setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,status:"Draft",rejection_reason:flagReason} as any:d));}const flagMsg:ChatMsg={role:"ai",text:`Document flagged and moved to Draft.\nReason: ${flagReason}\nComment: ${flagComment}`};const final=[...chatMessages,flagMsg];setChatMessages(final);scheduleSave(final);setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"8px",cursor:flagComment.trim()?"pointer":"not-allowed",alignSelf:"flex-start",opacity:flagComment.trim()?1:0.5}}>Submit Flag</button>
                        </div>
                      )}
                      {(m as any).classStage==="zone"&&(m as any).pendingClassification&&(
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={()=>{const cl=(m as any).pendingClassification;setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:`Zone ${cl.zone_num} - ${cl.zone_name} approved.\n\nArtifact: ${cl.artifact_num} - ${cl.artifact_name}\n\n${cl.issues?.length>0?"Issues:\n"+cl.issues.join("\n"):""}\n\nApprove this artifact?`,pendingClassification:cl,classStage:"artifact"} as any]);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Approve Zone</button>
                          <button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Zone rejected. Which zone should this document be filed under?"}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.bgTert,color:P.textSec,border:`1px solid ${P.border}`,borderRadius:"8px",cursor:"pointer"}}>Reject</button>
                        </div>
                      )}
                      {(m as any).classStage==="artifact"&&(m as any).pendingClassification&&(
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={async()=>{const cl=(m as any).pendingClassification;setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));setChatLoading(true);try{const vRes=await fetch("/api/trinity/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:cl.base64,fileName:cl.fileName,artifactNum:cl.artifact_num,artifactName:cl.artifact_name,zoneNum:cl.zone_num,zoneName:cl.zone_name,vaultDocs:vaultDocs.map(d=>({document_type:d.document_type,custom_name:d.custom_name,extracted_text:d.extracted_text?.slice(0,2000)||""})),filedDocs:docs.filter(d=>d.status==="Approved").map(d=>({artifact_num:d.artifact_num,artifact_name:d.artifact_name,custom_file_name:d.custom_file_name,status:d.status})),activeStudy:activeStudy?.study_id||"",orgId,userEmail:user?.email||"",userId:user?.id||"",studyIdentity})});const validation=await vRes.json();const valMsg={role:"ai",text:"__VALIDATE__",pendingClassification:cl,validation} as any;const final=[...chatMessages,valMsg];setChatMessages(final);scheduleSave(final);}catch{await fileDocument(cl,null);}setChatLoading(false);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Approve & Validate</button>
                          <button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Artifact rejected. Which artifact should this be filed under?"}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"7px 16px",background:P.bgTert,color:P.textSec,border:`1px solid ${P.border}`,borderRadius:"8px",cursor:"pointer"}}>Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading&&<div style={{display:"flex",gap:"10px"}}><span style={{width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#FFEDD5,#fff)",border:"1px solid #FFEDD5",display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,flexShrink:0}}><Ico.star/></span><div style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"12px",padding:"12px 15px",display:"flex",gap:"5px",alignItems:"center"}}>{[0,1,2].map(i=><span key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#D1D5DB",display:"inline-block",animation:"bounce 0.9s infinite",animationDelay:`${i*0.15}s`}}/>)}</div></div>}
                <div ref={messagesEnd}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 16px",background:`linear-gradient(135deg,${P.lavender} 0%,#F5F6FC 45%,${P.bg} 100%)`,flexShrink:0}}>
              <input ref={chatFileInput} type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0];if(!file)return;
                if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Select a study first."}]);return;}
                const userMsg:ChatMsg={role:"user",text:`Uploaded: ${file.name}`};
                const newMsgs=[...chatMessages,userMsg];setChatMessages(newMsgs);setChatLoading(true);
                const reader=new FileReader();
                reader.onload=async(ev)=>{
                  const base64=((ev.target?.result as string)||"").split(",")[1];
                  setChatMessages(prev=>[...prev,{role:"ai",text:"Reading your document... I'll analyse the content and suggest the correct TMF zone and artifact."}]);
                  try{
                    const res=await fetch("/api/classify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:file.name,activeZONES,activeTMF})});
                    const data=await res.json();
                    if(data.error){setChatMessages(prev=>[...prev,{role:"ai",text:"Could not classify: "+data.error}]);setChatLoading(false);return;}
                    const clMsg={role:"ai",text:`I've analysed your document.\n\n${data.reasoning}\n\nSuggested Zone: Zone ${data.zone_num} - ${data.zone_name}\nConfidence: ${data.confidence}%\n\nApprove this zone?`,pendingClassification:{...data,base64,fileName:file.name},classStage:"zone"} as any;
                    const final=[...newMsgs,{role:"ai" as const,text:"Reading your document..."},clMsg];setChatMessages(final);scheduleSave(final);
                  }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Classification error: "+err.message}]);}
                  setChatLoading(false);
                };
                reader.readAsDataURL(file);
                if(chatFileInput.current)chatFileInput.current.value="";
              }}/>
              <div style={{width:"100%",maxWidth:"820px",margin:"0 24px",display:"flex",alignItems:"center",gap:"8px",background:P.bg,border:`1px solid ${P.border}`,borderRadius:"28px",padding:"6px 8px 6px 16px",boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
                <button onClick={()=>chatFileInput.current?.click()} style={{width:"34px",height:"34px",borderRadius:"50%",border:"none",background:"transparent",color:P.textTert,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}><Ico.clip/></button>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask Trinity anything about this study..." style={{flex:1,border:"none",outline:"none",fontSize:"13px",background:"transparent",color:P.text,padding:"8px 2px"}}/>
                <button onClick={sendChat} disabled={chatLoading} style={{width:"34px",height:"34px",borderRadius:"50%",flexShrink:0,background:chatLoading?P.bgTert:P.primary,border:"none",color:chatLoading?P.textTert:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:chatLoading?"not-allowed":"pointer"}}><Ico.up/></button>
              </div>
            </div>
          </div>
        )}

        {/* VAULT PANEL */}
        {panel==="vault"&&(
          <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
            <div style={{maxWidth:"800px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
              <div><h2 style={{fontSize:"16px",fontWeight:"700",color:P.text,margin:0}}>Study Vault</h2><p style={{fontSize:"12px",color:P.textTert,marginTop:"4px",marginBottom:0}}>Upload key study documents. Trinity reads these to power identity verification and inspection readiness.</p></div>
              {studyIdentity&&(<div style={{background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:"12px",padding:"14px 16px"}}><div style={{fontSize:"11px",fontWeight:"600",color:"#059669",marginBottom:"8px"}}>Study Identity Profile Active — Documents validated against this profile</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>{[{label:"Protocol",val:studyIdentity.protocol_number},{label:"Sponsor",val:studyIdentity.sponsor_name},{label:"Phase",val:studyIdentity.phase},{label:"IMP",val:studyIdentity.imp_name},{label:"Indication",val:studyIdentity.indication},{label:"Primary Endpoint",val:studyIdentity.primary_endpoint}].filter(f=>f.val).map((f,i)=><div key={i}><div style={{fontSize:"9px",color:"#6B7280",textTransform:"uppercase",letterSpacing:".06em"}}>{f.label}</div><div style={{fontSize:"11px",color:P.text,fontWeight:"500",marginTop:"2px"}}>{f.val}</div></div>)}</div></div>)}
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:"10px",padding:"12px 16px",fontSize:"11px",color:"#1E40AF"}}><strong>Recommended:</strong> Protocol (activates identity verification), IB, SAP, Monitoring Plan, IRB Decision.</div>
              <div style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
                <h3 style={{fontSize:"13px",fontWeight:"600",marginBottom:"14px",marginTop:0}}>Upload to Vault</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
                  <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Document type</label><select value={vaultDocType} onChange={e=>setVaultDocType(e.target.value)} style={{width:"100%",fontSize:"12px",border:`1px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",fontFamily:"inherit"}}>{VAULT_DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Custom name (optional)</label><input value={vaultCustomName} onChange={e=>setVaultCustomName(e.target.value)} placeholder="e.g. Protocol v2.1 Final" style={{width:"100%",fontSize:"12px",border:`1px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",outline:"none"}}/></div>
                </div>
                <div onClick={()=>vaultFileInput.current?.click()} style={{border:`2px dashed ${vaultFile?P.primary:P.border}`,borderRadius:"10px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:vaultFile?P.primaryLight:P.bgSec,marginBottom:"12px"}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)setVaultFile(f);}}>
                  <input ref={vaultFileInput} type="file" accept=".pdf,.doc,.docx,.PDF,.DOC,.DOCX" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setVaultFile(f);}}/>
                  {vaultFile?<div><div style={{fontSize:"24px",marginBottom:"6px"}}>📄</div><div style={{fontSize:"13px",fontWeight:"500",color:P.primary}}>{vaultFile.name}</div><div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>{(vaultFile.size/1024).toFixed(0)} KB</div></div>:<div><div style={{fontSize:"24px",marginBottom:"6px"}}>📁</div><div style={{fontSize:"13px",color:P.textSec}}>Drop a PDF or Word document here or click to browse</div></div>}
                </div>
                {vaultProgress&&<div style={{fontSize:"11px",padding:"8px 12px",borderRadius:"8px",background:vaultProgress.includes("Done")?P.successLight:P.primaryLight,color:vaultProgress.includes("Done")?P.success:P.primary,marginBottom:"10px"}}>{vaultProgress}</div>}
                <button onClick={uploadVaultDoc} disabled={!vaultFile||vaultUploading} style={{fontSize:"12px",fontWeight:"600",padding:"10px 20px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:vaultFile&&!vaultUploading?"pointer":"not-allowed",opacity:vaultFile&&!vaultUploading?1:0.5}}>{vaultUploading?"Processing...":"Upload to Vault"}</button>
              </div>
              {vaultDocs.length===0?<div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bgSec,borderRadius:"12px",border:`1px solid ${P.border}`}}><div style={{fontSize:"32px",marginBottom:"8px"}}>📂</div><div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>Vault is empty</div></div>:(
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  <h3 style={{fontSize:"13px",fontWeight:"600",margin:0}}>Vault Documents ({vaultDocs.length})</h3>
                  {vaultDocs.map(d=><div key={d.id} style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"10px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px"}}><div style={{width:"40px",height:"40px",borderRadius:"10px",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>📄</div><div style={{flex:1}}><div style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{d.custom_name||d.file_name}</div><div style={{display:"flex",gap:"8px",marginTop:"3px",alignItems:"center"}}><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.purpleLight,color:P.purple,fontWeight:"500"}}>{d.document_type}</span><span style={{fontSize:"10px",color:P.textTert}}>{new Date(d.uploaded_at).toLocaleDateString()}</span>{d.extracted_text?<span style={{fontSize:"10px",color:P.success}}>✓ {d.extracted_text.length} chars</span>:<span style={{fontSize:"10px",color:P.warning}}>⚠ No text</span>}</div></div><div style={{display:"flex",gap:"6px"}}><a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none",border:`1px solid ${P.border}`}}>View</a><button onClick={()=>deleteVaultDoc(d.id)} style={{fontSize:"11px",padding:"5px 12px",background:P.dangerLight,color:P.danger,border:"1px solid #FECACA",borderRadius:"6px",cursor:"pointer"}}>Remove</button></div></div>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INSPECTION PANEL */}
        {panel==="inspection"&&(
          <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
            <div style={{maxWidth:"960px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <h2 style={{fontSize:"16px",fontWeight:"700",color:P.text,margin:0}}>Inspection Simulation</h2>
                  <p style={{fontSize:"12px",color:P.textTert,marginTop:"4px",marginBottom:0}}>FDA/EMA inspection simulation evaluated against your live TMF document registry.</p>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  {inspectionReport&&!inspectionLoading&&(
                    <button onClick={()=>{
                      const rows=inspectionReport.questions||[];
                      const sc=inspectionReport.risk_score>=80?"#10B981":inspectionReport.risk_score>=50?"#F97316":"#EF4444";
                      const cards=rows.map((q:any)=>{
                        const borderColor=q.verdict==="Pass"?"#10B981":q.verdict==="Fail"?"#EF4444":q.verdict==="Partial"?"#F59E0B":"#3B82F6";
                        const bg=q.verdict==="Pass"?"#ECFDF5":q.verdict==="Fail"?"#FEF2F2":q.verdict==="Partial"?"#FFFBEB":"#EFF6FF";
                        const sevColor=q.severity==="Critical"?"#EF4444":q.severity==="Major"?"#F59E0B":"#3B82F6";
                        const verdColor=q.verdict==="Pass"?"#10B981":q.verdict==="Fail"?"#EF4444":q.verdict==="Partial"?"#F59E0B":"#3B82F6";
                        return [
                          '<div style="margin-bottom:10px;padding:10px 12px;border-radius:6px;border-left:3px solid '+borderColor+';background:'+bg+'">',
                          '<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;background:'+bg+';color:'+sevColor+';margin-right:4px">'+q.severity+'</span>',
                          '<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;background:'+bg+';color:'+verdColor+'">'+q.verdict+'</span>',
                          '<span style="color:#6B7280;font-size:9px;margin-left:6px">'+(q.category||'')+'</span>',
                          '<div style="font-weight:600;font-size:11px;margin:5px 0;color:#111">'+(q.question_text||'')+'</div>',
                          '<div style="color:#374151;font-size:10px">'+(q.finding||'')+'</div>',
                          q.evidence?'<div style="color:#3B82F6;font-size:10px;margin-top:3px"><strong>Evidence:</strong> '+q.evidence+'</div>':'',
                          q.regulatory_ref?'<div style="color:#6B7280;font-size:9px;font-family:monospace;margin-top:2px">'+q.regulatory_ref+'</div>':'',
                          q.recommendation&&q.verdict!=="Pass"?'<div style="color:#F97316;font-size:10px;margin-top:3px"><strong>Recommendation:</strong> '+q.recommendation+'</div>':'',
                          '</div>'
                        ].join('');
                      }).join('');
                      const html=[
                        '<!DOCTYPE html><html><head><meta charset="UTF-8"/>',
                        '<title>Inspection Report — '+(activeStudy?.study_id||'')+'</title>',
                        '<style>body{font-family:Arial,sans-serif;font-size:10px;margin:30px;color:#111}',
                        'h1{color:#0F1E3D;font-size:16px}h2{font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-top:18px;border-bottom:1px solid #E5E7EB;padding-bottom:4px}',
                        '.footer{margin-top:30px;font-size:8px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:8px}',
                        '@media print{body{margin:15px}}</style></head><body>',
                        '<h1>TMF Inspection Simulation Report</h1>',
                        '<p><strong>Study:</strong> '+(activeStudy?.study_id||'')+'&nbsp;<strong>Sponsor:</strong> '+(activeStudy?.sponsor||'—')+'&nbsp;<strong>Phase:</strong> '+(activeStudy?.phase||'—')+'</p>',
                        '<p><strong>Generated:</strong> '+new Date(inspectionReport.generated_at).toLocaleString()+'&nbsp;<strong>Questions evaluated:</strong> '+rows.length+'</p>',
                        '<div style="font-size:36px;font-weight:700;color:'+sc+'">'+inspectionReport.risk_score+'/100&nbsp;<span style="font-size:13px;color:#6B7280">'+(inspectionReport.inspection_ready?'✅ Inspection Ready':'🚫 Not Ready')+'</span></div>',
                        '<p style="color:#6B7280">'+(inspectionReport.critical_fails?.length||0)+' critical · '+(inspectionReport.major_fails?.length||0)+' major · '+(inspectionReport.partial?.length||0)+' partial · '+(inspectionReport.unverifiable?.length||0)+' unable to verify · '+(inspectionReport.passing?.length||0)+' passing</p>',
                        inspectionReport.summary?'<p style="background:#F3F4F6;padding:10px 12px;border-radius:6px;font-style:italic;font-size:10px">'+inspectionReport.summary+'</p>':'',
                        '<h2>Findings Detail</h2>',
                        cards,
                        '<div class="footer">TMF360 Trinity AI Inspection Simulation · '+new Date().toISOString()+' · For internal readiness assessment only</div>',
                        '</body></html>'
                      ].join('');
                      const w=window.open("","_blank");
                      if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
                    }} style={{fontSize:"12px",padding:"8px 14px",background:"#374151",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}>
                      <Ico.download/>Export PDF
                    </button>
                  )}
                  <button onClick={()=>{setInspectionTab("report");generateInspectionReport();}} disabled={inspectionLoading||inspectionQuestions.length===0} style={{fontSize:"12px",padding:"8px 16px",background:"#0F172A",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",opacity:inspectionLoading||inspectionQuestions.length===0?0.5:1}}>
                    {inspectionLoading?<Ico.loader/>:<Ico.shield/>}{inspectionLoading?"Running...":"Run Inspection"}
                  </button>
                </div>
              </div>

              <div style={{display:"flex",gap:"0",borderBottom:`1px solid ${P.border}`}}>
                {[{id:"questions",label:`Questions (${inspectionQuestions.length})`},{id:"report",label:"Inspection Report"}].map(t=>(
                  <button key={t.id} onClick={()=>setInspectionTab(t.id as any)} style={{padding:"10px 20px",fontSize:"12px",fontWeight:inspectionTab===t.id?"600":"400",color:inspectionTab===t.id?P.primary:P.textSec,background:"none",border:"none",borderBottom:inspectionTab===t.id?`2px solid ${P.primary}`:"2px solid transparent",cursor:"pointer",fontFamily:"inherit"}}>{t.label}</button>
                ))}
              </div>

              {inspectionTab==="questions"&&(
                <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <p style={{fontSize:"12px",color:P.textTert,margin:0,flex:1}}>These questions guide the inspection. Trinity evaluates each one against your actual TMF documents from the artifact browser. Add or remove questions to tailor the inspection to your study type.</p>
                    <button onClick={()=>setShowAddQuestion(!showAddQuestion)} style={{fontSize:"12px",fontWeight:"600",padding:"8px 14px",background:P.primaryLight,color:P.primary,border:"1px solid #FDBA74",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px",flexShrink:0,marginLeft:"12px"}}><Ico.plus/>Add Question</button>
                  </div>
                  {showAddQuestion&&(
                    <div style={{background:P.bgSec,border:`1px solid ${P.border}`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                      <div style={{fontSize:"12px",fontWeight:"600",color:P.text}}>Add Custom Question</div>
                      <textarea value={newQuestionText} onChange={e=>setNewQuestionText(e.target.value)} rows={3} placeholder="Enter your inspection question..." style={{width:"100%",fontSize:"12px",border:`1px solid ${P.border}`,borderRadius:"8px",padding:"10px 12px",resize:"vertical",fontFamily:"inherit",outline:"none"}}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                        <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Category</label><select value={newQuestionCategory} onChange={e=>setNewQuestionCategory(e.target.value)} style={{width:"100%",fontSize:"12px",border:`1px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px",fontFamily:"inherit"}}>{["TMF Structure","Document Quality","Protocol","IRB/EC","Investigator","Training","Informed Consent","Monitoring","Safety Reporting","Drug/Device Accountability","Protocol Deviations","Correspondence","Audit/Inspection","Subject Records","Electronic Records","Close-Out","Archive","General"].map(c=><option key={c}>{c}</option>)}</select></div>
                        <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Severity</label><select value={newQuestionSeverity} onChange={e=>setNewQuestionSeverity(e.target.value)} style={{width:"100%",fontSize:"12px",border:`1px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px",fontFamily:"inherit"}}><option>Critical</option><option>Major</option><option>Minor</option></select></div>
                      </div>
                      <div style={{display:"flex",gap:"8px"}}>
                        <button onClick={addInspectionQuestion} disabled={!newQuestionText.trim()} style={{fontSize:"12px",fontWeight:"600",padding:"8px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:newQuestionText.trim()?"pointer":"not-allowed",opacity:newQuestionText.trim()?1:0.5}}>Add Question</button>
                        <button onClick={()=>{setShowAddQuestion(false);setNewQuestionText("");}} style={{fontSize:"12px",padding:"8px 16px",background:P.bgTert,color:P.textSec,border:`1px solid ${P.border}`,borderRadius:"8px",cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {["TMF Structure","Document Quality","Protocol","IRB/EC","Investigator","Training","Informed Consent","Monitoring","Safety Reporting","Drug/Device Accountability","Protocol Deviations","Correspondence","Audit/Inspection","Subject Records","Electronic Records","Close-Out","Archive","General"].filter(cat=>inspectionQuestions.some(q=>q.category===cat)).map(cat=>{
                    const catQs=inspectionQuestions.filter(q=>q.category===cat);
                    return(
                      <div key={cat}>
                        <div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,textTransform:"uppercase",letterSpacing:".06em",marginBottom:"6px",paddingLeft:"4px"}}>{cat} ({catQs.length})</div>
                        {catQs.map(q=>(
                          <div key={q.id} style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"10px",padding:"12px 14px",marginBottom:"6px",display:"flex",alignItems:"flex-start",gap:"10px"}}>
                            <div style={{fontSize:"10px",fontWeight:"600",color:"#fff",background:SEVERITY_COLOR(q.severity),padding:"2px 7px",borderRadius:"20px",flexShrink:0,marginTop:"2px"}}>{q.severity}</div>
                            <div style={{flex:1,fontSize:"12px",color:P.text,lineHeight:"1.6"}}>{q.question_text}</div>
                            <button onClick={()=>removeInspectionQuestion(q.id)} style={{background:"none",border:"none",cursor:"pointer",color:P.textMuted,padding:"2px",flexShrink:0,display:"flex"}} title="Remove"><Ico.trash/></button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {inspectionTab==="report"&&(
                <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                  {inspectionLoading&&(
                    <div style={{textAlign:"center",padding:"4rem",color:P.textTert}}>
                      <div style={{display:"flex",justifyContent:"center",marginBottom:"12px"}}><Ico.loader/></div>
                      <div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>Trinity is evaluating each inspection question against your TMF document registry...</div>
                      <div style={{fontSize:"11px",color:P.textTert,marginTop:"4px"}}>{inspectionQuestions.length} questions · {docs.length} TMF documents</div>
                    </div>
                  )}
                  {!inspectionReport&&!inspectionLoading&&(
                    <div style={{textAlign:"center",padding:"4rem",color:P.textTert,background:P.bgSec,borderRadius:"12px",border:`1px solid ${P.border}`}}>
                      <div style={{fontSize:"32px",marginBottom:"8px"}}>🏛️</div>
                      <div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>No inspection report yet</div>
                      <div style={{fontSize:"12px",marginTop:"4px",marginBottom:"1rem",color:P.textTert}}>Click "Run Inspection" to simulate an FDA/EMA audit using your {inspectionQuestions.length} questions evaluated against {docs.length} TMF documents.</div>
                      <button onClick={()=>generateInspectionReport()} style={{fontSize:"12px",fontWeight:"600",padding:"10px 20px",background:"#0F172A",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Run Inspection Simulation</button>
                    </div>
                  )}
                  {inspectionReport&&!inspectionLoading&&(
                    <>
                      <div style={{background:"linear-gradient(135deg,#0F1E3D 0%,#1E3A5F 100%)",borderRadius:"14px",padding:"20px 24px",color:"#fff"}}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"12px"}}>
                          <div>
                            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"4px"}}>Inspection Readiness Score</div>
                            <div style={{fontSize:"52px",fontWeight:"700",lineHeight:1,color:inspectionReport.risk_score>=80?"#10B981":inspectionReport.risk_score>=50?"#F97316":"#EF4444"}}>{inspectionReport.risk_score}<span style={{fontSize:"24px",color:"rgba(255,255,255,0.3)"}}>/100</span></div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:"14px",fontWeight:"700",color:inspectionReport.inspection_ready?"#10B981":"#EF4444",marginBottom:"4px"}}>{inspectionReport.inspection_ready?"✅ Inspection Ready":"🚫 Not Ready"}</div>
                            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>{inspectionReport.critical_fails?.length||0} critical · {inspectionReport.major_fails?.length||0} major · {inspectionReport.partial?.length||0} partial · {inspectionReport.unverifiable?.length||0} unverifiable</div>
                            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"4px"}}>{new Date(inspectionReport.generated_at).toLocaleString()}</div>
                          </div>
                        </div>
                        {inspectionReport.summary&&<div style={{fontSize:"12px",lineHeight:"1.7",color:"rgba(255,255,255,0.8)",borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:"12px"}}>{inspectionReport.summary}</div>}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
                        {[{val:inspectionReport.passing?.length||0,label:"Passing",color:P.success,bg:P.successLight},{val:inspectionReport.critical_fails?.length||0,label:"Critical Fails",color:P.danger,bg:P.dangerLight},{val:inspectionReport.major_fails?.length||0,label:"Major Findings",color:P.warning,bg:P.warningLight},{val:inspectionReport.unverifiable?.length||0,label:"Unable to Verify",color:P.blue,bg:P.blueLight}].map((s,i)=>(
                          <div key={i} style={{background:s.bg,border:`1px solid ${P.border}`,borderRadius:"10px",padding:"14px",textAlign:"center"}}><div style={{fontSize:"28px",fontWeight:"700",color:s.color}}>{s.val}</div><div style={{fontSize:"10px",color:P.textSec,marginTop:"3px"}}>{s.label}</div></div>
                        ))}
                      </div>
                      {[
                        {label:"Critical Failures",items:(inspectionReport.questions||[]).filter((q:any)=>q.verdict==="Fail"&&q.severity==="Critical"),color:P.danger,bg:P.dangerLight,bdr:"#FECACA"},
                        {label:"Major Findings",items:(inspectionReport.questions||[]).filter((q:any)=>(q.verdict==="Fail"&&q.severity==="Major")||(q.verdict==="Partial"&&(q.severity==="Critical"||q.severity==="Major"))),color:P.warning,bg:P.warningLight,bdr:"#FDE68A"},
                        {label:"Unable to Verify",items:inspectionReport.unverifiable||[],color:P.blue,bg:P.blueLight,bdr:"#BFDBFE"},
                        {label:"Passing",items:inspectionReport.passing||[],color:P.success,bg:P.successLight,bdr:"#A7F3D0"},
                      ].map(group=>{
                        if(!group.items.length)return null;
                        return(
                          <div key={group.label}>
                            <h3 style={{fontSize:"11px",fontWeight:"700",color:group.color,textTransform:"uppercase",letterSpacing:".06em",marginBottom:"8px"}}>{group.label} ({group.items.length})</h3>
                            {group.items.map((q:any,qi:number)=>(
                              <div key={qi} style={{background:P.bg,border:`1px solid ${group.bdr}`,borderRadius:"10px",padding:"14px 16px",marginBottom:"8px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px",flexWrap:"wrap"}}>
                                  <span style={{fontSize:"10px",fontWeight:"600",color:"#fff",background:SEVERITY_COLOR(q.severity),padding:"2px 8px",borderRadius:"20px"}}>{q.severity}</span>
                                  <span style={{fontSize:"10px",fontWeight:"600",color:group.color,background:group.bg,padding:"2px 8px",borderRadius:"20px",border:`1px solid ${group.bdr}`}}>{q.verdict}</span>
                                  <span style={{fontSize:"10px",color:P.textTert}}>{q.category}</span>
                                </div>
                                <div style={{fontSize:"12px",fontWeight:"600",color:P.text,marginBottom:"6px",lineHeight:"1.5"}}>{q.question_text}</div>
                                <div style={{fontSize:"11px",color:P.textSec,lineHeight:"1.6",marginBottom:"6px"}}>{q.finding}</div>
                                {q.evidence&&<div style={{fontSize:"10px",color:P.blue,background:P.blueLight,borderRadius:"6px",padding:"5px 10px",marginBottom:"6px"}}><strong>Evidence:</strong> {q.evidence}</div>}
                                {q.regulatory_ref&&<div style={{fontSize:"10px",color:P.textTert,fontFamily:"monospace"}}>{q.regulatory_ref}</div>}
                                {q.recommendation&&q.verdict!=="Pass"&&<div style={{fontSize:"10px",color:P.primary,background:P.primaryLight,borderRadius:"6px",padding:"6px 10px",marginTop:"6px"}}><strong>Recommendation:</strong> {q.recommendation}</div>}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}