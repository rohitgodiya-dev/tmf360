const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Find the start of the broken TmfConfigPanel
const startMarker = '\nfunction TmfConfigPanel(';
const startIdx = content.indexOf(startMarker);
if(startIdx === -1){ console.log('TmfConfigPanel start not found!'); process.exit(1); }

// Find the end - it's followed by blank lines at the end of the file  
// The function ends with }\n\n\n\n\n
const endMarker = '}\n\n\n\n\n\n';
const endIdx = content.indexOf(endMarker, startIdx);
if(endIdx === -1){ console.log('TmfConfigPanel end not found!'); process.exit(1); }

console.log('Found TmfConfigPanel at:', startIdx, 'to:', endIdx + endMarker.length);

const before = content.substring(0, startIdx);
const after = content.substring(endIdx + endMarker.length);

const newContent = before + `
function TmfConfigPanel({user,P,supabase,activeStudy,orgId,currentUserRole,logAudit}:{user:any,P:any,supabase:any,activeStudy:any,orgId:string,currentUserRole:string,logAudit:any}){
  const[tab,setTab]=useState<"zones"|"artifacts"|"subartifacts">("zones");
  const[config,setConfig]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[showAddZone,setShowAddZone]=useState(false);
  const[showAddArtifact,setShowAddArtifact]=useState(false);
  const[showAddSub,setShowAddSub]=useState(false);
  const[showDisableModal,setShowDisableModal]=useState(false);
  const[showEditModal,setShowEditModal]=useState(false);
  const[disableTarget,setDisableTarget]=useState<any>(null);
  const[editTarget,setEditTarget]=useState<any>(null);
  const[editName,setEditName]=useState("");
  const[disableReason,setDisableReason]=useState("");
  const[msg,setMsg]=useState("");
  const[newZoneNum,setNewZoneNum]=useState("");
  const[newZoneName,setNewZoneName]=useState("");
  const[newArtNum,setNewArtNum]=useState("");
  const[newArtName,setNewArtName]=useState("");
  const[newArtZone,setNewArtZone]=useState("");
  const[newArtSection,setNewArtSection]=useState("");
  const[newArtCl,setNewArtCl]=useState("Core");
  const[newArtIso,setNewArtIso]=useState("");
  const[newSubNum,setNewSubNum]=useState("");
  const[newSubName,setNewSubName]=useState("");
  const[newSubParent,setNewSubParent]=useState("");
  const[newSubZone,setNewSubZone]=useState("");

  const isAdmin=currentUserRole==="System Administrator"||currentUserRole==="TMF Lead";

  useEffect(()=>{if(activeStudy&&orgId)loadConfig();},[activeStudy,orgId]);

  async function loadConfig(){
    setLoading(true);
    const{data}=await supabase.from("tmf_config").select("*").eq("org_id",orgId).eq("study_id",activeStudy.study_id).order("zone_num",{ascending:true});
    if(data)setConfig(data);
    setLoading(false);
  }

  async function seedIfEmpty(){
    const{data}=await supabase.from("tmf_config").select("id").eq("org_id",orgId).eq("study_id",activeStudy.study_id).limit(1);
    if(data&&data.length>0)return;

    const TMF_SEED=[
      {zone_num:"1",zone_name:"Trial Management",type:"zone"},
      {zone_num:"2",zone_name:"Central Trial Documents",type:"zone"},
      {zone_num:"3",zone_name:"Regulatory",type:"zone"},
      {zone_num:"4",zone_name:"IRB or IEC and other Approvals",type:"zone"},
      {zone_num:"5",zone_name:"Site Management",type:"zone"},
      {zone_num:"6",zone_name:"IP and Trial Supplies",type:"zone"},
      {zone_num:"7",zone_name:"Safety Reporting",type:"zone"},
      {zone_num:"8",zone_name:"Central and Local Testing",type:"zone"},
      {zone_num:"9",zone_name:"Third parties",type:"zone"},
      {zone_num:"10",zone_name:"Data Management",type:"zone"},
      {zone_num:"11",zone_name:"Statistics",type:"zone"},
      {zone_num:"1",artifact_num:"01.01.01",artifact_name:"Trial Master File Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.02",artifact_name:"Trial Management Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.03",artifact_name:"Quality Plan",section_num:"1.01",classification:"Recommended",iso_ref:"7.11 9.1 a",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.04",artifact_name:"List of SOPs Current During Trial",section_num:"1.01",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.05",artifact_name:"Operational Procedure Manual",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.06",artifact_name:"Recruitment Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.07",artifact_name:"Communication Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.08",artifact_name:"Monitoring Plan",section_num:"1.01",classification:"Core",iso_ref:"6.7 7.3 9.2.4.1",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.09",artifact_name:"Medical Monitoring Plan",section_num:"1.01",classification:"Core",iso_ref:"6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.10",artifact_name:"Publication Policy",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.11",artifact_name:"Debarment Statement",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.12",artifact_name:"Trial Status Report",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.13",artifact_name:"Investigator Newsletter",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.14",artifact_name:"Audit Certificate",section_num:"1.01",classification:"Core",iso_ref:"E3.4 7.11 e 9.1 D13 h",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.15",artifact_name:"Filenote Master List",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.16",artifact_name:"Risk Management Plan",section_num:"1.01",classification:"Recommended",iso_ref:"6.2 5.6.2 c 5.6.2 d 7.8.1 9.2.3 h 9.2.6 c 7.5.1 7.10 Annex H",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.17",artifact_name:"Vendor Management Plan",section_num:"1.01",classification:"Recommended",iso_ref:"9.3",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.18",artifact_name:"Roles and Responsibility Matrix",section_num:"1.01",classification:"Core",iso_ref:"6.1 9.2.1a",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.19",artifact_name:"Transfer of Regulatory Obligations",section_num:"1.01",classification:"Core",iso_ref:"9.3",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.20",artifact_name:"Operational Oversight",section_num:"1.01",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.02.01",artifact_name:"Trial Team Details",section_num:"1.02",classification:"Core",iso_ref:"E.1.28 E.2.26 6.1 9.2.1 a 9.2.1 g D.13e",type:"artifact"},
      {zone_num:"1",artifact_num:"01.02.02",artifact_name:"Trial Team Curriculum Vitae",section_num:"1.02",classification:"Core",iso_ref:"9.2.1g 6.1",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.01",artifact_name:"Committee Process",section_num:"1.03",classification:"Core",iso_ref:"6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.02",artifact_name:"Committee Member List",section_num:"1.03",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.03",artifact_name:"Committee Output",section_num:"1.03",classification:"Core",iso_ref:"6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.04",artifact_name:"Committee Member Curriculum Vitae",section_num:"1.03",classification:"Core",iso_ref:"6.1 6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.05",artifact_name:"Committee Member Financial Disclosure Form",section_num:"1.03",classification:"Core",iso_ref:"E.1.33 E.2.30 5.6.2 d 6.11 9.2.1 e 10.2 c",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.06",artifact_name:"Committee Member Contract",section_num:"1.03",classification:"Core",iso_ref:"6.9",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.07",artifact_name:"Committee Member Confidentiality Disclosure Agreement",section_num:"1.03",classification:"Core",iso_ref:"E.1.13 E.1.33 6.9 9. 2.1.a 9.2.1 d 10.2.c",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.01",artifact_name:"Kick-off Meeting Material",section_num:"1.04",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.02",artifact_name:"Trial Team Training Material",section_num:"1.04",classification:"Core",iso_ref:"9.2.4.2 c 7.3 7.6",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.03",artifact_name:"Investigators Meeting Material",section_num:"1.04",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.04",artifact_name:"Trial Team Evidence of Training",section_num:"1.04",classification:"Core",iso_ref:"9.2.1",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.01",artifact_name:"Relevant Communications",section_num:"1.05",classification:"Core",iso_ref:"E.2.11 9.2.3 b 9.2.4.5 o 10.6 h",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.02",artifact_name:"Tracking Information",section_num:"1.05",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.03",artifact_name:"Other Meeting Material",section_num:"1.05",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.04",artifact_name:"Filenote",section_num:"1.05",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.01",artifact_name:"Investigators Brochure",section_num:"2.01",classification:"Core",iso_ref:"E.1.1 E.2.1 6.5 7.5.1 Annex B 6.3",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.02",artifact_name:"Protocol",section_num:"2.01",classification:"Core",iso_ref:"E.1.2 4 5.6.2.a 5.6.4 6.3 6.4 7.1 7.5.1 10.6 b 10.6 f Annex A 7.1 7.8.2 Annex 1",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.03",artifact_name:"Protocol Synopsis",section_num:"2.01",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.04",artifact_name:"Protocol Amendment",section_num:"2.01",classification:"Core",iso_ref:"E2.2 7.51",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.05",artifact_name:"Financial Disclosure Summary",section_num:"2.01",classification:"Recommended",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.06",artifact_name:"Insurance",section_num:"2.01",classification:"Core",iso_ref:"E.1.25 5.3 5.6.2 j 9.2.2 e",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.07",artifact_name:"Sample Case Report Form",section_num:"2.01",classification:"Core",iso_ref:"E.1.25 E.1.26 E.1.27 6.6 7.4.2 7.4.3 Annex C",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.10",artifact_name:"Report of Prior Investigations",section_num:"2.01",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.11",artifact_name:"Marketed Product Material",section_num:"2.01",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.01",artifact_name:"Subject Diary",section_num:"2.02",classification:"Core",iso_ref:"Annex C.2.4.L",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.02",artifact_name:"Subject Questionnaire",section_num:"2.02",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.03",artifact_name:"Informed Consent Form",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 E.2.3 E.2.13 5.2 5.3 5.6.2 c 5.6.2.d 5.8.1 5.8.4 7.8.1 7.5.1 8.6 9.2.2.b 9.2.4.5.f 10.5 10.7.a 10.7.c 10.7.d 10.7.e",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.04",artifact_name:"Subject Information Sheet",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.05",artifact_name:"Subject Participation Card",section_num:"2.02",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.06",artifact_name:"Advertisements for Subject Recruitment",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.07",artifact_name:"Other Information Given to Subjects",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.03.01",artifact_name:"Clinical Study Report",section_num:"2.03",classification:"Core",iso_ref:"E.3.8 8.4 9.2.6 Annex D",type:"artifact"},
      {zone_num:"2",artifact_num:"02.03.02",artifact_name:"Bioanalytical Report",section_num:"2.03",classification:"Recommended",iso_ref:"8.6 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.01",artifact_name:"Relevant Communications",section_num:"2.04",classification:"Core",iso_ref:"E 2.11 9.2.3.c 9.2.4.5.o 10.6.h",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.02",artifact_name:"Tracking Information",section_num:"2.04",classification:"Recommended",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.03",artifact_name:"Meeting Material",section_num:"2.04",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.04",artifact_name:"Filenote",section_num:"2.04",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.01",artifact_name:"Regulatory Submission",section_num:"3.01",classification:"Recommended",iso_ref:"E 2.11 8.2.2 9.2.2 g, 9.2.2.I 9.4 a,b",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.02",artifact_name:"Regulatory Authority Decision",section_num:"3.01",classification:"Core",iso_ref:"E.1.11 E.2.5 7.1 9.2.2G 9.2.2.H",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.03",artifact_name:"Notification of Regulatory Identification Number",section_num:"3.01",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.04",artifact_name:"Public Registration",section_num:"3.01",classification:"Core",iso_ref:"Annex G 6 h 5.4 9.2.2j Annex J F.2",type:"artifact"},
      {zone_num:"3",artifact_num:"03.02.01",artifact_name:"Import or Export License Application",section_num:"3.02",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.02.02",artifact_name:"Import or Export Documentation",section_num:"3.02",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.03.01",artifact_name:"Notification of Safety or Trial Information",section_num:"3.03",classification:"Core",iso_ref:"E.2.19 7.4 9.2.5.L 9.2.4.5.d 9.4 10.8 7.4.2",type:"artifact"},
      {zone_num:"3",artifact_num:"03.03.02",artifact_name:"Regulatory Progress Report",section_num:"3.03",classification:"Core",iso_ref:"9.2.3 h 9.2.6 d 9.4 c",type:"artifact"},
      {zone_num:"3",artifact_num:"03.03.03",artifact_name:"Regulatory Notification of Trial Termination",section_num:"3.03",classification:"Core",iso_ref:"E.3.7 8.3. 9.2.6.",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.01",artifact_name:"Relevant Communications",section_num:"3.04",classification:"Core",iso_ref:"E 2.11 9.2.3 b 9.2.4.5.o 9.4 10.6.",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.02",artifact_name:"Tracking Information",section_num:"3.04",classification:"Recommended",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.03",artifact_name:"Meeting Material",section_num:"3.04",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.04",artifact_name:"Filenote",section_num:"3.04",classification:"Core",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.01",artifact_name:"IRB or IEC Submission",section_num:"4.01",classification:"Core",iso_ref:"E.1.9 5.6.3 7.1 9.2.2.h 10.4.C",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.02",artifact_name:"IRB or IEC Decision",section_num:"4.01",classification:"Core",iso_ref:"E.1.9 E 1.11 E.2.4 5.6.3 5.6.4.e 5.6.4.a 7.1 7.5.1. 9.2.2 h 9.2.3 b 9.2.4.5.o 10.4 c 9.2.4.5 o",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.03",artifact_name:"IRB or IEC Composition",section_num:"4.01",classification:"Core",iso_ref:"E.1.10 5.6.3",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.04",artifact_name:"IRB or IEC Documentation of Non-Voting Status",section_num:"4.01",classification:"Core",iso_ref:"E.1.10 5.6.3",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.05",artifact_name:"IRB or IEC Compliance Documentation",section_num:"4.01",classification:"Core",type:"artifact"},
      {zone_num:"4",artifact_num:"04.02.01",artifact_name:"Other Submissions",section_num:"4.02",classification:"Recommended",type:"artifact"},
      {zone_num:"4",artifact_num:"04.02.02",artifact_name:"Other Approvals",section_num:"4.02",classification:"Core",iso_ref:"10.4 e",type:"artifact"},
      {zone_num:"4",artifact_num:"04.03.01",artifact_name:"Notification to IRB or IEC of Safety Information",section_num:"4.03",classification:"Core",iso_ref:"E.2.20 5.6.4 9.2.5c 10.4 d 10.8 c 7.4.2",type:"artifact"},
      {zone_num:"4",artifact_num:"04.03.02",artifact_name:"IRB or IEC Progress Report",section_num:"4.03",classification:"Core",iso_ref:"E.2.22 5.6.4 9.2.3 h 9.2.4.5.O 10.4 10.8",type:"artifact"},
      {zone_num:"4",artifact_num:"04.03.03",artifact_name:"IRB or IEC Notification of Trial Termination",section_num:"4.03",classification:"Core",iso_ref:"E.3.6 5.6.4 8.3 b 9.2.6 d 10.4 f",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.01",artifact_name:"Relevant Communications",section_num:"4.04",classification:"Core",iso_ref:"E.2.11 9.2.3 b 10.4 a",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.02",artifact_name:"Tracking Information",section_num:"4.04",classification:"Recommended",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.03",artifact_name:"Meeting Material",section_num:"4.04",classification:"Core",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.04",artifact_name:"Filenote",section_num:"4.04",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.01",artifact_name:"Site Contact Details",section_num:"5.01",classification:"Recommended",iso_ref:"E.1.8 A.1.4",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.02",artifact_name:"Confidentiality Agreement",section_num:"5.01",classification:"Core",iso_ref:"6.9",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.03",artifact_name:"Feasibility Documentation",section_num:"5.01",classification:"Recommended",iso_ref:"6.8 9.2.1 9.2.4",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.04",artifact_name:"Pre Trial Monitoring Report",section_num:"5.01",classification:"Core",iso_ref:"E.1.21 6.8 9.2.1 b, 9.2.1 e 9.2.4.3 9.2.4.7 10.3.a 10.6 m 10.6 n",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.05",artifact_name:"Sites Evaluated but not Selected",section_num:"5.01",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.01",artifact_name:"Acceptance of Investigator Brochure",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.02",artifact_name:"Protocol Signature Page",section_num:"5.02",classification:"Core",iso_ref:"7.5.1 10.6 a Annex A",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.03",artifact_name:"Protocol Amendment Signature Page",section_num:"5.02",classification:"Core",iso_ref:"7.5.1 10.6.a Annex A",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.04",artifact_name:"Principal Investigator Curriculum Vitae",section_num:"5.02",classification:"Core",iso_ref:"E.1.4 E.2.6 5.6.2.e 9.2.1 10.2.a 10.2.b D.13.c",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.05",artifact_name:"Sub-Investigator Curriculum Vitae",section_num:"5.02",classification:"Core",iso_ref:"E.1.5 E.2.7 6.1 10.2.a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.06",artifact_name:"Other Curriculum Vitae",section_num:"5.02",classification:"Core",iso_ref:"E.1.6 E.2.7 6.1 9.2.1 9.2.4.3 10.2.a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.07",artifact_name:"Site Staff Qualification Supporting Information",section_num:"5.02",classification:"Recommended",iso_ref:"9.2.1 g 6.8",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.08",artifact_name:"Form FDA 1572",section_num:"5.02",classification:"Core",iso_ref:"E.1.12 10.3 b",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.09",artifact_name:"Investigator Regulatory Agreement",section_num:"5.02",classification:"Core",iso_ref:"E.1.12 6.9 9.2.1.a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.10",artifact_name:"Financial Disclosure Form",section_num:"5.02",classification:"Core",iso_ref:"E.1.14 E.1.33 E.2.30 9.2.1 D 9.2.2 F 10.2 c",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.11",artifact_name:"Data Privacy Agreement",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.12",artifact_name:"Clinical Trial Agreement",section_num:"5.02",classification:"Core",iso_ref:"E.1.12 E.1.14 6.9 9.2.1a 9.2.2.F 10.3 a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.13",artifact_name:"Indemnity",section_num:"5.02",classification:"Core",iso_ref:"E 1.15 5.6.2 j 9.2.2 e",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.14",artifact_name:"Other Financial Agreement",section_num:"5.02",classification:"Core",iso_ref:"E.1.34 6.9 10.1",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.17",artifact_name:"IP Site Release Documentation",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.18",artifact_name:"Site Signature Sheet",section_num:"5.02",classification:"Core",iso_ref:"E.1.7 E.2.12 7.2 9.2.1 e 9.2.2.d 9.2.4.4 b 9.2.4.5.b",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.19",artifact_name:"Investigators Agreement (Device)",section_num:"5.02",classification:"Core",iso_ref:"E1.12 6.9 9.2.1 a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.20",artifact_name:"Coordinating Investigator Documentation",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.03.01",artifact_name:"Trial Initiation Monitoring Report",section_num:"5.03",classification:"Core",iso_ref:"E.1.22 E.1.24 7.2 9.2.4.4 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.03.02",artifact_name:"Site Training Material",section_num:"5.03",classification:"Core",iso_ref:"10.2 b",type:"artifact"},
      {zone_num:"5",artifact_num:"05.03.03",artifact_name:"Site Evidence of Training",section_num:"5.03",classification:"Core",iso_ref:"E.1.29 9.2.1 h",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.01",artifact_name:"Subject Log",section_num:"5.04",classification:"Core",iso_ref:"E.2.23 7.5.2 7.10",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.02",artifact_name:"Source Data Verification",section_num:"5.04",classification:"Recommended",iso_ref:"E.1.23 E.2.15 7.5.3 9.2.4.5.g 10.6 c",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.03",artifact_name:"Monitoring Visit Report",section_num:"5.04",classification:"Core",iso_ref:"E.2.10 9.2.3 c 9.2.3 e 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.04",artifact_name:"Visit Log",section_num:"5.04",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.05",artifact_name:"Additional Monitoring Activity",section_num:"5.04",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.06",artifact_name:"Protocol Deviations",section_num:"5.04",classification:"Core",iso_ref:"10.4 e 10.6 g 10.6 o",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.07",artifact_name:"Financial Documentation",section_num:"5.04",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.08",artifact_name:"Final Trial Close Out Monitoring Report",section_num:"5.04",classification:"Core",iso_ref:"E.3.5 9.2.4.6 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.09",artifact_name:"Notification to Investigators of Safety Information",section_num:"5.04",classification:"Core",iso_ref:"E.2.21 9.2.5",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.10",artifact_name:"Subject Identification Log",section_num:"5.04",classification:"Core",iso_ref:"E.2.24 E.3.3 7.5.2",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.11",artifact_name:"Source Data",section_num:"5.04",classification:"Core",iso_ref:"E 2.13 E.2.14 7.5.3 7.8.2 10.6 c 10.6 q 10.7 f 7.8.1",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.12",artifact_name:"Monitoring Visit Follow-up Documentation",section_num:"5.04",classification:"Core",iso_ref:"E.1.24 E 2.10 9.2.3.c 9.2.3.e 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.13",artifact_name:"Subject Eligibility Verification Forms and Worksheets",section_num:"5.04",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.01",artifact_name:"Relevant Communications",section_num:"5.05",classification:"Core",iso_ref:"E.2.11 9.2.3 b 9.2.3.c 9.2.4.5.D 10.6 e 10.6 h",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.02",artifact_name:"Tracking Information",section_num:"5.05",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.03",artifact_name:"Meeting Material",section_num:"5.05",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.04",artifact_name:"Filenote",section_num:"5.05",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.01",artifact_name:"IP Supply Plan",section_num:"6.01",classification:"Recommended",iso_ref:"7.4.3 7.9",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.02",artifact_name:"IP Instructions for Handling",section_num:"6.01",classification:"Core",iso_ref:"10.2 b Annex B.2.F Annex I.7.C.3",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.03",artifact_name:"IP Sample Label",section_num:"6.01",classification:"Core",iso_ref:"E.1.3 6.10. Annex I.7 Annex B (B.2.g)",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.04",artifact_name:"IP Shipment Documentation",section_num:"6.01",classification:"Core",iso_ref:"E. 1.16 E. 2. 8 7.9 9.2.2 C 9.2.3 a 9.2.4.5 n 10.6 K",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.05",artifact_name:"IP Accountability Documentation",section_num:"6.01",classification:"Core",iso_ref:"E.1.16 E.2.8 E2.25 E.3.1 7.9 8.3 a 9.2.2 C 9.2.3 a 9.2.4.5.n 10.6 k 10.6 q Annex I.7.C.1",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.06",artifact_name:"IP Transfer Documentation",section_num:"6.01",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.07",artifact_name:"IP Re-labeling Documentation",section_num:"6.01",classification:"Core",iso_ref:"6.10 Annex I.7 C 2",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.08",artifact_name:"IP Recall Documentation",section_num:"6.01",classification:"Core",iso_ref:"9.2.2.D",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.09",artifact_name:"IP Quality Complaint Form",section_num:"6.01",classification:"Core",iso_ref:"7.4.3 9.1.a",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.10",artifact_name:"IP Return Documentation",section_num:"6.01",classification:"Core",iso_ref:"E.1.16 E.3.2 7.9 8.3 a 9.2.2.C 9.2.3 a 9.2.45.n 10.6 k 7.4.3",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.11",artifact_name:"IP Certificate of Destruction",section_num:"6.01",classification:"Core",iso_ref:"A.11, D.7 c, E.1.17 , 10.6.k, 10.6.l",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.12",artifact_name:"IP Retest and Expiry Documentation",section_num:"6.01",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.01",artifact_name:"QP (Qualified Person) Certification",section_num:"6.02",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.02",artifact_name:"IP Regulatory Release Documentation",section_num:"6.02",classification:"Core",iso_ref:"B.2.D",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.03",artifact_name:"IP Verification Statements",section_num:"6.02",classification:"Core",iso_ref:"B.2.D",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.04",artifact_name:"Certificate of Analysis",section_num:"6.02",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.03.01",artifact_name:"IP Treatment Allocation Documentation",section_num:"6.03",classification:"Core",iso_ref:"10.6 k A.6.1.B",type:"artifact"},
      {zone_num:"6",artifact_num:"06.03.02",artifact_name:"IP Unblinding Plan",section_num:"6.03",classification:"Core",iso_ref:"E.1.20 7.8.1 A 16 b 10.7.e",type:"artifact"},
      {zone_num:"6",artifact_num:"06.03.03",artifact_name:"IP Treatment Decoding Documentation",section_num:"6.03",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.04.01",artifact_name:"IP Storage Condition Documentation",section_num:"6.04",classification:"Core",iso_ref:"D.6.1.5",type:"artifact"},
      {zone_num:"6",artifact_num:"06.04.02",artifact_name:"IP Storage Condition Excursion Documentation",section_num:"6.04",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.04.03",artifact_name:"Maintenance Logs",section_num:"6.04",classification:"Core",iso_ref:"E.1.31 E.2.28 9.2.4.5.p, 10.6 i",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.01",artifact_name:"Non-IP Supply Plan",section_num:"6.05",classification:"Recommended",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.02",artifact_name:"Non-IP Shipment Documentation",section_num:"6.05",classification:"Recommended",iso_ref:"E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.03",artifact_name:"Non-IP Return Documentation",section_num:"6.05",classification:"Recommended",iso_ref:"E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.04",artifact_name:"Non-IP Storage Documentation",section_num:"6.05",classification:"Recommended",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.01",artifact_name:"IRT User Requirement Specification",section_num:"6.06",classification:"Core",iso_ref:"A.8.B 7.8.3",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.02",artifact_name:"IRT Validation Certification",section_num:"6.06",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.03",artifact_name:"IRT User Acceptance Testing (UAT) Certification",section_num:"6.06",classification:"Core",iso_ref:"B.3.E",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.04",artifact_name:"IRT User Manual",section_num:"6.06",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.05",artifact_name:"IRT User Account Management",section_num:"6.06",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.01",artifact_name:"Relevant Communications",section_num:"6.07",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6 h",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.02",artifact_name:"Tracking Information",section_num:"6.07",classification:"Recommended",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.03",artifact_name:"Meeting Material",section_num:"6.07",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.04",artifact_name:"Filenote",section_num:"6.07",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.01.01",artifact_name:"Safety Management Plan",section_num:"7.01",classification:"Core",iso_ref:"10.8 a 7.4.1",type:"artifact"},
      {zone_num:"7",artifact_num:"07.01.02",artifact_name:"Pharmacovigilance Database Line Listing",section_num:"7.01",classification:"Core",iso_ref:"7.4.2",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.01",artifact_name:"Expedited Safety Report",section_num:"7.02",classification:"Core",iso_ref:"10.8 b 7.4",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.02",artifact_name:"SAE Report",section_num:"7.02",classification:"Core",iso_ref:"E.2.17 7.4 9.2.4.5.k 9.2.4.5.L 9.2.5 10.8 D 13 g",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.03",artifact_name:"Pregnancy Report",section_num:"7.02",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.04",artifact_name:"Special Events of Interest",section_num:"7.02",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.01",artifact_name:"Relevant Communications",section_num:"7.03",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 O 10.6 h",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.02",artifact_name:"Tracking Information",section_num:"7.03",classification:"Recommended",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.03",artifact_name:"Meeting Material",section_num:"7.03",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.04",artifact_name:"Filenote",section_num:"7.03",classification:"Core",iso_ref:"10.8 e",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.01",artifact_name:"Certification or Accreditation",section_num:"8.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.02",artifact_name:"Laboratory Validation Documentation",section_num:"8.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.03",artifact_name:"Laboratory Results Documentation",section_num:"8.01",classification:"Core",iso_ref:"E.2.29",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.04",artifact_name:"Normal Ranges",section_num:"8.01",classification:"Core",iso_ref:"E.1.30 E.2.27 9.2.4.5.q",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.05",artifact_name:"Manual",section_num:"8.01",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.06",artifact_name:"Supply Import Documentation",section_num:"8.01",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.07",artifact_name:"Head of Facility Curriculum Vitae",section_num:"8.01",classification:"Recommended",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.08",artifact_name:"Standardization Methods",section_num:"8.01",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.01",artifact_name:"Specimen Label",section_num:"8.02",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.02",artifact_name:"Shipment Records",section_num:"8.02",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.03",artifact_name:"Sample Storage Condition Log",section_num:"8.02",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.04",artifact_name:"Sample Import or Export Documentation",section_num:"8.02",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.05",artifact_name:"Record of Retained Samples",section_num:"8.02",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.01",artifact_name:"Relevant Communications",section_num:"8.03",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6 h",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.02",artifact_name:"Tracking Information",section_num:"8.03",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.03",artifact_name:"Meeting Material",section_num:"8.03",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.04",artifact_name:"Filenote",section_num:"8.03",classification:"Core",type:"artifact"},
      {zone_num:"9",artifact_num:"09.01.01",artifact_name:"Qualification and Compliance",section_num:"9.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"9",artifact_num:"09.01.02",artifact_name:"Third Party Curriculum Vitae",section_num:"9.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"9",artifact_num:"09.01.03",artifact_name:"Ongoing Third Party Oversight",section_num:"9.01",classification:"Recommended",iso_ref:"J.2.f.15",type:"artifact"},
      {zone_num:"9",artifact_num:"09.02.01",artifact_name:"Confidentiality Agreement",section_num:"9.02",classification:"Core",iso_ref:"E.1.13 6.9 9.2.1.a",type:"artifact"},
      {zone_num:"9",artifact_num:"09.02.02",artifact_name:"Vendor Selection",section_num:"9.02",classification:"Recommended",type:"artifact"},
      {zone_num:"9",artifact_num:"09.02.03",artifact_name:"Contractual Agreement",section_num:"9.02",classification:"Core",iso_ref:"E.1.13 6.9 9.2.1.a",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.01",artifact_name:"Relevant Communications",section_num:"9.03",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6.h",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.02",artifact_name:"Tracking Information",section_num:"9.03",classification:"Recommended",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.03",artifact_name:"Meeting Material",section_num:"9.03",classification:"Core",iso_ref:"9.2.4.2.c",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.04",artifact_name:"Filenote",section_num:"9.03",classification:"Core",type:"artifact"},
      {zone_num:"10",artifact_num:"10.01.01",artifact_name:"Data Management Plan",section_num:"10.01",classification:"Recommended",iso_ref:"6.6 7.8.3.a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.01",artifact_name:"CRF Completion Requirements",section_num:"10.02",classification:"Core",iso_ref:"7.8.2",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.02",artifact_name:"Annotated CRF",section_num:"10.02",classification:"Recommended",iso_ref:"7.8.1 7.8.2 10.6 j",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.04",artifact_name:"Documentation of Corrections to Entered Data",section_num:"10.02",classification:"Core",iso_ref:"E.2.18 7.8.2 a 9.2.4.5 j 10.6 j",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.05",artifact_name:"Final Subject Data",section_num:"10.02",classification:"Core",iso_ref:"E.2.16 7.3 7.8.1 7.8.2 9.2.4.5.j) 10.6 j",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.01",artifact_name:"Database Requirements",section_num:"10.03",classification:"Core",iso_ref:"7.8.3",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.02",artifact_name:"Edit Check Plan",section_num:"10.03",classification:"Core",iso_ref:"7.8.3d",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.03",artifact_name:"Edit Check Programming",section_num:"10.03",classification:"Core",iso_ref:"7.8.3 a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.04",artifact_name:"Edit Check Testing",section_num:"10.03",classification:"Core",iso_ref:"7.8.3 f",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.05",artifact_name:"Approval for Database Activation",section_num:"10.03",classification:"Core",iso_ref:"A.8 B 7.8.3",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.06",artifact_name:"External Data Transfer Specifications",section_num:"10.03",classification:"Core",iso_ref:"A.8 B 3.13",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.07",artifact_name:"Data Entry Guidelines (Paper)",section_num:"10.03",classification:"Core",iso_ref:"7.8.2",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.08",artifact_name:"SAE Reconciliation",section_num:"10.03",classification:"Core",iso_ref:"9.2.5 7.8.3",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.09",artifact_name:"Dictionary Coding",section_num:"10.03",classification:"Core",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.10",artifact_name:"Data Review Documentation",section_num:"10.03",classification:"Core",iso_ref:"7.8.3.d",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.11",artifact_name:"Database Lock and Unlock Approval",section_num:"10.03",classification:"Core",iso_ref:"7.8.3.a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.12",artifact_name:"Database Change Control",section_num:"10.03",classification:"Core",iso_ref:"7.8.3.a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.04.01",artifact_name:"System Account Management",section_num:"10.04",classification:"Core",iso_ref:"7.8.3. h",type:"artifact"},
      {zone_num:"10",artifact_num:"10.04.02",artifact_name:"Technical Design Document",section_num:"10.04",classification:"Core",iso_ref:"7.8.3.b",type:"artifact"},
      {zone_num:"10",artifact_num:"10.04.03",artifact_name:"Validation Documentation",section_num:"10.04",classification:"Core",iso_ref:"7.8.3.c",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.01",artifact_name:"Relevant Communications",section_num:"10.05",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6.h",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.02",artifact_name:"Tracking Information",section_num:"10.05",classification:"Recommended",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.03",artifact_name:"Meeting Material",section_num:"10.05",classification:"Core",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.04",artifact_name:"Filenote",section_num:"10.05",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.01.01",artifact_name:"Statistical Analysis Plan",section_num:"11.01",classification:"Core",iso_ref:"6.6",type:"artifact"},
      {zone_num:"11",artifact_num:"11.01.02",artifact_name:"Sample Size Calculation",section_num:"11.01",classification:"Core",iso_ref:"3.25 A7e A7e6 6.2.2 E.2",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.01",artifact_name:"Randomization Plan",section_num:"11.02",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.02",artifact_name:"Randomization Procedure",section_num:"11.02",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.03",artifact_name:"Master Randomization List",section_num:"11.02",classification:"Core",iso_ref:"E.1.19 7.8.1",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.04",artifact_name:"Randomization Programming",section_num:"11.02",classification:"Core",iso_ref:"A.7.E 7.8.3",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.05",artifact_name:"Randomization Sign Off",section_num:"11.02",classification:"Core",iso_ref:"A.7.E 7.8.3.",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.06",artifact_name:"End of Trial or Interim Unblinding",section_num:"11.02",classification:"Core",iso_ref:"7.8.1 10.7.e",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.01",artifact_name:"Data Definitions for Analysis Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.02",artifact_name:"Analysis QC Documentation",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.03",artifact_name:"Interim Analysis Raw Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.04",artifact_name:"Interim Analysis Programs",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.05",artifact_name:"Interim Analysis Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.06",artifact_name:"Interim Analysis Output",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.07",artifact_name:"Final Analysis Raw Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.08",artifact_name:"Final Analysis Programs",section_num:"11.03",classification:"Core",iso_ref:"D.6.I.",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.09",artifact_name:"Final Analysis Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.10",artifact_name:"Final Analysis Output",section_num:"11.03",classification:"Core",iso_ref:"8.4",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.11",artifact_name:"Subject Evaluability Criteria and Subject Classification",section_num:"11.03",classification:"Core",iso_ref:"A.6.3",type:"artifact"},
      {zone_num:"11",artifact_num:"11.04.01",artifact_name:"Interim Statistical Report(s)",section_num:"11.04",classification:"Core",iso_ref:"E.3.8 8.3 9.2.6 b Annex D",type:"artifact"},
      {zone_num:"11",artifact_num:"11.04.02",artifact_name:"Statistical Report",section_num:"11.04",classification:"Core",iso_ref:"E.3.8 8.3 9.2.6 b Annex D",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.01",artifact_name:"Relevant Communications",section_num:"11.05",classification:"Core",iso_ref:"E2.11 9.2.3 c 9.2.4.5 o 10.6.h",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.02",artifact_name:"Tracking Information",section_num:"11.05",classification:"Recommended",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.03",artifact_name:"Meeting Material",section_num:"11.05",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.04",artifact_name:"Filenote",section_num:"11.05",classification:"Core",type:"artifact"},
    ].map(r=>({...r,org_id:orgId,study_id:activeStudy.study_id,is_enabled:true,is_locked:false,is_custom:false,created_by:user.email}));
    await supabase.from("tmf_config").insert(TMF_SEED);
    await loadConfig();
  }

  useEffect(()=>{if(activeStudy&&orgId&&!loading&&config.length===0)seedIfEmpty();},[loading]);

  async function toggleEnabled(item:any){
    if(!item.is_enabled){
      const{error}=await supabase.from("tmf_config").update({is_enabled:true,disabled_reason:null,disabled_by:null,disabled_at:null}).eq("id",item.id);
      if(!error){await logAudit("TMF config enabled",undefined,activeStudy.study_id,"is_enabled","false","true");loadConfig();}
    }else{
      setDisableTarget(item);setDisableReason("");setShowDisableModal(true);
    }
  }

  async function submitDisable(){
    if(!disableReason.trim()){setMsg("Reason is required.");return;}
    const now=new Date().toISOString();
    const{error}=await supabase.from("tmf_config").update({is_enabled:false,disabled_reason:disableReason.trim(),disabled_by:user.email,disabled_at:now}).eq("id",disableTarget.id);
    if(!error){
      await logAudit("TMF config disabled",undefined,activeStudy.study_id,"is_enabled","true","false",disableReason.trim());
      setShowDisableModal(false);setDisableTarget(null);setDisableReason("");loadConfig();
    }
  }

  async function toggleLock(item:any){
    const{error}=await supabase.from("tmf_config").update({is_locked:!item.is_locked}).eq("id",item.id);
    if(!error){await logAudit(item.is_locked?"TMF artifact unlocked":"TMF artifact locked",undefined,activeStudy.study_id,"is_locked",String(item.is_locked),String(!item.is_locked));loadConfig();}
  }

  async function saveEdit(){
    if(!editName.trim()||!editTarget)return;
    const field=editTarget.type==="zone"?"zone_name":"artifact_name";
    const{error}=await supabase.from("tmf_config").update({[field]:editName.trim()}).eq("id",editTarget.id);
    if(!error){
      await logAudit("TMF config name edited",undefined,activeStudy.study_id,field,editTarget[field]||"",editName.trim());
      setShowEditModal(false);setEditTarget(null);setEditName("");loadConfig();setMsg("Name updated.");
    }
  }

  async function addZone(){
    if(!newZoneNum.trim()||!newZoneName.trim())return;
    const{error}=await supabase.from("tmf_config").insert([{org_id:orgId,study_id:activeStudy.study_id,type:"zone",zone_num:newZoneNum.trim(),zone_name:newZoneName.trim(),is_enabled:true,is_locked:false,is_custom:true,created_by:user.email}]);
    if(!error){await logAudit("Custom zone added",undefined,activeStudy.study_id,"zone_num","",newZoneNum.trim());setShowAddZone(false);setNewZoneNum("");setNewZoneName("");loadConfig();setMsg("Zone added.");}
  }

  async function addArtifact(){
    if(!newArtNum.trim()||!newArtName.trim()||!newArtZone.trim())return;
    const{error}=await supabase.from("tmf_config").insert([{org_id:orgId,study_id:activeStudy.study_id,type:"artifact",zone_num:newArtZone.trim(),section_num:newArtSection.trim(),artifact_num:newArtNum.trim(),artifact_name:newArtName.trim(),classification:newArtCl,iso_ref:newArtIso.trim(),is_enabled:true,is_locked:false,is_custom:true,created_by:user.email}]);
    if(!error){await logAudit("Custom artifact added",undefined,activeStudy.study_id,"artifact_num","",newArtNum.trim());setShowAddArtifact(false);setNewArtNum("");setNewArtName("");setNewArtZone("");setNewArtSection("");setNewArtIso("");loadConfig();setMsg("Artifact added.");}
  }

  async function addSubArtifact(){
    if(!newSubNum.trim()||!newSubName.trim()||!newSubParent.trim())return;
    const{error}=await supabase.from("tmf_config").insert([{org_id:orgId,study_id:activeStudy.study_id,type:"sub_artifact",zone_num:newSubZone.trim(),artifact_num:newSubNum.trim(),artifact_name:newSubName.trim(),parent_artifact_num:newSubParent.trim(),classification:"Core",is_enabled:true,is_locked:false,is_custom:true,created_by:user.email}]);
    if(!error){await logAudit("Custom sub-artifact added",undefined,activeStudy.study_id,"artifact_num","",newSubNum.trim());setShowAddSub(false);setNewSubNum("");setNewSubName("");setNewSubParent("");setNewSubZone("");loadConfig();setMsg("Sub-artifact added.");}
  }

  async function resetToDefault(){
    if(!confirm("This will delete all custom config and reset to DIA standard. Continue?"))return;
    await supabase.from("tmf_config").delete().eq("org_id",orgId).eq("study_id",activeStudy.study_id);
    await logAudit("TMF config reset to DIA standard",undefined,activeStudy.study_id,"config","custom","default");
    await seedIfEmpty();
    setMsg("Reset to DIA TMF Reference Model v3.3.1.");
  }

  const zones=config.filter(c=>c.type==="zone").sort((a,b)=>parseFloat(a.zone_num)-parseFloat(b.zone_num));
  const artifacts=config.filter(c=>c.type==="artifact").sort((a,b)=>a.artifact_num?.localeCompare(b.artifact_num));
  const subartifacts=config.filter(c=>c.type==="sub_artifact").sort((a,b)=>a.artifact_num?.localeCompare(b.artifact_num));

  const clBadge=(cl:string)=>{
    const c:Record<string,any>={Core:{bg:"#FEF2F2",color:"#991B1B"},Recommended:{bg:"#FFFBEB",color:"#92400E"},Optional:{bg:"#F0FDF4",color:"#065F46"}};
    const s=c[cl]||c.Core;
    return<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:s.bg,color:s.color,fontWeight:"500"}}>{cl}</span>;
  };

  if(!activeStudy)return<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontSize:"14px",fontWeight:"500"}}>TMF Configuration - {activeStudy.study_id}</h1>
          <p style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Manage zones, artifacts, and sub-artifacts for this study. Changes are scoped to this study only.</p>
        </div>
        {isAdmin&&<button onClick={resetToDefault} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:P.bg,cursor:"pointer",color:P.textSec}}>Reset to DIA standard</button>}
      </div>

      {msg&&<div style={{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",background:P.successLight,color:P.success}}>{msg}</div>}

      <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#1E40AF"}}>
        DIA TMF Reference Model v3.3.1 - Disabled zones count as 100% complete. All changes are logged to the audit trail.
      </div>

      <div style={{display:"flex",gap:"6px",borderBottom:\`0.5px solid \${P.border}\`}}>
        {(["zones","artifacts","subartifacts"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{fontSize:"12px",padding:"8px 16px",border:"none",borderBottom:tab===t?\`2px solid \${P.primary}\`:"2px solid transparent",background:"transparent",color:tab===t?P.primary:P.textSec,cursor:"pointer",fontWeight:tab===t?"500":"400"}}>
            {t==="zones"?"Zones":t==="artifacts"?"Artifacts":"Sub-artifacts"}
            <span style={{marginLeft:"6px",fontSize:"10px",padding:"1px 6px",borderRadius:"20px",background:P.bgTert,color:P.textTert}}>
              {t==="zones"?zones.length:t==="artifacts"?artifacts.length:subartifacts.length}
            </span>
          </button>
        ))}
      </div>

      {tab==="zones"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {isAdmin&&<button onClick={()=>setShowAddZone(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>+ Add zone</button>}
          {loading?<div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>:zones.map(z=>(
            <div key={z.id} style={{background:P.bg,border:\`0.5px solid \${z.is_enabled?P.border:"#FCA5A5"}\`,borderRadius:"12px",padding:"14px",display:"flex",alignItems:"flex-start",gap:"12px"}}>
              <div style={{width:"32px",height:"32px",borderRadius:"8px",background:z.is_enabled?P.primaryLight:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"600",color:z.is_enabled?P.primary:"#EF4444",flexShrink:0}}>{z.zone_num}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                  <span style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{z.zone_name}</span>
                  {z.is_custom&&<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:"#F0FDF4",color:"#065F46",fontWeight:"500"}}>Custom</span>}
                  <span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:z.is_enabled?"#ECFDF5":"#FEF2F2",color:z.is_enabled?"#065F46":"#991B1B",fontWeight:"500"}}>{z.is_enabled?"Enabled":"Disabled"}</span>
                </div>
                {!z.is_enabled&&z.disabled_reason&&(
                  <div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",borderRadius:"6px",padding:"6px 10px",marginTop:"4px"}}>
                    Disabled: {z.disabled_reason} <span style={{color:P.textTert}}>by {z.disabled_by}</span>
                  </div>
                )}
              </div>
              {isAdmin&&(
                <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                  <button onClick={()=>{setEditTarget(z);setEditName(z.zone_name||"");setShowEditModal(true);}} style={{fontSize:"11px",padding:"5px 12px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:P.bgTert,color:P.textSec,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleEnabled(z)} style={{fontSize:"11px",padding:"5px 12px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:z.is_enabled?"#FEF2F2":"#ECFDF5",color:z.is_enabled?"#991B1B":"#065F46",cursor:"pointer"}}>{z.is_enabled?"Disable":"Enable"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==="artifacts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {isAdmin&&<button onClick={()=>setShowAddArtifact(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>+ Add artifact</button>}
          {loading?<div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>:artifacts.map(a=>(
            <div key={a.id} style={{background:P.bg,border:\`0.5px solid \${a.is_enabled?P.border:"#FCA5A5"}\`,borderRadius:"10px",padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:"10px"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px",flexWrap:"wrap" as const}}>
                  <span style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{a.artifact_num}</span>
                  <span style={{fontSize:"12px",fontWeight:"500",color:P.text}}>{a.artifact_name}</span>
                  {clBadge(a.classification||"Core")}
                  {a.is_custom&&<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:"#F0FDF4",color:"#065F46",fontWeight:"500"}}>Custom</span>}
                  {a.is_locked&&<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:"#F3F4F6",color:"#374151",fontWeight:"500"}}>Locked</span>}
                  <span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:a.is_enabled?"#ECFDF5":"#FEF2F2",color:a.is_enabled?"#065F46":"#991B1B",fontWeight:"500"}}>{a.is_enabled?"Enabled":"Disabled"}</span>
                </div>
                <div style={{fontSize:"10px",color:P.textTert}}>Zone {a.zone_num}{a.section_num?\` - Section \${a.section_num}\`:""}{a.iso_ref?\` - ISO: \${a.iso_ref}\`:""}</div>
                {!a.is_enabled&&a.disabled_reason&&(
                  <div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",borderRadius:"6px",padding:"5px 9px",marginTop:"4px"}}>
                    Disabled: {a.disabled_reason} <span style={{color:P.textTert}}>by {a.disabled_by}</span>
                  </div>
                )}
              </div>
              {isAdmin&&(
                <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                  <button onClick={()=>{setEditTarget(a);setEditName(a.artifact_name||"");setShowEditModal(true);}} style={{fontSize:"10px",padding:"4px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:P.bgTert,color:P.textSec,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleLock(a)} style={{fontSize:"10px",padding:"4px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:a.is_locked?"#FFFBEB":"#F9FAFB",color:a.is_locked?"#92400E":P.textSec,cursor:"pointer"}}>{a.is_locked?"Unlock":"Lock"}</button>
                  <button onClick={()=>toggleEnabled(a)} style={{fontSize:"10px",padding:"4px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:a.is_enabled?"#FEF2F2":"#ECFDF5",color:a.is_enabled?"#991B1B":"#065F46",cursor:"pointer"}}>{a.is_enabled?"Disable":"Enable"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==="subartifacts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {isAdmin&&<button onClick={()=>setShowAddSub(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>+ Add sub-artifact</button>}
          {loading?<div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>:subartifacts.length===0?(
            <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No sub-artifacts yet. Add one to get started.</div>
          ):subartifacts.map(s=>(
            <div key={s.id} style={{background:P.bg,border:\`0.5px solid \${s.is_enabled?P.border:"#FCA5A5"}\`,borderRadius:"10px",padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:"10px"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px",flexWrap:"wrap" as const}}>
                  <span style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{s.artifact_num}</span>
                  <span style={{fontSize:"12px",fontWeight:"500",color:P.text}}>{s.artifact_name}</span>
                  <span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:s.is_enabled?"#ECFDF5":"#FEF2F2",color:s.is_enabled?"#065F46":"#991B1B",fontWeight:"500"}}>{s.is_enabled?"Enabled":"Disabled"}</span>
                </div>
                <div style={{fontSize:"10px",color:P.textTert}}>Zone {s.zone_num} - Parent: {s.parent_artifact_num}</div>
                {!s.is_enabled&&s.disabled_reason&&(
                  <div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",borderRadius:"6px",padding:"5px 9px",marginTop:"4px"}}>
                    Disabled: {s.disabled_reason} <span style={{color:P.textTert}}>by {s.disabled_by}</span>
                  </div>
                )}
              </div>
              {isAdmin&&(
                <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                  <button onClick={()=>{setEditTarget(s);setEditName(s.artifact_name||"");setShowEditModal(true);}} style={{fontSize:"10px",padding:"4px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:P.bgTert,color:P.textSec,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleEnabled(s)} style={{fontSize:"10px",padding:"4px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"6px",background:s.is_enabled?"#FEF2F2":"#ECFDF5",color:s.is_enabled?"#991B1B":"#065F46",cursor:"pointer"}}>{s.is_enabled?"Disable":"Enable"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEditModal&&editTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:\`0.5px solid \${P.border}\`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Edit {editTarget.type==="zone"?"zone":"artifact"} name</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{editTarget.zone_name||editTarget.artifact_name}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New name</label>
              <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Enter new name..." style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"8px 10px"}} onKeyDown={e=>e.key==="Enter"&&saveEdit()}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowEditModal(false);setEditTarget(null);setEditName("");}} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={saveEdit} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showDisableModal&&disableTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:\`0.5px solid \${P.border}\`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Disable {disableTarget.type==="zone"?"zone":"artifact"}</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{disableTarget.zone_name||disableTarget.artifact_name}</p>
            <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"8px",padding:"10px 12px",marginBottom:"1rem",fontSize:"11px",color:"#92400E"}}>
              {disableTarget.type==="zone"?"Disabled zones are counted as 100% complete in the TMF dashboard.":"Disabled artifacts are excluded from gap analysis and completeness calculations."}
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for disabling (required)</label>
              <textarea value={disableReason} onChange={e=>setDisableReason(e.target.value)} placeholder="e.g. Not applicable to this study type - no device involved" rows={3} style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const}}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowDisableModal(false);setDisableTarget(null);setDisableReason("");}} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={submitDisable} style={{fontSize:"11px",padding:"6px 14px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Confirm disable</button>
            </div>
          </div>
        </div>
      )}

      {showAddZone&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:\`0.5px solid \${P.border}\`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add custom zone</h2>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Zone number</label><input value={newZoneNum} onChange={e=>setNewZoneNum(e.target.value)} placeholder="e.g. 12" style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Zone name</label><input value={newZoneName} onChange={e=>setNewZoneName(e.target.value)} placeholder="e.g. Quality Management" style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowAddZone(false)} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addZone} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add zone</button>
            </div>
          </div>
        </div>
      )}

      {showAddArtifact&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"460px",border:\`0.5px solid \${P.border}\`,maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add custom artifact</h2>
            {[{l:"Zone number",v:newArtZone,s:setNewArtZone,p:"e.g. 1"},{l:"Section number",v:newArtSection,s:setNewArtSection,p:"e.g. 1.07"},{l:"Artifact number",v:newArtNum,s:setNewArtNum,p:"e.g. 01.07.01"},{l:"Artifact name",v:newArtName,s:setNewArtName,p:"e.g. Training Log"},{l:"ISO 14155 reference",v:newArtIso,s:setNewArtIso,p:"e.g. 6.2 (optional)"}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Classification</label>
              <select value={newArtCl} onChange={e=>setNewArtCl(e.target.value)} style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}>
                <option>Core</option><option>Recommended</option><option>Optional</option>
              </select>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowAddArtifact(false)} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addArtifact} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add artifact</button>
            </div>
          </div>
        </div>
      )}

      {showAddSub&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"440px",border:\`0.5px solid \${P.border}\`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add sub-artifact</h2>
            {[{l:"Zone number",v:newSubZone,s:setNewSubZone,p:"e.g. 1"},{l:"Parent artifact number",v:newSubParent,s:setNewSubParent,p:"e.g. 01.04.01"},{l:"Sub-artifact number",v:newSubNum,s:setNewSubNum,p:"e.g. 01.04.01.01"},{l:"Sub-artifact name",v:newSubName,s:setNewSubName,p:"e.g. Remote Monitoring Visit Report"}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowAddSub(false)} style={{fontSize:"11px",padding:"6px 14px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addSubArtifact} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add sub-artifact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
` + after;
fs.writeFileSync('app/platform/page.tsx', newContent, 'utf8');
console.log('Done. File updated successfully.');
console.log('New file length:', newContent.length);
