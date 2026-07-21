const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

// Find the main Platform component's previewUrl state (first occurrence)
let previewUrlLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const[previewUrl,setPreviewUrl]=useState<string|null>(null);')) {
    previewUrlLine = i;
    break;
  }
}
console.log('Found previewUrl state at line:', previewUrlLine + 1);

// Add previewDoc state after it
if (previewUrlLine !== -1) {
  lines.splice(previewUrlLine + 1, 0, '  const[previewDoc,setPreviewDoc]=useState<any>(null);');
  console.log('Added previewDoc state');
}

let content = lines.join('\n');

// Update openPreview to store doc
content = content.replace(
  'setPreviewUrl(url);setPreviewName(d.custom_file_name||d.file_name||"Document");',
  'setPreviewUrl(url);setPreviewName(d.custom_file_name||d.file_name||"Document");setPreviewDoc(d);'
);

// Update Close button to also clear previewDoc
content = content.replace(
  '<button onClick={()=>setPreviewUrl(null)} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Close</button>',
  '{previewDoc&&<button onClick={()=>{setQueryDoc(previewDoc);setShowQueryModal(true);}} style={{fontSize:"11px",padding:"5px 12px",background:"#EFF6FF",color:"#1D4ED8",border:"none",borderRadius:"6px",cursor:"pointer"}}>Query</button>}{previewDoc&&canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for deletion:");if(!reason)return;if(!confirm("Delete this document?"))return;if(previewDoc.file_path){await supabase.storage.from("Documents").remove([previewDoc.file_path]);}await supabase.from("documents").delete().eq("id",previewDoc.id);setDocs((prev:any)=>prev.filter((x:any)=>x.id!==previewDoc.id));await logAudit("Document deleted",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Deleted - "+reason);setPreviewUrl(null);setPreviewDoc(null);}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Delete</button>}<button onClick={()=>{setPreviewUrl(null);setPreviewDoc(null);}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Close</button>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
