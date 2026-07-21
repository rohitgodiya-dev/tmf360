const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: Update canPreview to return true for all previewable types including doc/xls/ppt
content = content.replace(
  'function canPreview(n:string){return["pdf","png","jpg","jpeg","gif","webp"].includes(n.split(".").pop()?.toLowerCase()||"");}',
  'function canPreview(n:string){return["pdf","png","jpg","jpeg","gif","webp","doc","docx","xls","xlsx","ppt","pptx"].includes(n.split(".").pop()?.toLowerCase()||"");}'
);

// Fix 2: Update preview modal to use Google Docs Viewer for non-image files
content = content.replace(
  '{previewName.match(/\\.(png|jpg|jpeg|gif|webp)$/i)?<img src={previewUrl} alt={previewName} style={{maxWidth:"100%",height:"auto"}}/>:<iframe src={previewUrl} style={{width:"100%",height:"70vh",border:"none"}}/>}',
  '{previewName.match(/\\.(png|jpg|jpeg|gif|webp)$/i)?<img src={previewUrl} alt={previewName} style={{maxWidth:"100%",height:"auto"}}/>:previewName.match(/\\.(pdf)$/i)?<iframe src={previewUrl} style={{width:"100%",height:"70vh",border:"none"}}/>:<iframe src={"https://docs.google.com/viewer?url="+encodeURIComponent(previewUrl)+"&embedded=true"} style={{width:"100%",height:"70vh",border:"none"}}/>}'
);

// Fix 3: Artifact browser - show preview for all file types
content = content.replace(
  '{d.file_path&&(canPreview(d.file_name||"")||canPreview(d.custom_file_name||""))&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}',
  '{d.file_path&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}'
);

// Fix 4: Documents panel - show preview for all file types
content = content.replace(
  '{d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"3px 8px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}',
  '{d.file_path&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"3px 8px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}'
);

content = content.replace(
  '{d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}',
  '{d.file_path&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
