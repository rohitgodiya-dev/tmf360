const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Add panel call before USER MANAGEMENT
content = content.replace(
  '{/* USER MANAGEMENT */}',
  `{/* QUERIES */}
          {panel==="queries"&&(
            <QueriesPanel user={user} P={P} supabase={supabase} orgId={orgId} activeStudy={activeStudy} currentUserRole={currentUserRole} logAudit={logAudit}/>
          )}

          {/* USER MANAGEMENT */}`
);

// 2. Add QueriesPanel component before TicketPanel
const component = `function QueriesPanel({user,P,supabase,orgId,activeStudy,currentUserRole,logAudit}:{user:any,P:any,supabase:any,orgId:string,activeStudy:any,currentUserRole:string,logAudit:any}){
  const[queries,setQueries]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState("All");
  const[selectedQuery,setSelectedQuery]=useState<any>(null);
  const[replyText,setReplyText]=useState("");
  const[previewUrl,setPreviewUrl]=useState<string|null>(null);
  const canManage=["System Administrator","Sponsor Admin","TMF Lead"].includes(currentUserRole);
  useEffect(()=>{if(user&&orgId)loadQueries();},[user,orgId,activeStudy]);
  async function loadQueries(){
    setLoading(true);
    let q=supabase.from("document_queries").select("*").eq("org_id",orgId);
    if(activeStudy)q=q.eq("study_id",activeStudy.study_id);
    if(!canManage)q=q.or("owner_email.eq."+user.email+",raised_by_email.eq."+user.email);
    const{data}=await q.order("created_at",{ascending:false});
    if(data)setQueries(data);
    setLoading(false);
  }
  async function addReply(){
    if(!replyText.trim()||!selectedQuery)return;
    const existing=selectedQuery.replies||"";
    const newReplies=existing+(existing?"\n":"")+"["+new Date().toLocaleString()+" - "+user.email+"]: "+replyText.trim();
    await supabase.from("document_queries").update({replies:newReplies}).eq("id",selectedQuery.id);
    await logAudit("Query reply added",selectedQuery.document_id,selectedQuery.study_id,"query_reply","",replyText.trim());
    setSelectedQuery((prev:any)=>({...prev,replies:newReplies}));
    setReplyText("");
    loadQueries();
  }
  async function closeQuery(){
    if(!selectedQuery)return;
    const now=new Date().toISOString();
    await supabase.from("document_queries").update({status:"Closed",closed_by:user.email,closed_at:now}).eq("id",selectedQuery.id);
    await logAudit("Query closed",selectedQuery.document_id,selectedQuery.study_id,"query_status","Open","Closed");
    setSelectedQuery((prev:any)=>({...prev,status:"Closed",closed_by:user.email,closed_at:now}));
    loadQueries();
  }
  async function reopenQuery(){
    if(!selectedQuery)return;
    await supabase.from("document_queries").update({status:"Open",closed_by:null,closed_at:null}).eq("id",selectedQuery.id);
    await logAudit("Query reopened",selectedQuery.document_id,selectedQuery.study_id,"query_status","Closed","Open");
    setSelectedQuery((prev:any)=>({...prev,status:"Open",closed_by:null,closed_at:null}));
    loadQueries();
  }
  const filtered=filter==="All"?queries:queries.filter(q=>q.status===filter);
  const priorityColor=(p:string)=>p==="High"?"#EF4444":p==="Medium"?"#F59E0B":"#10B981";
  const statusBg=(s:string)=>s==="Open"?"#EFF6FF":"#F3F4F6";
  const statusColor=(s:string)=>s==="Open"?"#1D4ED8":"#6B7280";
  const typeColor=(t:string)=>t==="Correction needed"?"#EF4444":t==="Missing info"?"#F59E0B":t==="Version issue"?"#8B5CF6":"#3B82F6";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontSize:"14px",fontWeight:"500"}}>Queries{activeStudy?" - "+activeStudy.study_id:""}</h1>
        <button onClick={loadQueries} style={{fontSize:"11px",padding:"5px 12px",border:"0.5px solid #E5E7EB",borderRadius:"8px",background:"#FFFFFF",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"}}><i className="ti ti-refresh" style={{fontSize:"13px"}}/>Refresh</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
        {[{label:"Open",color:"#1D4ED8",bg:"#EFF6FF"},{label:"Closed",color:"#6B7280",bg:"#F3F4F6"},{label:"All",color:"#F97316",bg:"#FFEDD5"}].map(s=>(
          <div key={s.label} style={{background:s.bg,border:"0.5px solid #E5E7EB",borderRadius:"10px",padding:"12px 14px"}}>
            <div style={{fontSize:"22px",fontWeight:"500",color:s.color}}>{s.label==="All"?queries.length:queries.filter(q=>q.status===s.label).length}</div>
            <div style={{fontSize:"11px",color:"#374151",marginTop:"2px"}}>{s.label} queries</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:"6px"}}>
        {["All","Open","Closed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{fontSize:"11px",padding:"5px 12px",borderRadius:"20px",border:"0.5px solid "+(filter===f?"#F97316":"#E5E7EB"),background:filter===f?"#FFEDD5":"transparent",color:filter===f?"#F97316":"#374151",cursor:"pointer"}}>{f}</button>
        ))}
      </div>
      {loading?<div style={{fontSize:"12px",color:"#6B7280"}}>Loading...</div>
      :filtered.length===0?<div style={{textAlign:"center",padding:"2rem",fontSize:"12px",color:"#6B7280"}}>No queries found.</div>
      :filtered.map(q=>(
        <div key={q.id} onClick={()=>{setSelectedQuery(q);setReplyText("");setPreviewUrl(null);}} style={{background:"#FFFFFF",border:"0.5px solid #E5E7EB",borderRadius:"10px",padding:"14px",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"6px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" as const}}>
              <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:statusBg(q.status),color:statusColor(q.status),fontWeight:"500"}}>{q.status}</span>
              <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:typeColor(q.query_type)+"22",color:typeColor(q.query_type),fontWeight:"500"}}>{q.query_type}</span>
              <span style={{fontSize:"10px",display:"flex",alignItems:"center",gap:"3px"}}><span style={{width:"6px",height:"6px",borderRadius:"50%",background:priorityColor(q.priority),display:"inline-block"}}/>{q.priority}</span>
            </div>
            {q.due_date&&<span style={{fontSize:"10px",color:new Date(q.due_date)<new Date()?"#EF4444":"#6B7280",flexShrink:0}}>Due: {q.due_date}</span>}
          </div>
          <div style={{fontSize:"12px",fontWeight:"500",color:"#111827",marginBottom:"4px"}}>{q.artifact_name} — Zone {q.zone}</div>
          <div style={{fontSize:"11px",color:"#374151",marginBottom:"6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{q.query_text}</div>
          <div style={{fontSize:"10px",color:"#9CA3AF"}}>Raised by {q.raised_by_email} · {new Date(q.created_at).toLocaleDateString()}</div>
        </div>
      ))}
      {selectedQuery&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#FFFFFF",borderRadius:"16px",width:"620px",maxHeight:"90vh",display:"flex",flexDirection:"column",border:"0.5px solid #E5E7EB"}}>
            <div style={{padding:"14px 18px",borderBottom:"0.5px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"14px",fontWeight:"500",color:"#111827"}}>{selectedQuery.artifact_name}</div>
                <div style={{fontSize:"10px",color:"#6B7280",marginTop:"2px"}}>Zone {selectedQuery.zone} · {selectedQuery.artifact_num}</div>
              </div>
              <button onClick={()=>{setSelectedQuery(null);setPreviewUrl(null);}} style={{background:"none",border:"none",fontSize:"18px",cursor:"pointer",color:"#9CA3AF"}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const}}>
                <span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",fontWeight:"500",background:statusBg(selectedQuery.status),color:statusColor(selectedQuery.status)}}>{selectedQuery.status}</span>
                <span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",fontWeight:"500",background:typeColor(selectedQuery.query_type)+"22",color:typeColor(selectedQuery.query_type)}}>{selectedQuery.query_type}</span>
                <span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",background:"#F3F4F6",color:priorityColor(selectedQuery.priority),fontWeight:"500"}}>{selectedQuery.priority} priority</span>
                {selectedQuery.due_date&&<span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",background:"#FFFBEB",color:"#92400E"}}>Due: {selectedQuery.due_date}</span>}
              </div>
              <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"12px 14px"}}>
                <div style={{fontSize:"10px",fontWeight:"500",color:"#9CA3AF",marginBottom:"4px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Query</div>
                <div style={{fontSize:"12px",color:"#374151",lineHeight:"1.6",whiteSpace:"pre-wrap" as const}}>{selectedQuery.query_text}</div>
                <div style={{fontSize:"10px",color:"#9CA3AF",marginTop:"6px"}}>By {selectedQuery.raised_by_email} · {new Date(selectedQuery.created_at).toLocaleString()}</div>
              </div>
              {selectedQuery.replies&&(
                <div>
                  <div style={{fontSize:"10px",fontWeight:"500",color:"#9CA3AF",marginBottom:"8px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Replies</div>
                  {selectedQuery.replies.split("\n").map((r:string,i:number)=>(
                    <div key={i} style={{background:"#F9FAFB",borderRadius:"8px",padding:"8px 12px",marginBottom:"6px",fontSize:"11px",color:"#374151",lineHeight:"1.55"}}>{r}</div>
                  ))}
                </div>
              )}
              <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"12px 14px"}}>
                <div style={{fontSize:"10px",fontWeight:"500",color:"#9CA3AF",marginBottom:"6px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Document preview</div>
                {selectedQuery.document_id&&(
                  <button onClick={async()=>{
                    const{data}=await supabase.from("documents").select("file_path,file_name").eq("id",selectedQuery.document_id).single();
                    if(data?.file_path){const url=supabase.storage.from("Documents").getPublicUrl(data.file_path).data.publicUrl;setPreviewUrl(previewUrl?null:url);}
                  }} style={{fontSize:"11px",padding:"5px 12px",background:"#FFEDD5",color:"#F97316",border:"0.5px solid #F97316",borderRadius:"6px",cursor:"pointer"}}>{previewUrl?"Hide preview":"Preview document"}</button>
                )}
                {previewUrl&&<iframe src={previewUrl} style={{width:"100%",height:"300px",border:"none",borderRadius:"8px",marginTop:"8px"}}/>}
              </div>
              <div>
                <label style={{fontSize:"10px",fontWeight:"500",color:"#9CA3AF",display:"block",marginBottom:"5px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Add reply</label>
                <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Type your reply..." rows={3} style={{width:"100%",fontSize:"12px",border:"0.5px solid #E5E7EB",borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,fontFamily:"inherit"}}/>
                <button onClick={addReply} disabled={!replyText.trim()} style={{marginTop:"6px",fontSize:"11px",padding:"6px 14px",background:"#F97316",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:replyText.trim()?1:0.4}}>Send reply</button>
              </div>
              <div style={{borderTop:"0.5px solid #E5E7EB",paddingTop:"12px",display:"flex",gap:"8px"}}>
                {selectedQuery.status==="Open"&&selectedQuery.raised_by_email===user.email&&(
                  <button onClick={closeQuery} style={{fontSize:"11px",padding:"6px 14px",background:"#F3F4F6",color:"#374151",border:"0.5px solid #E5E7EB",borderRadius:"8px",cursor:"pointer"}}>Mark as Closed</button>
                )}
                {selectedQuery.status==="Closed"&&selectedQuery.raised_by_email===user.email&&(
                  <button onClick={reopenQuery} style={{fontSize:"11px",padding:"6px 14px",background:"#EFF6FF",color:"#1D4ED8",border:"0.5px solid #BFDBFE",borderRadius:"8px",cursor:"pointer"}}>Reopen</button>
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

content = content.replace('function TicketPanel(', component + 'function TicketPanel(');
fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
