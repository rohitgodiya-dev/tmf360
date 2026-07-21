const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: Artifact browser - check custom_file_name too for preview
content = content.replace(
  '{d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}\n                                    {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}',
  '{d.file_path&&(canPreview(d.file_name||"")||canPreview(d.custom_file_name||""))&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}\n                                    {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}'
);

// Fix 2: TMF Auditor - open in preview modal instead of iframe download
content = content.replace(
  '<a href={supabase.storage.from("Documents").getPublicUrl(selectedDoc.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"10px",padding:"5px 10px",background:P.bgTert,color:P.textSec,border:`0.5px solid ${P.border}`,borderRadius:"6px",textDecoration:"none",textAlign:"center" as const}}>\n                    Open in New Tab\n                  </a>',
  '<a href={supabase.storage.from("Documents").getPublicUrl(selectedDoc.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"10px",padding:"5px 10px",background:P.bgTert,color:P.textSec,border:`0.5px solid ${P.border}`,borderRadius:"6px",textDecoration:"none",textAlign:"center" as const}}>\n                    Open in New Tab\n                  </a>\n                  <button onClick={()=>openPreview(selectedDoc)} style={{fontSize:"10px",padding:"5px 10px",background:"#ECFDF5",color:"#065F46",border:"0.5px solid #A7F3D0",borderRadius:"6px",cursor:"pointer",textAlign:"center" as const}}>Open Preview</button>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
