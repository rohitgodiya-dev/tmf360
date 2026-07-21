const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

content = content.replace(
  ': <iframe src={previewUrl} style={{width:"100%",height:"calc(100vh - 300px)",border:"none",borderRadius:"8px",background:"#fff"}}/>',
  ': <iframe src={previewUrl} style={{width:"100%",height:"calc(100vh - 300px)",border:"none",borderRadius:"8px",background:"#fff"}} onError={()=>setPreviewUrl(null)}/>'
);

// Also wrap the TMF Auditor preview area with a fallback
content = content.replace(
  '{previewUrl ? (\n                selectedDoc.file_name?.match(/.(png|jpg|jpeg|gif|webp)$/i)\n                  ? <img src={previewUrl} alt={selectedDoc.file_name} style={{maxWidth:"100%",height:"auto",borderRadius:"8px",boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}/>\n                  : <iframe src={previewUrl} style={{width:"100%",height:"calc(100vh - 300px)",border:"none",borderRadius:"8px",background:"#fff"}} onError={()=>setPreviewUrl(null)}/>\n              ) : (',
  '{previewUrl ? (\n                selectedDoc.file_name?.match(/.(png|jpg|jpeg|gif|webp)$/i)\n                  ? <img src={previewUrl} alt={selectedDoc.file_name} style={{maxWidth:"100%",height:"auto",borderRadius:"8px",boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}/>\n                  : <iframe src={previewUrl} style={{width:"100%",height:"calc(100vh - 300px)",border:"none",borderRadius:"8px",background:"#fff"}} onError={(e)=>{(e.target as HTMLIFrameElement).style.display="none";}}/>\n              ) : ('
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
