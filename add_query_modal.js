const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

const modal = `
      {/* Query Modal */}
      {showQueryModal&&queryDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#FFFFFF",borderRadius:"16px",padding:"1.5rem",width:"480px",border:"0.5px solid #E5E7EB",maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Raise a query</h2>
            <p style={{fontSize:"11px",color:"#6B7280",marginBottom:"1rem"}}>{queryDoc.artifact_name} — Zone {queryDoc.zone}</p>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:"#374151",display:"block",marginBottom:"3px"}}>Query type</label>
              <select value={queryType} onChange={e=>setQueryType(e.target.value)} style={{width:"100%",fontSize:"12px",border:"0.5px solid #E5E7EB",borderRadius:"8px",padding:"7px 10px"}}>
                {["Question","Correction needed","Missing info","Version issue"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:"#374151",display:"block",marginBottom:"3px"}}>Priority</label>
              <div style={{display:"flex",gap:"6px"}}>
                {["Low","Medium","High"].map(p=>(
                  <button key={p} onClick={()=>setQueryPriority(p)} style={{flex:1,fontSize:"11px",padding:"6px",borderRadius:"8px",border:"0.5px solid "+(queryPriority===p?"#F97316":"#E5E7EB"),background:queryPriority===p?"#FFEDD5":"transparent",color:queryPriority===p?"#F97316":"#374151",cursor:"pointer",fontWeight:queryPriority===p?"500":"400"}}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:"#374151",display:"block",marginBottom:"3px"}}>Due date (optional)</label>
              <input type="date" value={queryDueDate} onChange={e=>setQueryDueDate(e.target.value)} style={{width:"100%",fontSize:"12px",border:"0.5px solid #E5E7EB",borderRadius:"8px",padding:"7px 10px"}}/>
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:"#374151",display:"block",marginBottom:"3px"}}>Query / Comment</label>
              <textarea value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder="Describe your query or comment..." rows={4} style={{width:"100%",fontSize:"12px",border:"0.5px solid #E5E7EB",borderRadius:"8px",padding:"8px 10px",resize:"vertical",fontFamily:"inherit"}}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowQueryModal(false);setQueryText("");setQueryType("Question");setQueryPriority("Medium");setQueryDueDate("");}} style={{fontSize:"11px",padding:"6px 14px",border:"0.5px solid #E5E7EB",borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={async()=>{
                if(!queryText.trim())return;
                const{error}=await supabase.from("document_queries").insert([{
                  org_id:orgId,study_id:activeStudy.study_id,document_id:queryDoc.id,
                  artifact_num:queryDoc.artifact_num,artifact_name:queryDoc.artifact_name,zone:queryDoc.zone,
                  query_type:queryType,priority:queryPriority,query_text:queryText.trim(),
                  raised_by:user.id,raised_by_email:user.email,owner_email:queryDoc.owner,
                  status:"Open",due_date:queryDueDate||null,
                }]);
                if(!error){
                  await logAudit("Query raised",queryDoc.id,activeStudy.study_id,"query","",queryText.trim());
                  setShowQueryModal(false);setQueryText("");setQueryType("Question");setQueryPriority("Medium");setQueryDueDate("");
                }
              }} style={{fontSize:"11px",padding:"6px 14px",background:"#F97316",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Submit query</button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('{/* Preview Modal */}', modal + '\n      {/* Preview Modal */}');
fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
