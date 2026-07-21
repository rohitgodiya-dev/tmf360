const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: Documents panel delete button
const old1 = 'canUploadDownload&&<button onClick={async()=>{if(!confirm("Delete this document?"))return;if(d.file_path){await supabase.storage.from("Documents").remove([d.file_path]);}await supabase.from("documents").delete().eq("id",d.id);setDocs(prev=>prev.filter(x=>x.id!==d.id));await logAudit("Document deleted",d.id,d.study_id,"status",d.status,"Deleted");}} style={{fontSize:"9px",padding:"2px 6px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Delete</button>}';
const new1 = 'canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for archiving:");if(!reason)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason,pre_archive_status:d.status}).eq("id",d.id);if(!error){await logAudit("Document archived",d.id,d.study_id,"status",d.status,"Archived");setDocs(prev=>prev.map(x=>x.id===d.id?{...x,status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason}:x));}}} style={{fontSize:"9px",padding:"2px 6px",background:"#FFFBEB",color:"#92400E",border:"0.5px solid #FDE68A",borderRadius:"4px",cursor:"pointer"}}>Archive</button>}';

if (content.includes(old1)) {
  content = content.replace(old1, new1);
  console.log('Fixed Documents panel delete');
} else {
  console.log('Documents panel delete NOT found - searching for similar...');
  // Try to find it
  const idx = content.indexOf('"Document deleted"');
  if (idx !== -1) console.log('Found "Document deleted" at char', idx);
}

// Fix 2: Artifact browser delete button
const old2 = 'canUploadDownload&&<button onClick={async()=>{if(!confirm("Delete this document?"))return;if(d.file_path){await supabase.storage.from("Documents").remove([d.file_path]);}await supabase.from("documents").delete().eq("id",d.id);setDocs(prev=>prev.filter(x=>x.id!==d.id));}} style={{fontSize:"9px",padding:"2px 6px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"4px",cursor:"pointer"}}>Delete</button>}';
const new2 = 'canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for archiving:");if(!reason)return;const now=new Date().toISOString();await supabase.from("documents").update({status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason,pre_archive_status:d.status}).eq("id",d.id);setDocs((prev:any)=>prev.map((x:any)=>x.id===d.id?{...x,status:"Archived"}:x));}} style={{fontSize:"9px",padding:"2px 6px",background:"#FFFBEB",color:"#92400E",border:"0.5px solid #FDE68A",borderRadius:"4px",cursor:"pointer"}}>Archive</button>}';

if (content.includes(old2)) {
  content = content.replace(old2, new2);
  console.log('Fixed Artifact browser delete');
} else {
  console.log('Artifact browser delete NOT found');
}

// Fix 3: Preview modal delete button
const old3 = 'previewDoc&&canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for archiving:");if(!reason)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason,pre_archive_status:previewDoc.status}).eq("id",previewDoc.id);if(!error){await logAudit("Document archived",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Archived - "+reason);setDocs((prev:any)=>prev.map((x:any)=>x.id===previewDoc.id?{...x,status:"Archived"}:x));setPreviewUrl(null);setPreviewDoc(null);}}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Archive</button>}';

if (content.includes(old3)) {
  console.log('Preview modal already updated');
} else {
  // Check if old delete version exists
  const old3b = 'previewDoc&&canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for deletion:");if(!reason)return;if(!confirm("Delete this document?"))return;if(previewDoc.file_path){await supabase.storage.from("Documents").remove([previewDoc.file_path]);}await supabase.from("documents").delete().eq("id",previewDoc.id);setDocs((prev:any)=>prev.filter((x:any)=>x.id!==previewDoc.id));await logAudit("Document deleted",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Deleted - "+reason);setPreviewUrl(null);setPreviewDoc(null);}} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Delete</button>}';
  if (content.includes(old3b)) {
    content = content.replace(old3b, 'previewDoc&&canUploadDownload&&<button onClick={async()=>{const reason=prompt("Reason for archiving:");if(!reason)return;const now=new Date().toISOString();const{error}=await supabase.from("documents").update({status:"Archived",archived_by:user.email,archived_at:now,archive_reason:reason,pre_archive_status:previewDoc.status}).eq("id",previewDoc.id);if(!error){await logAudit("Document archived",previewDoc.id,previewDoc.study_id,"status",previewDoc.status,"Archived");setDocs((prev:any)=>prev.map((x:any)=>x.id===previewDoc.id?{...x,status:"Archived"}:x));setPreviewUrl(null);setPreviewDoc(null);}}} style={{fontSize:"11px",padding:"5px 12px",background:"#FFFBEB",color:"#92400E",border:"none",borderRadius:"6px",cursor:"pointer"}}>Archive</button>}');
    console.log('Fixed Preview modal delete');
  } else {
    console.log('Preview modal delete NOT found either');
  }
}

// Fix 4: Hide archived from documents panel
if (!content.includes('if(d.status==="Archived")return false;')) {
  content = content.replace(
    'const filteredDocs=studyDocs.filter(d=>{\n    if(docFilter!=="all"&&d.status!==docFilter)return false;',
    'const filteredDocs=studyDocs.filter(d=>{\n    if(d.status==="Archived")return false;\n    if(docFilter!=="all"&&d.status!==docFilter)return false;'
  );
  console.log('Fixed filteredDocs to hide archived');
}

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
