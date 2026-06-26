"use client";
import { useState, useEffect, useRef } from "react";

const TMF = [
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.04",an:"List of SOPs Current During Trial",cl:"Core",iso:"",def:"Record of which SOPs were in effect during the trial."},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.08",an:"Monitoring Plan",cl:"Core",iso:"6.7, 7.3, 9.2.4.1",def:"Monitoring strategy, frequency, and approach for the trial."},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.01",an:"Delegation of Authority Log",cl:"Core",iso:"6.2, 9.2",def:"Records delegation of sponsor responsibilities."},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.02",an:"Staff CVs and Training Records",cl:"Core",iso:"6.2",def:"CVs and training records for sponsor/CRO staff."},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Agreements",a:"01.03.01",an:"CRO Agreement",cl:"Core",iso:"6.1",def:"Contract between sponsor and CRO."},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Monitoring",a:"01.04.01",an:"Monitoring Visit Report",cl:"Core",iso:"9.2.4",def:"Report from each monitoring visit."},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"Risk Management",a:"01.05.01",an:"Risk Assessment",cl:"Core",iso:"9.1",def:"Identified risks with mitigation strategies."},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Protocol",a:"02.01.01",an:"Protocol",cl:"Core",iso:"7.2, Annex A",def:"Clinical investigation plan."},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Protocol",a:"02.01.02",an:"Protocol Amendment",cl:"Core",iso:"7.2.10",def:"Documented changes to the approved protocol."},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Informed Consent",a:"02.02.01",an:"Informed Consent Form (Master)",cl:"Core",iso:"7.4, 4.1",def:"Master ICF template approved by IRB/IEC."},
  {z:"2",zn:"Central Trial Documents",s:"2.03",sn:"Device Description",a:"02.03.01",an:"Investigator Brochure / Device Description",cl:"Core",iso:"7.3",def:"Summary of clinical and non-clinical device data."},
  {z:"2",zn:"Central Trial Documents",s:"2.04",sn:"CRFs",a:"02.04.01",an:"Case Report Form (Blank)",cl:"Core",iso:"7.8",def:"Blank CRF templates."},
  {z:"2",zn:"Central Trial Documents",s:"2.05",sn:"SAP",a:"02.05.01",an:"Statistical Analysis Plan",cl:"Core",iso:"7.9",def:"Detailed statistical analysis methods."},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Regulatory Applications",a:"03.01.01",an:"Regulatory Submission",cl:"Core",iso:"9.3",def:"Submission to regulatory authority (e.g., IDE)."},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Regulatory Applications",a:"03.01.02",an:"Regulatory Approval / Authorization",cl:"Core",iso:"9.3",def:"Approval letter from regulatory authority."},
  {z:"3",zn:"Regulatory",s:"3.02",sn:"Correspondence",a:"03.02.01",an:"Regulatory Correspondence",cl:"Core",iso:"9.3",def:"All correspondence with regulatory authorities."},
  {z:"3",zn:"Regulatory",s:"3.03",sn:"Progress Reports",a:"03.03.01",an:"Annual / Progress Report to Regulatory Authority",cl:"Core",iso:"9.4",def:"Periodic progress reports."},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.01",an:"IRB / IEC Submission",cl:"Core",iso:"9.5",def:"Submission package to IRB/IEC."},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.02",an:"IRB / IEC Approval",cl:"Core",iso:"4.1.3, 9.5.1",def:"Written IRB/IEC approval."},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.03",an:"IRB / IEC Continuing Review",cl:"Core",iso:"9.5.3",def:"Annual continuing review documentation."},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.04",an:"IRB / IEC Correspondence",cl:"Core",iso:"9.5",def:"All correspondence with IRB/IEC."},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.01",an:"Site Selection and Qualification Report",cl:"Core",iso:"6.5, 9.2.1",def:"Site evaluation and qualification documentation."},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.02",an:"Investigator / Site Qualification Questionnaire",cl:"Core",iso:"6.5",def:"Questionnaire assessing site capabilities."},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.01",an:"Site Initiation Visit Report",cl:"Core",iso:"9.2.2",def:"SIV report before first subject enrollment."},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.02",an:"Training Materials",cl:"Core",iso:"9.2.2",def:"Protocol and device training materials."},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.03",an:"Site Training Records",cl:"Core",iso:"9.2.2",def:"Records confirming training completion."},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.01",an:"Investigator Agreement / Signed Protocol",cl:"Core",iso:"6.4, 9.2.3.1",def:"Signed agreement or protocol page."},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.02",an:"Principal Investigator CV",cl:"Core",iso:"6.4.1",def:"Current CV of the principal investigator."},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.03",an:"Sub-Investigator CVs",cl:"Core",iso:"6.4.1",def:"CVs of all sub-investigators."},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.04",an:"Investigator / Staff Delegation Log",cl:"Core",iso:"6.4.2",def:"Delegation of responsibilities by PI."},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.05",an:"Medical Licenses",cl:"Core",iso:"6.4.1",def:"Current medical licenses for PI and sub-investigators."},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Facilities",a:"05.04.01",an:"Normal Value Ranges (Lab)",cl:"Core",iso:"7.5.4",def:"Lab reference ranges used at site."},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Facilities",a:"05.04.02",an:"Laboratory Certification / Accreditation",cl:"Core",iso:"7.5.4",def:"Evidence of lab accreditation."},
  {z:"5",zn:"Site Management",s:"5.05",sn:"Clinical Trial Agreement",a:"05.05.01",an:"Clinical Trial Agreement (Site)",cl:"Core",iso:"6.4.4",def:"Executed contract between sponsor and site."},
  {z:"5",zn:"Site Management",s:"5.06",sn:"Informed Consent",a:"05.06.01",an:"Signed Informed Consent Forms",cl:"Core",iso:"4.1, 7.4",def:"Executed ICFs for each enrolled subject."},
  {z:"5",zn:"Site Management",s:"5.07",sn:"Screening",a:"05.07.01",an:"Screening / Enrollment Log",cl:"Core",iso:"8.3",def:"Log of all screened and enrolled subjects."},
  {z:"5",zn:"Site Management",s:"5.07",sn:"Screening",a:"05.07.02",an:"Subject Identification Code List",cl:"Core",iso:"8.3",def:"Confidential subject ID list."},
  {z:"5",zn:"Site Management",s:"5.08",sn:"Protocol Deviations",a:"05.08.01",an:"Protocol Deviation Log",cl:"Core",iso:"8.2.4",def:"Log of all protocol deviations."},
  {z:"5",zn:"Site Management",s:"5.08",sn:"Protocol Deviations",a:"05.08.02",an:"Protocol Deviation Report",cl:"Core",iso:"8.2.4",def:"Individual deviation reports."},
  {z:"5",zn:"Site Management",s:"5.09",sn:"Site Closure",a:"05.09.01",an:"Site Closure Visit Report",cl:"Core",iso:"9.2.5",def:"Site closeout visit report."},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"Investigational Device",a:"06.01.01",an:"Device Accountability Log",cl:"Core",iso:"8.6",def:"Device receipt, use, and return/destruction log."},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"Investigational Device",a:"06.01.02",an:"Device Shipping and Receipt Records",cl:"Core",iso:"8.6",def:"Device shipment and receipt records."},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.01",an:"Adverse Event Log",cl:"Core",iso:"8.5",def:"All AEs reported during investigation."},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.02",an:"Serious Adverse Event Reports (SAE)",cl:"Core",iso:"8.5.4, 8.5.5",def:"Individual SAE reports."},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.03",an:"Device Deficiency Reports",cl:"Core",iso:"8.5.6",def:"Device failure or malfunction reports."},
  {z:"7",zn:"Safety Reporting",s:"7.02",sn:"Safety Reports",a:"07.02.01",an:"UADE / Safety Reports to Regulatory Authority",cl:"Core",iso:"8.5.4",def:"UADE reports to regulatory authority."},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Lab and Imaging",a:"08.01.01",an:"Central Lab Manual",cl:"Core",iso:"7.5",def:"Sample collection and shipping instructions."},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Lab and Imaging",a:"08.01.02",an:"Imaging Manual",cl:"Recommended",iso:"",def:"Imaging procedures and reading guidelines."},
  {z:"9",zn:"Third Parties",s:"9.01",sn:"Third Party Agreements",a:"09.01.01",an:"Third Party Agreement",cl:"Core",iso:"6.1",def:"Vendor and service provider contracts."},
  {z:"10",zn:"Data Management",s:"10.01",sn:"Data Management Plan",a:"10.01.01",an:"Data Management Plan",cl:"Core",iso:"7.8, 7.9",def:"Data collection, cleaning, and lock procedures."},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Database",a:"10.02.01",an:"Database Validation Documentation",cl:"Core",iso:"7.8.4",def:"EDC system validation evidence."},
  {z:"11",zn:"Statistics",s:"11.01",sn:"Statistical Analysis",a:"11.01.01",an:"Statistical Analysis Plan",cl:"Core",iso:"7.9",def:"Pre-specified statistical methods."},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Analysis Outputs",a:"11.02.01",an:"Statistical Analysis Output",cl:"Core",iso:"7.9",def:"Final tables, figures, and listings."},
];

const ZONES = [...new Set(TMF.map(a => a.z))].map(z => ({
  z, zn: TMF.find(a => a.z === z)!.zn,
  count: TMF.filter(a => a.z === z).length,
  core: TMF.filter(a => a.z === z && a.cl === "Core").length
}));

const ZONE_WEIGHT: Record<string, number> = {"3":3,"4":3,"5":3,"1":2,"2":2,"7":2,"6":1,"8":1,"9":1,"10":1,"11":1};
const ZONE_COLORS: Record<string, string> = {"1":"#1D9E75","2":"#185FA5","3":"#D85A30","4":"#BA7517","5":"#3B6D11","6":"#639922","7":"#A32D2D","8":"#533AB7","9":"#888780","10":"#D4537E","11":"#0F6E56"};

interface Study { id: string; protocol: string; phase: string; status: string; sponsor: string; }
interface Doc { artNum: string; an: string; zone: string; version: string; status: string; owner: string; effective: string; expiry: string; }
interface Docs { [key: string]: Doc[]; }

const SEED_STUDY: Study = {id:"OIL-BR-US-10",protocol:"CLE Imaging of Breast Tissue",phase:"Phase I",status:"Active",sponsor:"Optiscan Imaging Ltd."};
const SEED_DOCS: Doc[] = [
  {artNum:"02.01.01",an:"Protocol",zone:"2",version:"v3.0",status:"Approved",owner:"Jess (Director)",effective:"2024-01-15",expiry:""},
  {artNum:"04.01.02",an:"IRB / IEC Approval",zone:"4",version:"v1.0",status:"Approved",owner:"Camile (CRA)",effective:"2024-02-01",expiry:"2025-02-01"},
  {artNum:"01.01.08",an:"Monitoring Plan",zone:"1",version:"v1.0",status:"Approved",owner:"Jess (Director)",effective:"2024-01-20",expiry:""},
  {artNum:"05.03.02",an:"Principal Investigator CV",zone:"5",version:"v2.0",status:"Under Review",owner:"Site Coordinator",effective:"2023-06-01",expiry:"2025-06-01"},
  {artNum:"05.05.01",an:"Clinical Trial Agreement (Site)",zone:"5",version:"v1.0",status:"Approved",owner:"Jess (Director)",effective:"2024-01-10",expiry:""},
  {artNum:"05.02.01",an:"Site Initiation Visit Report",zone:"5",version:"v1.0",status:"Draft",owner:"Camile (CRA)",effective:"",expiry:""},
];

export default function TMF360() {
  const [panel, setPanel] = useState("dashboard");
  const [studies, setStudies] = useState<Study[]>([SEED_STUDY]);
  const [docs, setDocs] = useState<Docs>({"OIL-BR-US-10": SEED_DOCS});
  const [activeStudy, setActiveStudy] = useState<Study>(SEED_STUDY);
  const [docFilter, setDocFilter] = useState("all");
  const [artSearch, setArtSearch] = useState("");
  const [artZone, setArtZone] = useState("");
  const [artCl, setArtCl] = useState("");
  const [gapZone, setGapZone] = useState("");
  const [expandedArt, setExpandedArt] = useState<string | null>(null);
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([{role:"ai",text:"Hello! I'm your TMF360 AI Specialist — trained on DIA TMF Reference Model v3.3.1, ISO 14155:2020, and ICH E6(R3). Ask me anything about TMF filing, gaps, inspection readiness, or document drafting."}]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatHistory = useRef<{role:string;content:string}[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Study form
  const [fId, setFId] = useState(""); const [fProtocol, setFProtocol] = useState("");
  const [fPhase, setFPhase] = useState("Phase I"); const [fStatus, setFStatus] = useState("Startup");
  const [fSponsor, setFSponsor] = useState("");

  // Doc form
  const [fArtifact, setFArtifact] = useState(TMF[0].a + "|" + TMF[0].an + "|" + TMF[0].z);
  const [fVersion, setFVersion] = useState(""); const [fDocStatus, setFDocStatus] = useState("Draft");
  const [fOwner, setFOwner] = useState(""); const [fEff, setFEff] = useState(""); const [fExp, setFExp] = useState("");

  const getStudyDocs = (sid: string) => docs[sid] || [];
  const getFiledNames = (sid: string) => getStudyDocs(sid).map(d => d.an.toLowerCase());

  const completeness = (sid: string) => {
    const core = TMF.filter(a => a.cl === "Core");
    const filed = getFiledNames(sid);
    const done = core.filter(a => filed.some(f => a.an.toLowerCase().includes(f) || f.includes(a.an.toLowerCase())));
    return core.length ? Math.round(done.length / core.length * 100) : 0;
  };

  const zoneCompleteness = (z: string, sid: string) => {
    const core = TMF.filter(a => a.cl === "Core" && a.z === z);
    if (!core.length) return 100;
    const filed = getFiledNames(sid);
    const done = core.filter(a => filed.some(f => a.an.toLowerCase().includes(f) || f.includes(a.an.toLowerCase())));
    return Math.round(done.length / core.length * 100);
  };

  const riScore = (sid: string) => {
    let weighted = 0, total = 0;
    ZONES.forEach(({z}) => { const w = ZONE_WEIGHT[z] || 1; weighted += zoneCompleteness(z, sid) * w; total += 100 * w; });
    return total ? Math.round(weighted / total * 100) : 0;
  };

  const gapFindings = (sid: string) => {
    const filed = getFiledNames(sid);
    const gaps: {crit: any[], major: any[], minor: any[]} = {crit:[], major:[], minor:[]};
    TMF.filter(a => a.cl === "Core").forEach(a => {
      const found = filed.some(f => a.an.toLowerCase().includes(f) || f.includes(a.an.toLowerCase()));
      if (!found) {
        const e = {an: a.an, a: a.a, z: a.z, zn: a.zn, iso: a.iso};
        if (["3","4","5"].includes(a.z)) gaps.crit.push(e);
        else if (["1","2","7"].includes(a.z)) gaps.major.push(e);
        else gaps.minor.push(e);
      }
    });
    return gaps;
  };

  const scoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 60 ? "text-amber-600" : "text-red-600";
  const pct = completeness(activeStudy.id);
  const ri = riScore(activeStudy.id);
  const gaps = gapFindings(activeStudy.id);
  const studyDocs = getStudyDocs(activeStudy.id);
  const missing = Math.max(0, TMF.filter(a => a.cl === "Core").length - studyDocs.filter(d => d.status === "Approved").length);
  const expiring = studyDocs.filter(d => d.expiry && new Date(d.expiry) < new Date(Date.now() + 90 * 86400000)).length;
  const pending = studyDocs.filter(d => ["Draft","Under Review"].includes(d.status)).length;

  const filteredDocs = docFilter === "all" ? studyDocs : studyDocs.filter(d => d.status === docFilter);
  const filteredArts = TMF.filter(a => {
    if (artZone && a.z !== artZone) return false;
    if (artCl && a.cl !== artCl) return false;
    if (artSearch && !(a.an + a.sn + a.zn + a.def).toLowerCase().includes(artSearch.toLowerCase())) return false;
    return true;
  });

  const createStudy = () => {
    if (!fId.trim()) return;
    const s: Study = {id: fId, protocol: fProtocol, phase: fPhase, status: fStatus, sponsor: fSponsor};
    setStudies(prev => [...prev, s]);
    setDocs(prev => ({...prev, [fId]: []}));
    setActiveStudy(s);
    setShowStudyModal(false);
    setFId(""); setFProtocol(""); setFSponsor("");
    setPanel("dashboard");
  };

  const addDocument = () => {
    const [artNum, an, zone] = fArtifact.split("|");
    const d: Doc = {artNum, an, zone, version: fVersion, status: fDocStatus, owner: fOwner, effective: fEff, expiry: fExp};
    setDocs(prev => ({...prev, [activeStudy.id]: [...(prev[activeStudy.id] || []), d]}));
    setShowDocModal(false);
    setFVersion(""); setFOwner(""); setFEff(""); setFExp("");
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, {role:"user", text: msg}]);
    chatHistory.current.push({role:"user", content: msg});
    setChatLoading(true);
    const studyCtx = `Active study: ${activeStudy.id} (${activeStudy.protocol}), Phase: ${activeStudy.phase}, Status: ${activeStudy.status}. TMF completeness: ${pct}%. Inspection readiness: ${ri}. Filed documents: ${studyDocs.map(d=>d.an).join(", ") || "none"}.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          system: `You are the TMF360 AI Specialist — expert in DIA TMF Reference Model v3.3.1, ISO 14155:2020, ICH E6(R3), 21 CFR Part 11, and ALCOA+.\n\nStudy context: ${studyCtx}\n\nZones: 1-Trial Management, 2-Central Trial Documents, 3-Regulatory, 4-IRB/IEC, 5-Site Management, 6-IP/Trial Supplies, 7-Safety Reporting, 8-Central/Local Testing, 9-Third Parties, 10-Data Management, 11-Statistics.\n\nAlways cite artifact numbers and ISO 14155 sections. Be direct and concise. Flag CRITICAL gaps clearly. Use [PLACEHOLDER] for document drafting.`,
          messages: chatHistory.current
        })
      });
      const data = await res.json();
      const reply = data.content?.map((b: any) => b.text || "").join("") || "Could not get a response.";
      setChatMessages(prev => [...prev, {role:"ai", text: reply}]);
      chatHistory.current.push({role:"assistant", content: reply});
    } catch {
      setChatMessages(prev => [...prev, {role:"ai", text:"Connection error. Please check your network and try again."}]);
    }
    setChatLoading(false);
  };

  useEffect(() => { messagesEnd.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages]);

  const navItem = (id: string, label: string) => (
    <button onClick={() => setPanel(id)} className={`w-full text-left px-3 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${panel === id ? "bg-white text-emerald-700 font-medium" : "text-gray-500 hover:text-gray-800 hover:bg-white/50"}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 h-13 border-b border-gray-200 bg-white shrink-0" style={{height:"52px"}}>
        <span className="text-base font-semibold">TMF<span className="text-emerald-600">360</span></span>
        <span className="text-xs text-gray-400">Trial Master File Platform · DIA v3.3.1 · ISO 14155 · Free for clinical research</span>
        <div className="ml-auto flex items-center gap-3">
          <select value={activeStudy.id} onChange={e => { const s = studies.find(s => s.id === e.target.value); if (s) setActiveStudy(s); }} className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50">
            {studies.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pct >= 80 ? "bg-emerald-100 text-emerald-800" : pct >= 60 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{pct}% complete</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 border-r border-gray-200 bg-gray-50 flex flex-col p-2 gap-0.5 shrink-0 overflow-y-auto">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">Overview</p>
          {navItem("dashboard", "📊 Dashboard")}
          {navItem("studies", "🧪 Studies")}
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">TMF</p>
          {navItem("documents", "📁 Documents")}
          {navItem("artifacts", "🗂 Artifact browser")}
          {navItem("gap", "✅ Gap analysis")}
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">Intelligence</p>
          {navItem("readiness", "🛡 Inspection readiness")}
          {navItem("chat", "💬 AI specialist")}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-5">

          {/* DASHBOARD */}
          {panel === "dashboard" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="text-sm font-semibold">Dashboard</h1>
                <button onClick={() => setShowStudyModal(true)} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">+ New study</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[{val:`${pct}%`,label:"TMF completeness",color:scoreColor(pct)},{val:missing,label:"Missing / not approved",color:"text-red-600"},{val:expiring,label:"Expiring (90 days)",color:"text-amber-600"},{val:pending,label:"Pending review",color:"text-blue-600"}].map((m,i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className={`text-2xl font-semibold ${m.color}`}>{m.val}</div>
                    <div className="text-xs text-gray-500 mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-xs font-semibold mb-3">TMF completeness by zone</h2>
                  <div className="flex flex-col gap-2">
                    {ZONES.map(({z, zn}) => { const p = zoneCompleteness(z, activeStudy.id); return (
                      <div key={z} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-4">{z}</span>
                        <span className="text-xs text-gray-600 flex-1 truncate">{zn}</span>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${p}%`, background: ZONE_COLORS[z]}}/>
                        </div>
                        <span className="text-[10px] font-medium w-8 text-right" style={{color: ZONE_COLORS[z]}}>{p}%</span>
                      </div>
                    );})}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-xs font-semibold mb-3">Inspection readiness</h2>
                  <div className="flex flex-col items-center py-2 mb-3">
                    <span className={`text-4xl font-semibold ${scoreColor(ri)}`}>{ri}</span>
                    <span className="text-xs text-gray-500 mt-1">Readiness score</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {gaps.crit.slice(0,2).map((g,i) => <div key={i} className="text-xs bg-red-50 text-red-700 rounded px-2 py-1">⚠ CRITICAL — {g.an}</div>)}
                    {gaps.major.slice(0,2).map((g,i) => <div key={i} className="text-xs bg-amber-50 text-amber-700 rounded px-2 py-1">▲ MAJOR — {g.an}</div>)}
                    {gaps.crit.length === 0 && gaps.major.length === 0 && <div className="text-xs text-emerald-600 px-2 py-1">✓ No critical or major findings</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDIES */}
          {panel === "studies" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="text-sm font-semibold">Studies</h1>
                <button onClick={() => setShowStudyModal(true)} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">+ New study</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {studies.map(s => (
                  <div key={s.id} onClick={() => { setActiveStudy(s); setPanel("dashboard"); }} className={`border rounded-lg p-3 cursor-pointer transition-colors ${activeStudy.id === s.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-300"}`}>
                    <div className="text-sm font-semibold">{s.id}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.protocol || "—"}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Phase: {s.phase} · {s.sponsor || "—"}</div>
                    <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full ${s.status === "Active" ? "bg-emerald-100 text-emerald-700" : s.status === "Startup" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {panel === "documents" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h1 className="text-sm font-semibold">Document tracker — {activeStudy.id}</h1>
                <button onClick={() => setShowDocModal(true)} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">+ Add document</button>
              </div>
              <div className="flex gap-2">
                {["all","Approved","Under Review","Draft","Archived"].map(f => (
                  <button key={f} onClick={() => setDocFilter(f)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${docFilter === f ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-200 text-gray-500 hover:border-emerald-400"}`}>{f === "all" ? "All" : f}</button>
                ))}
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">{["Artifact","Zone","Version","Effective","Expiry","Status","Owner"].map(h => <th key={h} className="text-left px-3 py-2 text-[11px] font-medium text-gray-500">{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredDocs.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-6 text-gray-400">No documents — add your first document.</td></tr>
                    ) : filteredDocs.map((d, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2"><div className="font-mono text-[10px] text-gray-400">{d.artNum}</div><div>{d.an}</div></td>
                        <td className="px-3 py-2 text-gray-500">Zone {d.zone}</td>
                        <td className="px-3 py-2">{d.version || "—"}</td>
                        <td className="px-3 py-2">{d.effective || "—"}</td>
                        <td className={`px-3 py-2 ${d.expiry && new Date(d.expiry) < new Date(Date.now() + 90*86400000) ? "text-red-600 font-medium" : ""}`}>{d.expiry || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${d.status === "Approved" ? "bg-emerald-100 text-emerald-700" : d.status === "Under Review" ? "bg-blue-100 text-blue-700" : d.status === "Draft" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{d.status}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{d.owner || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ARTIFACT BROWSER */}
          {panel === "artifacts" && (
            <div className="flex flex-col gap-3">
              <h1 className="text-sm font-semibold">Artifact browser — DIA TMF Reference Model v3.3.1</h1>
              <div className="flex gap-2">
                <input value={artSearch} onChange={e => setArtSearch(e.target.value)} placeholder="Search artifacts..." className="flex-1 text-xs border border-gray-200 rounded px-3 py-1.5 bg-white"/>
                <select value={artZone} onChange={e => setArtZone(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                  <option value="">All zones</option>
                  {ZONES.map(({z, zn}) => <option key={z} value={z}>Zone {z} — {zn}</option>)}
                </select>
                <select value={artCl} onChange={e => setArtCl(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                  <option value="">Core + Recommended</option>
                  <option value="Core">Core only</option>
                  <option value="Recommended">Recommended only</option>
                </select>
              </div>
              <p className="text-xs text-gray-400">{filteredArts.length} artifact{filteredArts.length !== 1 ? "s" : ""}</p>
              <div className="flex flex-col gap-2">
                {filteredArts.map(a => (
                  <div key={a.a} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedArt(expandedArt === a.a ? null : a.a)}>
                      <span className="font-mono text-[10px] text-gray-400 shrink-0">{a.a}</span>
                      <span className="text-xs font-medium flex-1">{a.an}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.cl === "Core" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{a.cl}</span>
                    </div>
                    {expandedArt === a.a && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                        {a.def}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">Zone {a.z} · {a.zn}</span>
                          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{a.sn}</span>
                          {a.iso && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-mono">ISO 14155: {a.iso}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GAP ANALYSIS */}
          {panel === "gap" && (
            <div className="flex flex-col gap-3">
              <h1 className="text-sm font-semibold">Gap analysis — {activeStudy.id}</h1>
              <p className="text-xs text-gray-500">Comparing filed documents against Core artifacts in DIA TMF Reference Model v3.3.1</p>
              <div className="flex gap-2 items-center">
                <select value={gapZone} onChange={e => setGapZone(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
                  <option value="">All zones</option>
                  {ZONES.map(({z, zn}) => <option key={z} value={z}>Zone {z} — {zn}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{val:gaps.crit.length,label:"Critical",color:"text-red-600",bg:"bg-red-50"},{val:gaps.major.length,label:"Major",color:"text-amber-600",bg:"bg-amber-50"},{val:gaps.minor.length,label:"Minor",color:"text-blue-600",bg:"bg-blue-50"}].map((s,i) => (
                  <div key={i} className={`${s.bg} border border-gray-200 rounded-lg p-3 text-center`}>
                    <div className={`text-2xl font-semibold ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              {[{items: gaps.crit.filter(g => !gapZone || g.z === gapZone), label:"CRITICAL", bg:"bg-red-50", text:"text-red-700", border:"border-red-200"},
                {items: gaps.major.filter(g => !gapZone || g.z === gapZone), label:"MAJOR", bg:"bg-amber-50", text:"text-amber-700", border:"border-amber-200"},
                {items: gaps.minor.filter(g => !gapZone || g.z === gapZone), label:"MINOR", bg:"bg-blue-50", text:"text-blue-700", border:"border-blue-200"}].map(({items, label, bg, text, border}) => items.length > 0 && (
                <div key={label} className={`border ${border} rounded-lg overflow-hidden`}>
                  <div className={`${bg} ${text} px-3 py-2 text-xs font-semibold`}>{label} — {items.length} gap{items.length !== 1 ? "s" : ""}</div>
                  {items.map((g, i) => (
                    <div key={i} className="border-t border-gray-100 px-3 py-2 flex justify-between items-center bg-white text-xs">
                      <div><div className="font-medium">{g.an}</div><div className="text-gray-400 text-[10px] mt-0.5">Zone {g.z} — {g.zn}</div></div>
                      <div className="text-right shrink-0"><div className="font-mono text-[10px] text-gray-400">{g.a}</div>{g.iso && <div className="font-mono text-[10px] text-blue-500">{g.iso}</div>}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* INSPECTION READINESS */}
          {panel === "readiness" && (
            <div className="flex flex-col gap-4">
              <h1 className="text-sm font-semibold">Inspection readiness — {activeStudy.id}</h1>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center col-span-1">
                  <span className={`text-5xl font-semibold ${scoreColor(ri)}`}>{ri}</span>
                  <span className="text-xs text-gray-500 mt-2">Readiness score</span>
                  <div className="w-full h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${ri >= 80 ? "bg-emerald-500" : ri >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{width:`${ri}%`}}/>
                  </div>
                </div>
                <div className="col-span-3 bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-xs font-semibold mb-3">Top findings</h2>
                  <div className="flex flex-col gap-2">
                    {gaps.crit.slice(0,4).map((g,i) => <div key={i} className="text-xs bg-red-50 text-red-700 rounded px-2 py-1.5">⚠ CRITICAL — {g.an} <span className="font-mono text-[10px]">({g.a})</span></div>)}
                    {gaps.major.slice(0,3).map((g,i) => <div key={i} className="text-xs bg-amber-50 text-amber-700 rounded px-2 py-1.5">▲ MAJOR — {g.an} <span className="font-mono text-[10px]">({g.a})</span></div>)}
                    {gaps.crit.length === 0 && gaps.major.length === 0 && <div className="text-xs text-emerald-600">✓ No critical or major findings</div>}
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-xs font-semibold mb-3">Zone readiness breakdown</h2>
                <div className="flex flex-col gap-2">
                  {ZONES.map(({z, zn}) => { const p = zoneCompleteness(z, activeStudy.id); return (
                    <div key={z} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 w-4">{z}</span>
                      <span className="text-xs text-gray-600 w-44 truncate">{zn}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${p}%`, background: ZONE_COLORS[z]}}/>
                      </div>
                      <span className={`text-xs font-medium w-10 text-right ${scoreColor(p)}`}>{p}%</span>
                    </div>
                  );})}
                </div>
              </div>
            </div>
          )}

          {/* AI CHAT */}
          {panel === "chat" && (
            <div className="flex flex-col h-full gap-3">
              <h1 className="text-sm font-semibold">TMF AI specialist</h1>
              <div className="flex gap-2 flex-wrap">
                {["Where does a CTA go in the TMF?","Core docs before first patient?","Draft a Note to File for late IRB filing","What is Zone 5?","Explain ALCOA+ for TMF"].map(q => (
                  <button key={q} onClick={() => { setChatInput(q); }} className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-500 hover:border-emerald-400 hover:text-emerald-700 bg-white">{q}</button>
                ))}
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden" style={{minHeight:"360px"}}>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0 ${m.role === "ai" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white"}`}>{m.role === "ai" ? "AI" : "You"}</div>
                      <div className={`max-w-[85%] text-xs rounded-lg px-3 py-2 leading-relaxed ${m.role === "ai" ? "bg-gray-50 text-gray-800" : "bg-emerald-600 text-white"}`} style={{whiteSpace:"pre-wrap"}}>{m.text}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-medium">AI</div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2 flex gap-1 items-center">
                        {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEnd}/>
                </div>
                <div className="border-t border-gray-100 p-3 flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Ask about your TMF, ISO 14155, gaps, document drafting..." className="flex-1 text-xs border border-gray-200 rounded px-3 py-2"/>
                  <button onClick={sendChat} disabled={chatLoading} className="text-xs px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">Send</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Study Modal */}
      {showStudyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 border border-gray-200 shadow-xl">
            <h2 className="text-sm font-semibold mb-4">New study</h2>
            {[{label:"Study ID",val:fId,set:setFId,ph:"e.g. OIL-BR-US-10"},{label:"Protocol title",val:fProtocol,set:setFProtocol,ph:"e.g. CLE Imaging of Breast Tissue"},{label:"Sponsor",val:fSponsor,set:setFSponsor,ph:"e.g. Optiscan Imaging Ltd."}].map(f => (
              <div key={f.label} className="mb-3"><label className="text-xs text-gray-500 block mb-1">{f.label}</label><input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="w-full text-xs border border-gray-200 rounded px-3 py-2"/></div>
            ))}
            <div className="mb-3"><label className="text-xs text-gray-500 block mb-1">Phase</label><select value={fPhase} onChange={e => setFPhase(e.target.value)} className="w-full text-xs border border-gray-200 rounded px-3 py-2">{["Phase I","Phase II","Phase III","Observational","Feasibility"].map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="mb-4"><label className="text-xs text-gray-500 block mb-1">Status</label><select value={fStatus} onChange={e => setFStatus(e.target.value)} className="w-full text-xs border border-gray-200 rounded px-3 py-2">{["Startup","Active","Closed","On Hold"].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowStudyModal(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={createStudy} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">Create study</button>
            </div>
          </div>
        </div>
      )}

      {/* Doc Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 border border-gray-200 shadow-xl">
            <h2 className="text-sm font-semibold mb-4">Add document</h2>
            <div className="mb-3"><label className="text-xs text-gray-500 block mb-1">Artifact</label><select value={fArtifact} onChange={e => setFArtifact(e.target.value)} className="w-full text-xs border border-gray-200 rounded px-3 py-2">{TMF.map(a => <option key={a.a} value={`${a.a}|${a.an}|${a.z}`}>{a.a} — {a.an}</option>)}</select></div>
            <div className="mb-3"><label className="text-xs text-gray-500 block mb-1">Version</label><input value={fVersion} onChange={e => setFVersion(e.target.value)} placeholder="e.g. v1.0" className="w-full text-xs border border-gray-200 rounded px-3 py-2"/></div>
            <div className="mb-3"><label className="text-xs text-gray-500 block mb-1">Status</label><select value={fDocStatus} onChange={e => setFDocStatus(e.target.value)} className="w-full text-xs border border-gray-200 rounded px-3 py-2">{["Draft","Under Review","Approved","Archived"].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="mb-3"><label className="text-xs text-gray-500 block mb-1">Owner</label><input value={fOwner} onChange={e => setFOwner(e.target.value)} placeholder="e.g. Jane Smith, CRA" className="w-full text-xs border border-gray-200 rounded px-3 py-2"/></div>
            <div className="mb-3"><label className="text-xs text-gray-500 block mb-1">Effective date</label><input type="date" value={fEff} onChange={e => setFEff(e.target.value)} className="w-full text-xs border border-gray-200 rounded px-3 py-2"/></div>
            <div className="mb-4"><label className="text-xs text-gray-500 block mb-1">Expiry date (if applicable)</label><input type="date" value={fExp} onChange={e => setFExp(e.target.value)} className="w-full text-xs border border-gray-200 rounded px-3 py-2"/></div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDocModal(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={addDocument} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">Add document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}