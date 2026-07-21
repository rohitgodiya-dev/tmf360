const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// 1. Add previewDoc state to track which doc is being previewed
content = content.replace(
  'const[previewUrl,setPreviewUrl]=useState<string|null>(null);\n  const[previewName,setPreviewName]=useState("");',
  'const[previewUrl,setPreviewUrl]=useState<string|null>(null);\n  const[previewName,setPreviewName]=useState("");\n  const[previewDoc,setPreviewDoc]=useState<any>(null);'
);

// 2. Update openPreview to also store the doc
content = content.replace(
  'function openPreview(d:Doc){\n    const url=supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl;\n    setPreviewUrl(url);setPreviewName(d.custom_file_name||d.file_name||"Document");\n  }',
  'function openPreview(d:Doc){\n    const url=supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl;\n    setPreviewUrl(url);setPreviewName(d.custom_file_name||d.file_name||"Document");setPreviewDoc(d);\n  }'
);

// 3. Add Query and Delete buttons to preview modal header
content = content.replace(
  '<a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Open</a>\n                <a href={previewUrl} download style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Download</a>\n                <button onClick={()=>setPreviewUrl(null)} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Close</button>',
  '<a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Open</a>\n                <a href={previewUrl} download style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Download</a>\n                {previewDoc&&<button onClick={()=>{setQueryDoc(previewDoc);setShowQueryModal(true);}} style={{fontSize:"11px",padding:"5px 12px",background:"#EFF6FF",color:"#1D4ED8",border:"none",borderRadius:"6px",cursor:"pointer"}}>Query</button>}\n                {previewDoc&&canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for deletion:");if(!reason)return;if(!confirm("Delete this document?"))return;if(previewDoc.file_path){await supabase.storage.from("Documents").remove([previewDoc.file_path]);}await supabase.from("documents").delete().eq("id",previewDoc.id);setDocs((prev:any)=>prev.filter((x:any)=>x.id!==previewDoc.id));await logAudit("Document deleted",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Deleted - "+reason);setPreviewUrl(null);setPreviewDoc(null);}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Delete</button>}\n                <button onClick={()=>{setPreviewUrl(null);setPreviewDoc(null);}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Close</button>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
