const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');
const old = '{d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}';
const rep = '{d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}{canUploadDownload&&<button onClick={async()=>{if(!confirm("Delete this document?"))return;if(d.file_path){await supabase.storage.from("Documents").remove([d.file_path]);}await supabase.from("documents").delete().eq("id",d.id);setDocs(prev=>prev.filter(x=>x.id!==d.id));}} style={{fontSize:"9px",padding:"2px 6px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Delete</button>}';
content = content.replace(old, rep);
fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
