const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix using the exact pattern found - CRLF line endings
const bad = `          if(chatFileInputRef.current)chatFileInputRef.current.value="";\r\n                  }}/>\r\n          {panel===\"audit\"&&(`;

const good = `          if(chatFileInputRef.current)chatFileInputRef.current.value="";\r\n                  }}/>\r\n                  <button aria-label="Attach document or version tracker" onClick={()=>chatFileInputRef.current?.click()} style={{width:"32px",height:"32px",borderRadius:"50%",border:"none",background:"transparent",color:P.textTert,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>\r\n                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>\r\n                  </button>\r\n                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask Trinity or drop a document" aria-label="Message Trinity" style={{flex:1,border:"none",outline:"none",fontSize:"13px",background:"transparent",color:P.text,padding:"8px 2px"}}/>\r\n                  <button aria-label="Send message" onClick={sendChat} disabled={chatLoading} style={{width:"32px",height:"32px",borderRadius:"50%",flexShrink:0,background:chatLoading?P.bgTert:P.primary,border:"none",color:chatLoading?P.textTert:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:chatLoading?"not-allowed":"pointer"}}>\r\n                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>\r\n                  </button>\r\n                </div>\r\n              </div>\r\n            </div>\r\n          )}\r\n\r\n          {/* AUDIT TRAIL */}\r\n          {panel===\"audit\"&&(`;

if (c.includes(bad)) {
  c = c.replace(bad, good);
  console.log('Step 1: Chat panel close + audit open - OK');
} else {
  console.log('Step 1: Pattern not found');
}

// Now fix the broken audit panel end and quality panel
const bad2 = `            </div>\r\n            </div>\r\n          )}\r\n          {panel===\"quality\"&&(\r\n            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>\r\n          )}`;

const good2 = `            </div>\r\n          )}\r\n\r\n          {/* QUALITY CHECKS */}\r\n          {panel===\"quality\"&&(\r\n            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>\r\n              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Quality checks - {activeStudy?.study_id||"No study selected"}</h1>\r\n              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(<QualityPanel docs={studyDocs} P={P} supabase={supabase} setDocs={setDocs}/>)}\r\n            </div>\r\n          )}`;

if (c.includes(bad2)) {
  c = c.replace(bad2, good2);
  console.log('Step 2: Audit close + quality panel - OK');
} else {
  console.log('Step 2: Pattern not found, checking...');
  const idx = c.indexOf('{panel===\"quality\"&&(');
  if (idx > -1) console.log('quality panel context:', JSON.stringify(c.slice(idx-200, idx+200)));
}

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
