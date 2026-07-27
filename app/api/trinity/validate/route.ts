import{NextRequest,NextResponse}from"next/server";

const ANTHROPIC_API="https://api.anthropic.com/v1/messages";
const MODEL="claude-sonnet-4-6";
const KEY=process.env.ANTHROPIC_API_KEY||"";

async function callClaude(prompt:string,context:string,maxTokens=2000):Promise<string>{
  const res=await fetch(ANTHROPIC_API,{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:MODEL,max_tokens:maxTokens,messages:[{role:"user",content:[{type:"text",text:`${context}\n\n${prompt}`}]}]}),
  });
  const data=await res.json();
  return data.content?.[0]?.text||"";
}

async function callClaudeWithDoc(prompt:string,pdfBase64:string,maxTokens=2000):Promise<string>{
  const res=await fetch(ANTHROPIC_API,{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:MODEL,max_tokens:maxTokens,messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:pdfBase64}},{type:"text",text:prompt}]}]}),
  });
  const data=await res.json();
  return data.content?.[0]?.text||"";
}

function parseJSON(raw:string):any{
  try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}
  catch{return null;}
}

function generateHash(data:string):string{
  let hash=0;
  for(let i=0;i<data.length;i++){const char=data.charCodeAt(i);hash=((hash<<5)-hash)+char;hash=hash&hash;}
  return Math.abs(hash).toString(16).padStart(8,"0");
}

export async function POST(req:NextRequest){
  try{
    const{
      pdfBase64,fileName,artifactNum,artifactName,zoneNum,zoneName,
      vaultDocs,filedDocs,activeStudy,orgId,userEmail,userId,
      studyIdentity,
    }=await req.json();

    const results:any={
      identity_checks:[],
      quality_checks:[],
      consistency_checks:[],
      predicted_gaps:[],
      overall:"pass",
      audit_narrative:"",
      extracted_identity:null,
    };

    // ─── LEVEL 1+2: Extract document identity ───
    const extractPrompt=`Extract the following fields from this clinical trial document. Return ONLY valid JSON, no other text:\n{\n"protocol_number":"exact protocol/study number as written",\n"sponsor_name":"sponsor organisation name",\n"study_title":"full study title",\n"phase":"trial phase e.g. Phase I, Phase II, Phase III",\n"imp_name":"investigational medicinal product name",\n"indication":"disease or condition being studied",\n"document_version":"version number if present",\n"document_date":"date if present",\n"document_type_detected":"what type of document this actually is based on content",\n"sites_mentioned":["list of site numbers or names"],\n"countries_mentioned":["list of countries"],\n"investigator_names":["list of investigator names"],\n"has_signatures":true,\n"has_draft_watermark":false,\n"language":"document language",\n"irb_approval_number":"IRB/IEC approval number if present",\n"amendment_number":"protocol amendment number if present"\n}\nIf a field is not found, use null. Be precise — extract exact values as written in the document.`;

    const extractedRaw=await callClaudeWithDoc(extractPrompt,pdfBase64,1500);
    const extracted=parseJSON(extractedRaw);
    results.extracted_identity=extracted;

    // ─── LEVEL 1: Identity verification ───
    if(studyIdentity&&extracted){
      // Protocol number check
      const protoMatch=extracted.protocol_number&&studyIdentity.protocol_number&&
        extracted.protocol_number.toLowerCase().replace(/[\s\-_]/g,"")===
        studyIdentity.protocol_number.toLowerCase().replace(/[\s\-_]/g,"");
      const protoKnown=extracted.protocol_number&&studyIdentity.protocol_number;
      results.identity_checks.push({
        label:"Protocol Number",
        pass:protoKnown?protoMatch:true,
        detail:protoKnown
          ?protoMatch
            ?`Match confirmed: ${extracted.protocol_number}`
            ?`MISMATCH — Document: ${extracted.protocol_number} | Study: ${studyIdentity.protocol_number}`
            :`Match confirmed: ${extracted.protocol_number}`
          :"Protocol number not found in document or vault",
        hard:true,
        doc_value:extracted.protocol_number,
        vault_value:studyIdentity.protocol_number,
      });

      // Sponsor check
      const sponsorMatch=extracted.sponsor_name&&studyIdentity.sponsor_name&&
        extracted.sponsor_name.toLowerCase().includes(studyIdentity.sponsor_name.toLowerCase().split(" ")[0]);
      results.identity_checks.push({
        label:"Sponsor Name",
        pass:extracted.sponsor_name&&studyIdentity.sponsor_name?sponsorMatch:true,
        detail:extracted.sponsor_name&&studyIdentity.sponsor_name
          ?sponsorMatch?`Match: ${extracted.sponsor_name}`:`MISMATCH — Document: ${extracted.sponsor_name} | Vault: ${studyIdentity.sponsor_name}`
          :"Sponsor not identifiable",
        hard:true,
        doc_value:extracted.sponsor_name,
        vault_value:studyIdentity.sponsor_name,
      });

      // Phase check
      const phaseMatch=!extracted.phase||!studyIdentity.phase||
        extracted.phase.replace(/\s/g,"").toLowerCase()===studyIdentity.phase.replace(/\s/g,"").toLowerCase();
      results.identity_checks.push({
        label:"Trial Phase",
        pass:phaseMatch,
        detail:phaseMatch?`Phase confirmed: ${extracted.phase||"not specified"}`:`MISMATCH — Document: ${extracted.phase} | Study: ${studyIdentity.phase}`,
        hard:true,
        doc_value:extracted.phase,
        vault_value:studyIdentity.phase,
      });

      // IMP check
      const impMatch=!extracted.imp_name||!studyIdentity.imp_name||
        extracted.imp_name.toLowerCase().includes(studyIdentity.imp_name.toLowerCase().split(" ")[0])||
        studyIdentity.imp_name.toLowerCase().includes(extracted.imp_name.toLowerCase().split(" ")[0]);
      results.identity_checks.push({
        label:"Investigational Product",
        pass:impMatch,
        detail:impMatch?`IMP confirmed: ${extracted.imp_name||"not specified"}`:`MISMATCH — Document: ${extracted.imp_name} | Study: ${studyIdentity.imp_name}`,
        hard:false,
        doc_value:extracted.imp_name,
        vault_value:studyIdentity.imp_name,
      });
    }else if(!studyIdentity){
      results.identity_checks.push({label:"Study Identity Profile",pass:false,detail:"No study identity profile found. Upload the Protocol to the Study Vault first to enable identity verification.",hard:false,doc_value:null,vault_value:null});
    }

    // ─── LEVEL 2: Document type verification ───
    if(extracted){
      const declaredType=artifactName.toLowerCase();
      const detectedType=(extracted.document_type_detected||"").toLowerCase();
      const typeConsistent=detectedType.length===0||
        declaredType.split(" ").some((w:string)=>w.length>4&&detectedType.includes(w))||
        detectedType.split(" ").some((w:string)=>w.length>4&&declaredType.includes(w));
      results.quality_checks.push({
        label:"Document Type Verification",
        pass:typeConsistent,
        detail:typeConsistent
          ?`Document content is consistent with declared type: ${artifactName}`
          :`Content mismatch — document appears to be a "${extracted.document_type_detected}" but was classified as "${artifactName}"`,
        doc_value:extracted.document_type_detected,
        vault_value:artifactName,
      });

      // Signatures
      results.quality_checks.push({
        label:"Signatures Present",
        pass:extracted.has_signatures!==false,
        detail:extracted.has_signatures?"Signature block detected in document":"No signatures found — document may be unsigned",
      });

      // Draft watermark
      results.quality_checks.push({
        label:"Draft Watermark",
        pass:!extracted.has_draft_watermark,
        detail:extracted.has_draft_watermark?"DRAFT watermark detected — only final documents should be filed":"No draft watermark detected",
      });

      // Document date
      results.quality_checks.push({
        label:"Document Date Present",
        pass:!!extracted.document_date,
        detail:extracted.document_date?`Document dated: ${extracted.document_date}`:"No date found on document",
      });

      // Version present
      results.quality_checks.push({
        label:"Version Number Present",
        pass:!!extracted.document_version,
        detail:extracted.document_version?`Version: ${extracted.document_version}`:"No version number found",
      });
    }

    // ─── LEVEL 3: Cross-document consistency ───
    if(filedDocs&&filedDocs.length>0&&extracted){
      // Duplicate check
      const similarFiled=filedDocs.filter((d:any)=>
        d.artifact_num===artifactNum&&
        d.status==="Approved"
      );
      if(similarFiled.length>0){
        results.consistency_checks.push({
          label:"Duplicate Detection",
          pass:false,
          detail:`${similarFiled.length} document(s) already filed for artifact ${artifactNum}: ${similarFiled.map((d:any)=>d.custom_file_name||d.artifact_name).join(", ")}`,
          severity:"warn",
        });
      }else{
        results.consistency_checks.push({label:"Duplicate Detection",pass:true,detail:"No duplicate documents found for this artifact"});
      }

      // Investigator consistency
      if(extracted.investigator_names&&extracted.investigator_names.length>0){
        const investigatorDocs=filedDocs.filter((d:any)=>d.artifact_num&&d.artifact_num.startsWith("02.")&&d.status==="Approved");
        if(investigatorDocs.length>0){
          results.consistency_checks.push({label:"Investigator Records",pass:true,detail:`${extracted.investigator_names.length} investigator(s) named in document. CV records exist in Zone 2.`});
        }
      }

      // Protocol version chain
      if(extracted.amendment_number){
        const amendNum=parseInt(extracted.amendment_number.replace(/[^0-9]/g,""))||0;
        if(amendNum>1){
          const prevAmendment=filedDocs.find((d:any)=>d.artifact_num==="01.02.03"&&d.status==="Approved");
          results.consistency_checks.push({
            label:"Protocol Version Chain",
            pass:!!prevAmendment,
            detail:prevAmendment?`Previous amendment found — version chain intact`:`Amendment ${amendNum} detected but no previous amendment found in TMF. Please verify filing history.`,
            severity:prevAmendment?"":"warn",
          });
        }
      }
    }

    // ─── LEVEL 4: Predictive gap detection ───
    if(studyIdentity&&extracted){
      const newGaps:any[]=[];

      // SIV before monitoring reports
      if(artifactNum&&artifactNum.startsWith("05.03")&&extracted.sites_mentioned?.length>0){
        const siteNums=extracted.sites_mentioned;
        const sivFiled=filedDocs?.filter((d:any)=>d.artifact_num==="05.02.01"&&d.status==="Approved")||[];
        if(sivFiled.length<siteNums.length){
          newGaps.push({artifact_name:"Site Initiation Visit Report",artifact_ref:"05.02.01",zone:"5",reason:"Monitoring visit report filed but SIV report may be missing for referenced sites",priority:"High"});
        }
      }

      // Follow-up letter after monitoring visit
      if(artifactNum==="05.03.02"||artifactNum==="05.03.01"){
        newGaps.push({artifact_name:"Monitoring Visit Follow-up Letter",artifact_ref:"05.03.03",zone:"5",reason:"Follow-up letter required within 10 working days of monitoring visit per ICH E6(R3)",priority:"High"});
      }

      // IRB renewal check
      if(artifactNum&&artifactNum.startsWith("04.")&&extracted.document_date){
        newGaps.push({artifact_name:"IRB/IEC Approval (Current Period)",artifact_ref:"04.01.02",zone:"4",reason:"Verify IRB approval is current and covers the date of this document",priority:"Medium"});
      }

      results.predicted_gaps=newGaps;
    }

    // ─── LEVEL 5: Determine overall result ───
    const hardFails=results.identity_checks.filter((c:any)=>c.hard&&!c.pass);
    const softFails=[...results.quality_checks,...results.consistency_checks].filter((c:any)=>!c.pass);

    if(hardFails.length>0){
      results.overall="fail";
    }else if(softFails.length>0){
      results.overall="warn";
    }else{
      results.overall="pass";
    }

    // ─── LEVEL 5: Generate audit narrative ───
    const narrativePrompt=`Generate a professional clinical trial TMF audit narrative for this document validation event. Write it as a single paragraph in past tense, formal clinical research language. Include: document name, artifact classification, study ID, validation result, key checks performed and their outcomes, and any issues found. Keep it under 100 words.\n\nDocument: ${fileName}\nArtifact: ${artifactName} (${artifactNum})\nStudy: ${activeStudy}\nResult: ${results.overall}\nIdentity checks: ${JSON.stringify(results.identity_checks.map((c:any)=>({label:c.label,pass:c.pass})))}\nQuality checks: ${JSON.stringify(results.quality_checks.map((c:any)=>({label:c.label,pass:c.pass})))}\nValidated by: ${userEmail}`;

    const narrative=await callClaude(narrativePrompt,"You write formal clinical trial audit narratives. Return only the narrative paragraph, no labels or headers.",300);
    results.audit_narrative=narrative.trim();

    // ─── Generate hash ───
    const hash=generateHash(JSON.stringify({fileName,artifactNum,results,timestamp:new Date().toISOString()}));
    results.hash=hash;

    return NextResponse.json(results);
  }catch(error:any){
    return NextResponse.json({error:error.message},{status:500});
  }
}