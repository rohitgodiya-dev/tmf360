const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// FIX 1: When zone is disabled, also disable artifacts in that zone
c = c.replace(
  'setShowDisableModal(false);setDisableTarget(null);setDisableReason("");loadConfig();',
  'if(disableTarget.type==="zone"){supabase.from("tmf_config").update({is_enabled:false,disabled_reason:"Parent zone disabled",disabled_by:user.email,disabled_at:now}).eq("org_id",orgId).eq("study_id",activeStudy.study_id).eq("zone_num",disableTarget.zone_num).eq("type","artifact").then(()=>{});}\nsetShowDisableModal(false);setDisableTarget(null);setDisableReason("");loadConfig();'
);

// FIX 2: Zone dropdown - use activeTMF
c = c.replace(
  'setFZone(e.target.value);const arts=TMF.filter(a=>a.z===e.target.value);const customArts=tmfConfig.filter(c=>c.type==="artifact"&&c.zone_num===e.target.value&&!arts.some(b=>b.a===c.artifact_num)).map(c=>({a:c.artifact_num,an:c.artifact_name,z:c.zone_num}));const allArts=[...arts,...customArts];setZoneArts(allArts);',
  'setFZone(e.target.value);const allArts=activeTMF.filter(a=>a.z===e.target.value);setZoneArts(allArts);'
);

// FIX 2: Artifact dropdown - use activeTMF
c = c.replace(
  '{(()=>{const base=zoneArts.length>0?zoneArts:TMF.filter(a=>a.z===fZone);const custom=tmfConfig.filter(c=>c.type==="artifact"&&c.zone_num===fZone&&!base.some(b=>b.a===c.artifact_num)).map(c=>({a:c.artifact_num,an:c.artifact_name,z:c.zone_num}));return[...base,...custom].map(a=><option key={a.a} value={`${a.a}|${a.an}|${a.z}`}>{a.a} - {a.an}</option>);})()}',
  '{(zoneArts.length>0?zoneArts:activeTMF.filter(a=>a.z===fZone)).map(a=><option key={a.a} value={`${a.a}|${a.an}|${a.z}`}>{a.a} - {a.an}</option>)}'
);

// FIX 3: Add userFullName state
c = c.replace(
  'const[tmfConfig,setTmfConfig]=useState<any[]>([]);',
  'const[tmfConfig,setTmfConfig]=useState<any[]>([]);\n  const[userFullName,setUserFullName]=useState("");'
);

// FIX 3: Fetch full_name in loadUserRole
c = c.replace(
  'select("role,can_upload_download,can_download,org_id")',
  'select("role,can_upload_download,can_download,org_id,full_name")'
);

// FIX 3: Set userFullName when role loads
c = c.replace(
  'setCanDownload(data.can_download!==false);',
  'setCanDownload(data.can_download!==false);\n      setUserFullName(data.full_name||"");'
);

// FIX 3: Auto-populate owner when Add document button clicked
c = c.replace(
  '{activeStudy&&canUploadDownload&&<button onClick={()=>setShowDocModal(true)}',
  '{activeStudy&&canUploadDownload&&<button onClick={()=>{setShowDocModal(true);setFOwner(userFullName||user?.email||"");}}'
);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. File length:', c.length);

const checks = [
  ['Fix 1 - zone disable cascades', c.includes('Parent zone disabled')],
  ['Fix 2 - activeTMF zone filter', c.includes('const allArts=activeTMF.filter(a=>a.z===e.target.value)')],
  ['Fix 3 - userFullName state', c.includes('userFullName,setUserFullName')],
  ['Fix 3 - full_name fetched', c.includes('full_name")')],
  ['Fix 3 - owner auto-populated', c.includes('setFOwner(userFullName')],
];
checks.forEach(([name, ok]) => console.log(ok ? 'OK' : 'FAIL', name));
