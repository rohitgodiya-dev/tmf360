const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

// 1. Add demos state
content = content.replace(
  'const[tokens,setTokens]=useState<any[]>([]);',
  'const[tokens,setTokens]=useState<any[]>([]);\n  const[demos,setDemos]=useState<any[]>([]);\n  const[selectedDemo,setSelectedDemo]=useState<any>(null);\n  const[demoNotes,setDemoNotes]=useState("");'
);

// 2. Load demos in loadAllData
content = content.replace(
  '// Load tokens\n    const{data:tokenData}=await supabase.from("signup_tokens").select("*").order("created_at",{ascending:false}).limit(20);\n    if(tokenData)setTokens(tokenData);',
  '// Load tokens\n    const{data:tokenData}=await supabase.from("signup_tokens").select("*").order("created_at",{ascending:false}).limit(20);\n    if(tokenData)setTokens(tokenData);\n\n    // Load demo requests\n    const{data:demoData}=await supabase.from("demo_requests").select("*").order("created_at",{ascending:false});\n    if(demoData)setDemos(demoData);'
);

// 3. Add demo nav item
content = content.replace(
  '{navItem("tokens","Token History","ti-history")}',
  '{navItem("tokens","Token History","ti-history")}\n          <p style={{fontSize:"9px",fontWeight:"600",color:"#475569",padding:"10px 8px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Sales</p>\n          {navItem("demos","Demo Requests","ti-calendar-event",demos.filter(d=>d.status==="Pending").length||undefined)}'
);

// 4. Add updateDemoStatus function
content = content.replace(
  'async function revokeToken(id:string){',
  'async function updateDemoStatus(id:string,status:string,notes?:string){\n    await supabase.from("demo_requests").update({status,notes:notes||null,confirmed_at:status==="Confirmed"?new Date().toISOString():null,confirmed_by:status==="Confirmed"?adminUser?.email:null}).eq("id",id);\n    setSelectedDemo((prev:any)=>prev?{...prev,status,notes:notes||prev.notes}:null);\n    loadAllData();\n  }\n\n  async function revokeToken(id:string){'
);

// 5. Add demos panel before the closing main tag
content = content.replace(
  '      </main>\n    </div>\n  );\n}',
  `      {/* DEMO REQUESTS */}
        {panel==="demos"&&(
          <div style={{display:"flex",gap:"12px",height:"calc(100vh - 80px)"}}>
            <div style={{width:"380px",flexShrink:0,display:"flex",flexDirection:"column",gap:"8px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"600"}}>Demo Requests ({demos.length})</h1>
                <button onClick={loadAllData} style={{fontSize:"11px",padding:"4px 10px",border:"0.5px solid #E5E7EB",borderRadius:"6px",background:"#fff",cursor:"pointer"}}>Refresh</button>
              </div>
              <div style={{display:"flex",gap:"4px"}}>
                {["All","Pending","Confirmed","Completed","Cancelled"].map(f=>(
                  <button key={f} onClick={()=>{}} style={{fontSize:"10px",padding:"4px 8px",borderRadius:"20px",border:"0.5px solid #E5E7EB",background:"transparent",color:"#374151",cursor:"pointer"}}>{f}</button>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
                {demos.length===0?<div style={{textAlign:"center",padding:"2rem",fontSize:"12px",color:"#6B7280"}}>No demo requests yet.</div>
                :demos.map((d,i)=>(
                  <div key={i} onClick={()=>{setSelectedDemo(d);setDemoNotes(d.notes||"");}} style={{background:"#fff",border:"0.5px solid "+(selectedDemo?.id===d.id?"#F97316":"#E5E7EB"),borderRadius:"10px",padding:"12px",cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                      <span style={{fontSize:"12px",fontWeight:"500",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.full_name||"Unknown"}</span>
                      <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",fontWeight:"500",background:d.status==="Pending"?"#FFF7ED":d.status==="Confirmed"?"#ECFDF5":d.status==="Completed"?"#EFF6FF":"#F3F4F6",color:d.status==="Pending"?"#C2410C":d.status==="Confirmed"?"#065F46":d.status==="Completed"?"#1D4ED8":"#6B7280"}}>{d.status}</span>
                    </div>
                    <div style={{fontSize:"11px",color:"#6B7280"}}>{d.organisation}</div>
                    <div style={{fontSize:"10px",color:"#F97316",marginTop:"3px",fontWeight:"500"}}>{d.selected_date} at {d.selected_time}</div>
                    <div style={{fontSize:"10px",color:"#9CA3AF",marginTop:"2px"}}>{new Date(d.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
            {selectedDemo?(
              <div style={{flex:1,background:"#fff",border:"0.5px solid #E5E7EB",borderRadius:"12px",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{padding:"14px 18px",borderBottom:"0.5px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:"14px",fontWeight:"600"}}>{selectedDemo.full_name}</div>
                    <div style={{fontSize:"10px",color:"#6B7280",marginTop:"2px"}}>{selectedDemo.email} · {selectedDemo.organisation}</div>
                  </div>
                  <div style={{display:"flex",gap:"6px"}}>
                    {["Pending","Confirmed","Completed","Cancelled"].map(s=>(
                      <button key={s} onClick={()=>updateDemoStatus(selectedDemo.id,s)} style={{fontSize:"10px",padding:"4px 10px",borderRadius:"20px",border:"0.5px solid "+(selectedDemo.status===s?"#F97316":"#E5E7EB"),background:selectedDemo.status===s?"#FFF7ED":"transparent",color:selectedDemo.status===s?"#F97316":"#374151",cursor:"pointer"}}>{s}</button>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:"12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                    {[
                      {label:"Requested Date",value:selectedDemo.selected_date},
                      {label:"Requested Time",value:selectedDemo.selected_time+" (CST)"},
                      {label:"Role",value:selectedDemo.role},
                      {label:"Trial Phase",value:selectedDemo.trial_phase},
                      {label:"Team Size",value:selectedDemo.team_size},
                      {label:"Submitted",value:new Date(selectedDemo.created_at).toLocaleString()},
                    ].map((item,i)=>(
                      <div key={i} style={{background:"#F9FAFB",borderRadius:"8px",padding:"10px 12px"}}>
                        <div style={{fontSize:"10px",color:"#9CA3AF",fontWeight:"600",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"3px"}}>{item.label}</div>
                        <div style={{fontSize:"12px",color:"#111827",fontWeight:"500"}}>{item.value||"—"}</div>
                      </div>
                    ))}
                  </div>
                  {selectedDemo.message&&(
                    <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"12px 14px"}}>
                      <div style={{fontSize:"10px",color:"#9CA3AF",fontWeight:"600",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"6px"}}>Their message</div>
                      <div style={{fontSize:"12px",color:"#374151",lineHeight:"1.6"}}>{selectedDemo.message}</div>
                    </div>
                  )}
                  <div>
                    <label style={{fontSize:"10px",fontWeight:"600",color:"#9CA3AF",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:".05em"}}>Internal Notes</label>
                    <textarea value={demoNotes} onChange={e=>setDemoNotes(e.target.value)} placeholder="Add internal notes about this demo..." rows={3} style={{width:"100%",fontSize:"12px",border:"0.5px solid #E5E7EB",borderRadius:"8px",padding:"8px 10px",resize:"vertical",fontFamily:"inherit"}}/>
                    <button onClick={()=>updateDemoStatus(selectedDemo.id,selectedDemo.status,demoNotes)} style={{marginTop:"6px",fontSize:"11px",padding:"6px 14px",background:"#F97316",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Save Notes</button>
                  </div>
                  <div style={{borderTop:"0.5px solid #E5E7EB",paddingTop:"12px"}}>
                    <div style={{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"8px"}}>Convert to Client</div>
                    <div style={{fontSize:"11px",color:"#6B7280",marginBottom:"8px"}}>Generate a signup link for this prospect after a successful demo.</div>
                    <button onClick={async()=>{
                      const res=await fetch("/api/generate-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({org_name:selectedDemo.organisation,email:selectedDemo.email,secret:"tmf360-admin-2026",created_by:adminUser?.email})});
                      const data=await res.json();
                      if(data.signup_url){navigator.clipboard.writeText(data.signup_url);alert("Signup link copied: "+data.signup_url);}
                    }} style={{fontSize:"11px",padding:"8px 16px",background:"#ECFDF5",color:"#065F46",border:"0.5px solid #A7F3D0",borderRadius:"8px",cursor:"pointer",fontWeight:"500"}}>Generate & Copy Signup Link</button>
                  </div>
                </div>
              </div>
            ):(
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#6B7280",fontSize:"12px"}}>Select a demo request to view details</div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}`
);

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log('done');
