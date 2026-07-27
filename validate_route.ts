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
      vaultDocs,filedDocs,activeStudy,orgId,userEmail,userId,studyIdentity,
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

    // LEVEL 1+2: Extract document identity
    const extractPrompt=`Extract the following fields from this clinical trial document. Return ONLY valid JSON, no other text:
{
"protocol_number":"exact protocol/study number as written",
"sponsor_name":"sponsor organisation name",
"study_title":"full study title",
"phase":"trial phase e.g. Phase I, Phase II, Phase III",
"imp_name":"investigational medicinal product name",
"indication":"disease or condition being studied",
"document_version":"version number if present",
"document_date":"date if present",
"document_type_detected":"what type of document this actually is based on content",
"sites_mentioned":["list of site numbers or names"],
"countries_mentioned":["list of countries"],
"investigator_names":["list of investigator names"],
"has_signatures":true,
"has_draft_watermark":false,
"language":"document language",
"irb_approval_number":"IRB/IEC approval number if present",
"amendment_number":"protocol amendment number if present"
}
If a field is not found, use null. Be precise.`;

    const extractedRaw=await callClaudeWithDoc(extractPrompt,pdfBase64,1500);
    const extracted=parseJSON(extractedRaw);
    results.extracted_identity=extracted;

    // LEVEL 1: Identity verification hard checks
    if(studyIdentity&&extracted){
      // Protocol number
      const protoKnown=!!(extracted.protocol_number&&studyIdentity.protocol_number);
      let protoPass=true;
      let protoDetail="Protocol number not found in document or vault";
      if(protoKnown){
        const docNum=extracted.protocol_number.toLowerCase().replace(/[\s\-_]/g,"");
        const vaultNum=studyIdentity.protocol_number.toLowerCase().replace(/[\s\-_]/g,"");
        protoPass=docNum===vaultNum;
        if(protoPass){
          protoDetail="Match confirmed: "+extracted.protocol_number;
        }else{
          protoDetail="MISMATCH — Document: "+extracted.protocol_number+" | Study: "+studyIdentity.protocol_number;
        }
      }
      results.identity_checks.push({
        label:"Protocol Number",
        pass:protoKnown?protoPass:true,
        detail:protoDetail,
        hard:true,
        doc_value:extracted.protocol_number,
        vault_value:studyIdentity.protocol_number,
      });

      // Sponsor
      const sponsorKnown=!!(extracted.sponsor_name&&studyIdentity.sponsor_name);
      let sponsorPass=true;
      let sponsorDetail="Sponsor not identifiable";
      if(sponsorKnown){
        const firstWord=studyIdentity.sponsor_name.toLowerCase().split(" ")[0];
        sponsorPass=extracted.sponsor_name.toLowerCase().includes(firstWord);
        if(sponsorPass){
          sponsorDetail="Match: "+extracted.sponsor_name;
        }else{
          sponsorDetail="MISMATCH — Document: "+extracted.sponsor_name+" | Vault: "+studyIdentity.sponsor_name;
        }
      }
      results.identity_checks.push({
        label:"Sponsor Name",
        pass:sponsorKnown?sponsorPass:true,
        detail:sponsorDetail,
        hard:true,
        doc_value:extracted.sponsor_name,
        vault_value:studyIdentity.sponsor_name,
      });

      // Phase
      const phaseKnown=!!(extracted.phase&&studyIdentity.phase);
      let phasePass=true;
      let phaseDetail="Phase confirmed: "+(extracted.phase||"not specified");
      if(phaseKnown){
        phasePass=extracted.phase.replace(/\s/g,"").toLowerCase()===studyIdentity.phase.replace(/\s/g,"").toLowerCase();
        if(!phasePass){
          phaseDetail="MISMATCH — Document: "+extracted.phase+" | Study: "+studyIdentity.phase;
        }
      }
      results.identity_checks.push({
        label:"Trial Phase",
        pass:phasePass,
        detail:phaseDetail,
        hard:true,
        doc_value:extracted.phase,
        vault_value:studyIdentity.phase,
      });

      // IMP
      const impKnown=!!(extracted.imp_name&&studyIdentity.imp_name);
      let impPass=true;
      let impDetail="IMP confirmed: "+(extracted.imp_name||"not specified");
      if(impKnown){
        const docImp=extracted.imp_name.toLowerCase();
        const vaultImp=studyIdentity.imp_name.toLowerCase();
        impPass=docImp.includes(vaultImp.split(" ")[0])||vaultImp.includes(docImp.split(" ")[0]);
        if(!impPass){
          impDetail="MISMATCH — Document: "+extracted.imp_name+" | Study: "+studyIdentity.imp_name;
        }
      }
      results.identity_checks.push({
        label:"Investigational Product",
        pass:impPass,
        detail:impDetail,
        hard:false,
        doc_value:extracted.imp_name,
        vault_value:studyIdentity.imp_name,
      });
    }else if(!studyIdentity){
      results.identity_checks.push({
        label:"Study Identity Profile",
        pass:false,
        detail:"No study identity profile found. Upload the Protocol to the Study Vault first to enable identity verification.",
        hard:false,
        doc_value:null,
        vault_value:null,
      });
    }

    // LEVEL 2: Document type and quality checks
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
          ?"Document content is consistent with declared type: "+artifactName
          :"Content mismatch — document appears to be a "+extracted.document_type_detected+" but was classified as "+artifactName,
      });
      results.quality_checks.push({
        label:"Signatures Present",
        pass:extracted.has_signatures!==false,
        detail:extracted.has_signatures?"Signature block detected":"No signatures found — document may be unsigned",
      });
      results.quality_checks.push({
        label:"Draft Watermark",
        pass:!extracted.has_draft_watermark,
        detail:extracted.has_draft_watermark?"DRAFT watermark detected — only final documents should be filed":"No draft watermark detected",
      });
      results.quality_checks.push({
        label:"Document Date Present",
        pass:!!extracted.document_date,
        detail:extracted.document_date?"Document dated: "+extracted.document_date:"No date found on document",
      });
      results.quality_checks.push({
        label:"Version Number Present",
        pass:!!extracted.document_version,
        detail:extracted.document_version?"Version: "+extracted.document_version:"No version number found",
      });
    }

    // LEVEL 3: Cross-document consistency
    if(filedDocs&&filedDocs.length>0&&extracted){
      const similarFiled=filedDocs.filter((d:any)=>d.artifact_num===artifactNum&&d.status==="Approved");
      if(similarFiled.length>0){
        results.consistency_checks.push({
          label:"Duplicate Detection",
          pass:false,
          detail:similarFiled.length+" document(s) already filed for artifact "+artifactNum+": "+similarFiled.map((d:any)=>d.custom_file_name||d.artifact_name).join(", "),
          severity:"warn",
        });
      }else{
        results.consistency_checks.push({label:"Duplicate Detection",pass:true,detail:"No duplicate documents found for this artifact"});
      }
      if(extracted.investigator_names&&extracted.investigator_names.length>0){
        const investigatorDocs=filedDocs.filter((d:any)=>d.artifact_num&&d.artifact_num.startsWith("02.")&&d.status==="Approved");
        if(investigatorDocs.length>0){
          results.consistency_checks.push({label:"Investigator Records",pass:true,detail:extracted.investigator_names.length+" investigator(s) named. CV records exist in Zone 2."});
        }
      }
      if(extracted.amendment_number){
        const amendNum=parseInt(extracted.amendment_number.replace(/[^0-9]/g,""))||0;
        if(amendNum>1){
          const prevAmendment=filedDocs.find((d:any)=>d.artifact_num==="01.02.03"&&d.status==="Approved");
          results.consistency_checks.push({
            label:"Protocol Version Chain",
            pass:!!prevAmendment,
            detail:prevAmendment?"Previous amendment found — version chain intact":"Amendment "+amendNum+" detected but no previous amendment found in TMF.",
          });
        }
      }
    }

    // LEVEL 4: Predictive gap detection
    if(studyIdentity&&extracted){
      const newGaps:any[]=[];
      if(artifactNum&&artifactNum.startsWith("05.03")&&extracted.sites_mentioned?.length>0){
        const sivFiled=filedDocs?.filter((d:any)=>d.artifact_num==="05.02.01"&&d.status==="Approved")||[];
        if(sivFiled.length<extracted.sites_mentioned.length){
          newGaps.push({artifact_name:"Site Initiation Visit Report",artifact_ref:"05.02.01",zone:"5",reason:"Monitoring visit report filed but SIV report may be missing for referenced sites",priority:"High"});
        }
      }
      if(artifactNum==="05.03.02"||artifactNum==="05.03.01"){
        newGaps.push({artifact_name:"Monitoring Visit Follow-up Letter",artifact_ref:"05.03.03",zone:"5",reason:"Follow-up letter required within 10 working days of monitoring visit per ICH E6(R3)",priority:"High"});
      }
      if(artifactNum&&artifactNum.startsWith("04.")&&extracted.document_date){
        newGaps.push({artifact_name:"IRB/IEC Approval (Current Period)",artifact_ref:"04.01.02",zone:"4",reason:"Verify IRB approval is current and covers the date of this document",priority:"Medium"});
      }
      results.predicted_gaps=newGaps;
    }

    // LEVEL 5: Overall result
    const hardFails=results.identity_checks.filter((c:any)=>c.hard&&!c.pass);
    const softFails=[...results.quality_checks,...results.consistency_checks].filter((c:any)=>!c.pass);
    if(hardFails.length>0){results.overall="fail";}
    else if(softFails.length>0){results.overall="warn";}
    else{results.overall="pass";}

    // LEVEL 5: Audit narrative
    const narrativePrompt="Generate a professional clinical trial TMF audit narrative for this document validation event. Write it as a single paragraph in past tense, formal clinical research language. Include: document name, artifact classification, study ID, validation result, key checks performed and their outcomes, and any issues found. Keep it under 100 words.\n\nDocument: "+fileName+"\nArtifact: "+artifactName+" ("+artifactNum+")\nStudy: "+activeStudy+"\nResult: "+results.overall+"\nValidated by: "+userEmail;
    const narrative=await callClaude(narrativePrompt,"You write formal clinical trial audit narratives. Return only the narrative paragraph, no labels or headers.",300);
    results.audit_narrative=narrative.trim();
    results.hash=generateHash(JSON.stringify({fileName,artifactNum,results,timestamp:new Date().toISOString()}));

    return NextResponse.json(results);
  }catch(error:any){
    return NextResponse.json({error:error.message},{status:500});
  }
}
