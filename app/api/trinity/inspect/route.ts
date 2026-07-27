import{NextRequest,NextResponse}from"next/server";

const INSPECTION_QUESTIONS=[
  {id:"q1",category:"Protocol",question:"Can you demonstrate that all filed documents reference the current approved protocol version?",artifact_refs:["01.02.01","01.02.02","01.02.03"],severity:"Critical"},
  {id:"q2",category:"Informed Consent",question:"Is there a signed and dated ICF for every enrolled subject, approved by the IRB prior to enrolment?",artifact_refs:["04.01.01","04.01.02"],severity:"Critical"},
  {id:"q3",category:"Investigator Qualifications",question:"Is there a current CV and medical licence on file for every investigator who obtained consent or administered IMP?",artifact_refs:["02.01.01","02.01.02"],severity:"Critical"},
  {id:"q4",category:"Delegation of Authority",question:"Is there a delegation of authority log signed by the Principal Investigator for every site?",artifact_refs:["02.04.01"],severity:"Critical"},
  {id:"q5",category:"IRB Approval",question:"Is there IRB/IEC approval covering the full duration of the trial including all protocol amendments?",artifact_refs:["04.01.02","04.01.03"],severity:"Critical"},
  {id:"q6",category:"Monitoring",question:"Is there a monitoring visit report and follow-up letter for every monitoring visit conducted?",artifact_refs:["05.03.01","05.03.02","05.03.03"],severity:"Major"},
  {id:"q7",category:"Drug Accountability",question:"Is there complete drug accountability documentation from shipment to destruction for all IMP?",artifact_refs:["06.02.01","06.02.02","06.04.01"],severity:"Major"},
  {id:"q8",category:"Safety Reporting",question:"Are all SAEs reported within the required timeframes with complete follow-up documentation?",artifact_refs:["03.02.01","03.02.02"],severity:"Critical"},
  {id:"q9",category:"Regulatory Submissions",question:"Are all regulatory authority submissions and approvals on file for every country where the trial is conducted?",artifact_refs:["03.01.01","03.01.02"],severity:"Critical"},
  {id:"q10",category:"Site Initiation",question:"Is there a site initiation visit report confirming each site was qualified before enrolling subjects?",artifact_refs:["05.02.01"],severity:"Major"},
  {id:"q11",category:"Protocol Deviations",question:"Are all protocol deviations documented with root cause analysis and CAPA where required?",artifact_refs:["05.05.01"],severity:"Major"},
  {id:"q12",category:"Blinding",question:"If the trial is blinded, is the blinding code securely maintained with break records where applicable?",artifact_refs:["06.03.01"],severity:"Major"},
  {id:"q13",category:"Financial Disclosure",question:"Are financial disclosure forms on file for all investigators?",artifact_refs:["02.05.01"],severity:"Minor"},
  {id:"q14",category:"Insurance",question:"Is there evidence of trial insurance or indemnity covering all sites and subjects?",artifact_refs:["01.03.01"],severity:"Major"},
  {id:"q15",category:"TMF Completeness",question:"Is the TMF complete, contemporaneous, and inspection-ready per ICH E6(R3) section 8?",artifact_refs:[],severity:"Critical"},
];

export async function POST(req:NextRequest){
  try{
    const{filedDocs,studyIdentity,activeStudy,orgId,vaultDocs}=await req.json();

    const filedArtifactNums=filedDocs.filter((d:any)=>d.status==="Approved").map((d:any)=>d.artifact_num);

    const questionResults=INSPECTION_QUESTIONS.map(q=>{
      if(q.artifact_refs.length===0){
        const completeness=filedArtifactNums.length;
        return{...q,status:completeness>10?"pass":"fail",finding:completeness>10?`${completeness} approved documents found in TMF`:`Only ${completeness} approved documents — TMF may be incomplete`,filed_refs:[]};
      }
      const filed=q.artifact_refs.filter(ref=>filedArtifactNums.some((n:string)=>n===ref||n.startsWith(ref.split(".")[0]+"."+ref.split(".")[1])));
      const missing=q.artifact_refs.filter(ref=>!filedArtifactNums.some((n:string)=>n===ref||n.startsWith(ref.split(".")[0]+"."+ref.split(".")[1])));
      const pass=missing.length===0;
      return{
        ...q,
        status:pass?"pass":filed.length>0?"partial":"fail",
        finding:pass?`Required artifacts confirmed filed: ${q.artifact_refs.join(", ")}`
          :filed.length>0?`Partial — filed: ${filed.join(", ")} | Missing: ${missing.join(", ")}`
          :`Missing required artifacts: ${missing.join(", ")}`,
        filed_refs:filed,
        missing_refs:missing,
      };
    });

    const criticalFails=questionResults.filter(q=>q.severity==="Critical"&&q.status==="fail");
    const majorFails=questionResults.filter(q=>q.severity==="Major"&&(q.status==="fail"||q.status==="partial"));
    const minorFails=questionResults.filter(q=>q.severity==="Minor"&&q.status==="fail");
    const passing=questionResults.filter(q=>q.status==="pass");

    const riskScore=Math.max(0,100-(criticalFails.length*15)-(majorFails.length*7)-(minorFails.length*2));
    const inspectionReady=criticalFails.length===0&&majorFails.length<3;

    // Generate AI narrative summary
    const summaryPrompt=`You are an FDA/EMA inspection expert. Generate a concise inspection readiness assessment (3-4 sentences) for study ${activeStudy} based on these findings:\n- Critical gaps: ${criticalFails.length} (${criticalFails.map(q=>q.category).join(", ")||"none"})\n- Major gaps: ${majorFails.length} (${majorFails.map(q=>q.category).join(", ")||"none"})\n- Minor gaps: ${minorFails.length}\n- Passing: ${passing.length} of ${INSPECTION_QUESTIONS.length} checks\n- Risk score: ${riskScore}/100\nBe direct and professional. State whether the TMF is inspection-ready and what the most urgent actions are.`;

    const summaryRes=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY||"","anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:300,messages:[{role:"user",content:summaryPrompt}]}),
    });
    const summaryData=await summaryRes.json();
    const summary=summaryData.content?.[0]?.text||"";

    return NextResponse.json({
      questions:questionResults,
      critical_fails:criticalFails,
      major_fails:majorFails,
      minor_fails:minorFails,
      passing,
      risk_score:riskScore,
      inspection_ready:inspectionReady,
      summary,
      generated_at:new Date().toISOString(),
    });
  }catch(error:any){
    return NextResponse.json({error:error.message},{status:500});
  }
}