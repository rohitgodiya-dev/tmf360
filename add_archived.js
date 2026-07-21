const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Replace delete in Documents panel
content = content.replace(
  '{canUploadDownload&&<button onClick={async()=>{if(!confirm("Delete this document?"))return;if(d.file_path){await supabase.storage.from("Documents").remove([d.file_path]);}await supabase.from("documents").delete().eq("id",d.id);setDocs(prev=>prev.filter(x=>x.id!==d.id));await logAudit("Document deleted",d.id,d.study_id,"status",d.status,"Deleted");}} style={{fontSize:"9px",padding:"2px 6px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Delete</button>}',
  '{canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for archiving this document:");if(!reason)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason,pre_archive_status:d.status}).eq("id",d.id);if(!error){await logAudit("Document archived",d.id,d.study_id,"status",d.status,"Archived - "+reason);setDocs(prev=>prev.map(x=>x.id===d.id?{...x,status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason}:x));}}} style={{fontSize:"9px",padding:"2px 6px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Archive</button>}'
);

// 2. Replace delete in artifact browser
content = content.replace(
  '{canUploadDownload&&<button onClick={async()=>{if(!confirm("Delete this document?"))return;if(d.file_path){await supabase.storage.from("Documents").remove([d.file_path]);}await supabase.from("documents").delete().eq("id",d.id);setDocs(prev=>prev.filter(x=>x.id!==d.id));}} style={{fontSize:"9px",padding:"2px 6px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Delete</button>}',
  '{canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for archiving this document:");if(!reason)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason,pre_archive_status:d.status}).eq("id",d.id);if(!error){setDocs((prev:any)=>prev.map((x:any)=>x.id===d.id?{...x,status:"Archived"}:x));}}} style={{fontSize:"9px",padding:"2px 6px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Archive</button>}'
);

// 3. Replace delete in preview modal
content = content.replace(
  '{previewDoc&&canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for deletion:");if(!reason)return;if(!confirm("Delete this document?"))return;if(previewDoc.file_path){await supabase.storage.from("Documents").remove([previewDoc.file_path]);}await supabase.from("documents").delete().eq("id",previewDoc.id);setDocs((prev:any)=>prev.filter((x:any)=>x.id!==previewDoc.id));await logAudit("Document deleted",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Deleted - "+reason);setPreviewUrl(null);setPreviewDoc(null);}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Delete</button>}',
  '{previewDoc&&canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for archiving:");if(!reason)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason,pre_archive_status:previewDoc.status}).eq("id",previewDoc.id);if(!error){await logAudit("Document archived",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Archived - "+reason);setDocs((prev:any)=>prev.map((x:any)=>x.id===previewDoc.id?{...x,status:"Archived"}:x));setPreviewUrl(null);setPreviewDoc(null);}}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Archive</button>}'
);

// 4. Hide archived docs from Documents panel filter
content = content.replace(
  'const filteredDocs=studyDocs.filter(d=>{\n    if(docFilter!=="all"&&d.status!==docFilter)return false;',
  'const filteredDocs=studyDocs.filter(d=>{\n    if(d.status==="Archived")return false;\n    if(docFilter!=="all"&&d.status!==docFilter)return false;'
);

// 5. Hide archived from completeness/gap calculations
content = content.replace(
  'const filedNames=studyDocs.filter(d=>d.status==="Approved").map(d=>d.artifact_num);',
  'const activeDocs=studyDocs.filter(d=>d.status!=="Archived");\n  const filedNames=activeDocs.filter(d=>d.status==="Approved").map(d=>d.artifact_num);'
);

// 6. Add ArchivedPanel component before QueriesPanel
const archivedPanel = `
function ArchivedPanel({user,P,supabase,orgId,activeStudy,currentUserRole,logAudit,setDocs}:{user:any,P:any,supabase:any,orgId:string,activeStudy:any,currentUserRole:string,logAudit:any,setDocs:any}){
  const[docs,setLocalDocs]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[filterZone,setFilterZone]=useState("");
  const[filterUser,setFilterUser]=useState("");
  const[filterFrom,setFilterFrom]=useState("");
  const[filterTo,setFilterTo]=useState("");
  const canManage=["System Administrator","Sponsor Admin","TMF Lead"].includes(currentUserRole);

  useEffect(()=>{if(orgId)loadArchived();},[orgId,activeStudy]);

  async function loadArchived(){
    setLoading(true);
    let q=supabase.from("documents").select("*").eq("org_id",orgId).eq("status","Archived");
    if(activeStudy)q=q.eq("study_id",activeStudy.study_id);
    const{data}=await q.order("archived_at",{ascending:false});
    if(data)setLocalDocs(data);
    setLoading(false);
  }

  async function restoreDoc(d:any){
    const restoreStatus=d.pre_archive_status||"Draft";
    const{error}=await supabase.from("documents").update({status:restoreStatus,archived_by:null,archived_at:null,archive_reason:null,pre_archive_status:null}).eq("id",d.id);
    if(!error){
      await logAudit("Document restored from archive",d.id,d.study_id,"status","Archived",restoreStatus);
      setLocalDocs(prev=>prev.filter(x=>x.id!==d.id));
      setDocs((prev:any)=>prev.map((x:any)=>x.id===d.id?{...x,status:restoreStatus,archived_by:null,archived_at:null,archive_reason:null}:x));
    }
  }

  async function permanentDelete(d:any){
    if(!confirm("Permanently delete this document? This cannot be undone."))return;
    if(d.file_path)await supabase.storage.from("Documents").remove([d.file_path]);
    await supabase.from("documents").delete().eq("id",d.id);
    await logAudit("Document permanently deleted",d.id,d.study_id,"status","Archived","Permanently deleted");
    setLocalDocs(prev=>prev.filter(x=>x.id!==d.id));
    setDocs((prev:any)=>prev.filter((x:any)=>x.id!==d.id));
  }

  function exportCSV(){
    const headers=["Document Name","Artifact","Zone","Archive Reason","Archived By","Archived At","Original Owner","Pre-Archive Status"];
    const rows=filtered.map((d:any)=>[d.custom_file_name||d.file_name||d.artifact_name,d.artifact_num,d.zone,d.archive_reason||"",d.archived_by||"",d.archived_at?new Date(d.archived_at).toLocaleString():"",d.owner||"",d.pre_archive_status||""]);
    const csv=[headers,...rows].map(r=>r.map((v:string)=>JSON.stringify(v)).join(",")).join("\\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=\`Archived_${activeStudy?.study_id||"docs"}_\${Date.now()}.csv\`;a.click();URL.revokeObjectURL(url);
  }

  const uniqueZones=[...new Set(docs.map((d:any)=>d.zone))].filter(Boolean).sort();
  const uniqueUsers=[...new Set(docs.map((d:any)=>d.archived_by))].filter(Boolean).sort();

  const filtered=docs.filter((d:any)=>{
    if(filterZone&&d.zone!==filterZone)return false;
    if(filterUser&&d.archived_by!==filterUser)return false;
    if(filterFrom&&d.archived_at&&new Date(d.archived_at)<new Date(filterFrom))return false;
    if(filterTo&&d.archived_at&&new Date(d.archived_at)>new Date(filterTo+"T23:59:59"))return false;
    return true;
  });

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontSize:"14px",fontWeight:"500"}}>Archived Documents{activeStudy?" - "+activeStudy.study_id:""}</h1>
          <p style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Documents archived from the TMF. Restore or permanently delete.</p>
        </div>
        <button onClick={exportCSV} style={{fontSize:"11px",padding:"6px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"}}>
          <i className="ti ti-download" style={{fontSize:"13px"}}/>Export CSV
        </button>
      </div>

      <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
        Archived documents are excluded from all TMF completeness, gap analysis, and inspection readiness calculations. Only System Administrator, Sponsor Admin, and TMF Lead can restore or permanently delete.
      </div>

      <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const,alignItems:"center"}}>
        <select value={filterZone} onChange={e=>setFilterZone(e.target.value)} style={{fontSize:"11px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"6px 10px"}}>
          <option value="">All zones</option>
          {uniqueZones.map((z:any)=><option key={z} value={z}>Zone {z}</option>)}
        </select>
        <select value={filterUser} onChange={e=>setFilterUser(e.target.value)} style={{fontSize:"11px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"6px 10px"}}>
          <option value="">All users</option>
          {uniqueUsers.map((u:any)=><option key={u} value={u}>{u}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} style={{fontSize:"11px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"6px 10px"}} placeholder="From"/>
        <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} style={{fontSize:"11px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"6px 10px"}} placeholder="To"/>
        {(filterZone||filterUser||filterFrom||filterTo)&&<button onClick={()=>{setFilterZone("");setFilterUser("");setFilterFrom("");setFilterTo("");}} style={{fontSize:"11px",padding:"6px 10px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",background:"transparent",cursor:"pointer",color:P.textSec}}>Clear</button>}
      </div>

      <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"12px",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:"11px",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:\`0.5px solid \${P.border}\`}}>
            {["Document","Artifact","Zone","Archive Reason","Archived By","Archived At","Owner","Actions"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",fontWeight:"500",color:P.textSec}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>
            :filtered.length===0?<tr><td colSpan={8} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No archived documents.</td></tr>
            :filtered.map((d:any,i:number)=>(
              <tr key={i} style={{borderBottom:\`0.5px solid \${P.bgTert}\`}}>
                <td style={{padding:"8px 10px"}}>
                  <div style={{fontSize:"11px",fontWeight:"500",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.custom_file_name||d.file_name||d.artifact_name}</div>
                  <div style={{fontSize:"9px",color:P.textTert}}>{d.pre_archive_status||"Draft"} before archive</div>
                </td>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>Zone {d.zone}</td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{fontSize:"11px",color:"#92400E",background:"#FFFBEB",borderRadius:"6px",padding:"4px 8px",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.archive_reason||"-"}</div>
                </td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.archived_by||"-"}</td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.archived_at?new Date(d.archived_at).toLocaleDateString():"-"}</td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.owner||"-"}</td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",gap:"4px"}}>
                    {canManage&&<button onClick={()=>restoreDoc(d)} style={{fontSize:"9px",padding:"3px 8px",background:"#ECFDF5",color:"#065F46",border:"0.5px solid #A7F3D0",borderRadius:"4px",cursor:"pointer"}}>Restore</button>}
                    {canManage&&<button onClick={()=>permanentDelete(d)} style={{fontSize:"9px",padding:"3px 8px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

content = content.replace('function QueriesPanel(', archivedPanel + '\nfunction QueriesPanel(');

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
