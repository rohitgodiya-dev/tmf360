const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Add TMF Auditor to sidebar under Intelligence
c = c.replace(
  '{navItem("quality","Quality checks","ti-clipboard-list")}',
  '{navItem("quality","Quality checks","ti-clipboard-list")}\n          {navItem("tmfauditor","TMF Auditor","ti-checkup-list")}'
);

// 2. Add TMF Auditor panel before MESSAGES
const auditorPanel = `          {/* TMF AUDITOR */}
          {panel==="tmfauditor"&&(
            <TmfAuditorPanel
              user={user} P={P} supabase={supabase}
              activeStudy={activeStudy} orgId={orgId}
              currentUserRole={currentUserRole}
              activeTMF={activeTMF} activeZONES={activeZONES}
              studyDocs={studyDocs} setDocs={setDocs}
              logAudit={logAudit}
            />
          )}

`;

c = c.replace('          {/* MESSAGES */}', auditorPanel + '          {/* MESSAGES */}');

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('TMF Auditor panel added to page.tsx');

// Add TmfAuditorPanel component before TrackerPanel
let page = fs.readFileSync('app/platform/page.tsx', 'utf8');

const auditorComponent = `
function TmfAuditorPanel({user,P,supabase,activeStudy,orgId,currentUserRole,activeTMF,activeZONES,studyDocs,setDocs,logAudit}:{user:any,P:any,supabase:any,activeStudy:any,orgId:string,currentUserRole:string,activeTMF:any[],activeZONES:any[],studyDocs:any[],setDocs:any,logAudit:any}){
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set(["1"]));
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());
  const [actionComment, setActionComment] = useState("");
  const [actionType, setActionType] = useState<"approve"|"review"|null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);

  const canAudit = ["System Administrator","Sponsor Admin","TMF Lead"].includes(currentUserRole);

  function toggleZone(z: string) {
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(z)) next.delete(z); else next.add(z);
      return next;
    });
  }

  function toggleArtifact(a: string) {
    setExpandedArtifacts(prev => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  }

  function getArtifactDocs(artifactNum: string) {
    return studyDocs.filter(d => d.artifact_num === artifactNum);
  }

  function getZoneStatus(z: string) {
    const coreArts = activeTMF.filter(a => a.cl === "Core" && a.z === z);
    const approvedArts = coreArts.filter(a => studyDocs.some(d => d.artifact_num === a.a && d.status === "Approved"));
    if (coreArts.length === 0) return "empty";
    if (approvedArts.length === coreArts.length) return "complete";
    if (approvedArts.length > 0) return "partial";
    return "missing";
  }

  function getArtifactStatus(artifactNum: string) {
    const docs = getArtifactDocs(artifactNum);
    if (docs.some(d => d.status === "Approved")) return "approved";
    if (docs.some(d => d.status === "Under Review")) return "review";
    if (docs.length > 0) return "draft";
    return "empty";
  }

  async function handleAction() {
    if (!selectedDoc || !actionType || !actionComment.trim()) return;
    setSaving(true);
    const newStatus = actionType === "approve" ? "Approved" : "Under Review";
    const now = new Date().toISOString();
    
    const updateData: any = {
      status: newStatus,
      comments: (selectedDoc.comments||"") + (selectedDoc.comments?"\n":"") + \`[\${new Date().toLocaleString()} - \${user.email}]: \${actionComment.trim()}\`
    };
    
    if (actionType === "approve") {
      updateData.approved_by = user.email;
      updateData.approved_at = now;
      updateData.signature_reason = actionComment.trim();
    }

    const { error } = await supabase.from("documents").update(updateData).eq("id", selectedDoc.id);
    if (!error) {
      await logAudit(
        actionType === "approve" ? "Document approved via TMF Auditor" : "Document moved to pending review via TMF Auditor",
        selectedDoc.id, selectedDoc.study_id, "status", selectedDoc.status, newStatus, actionComment.trim()
      );
      setDocs((prev: any[]) => prev.map(d => d.id === selectedDoc.id ? {...d, ...updateData} : d));
      setSelectedDoc((prev: any) => prev ? {...prev, ...updateData} : null);
      setMsg(actionType === "approve" ? "Document marked complete. Audit trail updated." : "Document moved to Pending Review.");
      setActionComment("");
      setActionType(null);
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  const statusDot = (status: string) => {
    const colors: Record<string,string> = {
      complete:"#10B981", approved:"#10B981", partial:"#F59E0B",
      review:"#3B82F6", draft:"#9CA3AF", missing:"#EF4444", empty:"#E5E7EB"
    };
    return <span style={{width:"8px",height:"8px",borderRadius:"50%",background:colors[status]||"#E5E7EB",display:"inline-block",flexShrink:0}}/>;
  };

  if (!activeStudy) return <div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>;
  if (!canAudit) return <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"12px 14px",fontSize:"11px",color:"#92400E"}}>Only System Administrator, TMF Lead, and Sponsor Admin can access TMF Auditor.</div>;

  return (
    <div style={{display:"flex",height:"calc(100vh - 110px)",gap:"0",border:\`0.5px solid \${P.border}\`,borderRadius:"14px",overflow:"hidden",background:P.bg}}>
      
      {/* Left tree panel */}
      <div style={{width:"320px",borderRight:\`0.5px solid \${P.border}\`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px 14px",borderBottom:\`0.5px solid \${P.border}\`,background:P.bgSec}}>
          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>TMF Auditor</div>
          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>{activeStudy.study_id} — Document review</div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {activeZONES.map(({z,zn}) => {
            const zoneArts = activeTMF.filter(a => a.z === z);
            const zStatus = getZoneStatus(z);
            const isExpanded = expandedZones.has(z);
            return (
              <div key={z}>
                {/* Zone row */}
                <div onClick={() => toggleZone(z)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",cursor:"pointer",background:isExpanded?P.primaryLight:"transparent",borderBottom:\`0.5px solid \${P.bgTert}\`,userSelect:"none"}}>
                  <i className={\`ti \${isExpanded?"ti-chevron-down":"ti-chevron-right"}\`} style={{fontSize:"12px",color:P.textTert,flexShrink:0}}/>
                  {statusDot(zStatus)}
                  <span style={{fontSize:"11px",fontWeight:"600",color:isExpanded?P.primary:P.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>Zone {z} — {zn}</span>
                  <span style={{fontSize:"9px",color:P.textTert,flexShrink:0}}>{zoneArts.length}</span>
                </div>
                {/* Artifacts */}
                {isExpanded && zoneArts.map(a => {
                  const aStatus = getArtifactStatus(a.a);
                  const aDocs = getArtifactDocs(a.a);
                  const isArtExpanded = expandedArtifacts.has(a.a);
                  return (
                    <div key={a.a}>
                      <div onClick={() => toggleArtifact(a.a)} style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px 6px 28px",cursor:"pointer",background:isArtExpanded?"#F0FDF4":"transparent",borderBottom:\`0.5px solid \${P.bgTert}\`}}>
                        <i className={\`ti \${isArtExpanded?"ti-chevron-down":"ti-chevron-right"}\`} style={{fontSize:"11px",color:P.textTert,flexShrink:0}}/>
                        {statusDot(aStatus)}
                        <span style={{fontSize:"10px",color:P.textSec,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{a.a} — {a.an}</span>
                        {aDocs.length > 0 && <span style={{fontSize:"9px",background:P.bgTert,color:P.textTert,padding:"1px 5px",borderRadius:"10px",flexShrink:0}}>{aDocs.length}</span>}
                      </div>
                      {/* Documents */}
                      {isArtExpanded && aDocs.length === 0 && (
                        <div style={{padding:"6px 12px 6px 44px",fontSize:"10px",color:P.textMuted,borderBottom:\`0.5px solid \${P.bgTert}\`}}>No documents uploaded</div>
                      )}
                      {isArtExpanded && aDocs.map(d => (
                        <div key={d.id} onClick={() => {setSelectedDoc(d);setActionComment("");setActionType(null);setPreviewUrl(null);}}
                          style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px 6px 44px",cursor:"pointer",background:selectedDoc?.id===d.id?P.primaryLight:"transparent",borderBottom:\`0.5px solid \${P.bgTert}\`}}>
                          {statusDot(d.status==="Approved"?"approved":d.status==="Under Review"?"review":"draft")}
                          <span style={{fontSize:"10px",color:selectedDoc?.id===d.id?P.primary:P.textSec,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.custom_file_name||d.file_name||d.artifact_name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{padding:"10px 14px",borderTop:\`0.5px solid \${P.border}\`,display:"flex",gap:"10px",flexWrap:"wrap" as const}}>
          {[{c:"#10B981",l:"Approved"},{c:"#3B82F6",l:"Review"},{c:"#F59E0B",l:"Partial"},{c:"#9CA3AF",l:"Draft"},{c:"#EF4444",l:"Missing"}].map((leg,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"4px"}}>
              <span style={{width:"7px",height:"7px",borderRadius:"50%",background:leg.c,display:"inline-block"}}/>
              <span style={{fontSize:"9px",color:P.textTert}}>{leg.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right detail panel */}
      {!selectedDoc ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"10px",color:P.textTert}}>
          <i className="ti ti-file-search" style={{fontSize:"40px",color:P.border}}/>
          <div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>Select a document to review</div>
          <div style={{fontSize:"11px"}}>Click a document in the tree on the left</div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Doc header */}
          <div style={{padding:"12px 20px",borderBottom:\`0.5px solid \${P.border}\`,background:P.bgSec,display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>{selectedDoc.custom_file_name||selectedDoc.file_name||selectedDoc.artifact_name}</div>
              <div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>{selectedDoc.artifact_num} — Zone {selectedDoc.zone}</div>
            </div>
            <span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",fontWeight:"500",background:selectedDoc.status==="Approved"?"#ECFDF5":selectedDoc.status==="Under Review"?"#EFF6FF":"#F3F4F6",color:selectedDoc.status==="Approved"?"#065F46":selectedDoc.status==="Under Review"?"#1D4ED8":"#374151"}}>{selectedDoc.status}</span>
          </div>

          <div style={{flex:1,overflow:"auto",display:"flex",gap:"0"}}>
            {/* Metadata sidebar */}
            <div style={{width:"220px",borderRight:\`0.5px solid \${P.border}\`,padding:"14px",overflowY:"auto",flexShrink:0}}>
              <div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,textTransform:"uppercase" as const,letterSpacing:".06em",marginBottom:"10px"}}>Document Metadata</div>
              {[
                {label:"Artifact",value:selectedDoc.artifact_num},
                {label:"Artifact Name",value:selectedDoc.artifact_name},
                {label:"Zone",value:selectedDoc.zone},
                {label:"Version",value:selectedDoc.version||"—"},
                {label:"Owner",value:selectedDoc.owner||"—"},
                {label:"Status",value:selectedDoc.status},
                {label:"Effective Date",value:selectedDoc.effective_date||"—"},
                {label:"Expiry Date",value:selectedDoc.expiry_date||"—"},
                {label:"File Name",value:selectedDoc.file_name||"—"},
                {label:"File Size",value:selectedDoc.file_size?Math.round(selectedDoc.file_size/1024)+"KB":"—"},
                {label:"Approved By",value:selectedDoc.approved_by||"—"},
                {label:"Approved At",value:selectedDoc.approved_at?new Date(selectedDoc.approved_at).toLocaleDateString():"—"},
              ].map((m,i)=>(
                <div key={i} style={{marginBottom:"8px"}}>
                  <div style={{fontSize:"9px",color:P.textTert,fontWeight:"600",textTransform:"uppercase" as const,letterSpacing:".04em"}}>{m.label}</div>
                  <div style={{fontSize:"11px",color:P.text,marginTop:"2px",wordBreak:"break-word" as const}}>{m.value}</div>
                </div>
              ))}
              {selectedDoc.comments && (
                <div style={{marginTop:"10px",paddingTop:"10px",borderTop:\`0.5px solid \${P.border}\`}}>
                  <div style={{fontSize:"9px",color:P.textTert,fontWeight:"600",textTransform:"uppercase" as const,letterSpacing:".04em",marginBottom:"4px"}}>Comments</div>
                  <div style={{fontSize:"10px",color:P.textSec,whiteSpace:"pre-wrap" as const}}>{selectedDoc.comments}</div>
                </div>
              )}
              {selectedDoc.file_path && (
                <div style={{marginTop:"12px",display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                  <button onClick={()=>{
                    const url = supabase.storage.from("Documents").getPublicUrl(selectedDoc.file_path).data.publicUrl;
                    setPreviewUrl(previewUrl ? null : url);
                  }} style={{fontSize:"10px",padding:"5px 10px",background:P.primaryLight,color:P.primary,border:\`0.5px solid \${P.primary}\`,borderRadius:"6px",cursor:"pointer"}}>
                    {previewUrl ? "Hide Preview" : "Preview Document"}
                  </button>
                  <a href={supabase.storage.from("Documents").getPublicUrl(selectedDoc.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"10px",padding:"5px 10px",background:P.bgTert,color:P.textSec,border:\`0.5px solid \${P.border}\`,borderRadius:"6px",textDecoration:"none",textAlign:"center" as const}}>
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>

            {/* Preview / main area */}
            <div style={{flex:1,overflow:"auto",background:P.bgSec,display:"flex",alignItems:previewUrl?"flex-start":"center",justifyContent:"center",padding:"16px"}}>
              {previewUrl ? (
                selectedDoc.file_name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                  ? <img src={previewUrl} alt={selectedDoc.file_name} style={{maxWidth:"100%",height:"auto",borderRadius:"8px",boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}/>
                  : <iframe src={previewUrl} style={{width:"100%",height:"calc(100vh - 300px)",border:"none",borderRadius:"8px",background:"#fff"}}/>
              ) : (
                <div style={{textAlign:"center",color:P.textTert}}>
                  <i className="ti ti-file-description" style={{fontSize:"48px",color:P.border}}/>
                  <div style={{fontSize:"12px",marginTop:"8px"}}>Click "Preview Document" to view</div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div style={{padding:"14px 20px",borderTop:\`0.5px solid \${P.border}\`,background:P.bg,display:"flex",flexDirection:"column" as const,gap:"10px"}}>
            {msg && <div style={{fontSize:"11px",padding:"8px 12px",borderRadius:"8px",background:msg.includes("Approved")||msg.includes("complete")?P.successLight:P.primaryLight,color:msg.includes("Approved")||msg.includes("complete")?P.success:P.primary}}>{msg}</div>}
            <div style={{display:"flex",gap:"10px",alignItems:"flex-end"}}>
              <div style={{flex:1}}>
                <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"4px",fontWeight:"500"}}>
                  {actionType==="approve"?"Approval reason (required)":actionType==="review"?"Reason for returning to review (required)":"Add a comment to take action"}
                </label>
                <textarea value={actionComment} onChange={e=>setActionComment(e.target.value)} placeholder={actionType==="approve"?"e.g. Reviewed and approved — document is accurate and complete":actionType==="review"?"e.g. Version number missing — please update":"Select an action below..."} rows={2} style={{width:"100%",fontSize:"11px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,background:P.bg}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column" as const,gap:"6px",flexShrink:0}}>
                <button onClick={()=>setActionType("approve")} disabled={!canAudit} style={{fontSize:"11px",fontWeight:"500",padding:"8px 16px",background:actionType==="approve"?P.success:"transparent",color:actionType==="approve"?"#fff":P.success,border:\`1.5px solid \${P.success}\`,borderRadius:"8px",cursor:canAudit?"pointer":"not-allowed",minWidth:"140px"}}>
                  ✓ Mark Complete
                </button>
                <button onClick={()=>setActionType("review")} disabled={!canAudit} style={{fontSize:"11px",fontWeight:"500",padding:"8px 16px",background:actionType==="review"?P.blue:"transparent",color:actionType==="review"?"#fff":P.blue,border:\`1.5px solid \${P.blue}\`,borderRadius:"8px",cursor:canAudit?"pointer":"not-allowed",minWidth:"140px"}}>
                  ↩ Move to Review
                </button>
                {actionType && (
                  <button onClick={handleAction} disabled={!actionComment.trim()||saving} style={{fontSize:"11px",fontWeight:"600",padding:"8px 16px",background:actionType==="approve"?P.success:P.blue,color:"#fff",border:"none",borderRadius:"8px",cursor:actionComment.trim()&&!saving?"pointer":"not-allowed",opacity:actionComment.trim()&&!saving?1:0.5}}>
                    {saving?"Saving...":"Confirm"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

`;

page = page.replace('function TrackerPanel(', auditorComponent + 'function TrackerPanel(');
fs.writeFileSync('app/platform/page.tsx', page, 'utf8');
console.log('TmfAuditorPanel component added');
console.log('Done. Length:', page.length);
