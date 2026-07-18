const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// The broken section - after chatFileInputRef closing, the audit panel is missing its surrounding chat panel close
const bad = `                  if(chatFileInputRef.current)chatFileInputRef.current.value="";
                  }}/>
          {panel==="audit"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Audit trail - 21 CFR Part 11 compliant</h1>
              <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
                This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions, electronic signatures, and approvals are permanently recorded.
              </div>
              <AuditTrail user={user} activeStudy={activeStudy} P={P}/>
            </div>
            </div>
          )}
          {panel==="quality"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          )}`;

const good = `                  if(chatFileInputRef.current)chatFileInputRef.current.value="";
                  }}/>
                  <button aria-label="Attach document or version tracker" onClick={()=>chatFileInputRef.current?.click()} style={{width:"32px",height:"32px",borderRadius:"50%",border:"none",background:"transparent",color:P.textTert,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>
                  </button>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask Trinity or drop a document" aria-label="Message Trinity" style={{flex:1,border:"none",outline:"none",fontSize:"13px",background:"transparent",color:P.text,padding:"8px 2px"}}/>
                  <button aria-label="Send message" onClick={sendChat} disabled={chatLoading} style={{width:"32px",height:"32px",borderRadius:"50%",flexShrink:0,background:chatLoading?P.bgTert:P.primary,border:"none",color:chatLoading?P.textTert:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:chatLoading?"not-allowed":"pointer"}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AUDIT TRAIL */}
          {panel==="audit"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Audit trail - 21 CFR Part 11 compliant</h1>
              <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
                This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions, electronic signatures, and approvals are permanently recorded.
              </div>
              <AuditTrail user={user} activeStudy={activeStudy} P={P}/>
            </div>
          )}

          {/* QUALITY CHECKS */}
          {panel==="quality"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Quality checks - {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(<QualityPanel docs={studyDocs} P={P} supabase={supabase} setDocs={setDocs}/>)}
            </div>
          )}`;

if (c.includes(bad)) {
  c = c.replace(bad, good);
  console.log('Fix applied - OK');
} else {
  // Try to find what's actually there
  const idx = c.indexOf('if(chatFileInputRef.current)chatFileInputRef.current.value="";');
  console.log('chatFileInputRef found at index:', idx);
  if (idx > -1) {
    console.log('--- Context around it ---');
    console.log(JSON.stringify(c.slice(idx - 10, idx + 600)));
  }
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
