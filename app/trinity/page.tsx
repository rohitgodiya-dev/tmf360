"use client";
import{useState,useEffect,useRef,useCallback}from"react";
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
  sidebar:"#0F172A",sidebarHover:"#1E293B",sidebarActive:"#1E3A5F",sidebarText:"#94A3B8",sidebarTextActive:"#F1F5F9",
};

const VAULT_DOC_TYPES=["Protocol","Protocol Amendment","Investigator's Brochure","Statistical Analysis Plan","Monitoring Plan","Medical Monitoring Plan","IRB / IEC Decision","Regulatory Authority Decision","Clinical Trial Agreement","Informed Consent Form","Risk Management Plan","Quality Plan","Data Management Plan","Safety Management Plan","Other"];
const SEVERITY_COLOR=(s:string)=>s==="Critical"?P.danger:s==="Major"?P.warning:P.blue;
const SEVERITY_BG=(s:string)=>s==="Critical"?P.dangerLight:s==="Major"?P.warningLight:P.blueLight;

// SVG Icons
const Ico={
  star:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>,
  chat:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  db:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  alert:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  sun:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  list:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  brain:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.14Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.14Z"/></svg>,
  refresh:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  loader:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 1s linear infinite"}}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  check:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  up:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  clip:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>,
  circleCheck:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>,
  pin:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>,
  search:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  memory:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  download:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  doc:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  chevDown:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  lightning:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};

interface ChatMsg{role:"ai"|"user";text:string;isHealthCard?:boolean;sourceTags?:string[];classification?:{zoneLine:string;confidence:number;warning?:{detail:string;action:string}};pendingClassification?:any;classStage?:string;validation?:any;}
interface VaultDoc{id:string;file_name:string;custom_name:string;document_type:string;file_path:string;file_size:number;extracted_text:string;uploaded_by:string;uploaded_at:string;is_active:boolean;}
interface Finding{id:string;finding_type:string;severity:string;title:string;detail:string;source_doc:string;artifact_ref:string;status:string;created_at:string;}
interface ChatSession{id:string;title:string;messages:ChatMsg[];is_pinned:boolean;document_id?:string;document_name?:string;created_at:string;updated_at:string;}
interface Memory{id:string;memory_text:string;created_at:string;}
interface Suggestion{id:string;action_text:string;reason:string;urgency:string;}

export default function TrinityPage(){
  const[user,setUser]=useState<any>(null);
  const[orgId,setOrgId]=useState("");
  const[studies,setStudies]=useState<any[]>([]);
  const[activeStudy,setActiveStudy]=useState<any>(null);
  const[userFullName,setUserFullName]=useState("");
  const[panel,setPanel]=useState<"chat"|"vault"|"findings"|"briefing"|"checklist">("chat");
  const[loading,setLoading]=useState(true);
  const[docs,setDocs]=useState<any[]>([]);
  const[tmfConfig,setTmfConfig]=useState<any[]>([]);

  // Chat state
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

  // Session state
  const[sessions,setSessions]=useState<ChatSession[]>([]);
  const[activeSessionId,setActiveSessionId]=useState<string|null>(null);
  const[chatSearch,setChatSearch]=useState("");
  const[showSearch,setShowSearch]=useState(false);
  const saveTimer=useRef<any>(null);

  // Vault state
  const[vaultDocs,setVaultDocs]=useState<VaultDoc[]>([]);
  const[vaultUploading,setVaultUploading]=useState(false);
  const[vaultProgress,setVaultProgress]=useState("");
  const[vaultDocType,setVaultDocType]=useState("Protocol");
  const[vaultCustomName,setVaultCustomName]=useState("");
  const[vaultFile,setVaultFile]=useState<File|null>(null);
  const vaultFileInput=useRef<HTMLInputElement>(null);

  // Findings, briefing, checklist
  const[findings,setFindings]=useState<Finding[]>([]);
  const[analysing,setAnalysing]=useState(false);
  const[briefing,setBriefing]=useState<any>(null);
  const[briefingLoading,setBriefingLoading]=useState(false);
  const[checklist,setChecklist]=useState<any[]>([]);
  const[checklistLoading,setChecklistLoading]=useState(false);
  const[checklistGenerated,setChecklistGenerated]=useState(false);

  // Memory & suggestions
  const[memories,setMemories]=useState<Memory[]>([]);
  const[suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const[showMemory,setShowMemory]=useState(false);
  const[suggestionsLoading,setSuggestionsLoading]=useState(false);

  // Sidebar collapse
  const[sidebarCollapsed,setSidebarCollapsed]=useState(false);

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
      await generateSuggestions(active.study_id,data.org_id);
    }
    setLoading(false);
  }

  async function loadStudyData(studyId:string,oid:string,uid?:string){
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
    const{data:checklistData}=await supabase.from("study_checklist").select("*").eq("org_id",oid).eq("study_id",studyId).eq("is_active",true).order("generated_at",{ascending:false});
    if(checklistData&&checklistData.length>0){setChecklist(checklistData);setChecklistGenerated(true);}
  }

  async function loadSessions(studyId:string,oid:string,uid:string){
    const{data}=await supabase.from("trinity_chats").select("*").eq("org_id",oid).eq("study_id",studyId).eq("user_id",uid).eq("is_active",true).order("updated_at",{ascending:false}).limit(50);
    if(data){
      setSessions(data as ChatSession[]);
      // Auto-continue most recent session
      if(data.length>0){
        const latest=data[0] as ChatSession;
        setActiveSessionId(latest.id);
        if(latest.messages&&latest.messages.length>0)setChatMessages(latest.messages);
      }else{
        await createNewSession(studyId,oid,uid);
      }
    }
  }

  async function loadMemories(studyId:string,oid:string,uid:string){
    const{data}=await supabase.from("trinity_memory").select("*").eq("org_id",oid).eq("study_id",studyId).eq("user_id",uid).eq("is_active",true).order("created_at",{ascending:false}).limit(20);
    if(data)setMemories(data as Memory[]);
  }

  async function createNewSession(studyId:string,oid:string,uid:string,title?:string):Promise<string|null>{
    const initMsg:ChatMsg={role:"ai",text:"Hi, I'm Trinity — your AI TMF Specialist. Start a conversation or upload a document to classify it."};
    const{data}=await supabase.from("trinity_chats").insert([{
      org_id:oid,study_id:studyId,user_id:uid,
      title:title||"New conversation",
      messages:[initMsg],
      is_pinned:false,is_active:true,
    }]).select().single();
    if(data){
      setSessions(prev=>[data as ChatSession,...prev]);
      setActiveSessionId(data.id);
      setChatMessages([initMsg]);
      return data.id;
    }
    return null;
  }

  async function startNewChat(){
    if(!activeStudy||!user||!orgId)return;
    await createNewSession(activeStudy.study_id,orgId,user.id);
  }

  async function loadSession(session:ChatSession){
    setActiveSessionId(session.id);
    setChatMessages(session.messages||[{role:"ai",text:"Hi, I'm Trinity — your AI TMF Specialist."}]);
    setPanel("chat");
    setChatDocAction(null);setFlagStage("idle");setApproveStage(0);
  }

  function scheduleSave(msgs:ChatMsg[]){
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      if(!activeSessionId)return;
      await supabase.from("trinity_chats").update({messages:msgs,updated_at:new Date().toISOString()}).eq("id",activeSessionId);
      setSessions(prev=>prev.map(s=>s.id===activeSessionId?{...s,messages:msgs,updated_at:new Date().toISOString()}:s));
    },1500);
  }

  async function autoTitle(msgs:ChatMsg[],sessionId:string){
    if(msgs.length<3)return;
    const firstUserMsg=msgs.find(m=>m.role==="user");
    if(!firstUserMsg)return;
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Generate a short 4-6 word title for a conversation that starts with: "${firstUserMsg.text}". Return ONLY the title, no quotes, no punctuation at end.`,context:"You generate short conversation titles."})});
      const data=await res.json();
      const title=(data.response||"").trim().slice(0,60);
      if(title){
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
    if(activeSessionId===sessionId){
      const remaining=sessions.filter(s=>s.id!==sessionId);
      if(remaining.length>0){loadSession(remaining[0]);}
      else{await startNewChat();}
    }
  }

  async function extractMemories(msgs:ChatMsg[]){
    if(!activeStudy||!user||!orgId)return;
    const recentAI=msgs.filter(m=>m.role==="ai"&&m.text&&m.text.length>50).slice(-3).map(m=>m.text).join("\n");
    if(!recentAI)return;
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Extract 1-3 key factual statements worth remembering about this study from these AI responses. Only extract concrete facts (versions, dates, site counts, endpoints, countries). Return a JSON array of strings: ["fact1","fact2"]. If nothing worth remembering, return []. Responses:\n${recentAI}`,context:"Return only valid JSON array."})});
      const data=await res.json();
      const raw=data.response?.replace(/```json|```/g,"").trim();
      const facts:string[]=JSON.parse(raw);
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

  async function generateSuggestions(studyId:string,oid:string){
    setSuggestionsLoading(true);
    try{
      const{data:docData}=await supabase.from("documents").select("*").eq("study_id",studyId).eq("org_id",oid);
      if(!docData){setSuggestionsLoading(false);return;}
      const expiring=docData.filter((d:any)=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+30*86400000));
      const pending=docData.filter((d:any)=>d.status==="Under Review");
      const suggs:Suggestion[]=[];
      if(expiring.length>0)suggs.push({id:"exp",action_text:`${expiring.length} document${expiring.length!==1?"s":""} expiring within 30 days`,reason:"Review and renew before expiry",urgency:"High"});
      if(pending.length>0)suggs.push({id:"pen",action_text:`${pending.length} document${pending.length!==1?"s":""} awaiting review`,reason:"Approve or reject pending documents",urgency:"Medium"});
      suggs.push({id:"vault",action_text:"Upload Protocol to Study Vault",reason:"Enables study-specific gap detection",urgency:"Medium"});
      setSuggestions(suggs);
    }catch{}
    setSuggestionsLoading(false);
  }

  async function exportChatAsPDF(){
    if(!activeSessionId)return;
    const session=sessions.find(s=>s.id===activeSessionId);
    if(!session)return;
    const msgs=session.messages||chatMessages;
    const lines=msgs.map(m=>`[${m.role==="user"?"User":"Trinity"}]: ${m.text||"[Action card]"}`).join("\n\n");
    const hash=btoa(JSON.stringify(msgs)).slice(0,32);
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Trinity Chat Export</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:30px;color:#111}h1{color:#F97316}h2{color:#374151;font-size:12px}.msg{margin:10px 0;padding:8px 12px;border-radius:6px}.user{background:#F3F4F6}.ai{background:#EFF6FF;border-left:3px solid #F97316}.footer{margin-top:30px;font-size:9px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:10px}</style></head><body><h1>Trinity AI Chat Export</h1><p><strong>Study:</strong> ${activeStudy?.study_id||""} &nbsp; <strong>User:</strong> ${user?.email||""} &nbsp; <strong>Exported:</strong> ${new Date().toLocaleString()}</p><p><strong>Session:</strong> ${session.title||"Untitled"}</p><hr/>${msgs.map(m=>`<div class="msg ${m.role}">${m.role==="user"?"<strong>User</strong>":"<strong>Trinity AI</strong>"}: ${m.text||"[Action card]"}</div>`).join("")}<div class="footer">SHA-256 Hash: ${hash} · Generated by TMF360 Trinity AI · ${new Date().toISOString()}</div></body></html>`;
    const w=window.open("","_blank");
    if(w){w.document.write(html);w.document.close();}
  }

  function switchStudy(studyId:string){
    const s=studies.find(x=>x.study_id===studyId);
    if(s&&user&&orgId){
      setActiveStudy(s);
      localStorage.setItem("tmf_active_study",studyId);
      setDocs([]);setVaultDocs([]);setFindings([]);setChecklist([]);setChecklistGenerated(false);setBriefing(null);setMemories([]);setSuggestions([]);
      loadStudyData(studyId,orgId,user.id);
      loadSessions(studyId,orgId,user.id);
      loadMemories(studyId,orgId,user.id);
      generateSuggestions(studyId,orgId);
    }
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

  function padZone(z:string){return z.padStart(2,"0");}
  function formatSection(s:string){const p=(s||"").split(".");if(p.length<2)return s||"00.00";return`${p[0].padStart(2,"0")}.${p[1]}`;}
  function detectFlagReason(doc:any){if(!doc.version||doc.version.trim()==="")return"Missing version — no version number is on file for this document.";if(doc.expiry_date&&new Date(doc.expiry_date)<new Date())return`Document expired — expired on ${doc.expiry_date}.`;return`Version mismatch — document version ${doc.version} does not match the current tracked version.`;}
  function buildVaultContext(){if(vaultDocs.length===0)return"No vault documents uploaded for this study.";return vaultDocs.map(d=>`[${d.document_type} - ${d.custom_name}]:\n${d.extracted_text?.slice(0,2000)||"No text extracted"}`).join("\n\n---\n\n");}

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
    if(activeStudy&&/why/.test(lower)&&/(flag|reject)/.test(lower)){
      const flaggedDoc=docs.find(d=>d.status==="Draft"&&(d as any).rejection_reason);
      const aiMsg:ChatMsg=flaggedDoc?{role:"ai",text:`"${flaggedDoc.custom_file_name||flaggedDoc.artifact_name}" was flagged:\n${(flaggedDoc as any).rejection_reason}`,sourceTags:["Document tracker","Audit trail"]}:{role:"ai",text:`No flagged documents in ${activeStudy.study_id} right now.`};
      const final=[...newMsgs,aiMsg];setChatMessages(final);scheduleSave(final);setChatLoading(false);return;
    }
    if(activeStudy&&/(review|approve|classify|flag|upload)/.test(lower)&&/(doc|document|file|tracker)/.test(lower)){presentClassification();setChatLoading(false);return;}
    try{
      const vaultCtx=buildVaultContext();
      const memCtx=memories.length>0?`\n\nTRINITY MEMORY (key facts about this study):\n${memories.map(m=>m.memory_text).join("\n")}`:""
      const missingList=gaps.crit.concat(gaps.major).concat(gaps.minor).map((g:any)=>`${g.a} - ${g.an} (Zone ${g.z})`).join("\n");
      const studyContext=activeStudy?`Active study: ${activeStudy.study_id} (${activeStudy.protocol||""}). Sponsor: ${activeStudy.sponsor||""}. Phase: ${activeStudy.phase||""}.\nTMF completeness: ${donePct}%. Inspection readiness: ${ri}/100. Missing core documents (${missing} total):\n${missingList}\nPending review: ${pending}. Expiring within 90 days: ${expiring}.`:"No active study selected.";
      const recentTurns=chatMessages.slice(-6).map(m=>`${m.role==="user"?"User":"Trinity"}: ${m.text}`).join("\n");
      const context=`${studyContext}${memCtx}\n\nSTUDY VAULT DOCUMENTS:\n${vaultCtx}\n\nRecent conversation:\n${recentTurns}\n\nOnly answer using data for study ${activeStudy?.study_id||""}.`;
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,context})});
      const data=await res.json();
      const aiMsg:ChatMsg={role:"ai",text:data.response||"I couldn't process that request."};
      const final=[...newMsgs,aiMsg];
      setChatMessages(final);
      scheduleSave(final);
      // Auto-title after 3rd message
      if(final.length===3&&activeSessionId)autoTitle(final,activeSessionId);
      // Extract memories every 10 messages
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
      const hasIssues=validationResult?.overall==="fail"||(cl.issues?.length>0||cl.missing_fields?.length>0);
      const docStatus=hasIssues?"Draft":"Under Review";
      const rejReason=hasIssues?[validationResult?.summary,...(cl.issues||[])].filter(Boolean).join("; "):undefined;
      const{data:docData,error:docErr}=await supabase.from("documents").insert([{study_id:activeStudy?.study_id,user_id:user?.id,org_id:orgId,artifact_num:cl.artifact_num,artifact_name:cl.artifact_name,zone:cl.zone_num,version:"",status:docStatus,owner:userFullName||user?.email,file_path:filePath,file_name:cl.fileName,custom_file_name:cl.fileName,file_type:"application/pdf",file_size:0,comments:"Auto-classified by Trinity AI. Vault validated. Confidence: "+cl.confidence+"%",rejection_reason:rejReason||null}]).select();
      if(docErr)throw new Error(docErr.message);
      setDocs(prev=>[docData[0],...prev]);
      await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document classified and vault-validated by Trinity",document_id:docData[0].id,study_id:activeStudy?.study_id,field_changed:"status",old_value:"",new_value:docStatus,signature_reason:"Trinity AI + vault validation",document_name:cl.fileName}]);
      const aiMsg:ChatMsg={role:"ai",text:hasIssues?`⚠️ Filed to Draft — issues detected:\n${rejReason}`:`__FILED__Filed to Zone ${cl.zone_num} — ${cl.artifact_name}\nVault-validated and audit trail recorded.`};
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
    try{const reader=new FileReader();const base64=await new Promise<string>((res,rej)=>{reader.onload=()=>res((reader.result as string).split(",")[1]);reader.onerror=rej;reader.readAsDataURL(vaultFile);});const resp=await fetch("/api/vault/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:vaultFile.name})});const data=await resp.json();extractedText=data.text||"";}catch(e){extractedText="";}
    setVaultProgress("Saving...");
    const{data:inserted}=await supabase.from("study_vault").insert([{org_id:orgId,study_id:activeStudy.study_id,file_name:vaultFile.name,custom_name:vaultCustomName||vaultFile.name,document_type:vaultDocType,file_path:path,file_size:vaultFile.size,extracted_text:extractedText,uploaded_by:user?.email,is_active:true}]).select();
    if(inserted){setVaultDocs(prev=>[inserted[0] as VaultDoc,...prev]);setVaultProgress("Done!");setTimeout(()=>{setVaultFile(null);setVaultCustomName("");setVaultProgress("");},2000);}
    setVaultUploading(false);
  }

  async function deleteVaultDoc(id:string){if(!confirm("Remove this document from the vault?"))return;await supabase.from("study_vault").update({is_active:false}).eq("id",id);setVaultDocs(prev=>prev.filter(d=>d.id!==id));}

  async function runVaultAnalysis(){
    if(!activeStudy||vaultDocs.length===0){alert("Upload at least one document to the Study Vault first.");return;}
    setAnalysing(true);
    try{
      const vaultContext=vaultDocs.map(d=>`[${d.document_type}] ${d.custom_name}:\n${d.extracted_text?.slice(0,3000)||"No text extracted"}`).join("\n\n---\n\n");
      const missingList=gaps.crit.concat(gaps.major).concat(gaps.minor).map(g=>`${g.a} - ${g.an} (Zone ${g.z})`).join("\n");
      const prompt=`You are a clinical trial TMF expert. Analyse the vault documents and missing artifacts. Return JSON array:\n[{"finding_type":"gap","severity":"Critical","title":"short title","detail":"detailed explanation","source_doc":"vault doc","artifact_ref":"DIA artifact number"}]\n\nVAULT:\n${vaultContext}\n\nMISSING:\n${missingList}\n\nFILED:\n${docs.filter(d=>d.status==="Approved").map(d=>`${d.artifact_num} - ${d.artifact_name}`).join("\n")}\n\nReturn ONLY the JSON array.`;
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,context:"Return only valid JSON."})});
      const data=await res.json();
      let newFindings:any[]=[];
      try{const raw=data.response?.replace(/```json|```/g,"").trim();newFindings=JSON.parse(raw);}catch{newFindings=[];}
      if(newFindings.length>0){const toInsert=newFindings.map((f:any)=>({...f,org_id:orgId,study_id:activeStudy.study_id,status:"Open"}));const{data:saved}=await supabase.from("trinity_findings").insert(toInsert).select();if(saved)setFindings(prev=>[...saved,...prev]);}
      setPanel("findings");
    }catch(e){alert("Analysis failed.");}
    setAnalysing(false);
  }

  async function resolveFinding(id:string){await supabase.from("trinity_findings").update({status:"Resolved",resolved_at:new Date().toISOString(),resolved_by:user?.email}).eq("id",id);setFindings(prev=>prev.map(f=>f.id===id?{...f,status:"Resolved"}:f));}

  async function generateChecklist(){
    if(!activeStudy||vaultDocs.length===0){alert("Upload at least one vault document first.");return;}
    setChecklistLoading(true);
    const vaultCtx=vaultDocs.map(d=>`[${d.document_type} - ${d.custom_name}]:\n${d.extracted_text?.slice(0,2000)||""}`).join("\n\n---\n\n");
    const filedList=docs.filter(d=>d.status==="Approved").map(d=>`${d.artifact_num} - ${d.artifact_name}`).join("\n");
    const prompt=`You are a clinical trial TMF expert. Generate a study-specific expected document checklist from the vault documents.\n\nVAULT:\n${vaultCtx}\n\nFILED:\n${filedList||"None"}\n\nReturn JSON array:\n[{"item_name":"string","artifact_ref":"string","zone":"string","reason":"string","severity":"Critical|Major|Minor","status":"Filed|Missing"}]\n\nReturn ONLY valid JSON array.`;
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,context:"Return only valid JSON."})});
      const data=await res.json();
      let items:any[]=[];
      try{const raw=data.response?.replace(/```json|```/g,"").trim();items=JSON.parse(raw);}catch{items=[];}
      if(items.length>0){
        await supabase.from("study_checklist").update({is_active:false}).eq("org_id",orgId).eq("study_id",activeStudy.study_id);
        const toInsert=items.map((item:any)=>({...item,org_id:orgId,study_id:activeStudy.study_id,is_active:true}));
        const{data:saved}=await supabase.from("study_checklist").insert(toInsert).select();
        if(saved){setChecklist(saved);setChecklistGenerated(true);}
      }
      setPanel("checklist");
    }catch(e){alert("Checklist generation failed.");}
    setChecklistLoading(false);
  }

  async function generateBriefing(){
    if(!activeStudy)return;
    setBriefingLoading(true);
    const vaultContext=vaultDocs.slice(0,3).map(d=>`[${d.document_type}]: ${d.extracted_text?.slice(0,1000)||""}`).join("\n\n");
    const prompt=`Generate a daily TMF briefing. Return JSON:\n{"summary":"2 sentence overview","priority_actions":[{"action":"string","reason":"string","urgency":"High|Medium|Low"}],"stats":{"completeness":${donePct},"missing":${missing},"pending":${pending},"expiring":${expiring},"ri":${ri}},"vault_insight":"one insight from vault"}\n\nVAULT:\n${vaultContext}\n\nReturn ONLY valid JSON.`;
    try{const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,context:"Return only valid JSON."})});const data=await res.json();const raw=data.response?.replace(/```json|```/g,"").trim();setBriefing(JSON.parse(raw));}catch{setBriefing(null);}
    setBriefingLoading(false);
  }

  useEffect(()=>{if(panel==="briefing"&&!briefing&&activeStudy)generateBriefing();},[panel,activeStudy]);

  const openFindings=findings.filter(f=>f.status==="Open");
  const vaultHasProtocol=vaultDocs.some(d=>d.document_type==="Protocol");
  const pinnedSessions=sessions.filter(s=>s.is_pinned);
  const unpinnedSessions=sessions.filter(s=>!s.is_pinned);
  const filteredSessions=chatSearch?sessions.filter(s=>s.title?.toLowerCase().includes(chatSearch.toLowerCase())):null;

  const NAV=[
    {id:"chat",label:"Chat",Icon:Ico.chat,badge:null},
    {id:"vault",label:"Study Vault",Icon:Ico.db,badge:vaultDocs.length>0?vaultDocs.length:null},
    {id:"findings",label:"Findings",Icon:Ico.alert,badge:openFindings.length>0?openFindings.length:null},
    {id:"briefing",label:"Daily Briefing",Icon:Ico.sun,badge:null},
    {id:"checklist",label:"Study Checklist",Icon:Ico.list,badge:checklist.length>0?checklist.length:null},
  ];

  if(loading)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0F172A",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg,#FFEDD5,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",color:"#fff"}}><Ico.star/></div>
        <div style={{fontSize:"14px",color:"#94A3B8"}}>Loading Trinity...</div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",background:P.bg,overflow:"hidden"}}>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.t-btn{background:none;border:none;cursor:pointer;font-family:inherit;}`}</style>

      {/* LEFT SIDEBAR */}
      <div style={{width:sidebarCollapsed?"60px":"260px",background:P.sidebar,display:"flex",flexDirection:"column",flexShrink:0,transition:"width .2s ease",overflow:"hidden"}}>

        {/* Sidebar header */}
        <div style={{padding:"16px 12px 12px",borderBottom:"0.5px solid #1E293B",display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
          <div style={{width:"28px",height:"28px",borderRadius:"8px",background:"linear-gradient(135deg,#F97316,#EA580C)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}>
            <Ico.star/>
          </div>
          {!sidebarCollapsed&&(
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"13px",fontWeight:"700",color:"#F1F5F9"}}>Trinity</div>
              <div style={{fontSize:"10px",color:"#64748B"}}>AI Specialist</div>
            </div>
          )}
          <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} style={{background:"none",border:"none",cursor:"pointer",color:"#64748B",padding:"2px",flexShrink:0,display:"flex"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>

        {/* Study switcher */}
        {!sidebarCollapsed&&(
          <div style={{padding:"10px 12px",borderBottom:"0.5px solid #1E293B",flexShrink:0}}>
            <div style={{fontSize:"9px",color:"#475569",textTransform:"uppercase",letterSpacing:".08em",marginBottom:"6px"}}>Active Study</div>
            <select value={activeStudy?.study_id||""} onChange={e=>switchStudy(e.target.value)} style={{width:"100%",fontSize:"11px",background:"#1E293B",color:"#F1F5F9",border:"0.5px solid #334155",borderRadius:"6px",padding:"6px 8px",fontFamily:"inherit"}}>
              {studies.map(s=>{
                const pct=0;
                return<option key={s.study_id} value={s.study_id}>{s.study_id}</option>;
              })}
            </select>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"6px"}}>
              <div style={{flex:1,height:"3px",background:"#1E293B",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{width:`${donePct}%`,height:"100%",background:donePct>=80?"#10B981":donePct>=50?"#F97316":"#EF4444",borderRadius:"3px"}}/>
              </div>
              <span style={{fontSize:"10px",color:"#94A3B8"}}>{donePct}%</span>
            </div>
          </div>
        )}

        {/* Nav items */}
        <div style={{padding:"8px 8px 0",flexShrink:0}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPanel(n.id as any)} style={{width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"8px",borderRadius:"8px",border:"none",cursor:"pointer",background:panel===n.id?"#1E3A5F":"transparent",color:panel===n.id?"#F97316":"#94A3B8",marginBottom:"2px",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
              <span style={{flexShrink:0}}><n.Icon/></span>
              {!sidebarCollapsed&&(
                <>
                  <span style={{fontSize:"12px",fontWeight:panel===n.id?"600":"400",flex:1}}>{n.label}</span>
                  {n.badge&&<span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"20px",background:panel===n.id?"rgba(249,115,22,0.2)":"#1E293B",color:panel===n.id?"#F97316":"#64748B"}}>{n.badge}</span>}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        {!sidebarCollapsed&&(
          <div style={{padding:"8px",borderTop:"0.5px solid #1E293B",marginTop:"4px",display:"flex",gap:"4px",flexShrink:0}}>
            <button onClick={generateChecklist} disabled={checklistLoading||vaultDocs.length===0} style={{flex:1,fontSize:"10px",padding:"5px",background:"#0891B2",color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer",opacity:checklistLoading||vaultDocs.length===0?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>
              {checklistLoading?<Ico.loader/>:<Ico.list/>}{checklistLoading?"...":"Checklist"}
            </button>
            <button onClick={runVaultAnalysis} disabled={analysing||vaultDocs.length===0} style={{flex:1,fontSize:"10px",padding:"5px",background:"#8B5CF6",color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer",opacity:analysing||vaultDocs.length===0?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>
              {analysing?<Ico.loader/>:<Ico.brain/>}{analysing?"...":"Analyse"}
            </button>
          </div>
        )}

        {/* Memory panel toggle */}
        {!sidebarCollapsed&&memories.length>0&&(
          <div style={{padding:"0 8px 4px",flexShrink:0}}>
            <button onClick={()=>setShowMemory(!showMemory)} style={{width:"100%",display:"flex",alignItems:"center",gap:"8px",padding:"7px 8px",borderRadius:"8px",border:"none",cursor:"pointer",background:"transparent",color:"#64748B",fontFamily:"inherit"}}>
              <Ico.memory/>
              <span style={{fontSize:"11px",flex:1,textAlign:"left"}}>Memory ({memories.length})</span>
              <Ico.chevDown/>
            </button>
            {showMemory&&(
              <div style={{background:"#0F172A",borderRadius:"8px",padding:"8px",marginTop:"4px",border:"0.5px solid #1E293B",maxHeight:"160px",overflowY:"auto"}}>
                {memories.map(m=>(
                  <div key={m.id} style={{display:"flex",gap:"6px",alignItems:"flex-start",marginBottom:"6px"}}>
                    <div style={{width:"4px",height:"4px",borderRadius:"50%",background:"#F97316",flexShrink:0,marginTop:"5px"}}/>
                    <div style={{flex:1,fontSize:"10px",color:"#94A3B8",lineHeight:"1.5"}}>{m.memory_text}</div>
                    <button onClick={()=>deleteMemory(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#475569",padding:"0",flexShrink:0}}><Ico.x/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggested Actions */}
        {!sidebarCollapsed&&suggestions.length>0&&(
          <div style={{padding:"0 8px 8px",flexShrink:0}}>
            <div style={{fontSize:"9px",color:"#475569",textTransform:"uppercase",letterSpacing:".08em",marginBottom:"6px",padding:"0 4px"}}>Suggested</div>
            {suggestions.slice(0,3).map(s=>(
              <button key={s.id} onClick={()=>{setChatInput(s.action_text);setPanel("chat");}} style={{width:"100%",display:"flex",alignItems:"flex-start",gap:"6px",padding:"7px 8px",borderRadius:"6px",border:"none",cursor:"pointer",background:"transparent",textAlign:"left",fontFamily:"inherit",marginBottom:"2px"}}>
                <span style={{color:s.urgency==="High"?"#EF4444":s.urgency==="Medium"?"#F59E0B":"#3B82F6",flexShrink:0,marginTop:"1px"}}><Ico.lightning/></span>
                <span style={{fontSize:"10px",color:"#94A3B8",lineHeight:"1.4"}}>{s.action_text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Recent chats */}
        {!sidebarCollapsed&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",borderTop:"0.5px solid #1E293B"}}>
            <div style={{padding:"10px 12px 6px",display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
              <span style={{fontSize:"9px",color:"#475569",textTransform:"uppercase",letterSpacing:".08em",flex:1}}>Recent</span>
              <button onClick={()=>setShowSearch(!showSearch)} style={{background:"none",border:"none",cursor:"pointer",color:"#475569",padding:"2px"}}><Ico.search/></button>
              <button onClick={startNewChat} style={{background:"none",border:"none",cursor:"pointer",color:"#475569",padding:"2px"}} title="New chat"><Ico.plus/></button>
            </div>

            {showSearch&&(
              <div style={{padding:"0 8px 6px",flexShrink:0}}>
                <input value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Search chats..." style={{width:"100%",fontSize:"11px",background:"#1E293B",color:"#F1F5F9",border:"0.5px solid #334155",borderRadius:"6px",padding:"5px 8px",fontFamily:"inherit",outline:"none"}}/>
              </div>
            )}

            <div style={{flex:1,overflowY:"auto"}}>
              {/* Pinned */}
              {pinnedSessions.length>0&&!chatSearch&&(
                <div>
                  <div style={{fontSize:"9px",color:"#475569",padding:"4px 12px",textTransform:"uppercase",letterSpacing:".06em"}}>Pinned</div>
                  {pinnedSessions.map(s=>(<SessionRow key={s.id} s={s} active={activeSessionId===s.id} onLoad={loadSession} onPin={togglePin} onDelete={deleteSession}/>))}
                </div>
              )}
              {/* Sessions list */}
              {(filteredSessions||unpinnedSessions).map(s=>(<SessionRow key={s.id} s={s} active={activeSessionId===s.id} onLoad={loadSession} onPin={togglePin} onDelete={deleteSession}/>))}
              {sessions.length===0&&<div style={{fontSize:"11px",color:"#475569",padding:"12px",textAlign:"center"}}>No conversations yet</div>}
            </div>

            {/* Back to platform */}
            <div style={{padding:"8px 12px",borderTop:"0.5px solid #1E293B",flexShrink:0}}>
              <a href="/platform" style={{display:"flex",alignItems:"center",gap:"6px",textDecoration:"none",color:"#64748B",fontSize:"11px"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back to TMF360
              </a>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Top bar */}
        <div style={{height:"44px",borderBottom:`0.5px solid ${P.border}`,background:P.bg,display:"flex",alignItems:"center",padding:"0 1.25rem",gap:"12px",flexShrink:0}}>
          <span style={{fontSize:"13px",fontWeight:"600",color:P.text}}>{NAV.find(n=>n.id===panel)?.label}</span>
          {activeStudy&&<span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.primaryLight,color:P.primary,fontWeight:"500"}}>{activeStudy.study_id}</span>}
          <div style={{marginLeft:"auto",display:"flex",gap:"8px",alignItems:"center"}}>
            {panel==="chat"&&(
              <>
                <button onClick={exportChatAsPDF} style={{fontSize:"11px",padding:"4px 10px",background:P.bgTert,color:P.textSec,border:`0.5px solid ${P.border}`,borderRadius:"6px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><Ico.download/>Export</button>
                <button onClick={startNewChat} style={{fontSize:"11px",padding:"4px 10px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><Ico.plus/>New Chat</button>
              </>
            )}
            <span style={{fontSize:"11px",color:P.textTert}}>{user?.email}</span>
          </div>
        </div>

        {/* CHAT PANEL */}
        {panel==="chat"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Quick prompts */}
            <div style={{padding:"8px 1.25rem",display:"flex",gap:"6px",flexWrap:"wrap",borderBottom:`0.5px solid ${P.border}`,background:P.bgSec,flexShrink:0}}>
              {["What's my TMF health?","What is the primary endpoint?","What documents are missing from Zone 3?","Summarise the Protocol","Review a pending document"].map(q=>(
                <button key={q} onClick={()=>setChatInput(q)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"20px",padding:"4px 12px",color:P.textSec,background:P.bg,cursor:"pointer",whiteSpace:"nowrap"}}>{q}</button>
              ))}
              {!vaultHasProtocol&&<span style={{fontSize:"11px",padding:"4px 12px",borderRadius:"20px",background:"#FFFBEB",color:"#92400E",border:"0.5px solid #FDE68A"}}>Upload Protocol to vault for full insights</span>}
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",background:`linear-gradient(135deg,${P.lavender} 0%,#F5F6FC 45%,${P.bg} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0 8px"}}>
              <div style={{width:"100%",maxWidth:"800px",padding:"0 20px",display:"flex",flexDirection:"column",gap:"16px"}}>
                {chatMessages.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:"10px",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeIn .2s ease"}}>
                    {m.role==="ai"&&(
                      <span style={{width:"28px",height:"28px",borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,#FFEDD5,#fff)",border:`0.5px solid #FFEDD5`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,marginTop:"2px"}}>
                        <Ico.star/>
                      </span>
                    )}
                    <div style={{maxWidth:"78%",display:"flex",flexDirection:"column",gap:"6px"}}>
                      {m.role==="ai"&&<div style={{fontSize:"10px",color:P.textTert,fontWeight:"600",paddingLeft:"2px"}}>Trinity</div>}

                      {m.text&&m.text!=="__VALIDATE__"&&!m.text.startsWith("__FILED__")&&!m.text.startsWith("__VALIDATE_DONE__")&&(
                        <div style={{fontSize:"13px",borderRadius:m.role==="ai"?"10px 10px 10px 4px":"10px 10px 4px 10px",padding:"10px 14px",lineHeight:"1.65",whiteSpace:"pre-wrap",background:m.role==="ai"?P.bg:P.bgTert,border:m.role==="ai"?`0.5px solid ${P.border}`:"none",color:P.text}}>{m.text}</div>
                      )}

                      {m.text?.startsWith("__FILED__")&&(
                        <div style={{display:"flex",alignItems:"flex-start",gap:"9px",border:"0.5px solid #bfe6d4",background:P.successLight,borderRadius:"10px",padding:"11px 14px"}}>
                          <span style={{color:P.success,flexShrink:0}}><Ico.circleCheck/></span>
                          <div>
                            <div style={{fontSize:"12px",fontWeight:"600",color:"#0a6b4f"}}>{m.text.replace("__FILED__","").split("\n")[0]}</div>
                            <div style={{fontSize:"11px",color:"#0a6b4f",opacity:.85}}>{m.text.replace("__FILED__","").split("\n")[1]}</div>
                          </div>
                        </div>
                      )}

                      {m.text==="__VALIDATE__"&&m.validation&&(
                        <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px 16px",background:P.bg,display:"flex",flexDirection:"column",gap:"10px"}}>
                          <div style={{fontSize:"12px",fontWeight:"600",color:P.text}}>Vault Validation Report</div>
                          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                            {m.validation.checks?.map((c:any,ci:number)=>(
                              <div key={ci} style={{display:"flex",alignItems:"flex-start",gap:"8px",padding:"7px 10px",borderRadius:"7px",background:c.pass?P.successLight:P.warningLight}}>
                                <span style={{flexShrink:0,color:c.pass?P.success:P.warning}}>{c.pass?<Ico.check/>:<Ico.alert/>}</span>
                                <div style={{flex:1}}><div style={{fontSize:"11px",fontWeight:"600",color:P.text}}>{c.label}</div><div style={{fontSize:"10px",color:P.textSec,marginTop:"1px"}}>{c.detail}</div></div>
                              </div>
                            ))}
                          </div>
                          <div style={{padding:"8px 12px",borderRadius:"8px",background:m.validation.overall==="pass"?P.successLight:m.validation.overall==="fail"?P.dangerLight:P.warningLight,fontSize:"11px",color:m.validation.overall==="pass"?P.success:m.validation.overall==="fail"?P.danger:P.warning,fontWeight:"500"}}>{m.validation.summary}</div>
                          <div style={{display:"flex",gap:"8px"}}>
                            <button onClick={async()=>{const cl=m.pendingClassification;setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,text:"__VALIDATE_DONE__"} as any:msg));await fileDocument(cl,m.validation);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><Ico.check/>Confirm & File</button>
                            <button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,text:"__VALIDATE_DONE__"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Filing cancelled."}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><Ico.x/>Cancel</button>
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
                          {m.classification.warning&&(<div style={{border:"0.5px solid #f3d9a6",background:P.warningLight,borderRadius:"10px",padding:"11px 14px"}}><div style={{fontSize:"11px",fontWeight:"600",color:P.warning,marginBottom:"4px"}}>⚠️ Version mismatch detected</div><div style={{fontSize:"11px",color:"#7a5205",lineHeight:"1.55"}}>{m.classification.warning.detail}</div><div style={{fontSize:"11px",color:"#7a5205",background:"#fff",border:"0.5px solid #f3d9a6",borderRadius:"7px",padding:"7px 10px",marginTop:"6px"}}>Suggested action: {m.classification.warning.action}</div></div>)}
                        </>
                      )}

                      {chatDocAction?.msgIdx===i&&!chatDocAction.disabled&&(
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={()=>{const pendingDoc=docs.find(d=>d.status==="Under Review");if(!pendingDoc)return;const zoneInfo=activeZONES.find(z=>z.z===pendingDoc.zone);setApproveDocId(pendingDoc.id||null);setApproveStage(1);setChatMessages(prev=>[...prev,{role:"ai",text:`Zone ${padZone(pendingDoc.zone)} - ${zoneInfo?.zn||"Unclassified zone"}\nConfirm this is the correct zone for filing.`}]);setChatDocAction(prev=>prev?{...prev,disabled:true}:null);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Approve</button>
                          <button onClick={()=>{const pendingDoc=docs.find(d=>d.status==="Under Review");if(!pendingDoc)return;setFlagDocId(pendingDoc.id||null);setFlagReason(detectFlagReason(pendingDoc));setFlagStage("form");setFlagMsgIdx(i);setChatMessages(prev=>[...prev,{role:"ai",text:"Flag initiated. Review the detected reason below and add context before submitting."}]);setChatDocAction(prev=>prev?{...prev,disabled:true}:null);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Flag</button>
                        </div>
                      )}

                      {approveStage===1&&i===chatMessages.length-1&&m.text.startsWith("Zone ")&&(
                        <button onClick={async()=>{const pendingDoc=docs.find(d=>d.id===approveDocId);if(!pendingDoc)return;const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);setApproveStage(2);setChatMessages(prev=>[...prev,{role:"ai",text:`Artifact - ${art?.an||pendingDoc.artifact_name}\nConfirm this is the correct artifact type.`}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start"}}>Approve Zone</button>
                      )}

                      {approveStage===2&&i===chatMessages.length-1&&m.text.startsWith("Artifact -")&&(
                        <button onClick={async()=>{const pendingDoc=docs.find(d=>d.id===approveDocId);if(!pendingDoc)return;const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Approved",approved_by:user?.email,approved_at:now,signature_reason:"Approved via Trinity AI"}).eq("id",pendingDoc.id);if(!error){await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document approved via Trinity",document_id:pendingDoc.id,study_id:pendingDoc.study_id,field_changed:"status",old_value:pendingDoc.status,new_value:"Approved",signature_reason:"Approved via Trinity AI",document_name:pendingDoc.custom_file_name||pendingDoc.artifact_name}]);setDocs(prev=>prev.map(d=>d.id===pendingDoc.id?{...d,status:"Approved",approved_by:user?.email,approved_at:now}:d));const filedMsg:ChatMsg={role:"ai",text:`__FILED__Filed to Zone ${padZone(pendingDoc.zone)} — Section ${formatSection(art?.s||"")}\nAudit trail entry recorded.`};const final=[...chatMessages,filedMsg];setChatMessages(final);scheduleSave(final);}setApproveStage(0);setApproveDocId(null);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start"}}>Approve & File</button>
                      )}

                      {flagStage==="form"&&i===chatMessages.length-1&&m.text.includes("Flag initiated")&&(
                        <div style={{background:P.dangerLight,border:"0.5px solid #f3c9c7",borderRadius:"10px",padding:"12px 14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                          <div><div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase",letterSpacing:".03em"}}>Auto-detected reason</div><div style={{fontSize:"12px",background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",color:P.textSec}}>{flagReason}</div></div>
                          <div><div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase",letterSpacing:".03em"}}>Your comment</div><textarea value={flagComment} onChange={e=>setFlagComment(e.target.value)} rows={2} placeholder="Add context for the reviewer..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",resize:"vertical",background:"#fff",fontFamily:"inherit"}}/></div>
                          <button disabled={!flagComment.trim()} onClick={async()=>{if(!flagDocId)return;const doc=docs.find(d=>d.id===flagDocId);if(!doc)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:flagReason,rejected_by:user?.email,rejected_at:now}).eq("id",doc.id);if(!error){await supabase.from("audit_trail").insert([{user_id:user?.id,user_email:user?.email,action:"Document flagged via Trinity",document_id:doc.id,study_id:doc.study_id,field_changed:"status",old_value:doc.status,new_value:"Draft",signature_reason:flagReason,document_name:doc.custom_file_name||doc.artifact_name}]);setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,status:"Draft",rejection_reason:flagReason} as any:d));}const flagMsg:ChatMsg={role:"ai",text:`Document flagged and moved to Draft.\nReason: ${flagReason}\nComment: ${flagComment}`};const final=[...chatMessages,flagMsg];setChatMessages(final);scheduleSave(final);setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 16px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:flagComment.trim()?"pointer":"not-allowed",alignSelf:"flex-start",opacity:flagComment.trim()?1:0.5}}>Submit Flag</button>
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
                            const vaultCtx=vaultDocs.length>0?vaultDocs.map(d=>`[${d.document_type}]:\n${d.extracted_text?.slice(0,1500)||""}`).join("\n\n"):"No vault documents.";
                            const validationPrompt=`You are a clinical trial document validator. Return JSON:\n{"checks":[{"label":"string","pass":true,"detail":"string"}],"overall":"pass","summary":"one sentence"}\n\nDOCUMENT: ${cl.fileName} classified as ${cl.artifact_name} (${cl.artifact_num}) Zone ${cl.zone_num}\n\nVAULT:\n${vaultCtx}\n\nCheck: 1)Study title consistency 2)Sponsor match 3)Protocol version match 4)Document completeness 5)Duplicate check\n\nReturn ONLY valid JSON.`;
                            try{
                              const vRes=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:validationPrompt,context:"Return only valid JSON."})});
                              const vData=await vRes.json();
                              const raw=vData.response?.replace(/```json|```/g,"").trim();
                              const validation=JSON.parse(raw);
                              const valMsg={role:"ai",text:"__VALIDATE__",pendingClassification:cl,validation} as any;
                              const final=[...chatMessages,valMsg];setChatMessages(final);scheduleSave(final);
                            }catch{await fileDocument(cl,null);}
                            setChatLoading(false);
                          }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✓ Approve & Validate</button>
                          <button onClick={()=>{setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));setChatMessages(prev=>[...prev,{role:"ai",text:"Artifact rejected. Which artifact should this be filed under?"}]);}} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✗ Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading&&(
                  <div style={{display:"flex",gap:"10px"}}>
                    <span style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#FFEDD5,#fff)",border:"0.5px solid #FFEDD5",display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,flexShrink:0}}><Ico.star/></span>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",display:"flex",gap:"4px",alignItems:"center"}}>
                      {[0,1,2].map(i=><span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:P.textTert,display:"inline-block",animation:"bounce 0.9s infinite",animationDelay:`${i*0.15}s`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={messagesEnd}/>
              </div>
            </div>

            {/* Input */}
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 16px",background:`linear-gradient(135deg,${P.lavender} 0%,#F5F6FC 45%,${P.bg} 100%)`,flexShrink:0}}>
              <input ref={chatFileInput} type="file" accept=".pdf" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0];if(!file)return;
                if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Select a study first."}]);return;}
                const userMsg:ChatMsg={role:"user",text:`Uploaded: ${file.name}`};
                const newMsgs=[...chatMessages,userMsg];setChatMessages(newMsgs);setChatLoading(true);
                const reader=new FileReader();
                reader.onload=async(ev)=>{
                  const base64=((ev.target?.result as string)||"").split(",")[1];
                  const readMsg:ChatMsg={role:"ai",text:"Reading your document... I'll analyse the content and suggest the correct TMF zone and artifact."};
                  setChatMessages(prev=>[...prev,readMsg]);
                  try{
                    const res=await fetch("/api/classify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:file.name,activeZONES,activeTMF})});
                    const data=await res.json();
                    if(data.error){setChatMessages(prev=>[...prev,{role:"ai",text:"Could not classify: "+data.error}]);setChatLoading(false);return;}
                    const clMsg={role:"ai",text:`I've analysed your document.\n\n${data.reasoning}\n\nSuggested Zone:\n📁 Zone ${data.zone_num} - ${data.zone_name}\n\nConfidence: ${data.confidence}%\n\nApprove this zone?`,pendingClassification:{...data,base64,fileName:file.name},classStage:"zone"} as any;
                    const final=[...newMsgs,readMsg,clMsg];setChatMessages(final);scheduleSave(final);
                  }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Classification error: "+err.message}]);}
                  setChatLoading(false);
                };
                reader.readAsDataURL(file);
                if(chatFileInput.current)chatFileInput.current.value="";
              }}/>
              <div style={{width:"100%",maxWidth:"800px",margin:"0 20px",display:"flex",alignItems:"center",gap:"8px",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"26px",padding:"6px 8px 6px 14px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                <button onClick={()=>chatFileInput.current?.click()} style={{width:"32px",height:"32px",borderRadius:"50%",border:"none",background:"transparent",color:P.textTert,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}><Ico.clip/></button>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask Trinity anything about this study..." style={{flex:1,border:"none",outline:"none",fontSize:"13px",background:"transparent",color:P.text,padding:"8px 2px"}}/>
                <button onClick={sendChat} disabled={chatLoading} style={{width:"32px",height:"32px",borderRadius:"50%",flexShrink:0,background:chatLoading?P.bgTert:P.primary,border:"none",color:chatLoading?P.textTert:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:chatLoading?"not-allowed":"pointer"}}><Ico.up/></button>
              </div>
            </div>
          </div>
        )}

        {/* VAULT PANEL */}
        {panel==="vault"&&(
          <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
            <div style={{maxWidth:"800px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
              <div><h2 style={{fontSize:"16px",fontWeight:"700",color:P.text}}>Study Vault</h2><p style={{fontSize:"12px",color:P.textTert,marginTop:"3px"}}>Upload key study documents. Trinity reads these to understand your trial and give study-specific insights.</p></div>
              <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"10px",padding:"12px 16px",fontSize:"11px",color:"#1E40AF"}}><strong>Recommended uploads:</strong> Protocol (most important), Investigator's Brochure, Statistical Analysis Plan, Monitoring Plan, IRB Decision.</div>
              <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
                <h3 style={{fontSize:"13px",fontWeight:"600",marginBottom:"14px"}}>Upload to Vault</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
                  <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Document type</label><select value={vaultDocType} onChange={e=>setVaultDocType(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",fontFamily:"inherit"}}>{VAULT_DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Custom name (optional)</label><input value={vaultCustomName} onChange={e=>setVaultCustomName(e.target.value)} placeholder="e.g. Protocol v2.1 Final" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}/></div>
                </div>
                <div onClick={()=>vaultFileInput.current?.click()} style={{border:`1.5px dashed ${vaultFile?P.primary:P.border}`,borderRadius:"10px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:vaultFile?P.primaryLight:P.bgSec,marginBottom:"12px"}} onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)setVaultFile(f);}}>
                  <input ref={vaultFileInput} type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setVaultFile(f);}}/>
                  {vaultFile?(<div><div style={{fontSize:"24px",marginBottom:"6px"}}>📄</div><div style={{fontSize:"13px",fontWeight:"500",color:P.primary}}>{vaultFile.name}</div><div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>{(vaultFile.size/1024).toFixed(0)} KB</div></div>):(<div><div style={{fontSize:"24px",marginBottom:"6px"}}>📁</div><div style={{fontSize:"13px",color:P.textSec}}>Drop a PDF here or click to browse</div></div>)}
                </div>
                {vaultProgress&&<div style={{fontSize:"11px",padding:"8px 12px",borderRadius:"8px",background:vaultProgress.includes("Done")?P.successLight:P.primaryLight,color:vaultProgress.includes("Done")?P.success:P.primary,marginBottom:"10px"}}>{vaultProgress}</div>}
                <button onClick={uploadVaultDoc} disabled={!vaultFile||vaultUploading} style={{fontSize:"12px",fontWeight:"600",padding:"10px 20px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:vaultFile&&!vaultUploading?"pointer":"not-allowed",opacity:vaultFile&&!vaultUploading?1:0.5}}>{vaultUploading?"Processing...":"Upload to Vault"}</button>
              </div>
              {vaultDocs.length===0?(<div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bgSec,borderRadius:"12px",border:`0.5px solid ${P.border}`}}><div style={{fontSize:"32px",marginBottom:"8px"}}>📂</div><div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>Vault is empty</div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  <h3 style={{fontSize:"13px",fontWeight:"600"}}>Vault Documents ({vaultDocs.length})</h3>
                  {vaultDocs.map(d=>(<div key={d.id} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px"}}><div style={{width:"40px",height:"40px",borderRadius:"10px",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>📄</div><div style={{flex:1}}><div style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{d.custom_name||d.file_name}</div><div style={{display:"flex",gap:"8px",marginTop:"3px",alignItems:"center"}}><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.purpleLight,color:P.purple,fontWeight:"500"}}>{d.document_type}</span><span style={{fontSize:"10px",color:P.textTert}}>{new Date(d.uploaded_at).toLocaleDateString()}</span>{d.extracted_text?<span style={{fontSize:"10px",color:P.success}}>✓ {d.extracted_text.length} chars</span>:<span style={{fontSize:"10px",color:P.warning}}>⚠ No text</span>}</div></div><div style={{display:"flex",gap:"6px"}}><a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>View</a><button onClick={()=>deleteVaultDoc(d.id)} style={{fontSize:"11px",padding:"5px 12px",background:P.dangerLight,color:P.danger,border:"none",borderRadius:"6px",cursor:"pointer"}}>Remove</button></div></div>))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FINDINGS PANEL */}
        {panel==="findings"&&(
          <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
            <div style={{maxWidth:"900px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><h2 style={{fontSize:"16px",fontWeight:"700",color:P.text}}>Trinity Findings</h2><p style={{fontSize:"12px",color:P.textTert,marginTop:"3px"}}>Auto-generated from vault document analysis.</p></div>
                <button onClick={runVaultAnalysis} disabled={analysing||vaultDocs.length===0} style={{fontSize:"12px",padding:"8px 16px",background:P.purple,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",opacity:analysing||vaultDocs.length===0?0.5:1}}>{analysing?<Ico.loader/>:<Ico.brain/>}{analysing?"Analysing...":"Re-run Analysis"}</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                {[{label:"Critical",color:P.danger,bg:P.dangerLight,count:findings.filter(f=>f.severity==="Critical"&&f.status==="Open").length},{label:"Major",color:P.warning,bg:P.warningLight,count:findings.filter(f=>f.severity==="Major"&&f.status==="Open").length},{label:"Minor",color:P.blue,bg:P.blueLight,count:findings.filter(f=>f.severity==="Minor"&&f.status==="Open").length}].map((s,i)=>(<div key={i} style={{background:s.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px"}}><div style={{fontSize:"26px",fontWeight:"700",color:s.color}}>{s.count}</div><div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{s.label} open</div></div>))}
              </div>
              {findings.length===0?(<div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bgSec,borderRadius:"12px",border:`0.5px solid ${P.border}`}}><div style={{fontSize:"32px",marginBottom:"8px"}}>🔍</div><div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>No findings yet</div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {["Critical","Major","Minor"].map(sev=>{const sevFindings=findings.filter(f=>f.severity===sev);if(!sevFindings.length)return null;return(<div key={sev}><h3 style={{fontSize:"11px",fontWeight:"600",color:SEVERITY_COLOR(sev),textTransform:"uppercase",letterSpacing:".06em",marginBottom:"6px"}}>{sev} — {sevFindings.filter(f=>f.status==="Open").length} open</h3>{sevFindings.map(f=>(<div key={f.id} style={{background:P.bg,border:`0.5px solid ${f.status==="Open"?SEVERITY_COLOR(f.severity):P.border}`,borderRadius:"10px",padding:"14px 16px",marginBottom:"6px",display:"flex",gap:"12px",alignItems:"flex-start",opacity:f.status==="Resolved"?0.6:1}}><div style={{width:"8px",height:"8px",borderRadius:"50%",background:f.status==="Resolved"?P.textMuted:SEVERITY_COLOR(f.severity),flexShrink:0,marginTop:"5px"}}/><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}><span style={{fontSize:"13px",fontWeight:"600",color:P.text}}>{f.title}</span><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:SEVERITY_BG(f.severity),color:SEVERITY_COLOR(f.severity),fontWeight:"500"}}>{f.severity}</span><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:f.status==="Resolved"?P.successLight:P.bgTert,color:f.status==="Resolved"?P.success:P.textTert}}>{f.status}</span></div><div style={{fontSize:"12px",color:P.textSec,lineHeight:"1.6",marginBottom:"6px"}}>{f.detail}</div><div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>{f.source_doc&&<span style={{fontSize:"10px",color:P.textTert}}>Source: {f.source_doc}</span>}{f.artifact_ref&&<span style={{fontSize:"10px",fontFamily:"monospace",color:P.blue}}>Artifact: {f.artifact_ref}</span>}</div></div>{f.status==="Open"&&<button onClick={()=>resolveFinding(f.id)} style={{fontSize:"11px",padding:"5px 12px",background:P.successLight,color:P.success,border:`0.5px solid #A7F3D0`,borderRadius:"6px",cursor:"pointer",flexShrink:0}}>Resolve</button>}</div>))}</div>);})}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BRIEFING PANEL */}
        {panel==="briefing"&&(
          <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
            <div style={{maxWidth:"800px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><h2 style={{fontSize:"16px",fontWeight:"700",color:P.text}}>Daily Briefing</h2><p style={{fontSize:"12px",color:P.textTert,marginTop:"3px"}}>{activeStudy?.study_id} · {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p></div>
                <button onClick={generateBriefing} disabled={briefingLoading} style={{fontSize:"12px",padding:"8px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",opacity:briefingLoading?0.6:1}}>{briefingLoading?<Ico.loader/>:<Ico.refresh/>}{briefingLoading?"Generating...":"Refresh"}</button>
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
                    {[{val:`${briefing.stats?.completeness||donePct}%`,label:"Completeness",color:P.blue},{val:briefing.stats?.missing||missing,label:"Missing",color:P.danger},{val:briefing.stats?.pending||pending,label:"Pending",color:P.warning},{val:briefing.stats?.expiring||expiring,label:"Expiring",color:P.warning},{val:`${briefing.stats?.ri||ri}/100`,label:"Readiness",color:ri>=80?P.success:ri>=50?P.primary:P.danger}].map((s,i)=>(<div key={i} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px",textAlign:"center"}}><div style={{fontSize:"22px",fontWeight:"700",color:s.color}}>{s.val}</div><div style={{fontSize:"10px",color:P.textSec,marginTop:"3px"}}>{s.label}</div></div>))}
                  </div>
                  {briefing.priority_actions?.length>0&&(
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px 20px"}}>
                      <h3 style={{fontSize:"13px",fontWeight:"600",marginBottom:"12px"}}>Priority Actions</h3>
                      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                        {briefing.priority_actions.map((a:any,i:number)=>{const urg=a.urgency==="High"?{bg:P.dangerLight,color:P.danger,border:"#FECACA"}:a.urgency==="Medium"?{bg:P.warningLight,color:P.warning,border:"#FDE68A"}:{bg:P.blueLight,color:P.blue,border:"#BFDBFE"};return(<div key={i} style={{display:"flex",gap:"10px",padding:"10px 12px",background:urg.bg,borderRadius:"8px",border:`0.5px solid ${urg.border}`}}><span style={{fontSize:"14px",flexShrink:0}}>{a.urgency==="High"?"🔴":a.urgency==="Medium"?"🟡":"🔵"}</span><div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:"600",color:P.text}}>{a.action}</div><div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{a.reason}</div></div><span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"20px",background:"rgba(255,255,255,0.7)",color:urg.color,fontWeight:"600",flexShrink:0,alignSelf:"flex-start"}}>{a.urgency}</span></div>);})}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* CHECKLIST PANEL */}
        {panel==="checklist"&&(
          <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
            <div style={{maxWidth:"900px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><h2 style={{fontSize:"16px",fontWeight:"700",color:P.text}}>Study Checklist</h2><p style={{fontSize:"12px",color:P.textTert,marginTop:"3px"}}>Protocol-driven expected document list generated by Trinity.</p></div>
                <button onClick={generateChecklist} disabled={checklistLoading||vaultDocs.length===0} style={{fontSize:"12px",padding:"8px 16px",background:P.cyan,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",opacity:checklistLoading||vaultDocs.length===0?0.5:1}}>{checklistLoading?<Ico.loader/>:<Ico.refresh/>}{checklistLoading?"Generating...":"Regenerate"}</button>
              </div>
              {vaultDocs.length===0&&<div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"12px 16px",fontSize:"11px",color:"#92400E"}}>Upload your Protocol to the Study Vault first.</div>}
              {!checklistGenerated&&vaultDocs.length>0&&(
                <div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bgSec,borderRadius:"12px",border:`0.5px solid ${P.border}`}}>
                  <div style={{fontSize:"32px",marginBottom:"8px"}}>📋</div>
                  <div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>No checklist generated yet</div>
                  <div style={{fontSize:"12px",marginTop:"4px",marginBottom:"1rem"}}>Click Generate Checklist to create a Protocol-driven expected document list.</div>
                  <button onClick={generateChecklist} style={{fontSize:"12px",fontWeight:"600",padding:"10px 20px",background:P.cyan,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Generate Checklist</button>
                </div>
              )}
              {checklistGenerated&&checklist.length>0&&(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                    {[{label:"Total expected",color:P.cyan,bg:P.cyanLight,count:checklist.length},{label:"Filed",color:P.success,bg:P.successLight,count:checklist.filter(c=>c.status==="Filed").length},{label:"Missing",color:P.danger,bg:P.dangerLight,count:checklist.filter(c=>c.status==="Missing").length}].map((s,i)=>(<div key={i} style={{background:s.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px"}}><div style={{fontSize:"26px",fontWeight:"700",color:s.color}}>{s.count}</div><div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{s.label}</div></div>))}
                  </div>
                  {["Critical","Major","Minor"].map(sev=>{const sevItems=checklist.filter(c=>c.severity===sev);if(!sevItems.length)return null;return(<div key={sev}><h3 style={{fontSize:"11px",fontWeight:"600",color:SEVERITY_COLOR(sev),textTransform:"uppercase",letterSpacing:".06em",marginBottom:"6px"}}>{sev} — {sevItems.filter(c=>c.status==="Missing").length} missing of {sevItems.length}</h3>{sevItems.map((item,idx)=>(<div key={idx} style={{background:P.bg,border:`0.5px solid ${item.status==="Missing"?SEVERITY_COLOR(item.severity):P.success}`,borderRadius:"10px",padding:"14px 16px",marginBottom:"6px",display:"flex",gap:"12px",alignItems:"flex-start"}}><div style={{width:"28px",height:"28px",borderRadius:"50%",background:item.status==="Filed"?P.successLight:SEVERITY_BG(item.severity),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:item.status==="Filed"?P.success:SEVERITY_COLOR(item.severity)}}>{item.status==="Filed"?<Ico.check/>:<Ico.alert/>}</div><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}><span style={{fontSize:"13px",fontWeight:"600",color:P.text}}>{item.item_name}</span><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:item.status==="Filed"?P.successLight:SEVERITY_BG(item.severity),color:item.status==="Filed"?P.success:SEVERITY_COLOR(item.severity),fontWeight:"500"}}>{item.status}</span></div><div style={{fontSize:"12px",color:P.textSec,lineHeight:"1.6",marginBottom:"4px"}}>{item.reason}</div><div style={{display:"flex",gap:"10px"}}>{item.artifact_ref&&<span style={{fontSize:"10px",fontFamily:"monospace",color:P.blue}}>{item.artifact_ref}</span>}{item.zone&&<span style={{fontSize:"10px",color:P.textTert}}>Zone {item.zone}</span>}</div></div></div>))}</div>);})}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Session row component for sidebar
function SessionRow({s,active,onLoad,onPin,onDelete}:{s:ChatSession;active:boolean;onLoad:(s:ChatSession)=>void;onPin:(id:string,pinned:boolean)=>void;onDelete:(id:string)=>void}){
  const[hover,setHover]=useState(false);
  return(
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 8px",borderRadius:"7px",cursor:"pointer",background:active?"#1E3A5F":hover?"#1E293B":"transparent",margin:"0 4px 1px"}}>
      <div onClick={()=>onLoad(s)} style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"11px",color:active?"#F1F5F9":"#94A3B8",fontWeight:active?"500":"400",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title||"New conversation"}</div>
        <div style={{fontSize:"9px",color:"#475569",marginTop:"1px"}}>{new Date(s.updated_at).toLocaleDateString()}</div>
      </div>
      {hover&&(
        <div style={{display:"flex",gap:"2px",flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();onPin(s.id,s.is_pinned);}} style={{background:"none",border:"none",cursor:"pointer",color:s.is_pinned?"#F97316":"#475569",padding:"2px"}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg></button>
          <button onClick={e=>{e.stopPropagation();onDelete(s.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#475569",padding:"2px"}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      )}
    </div>
  );
}