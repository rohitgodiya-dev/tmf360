const fs = require('fs');
const path = require('path');

// Create API route directory and file
const apiDir = 'app/api/classify';
if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, {recursive: true});

const apiRoute = `import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { pdfBase64, fileName, activeZONES, activeTMF } = await req.json();
    if (!pdfBase64) return NextResponse.json({ error: "No PDF data" }, { status: 400 });

    const zonesContext = activeZONES.map((z: any) => \`Zone \${z.z}: \${z.zn}\`).join("\\n");
    const artifactsContext = activeTMF.map((a: any) => \`\${a.a} - \${a.an} (Zone \${a.z}, \${a.cl})\`).join("\\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: \`You are a clinical trial TMF document classification specialist with expertise in DIA TMF Reference Model v3.3.1.

Analyze this document and classify it.

Available zones:
\${zonesContext}

Available artifacts:
\${artifactsContext}

Respond ONLY with this JSON format, no other text:
{
  "zone_num": "5",
  "zone_name": "Site Management",
  "artifact_num": "05.02.04",
  "artifact_name": "Principal Investigator Curriculum Vitae",
  "confidence": 94,
  "reasoning": "Brief explanation of why this classification was chosen",
  "issues": ["issue1 if any"],
  "missing_fields": ["missing field if any"]
}

issues = problems found in the document (expired, missing signature, etc)
missing_fields = required fields not present
If no issues, use empty arrays.\` }
        ]
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Classify error:", error);
    return NextResponse.json({ error: error.message || "Classification failed" }, { status: 500 });
  }
}
`;

fs.writeFileSync('app/api/classify/route.ts', apiRoute);
console.log('API route created: app/api/classify/route.ts');

// Update Trinity file upload handler in page.tsx
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Replace the file input onChange handler
const oldHandler = `<input ref={chatFileInputRef} type="file" style={{display:"none"}} onChange={()=>{
                    setChatMessages(prev=>[...prev,{role:"user",text:"Uploaded a document and this month's version tracker"}]);
                    presentClassification();
                    if(chatFileInputRef.current)chatFileInputRef.current.value="";
                  }}/>`;

const newHandler = `<input ref={chatFileInputRef} type="file" accept=".pdf" style={{display:"none"}} onChange={async(e)=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Please select a study first before uploading a document."}]);return;}
                    setChatMessages(prev=>[...prev,{role:"user",text:\`Uploaded: \${file.name}\`}]);
                    setChatLoading(true);
                    try{
                      const reader=new FileReader();
                      reader.onload=async(ev)=>{
                        const base64=((ev.target?.result as string)||"").split(",")[1];
                        setChatMessages(prev=>[...prev,{role:"ai",text:"Reading your document... I'll analyse the content and suggest the correct TMF zone and artifact."}]);
                        try{
                          const res=await fetch("/api/classify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:file.name,activeZONES,activeTMF})});
                          const data=await res.json();
                          if(data.error){setChatMessages(prev=>[...prev,{role:"ai",text:"I couldn't classify this document: "+data.error}]);setChatLoading(false);return;}
                          // Store classification result for step-by-step approval
                          const classResult={file,base64,fileName:file.name,...data};
                          setChatMessages(prev=>[...prev,{
                            role:"ai",
                            text:\`I've analysed your document. Here is my classification:\\n\\n\${data.reasoning}\\n\\nI'm suggesting:\\n📁 Zone \${data.zone_num} - \${data.zone_name}\\n\\nConfidence: \${data.confidence}%\\n\\nDo you approve this zone?\`,
                            pendingClassification:classResult,
                            classStage:"zone"
                          } as any]);
                        }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Classification error: "+err.message}]);}
                        setChatLoading(false);
                      };
                      reader.readAsDataURL(file);
                    }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Error reading file: "+err.message}]);setChatLoading(false);}
                    if(chatFileInputRef.current)chatFileInputRef.current.value="";
                  }}/>`;

if (c.includes(oldHandler)) {
  c = c.replace(oldHandler, newHandler);
  console.log('File upload handler updated - OK');
} else {
  console.log('ERROR: Could not find file upload handler');
}

// Add classStage rendering in chat messages
// Find where chatDocAction buttons are rendered and add classification approval UI
const oldClassificationRender = `{chatDocAction&&chatDocAction.msgIdx===i&&!chatDocAction.disabled&&(`;

const newClassificationRender = `{(m as any).classStage==="zone"&&(m as any).pendingClassification&&(
                          <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                            <button onClick={async()=>{
                              const cl=(m as any).pendingClassification;
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));
                              setChatMessages(prev=>[...prev,{
                                role:"ai",
                                text:\`Zone \${cl.zone_num} - \${cl.zone_name} approved.\\n\\nNow for the artifact:\\n📄 \${cl.artifact_num} - \${cl.artifact_name}\\n\\n\${cl.issues?.length>0?"⚠️ Issues detected:\\n"+cl.issues.join("\\n"):"No issues detected."}\\n\${cl.missing_fields?.length>0?"Missing fields: "+cl.missing_fields.join(", "):""}\\n\\nDo you approve this artifact?\`,
                                pendingClassification:cl,
                                classStage:"artifact"
                              } as any]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✓ Approve Zone</button>
                            <button onClick={()=>{
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));
                              setChatMessages(prev=>[...prev,{role:"ai",text:"Zone rejected. Please tell me which zone this document belongs to and I'll reclassify."}]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✗ Reject Zone</button>
                          </div>
                        )}
                        {(m as any).classStage==="artifact"&&(m as any).pendingClassification&&(
                          <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                            <button onClick={async()=>{
                              const cl=(m as any).pendingClassification;
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));
                              setChatLoading(true);
                              try{
                                // Upload file to Supabase storage
                                const byteString=atob(cl.base64);
                                const ab=new ArrayBuffer(byteString.length);
                                const ia=new Uint8Array(ab);
                                for(let j=0;j<byteString.length;j++)ia[j]=byteString.charCodeAt(j);
                                const blob=new Blob([ab],{type:"application/pdf"});
                                const filePath=\`\${user.id}/\${activeStudy.study_id}/\${Date.now()}_\${cl.fileName}\`;
                                const{error:upErr}=await supabase.storage.from("Documents").upload(filePath,blob);
                                if(upErr)throw new Error(upErr.message);
                                // Create document record
                                const hasIssues=(cl.issues?.length>0||cl.missing_fields?.length>0);
                                const docStatus=hasIssues?"Draft":"Under Review";
                                const rejectionReason=hasIssues?[...(cl.issues||[]),...(cl.missing_fields?.map((f:string)=>"Missing: "+f)||[])].join("; "):undefined;
                                const{data:docData,error:docErr}=await supabase.from("documents").insert([{
                                  study_id:activeStudy.study_id,user_id:user.id,org_id:orgId,
                                  artifact_num:cl.artifact_num,artifact_name:cl.artifact_name,zone:cl.zone_num,
                                  version:"1.0",status:docStatus,owner:userFullName||user.email,
                                  file_path:filePath,file_name:cl.fileName,custom_file_name:cl.fileName,
                                  file_type:"application/pdf",file_size:0,
                                  comments:"Auto-classified by Trinity AI. Confidence: "+cl.confidence+"%",
                                  rejection_reason:rejectionReason||null,
                                }]).select();
                                if(docErr)throw new Error(docErr.message);
                                setDocs(prev=>[docData[0],...prev]);
                                await logAudit("Document auto-classified by Trinity",docData[0].id,activeStudy.study_id,"status","",docStatus,"Trinity AI classification");
                                const statusMsg=hasIssues
                                  ? \`⚠️ Document filed to **Not Approved** due to issues detected:\\n\${rejectionReason}\\n\\nIt has been saved and can be reviewed in the Documents panel.\`
                                  : \`✅ Document successfully filed to **Zone \${cl.zone_num} - \${cl.zone_name}** under artifact **\${cl.artifact_num} - \${cl.artifact_name}**.\\n\\nStatus: Under Review. A TMF Lead or System Administrator can now approve it.\`;
                                setChatMessages(prev=>[...prev,{role:"ai",text:statusMsg}]);
                              }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Filing error: "+err.message}]);}
                              setChatLoading(false);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✓ Approve & File</button>
                            <button onClick={()=>{
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));
                              setChatMessages(prev=>[...prev,{role:"ai",text:"Artifact rejected. Please tell me which artifact this document should be filed under."}]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✗ Reject Artifact</button>
                          </div>
                        )}
                        {chatDocAction&&chatDocAction.msgIdx===i&&!chatDocAction.disabled&&(`;

if (c.includes(oldClassificationRender)) {
  c = c.replace(oldClassificationRender, newClassificationRender);
  console.log('Classification UI added to chat - OK');
} else {
  console.log('ERROR: Could not find chatDocAction render point');
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. File length:', c.length);
