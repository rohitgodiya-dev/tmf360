const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: totalW and earnedW - still using ZONES instead of activeZONES
c = c.replace(
  'const totalW=ZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+w;},0);',
  'const totalW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+w;},0);'
);
c = c.replace(
  'const earnedW=ZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+(zoneComp(z)/100)*w;},0);',
  'const earnedW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+(zoneComp(z)/100)*w;},0);'
);

// Fix 2: Completeness detail - uses TMF instead of activeTMF
c = c.replace(
  'const zoneArtsAll=TMF.filter(a=>a.cl==="Core"&&a.z===z);',
  'const zoneArtsAll=activeTMF.filter(a=>a.cl==="Core"&&a.z===z);'
);

// Fix 3: Missing detail - uses TMF instead of activeTMF
c = c.replace(
  'const items=TMF.filter(a=>a.cl==="Core"&&sevZones.includes(a.z)&&!filedNames.some(f=>f===a.a));',
  'const items=activeTMF.filter(a=>a.cl==="Core"&&sevZones.includes(a.z)&&!filedNames.some(f=>f===a.a));'
);

// Fix 4: Gap analysis zone dropdown - broken with doubled options and missing closing tags
const brokenGap = `                  <select value={gapZone} onChange={e=>setGapZone(e.target.value)} style={{fontSize:"11px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"6px 10px",width:"220px"}}>
                    <option value="">All zones</option>
                    {[...activeZONES,...tmfConfig.filter(c=>c.type==="zone"&&!activeZONES.some(z=>z.z===c.zone_num)).map(c=>({z:c.zone_num,zn:c.zone_name})).filter(c=>c.type==="zone"&&!ZONES.some(z=>z.z===c.zone_num)).map(c=>({z:c.zone_num,zn:c.zone_name}))].map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                    {activeZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                  <div style={{display:"grid"`;

const fixedGap = `                  <select value={gapZone} onChange={e=>setGapZone(e.target.value)} style={{fontSize:"11px",border:\`0.5px solid \${P.border}\`,borderRadius:"8px",padding:"6px 10px",width:"220px"}}>
                    <option value="">All zones</option>
                    {activeZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                  </select>
                  <div style={{display:"grid"`;

c = c.replace(brokenGap, fixedGap);

// Fix 5: Doc modal Zone dropdown - broken with doubled options and missing closing tag
const brokenDoc = `                {[...activeZONES,...tmfConfig.filter(c=>c.type==="zone"&&!activeZONES.some(z=>z.z===c.zone_num)).map(c=>({z:c.zone_num,zn:c.zone_name})).filter(c=>c.type==="zone"&&!ZONES.some(z=>z.z===c.zone_num)).map(c=>({z:c.zone_num,zn:c.zone_name}))].map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                {activeZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
            </div>`;

const fixedDoc = `                {activeZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
              </select>
            </div>`;

c = c.replace(brokenDoc, fixedDoc);

// Fix 6: Trinity chat - uses ZONES.find instead of activeZONES.find
c = c.replace(
  'const zoneInfo=ZONES.find(z=>z.z===doc.zone);',
  'const zoneInfo=activeZONES.find(z=>z.z===doc.zone);'
);

// Fix 7: Trinity chat - uses TMF.find instead of activeTMF.find (2 instances)
c = c.replace(
  /const art=TMF\.find\(a=>a\.a===doc\.artifact_num\);/g,
  'const art=activeTMF.find(a=>a.a===doc.artifact_num);'
);
c = c.replace(
  /const art=TMF\.find\(a=>a\.a===pendingDoc\.artifact_num\);/g,
  'const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);'
);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. File length:', c.length);

// Verify key fixes
const checks = [
  ['activeZONES.reduce', c.includes('activeZONES.reduce')],
  ['activeTMF.filter(a=>a.cl==="Core"&&sevZones', c.includes('activeTMF.filter(a=>a.cl==="Core"&&sevZones')],
  ['activeTMF.filter(a=>a.cl==="Core"&&a.z===z)', c.includes('activeTMF.filter(a=>a.cl==="Core"&&a.z===z)')],
  ['No ZONES.reduce', !c.includes('ZONES.reduce')],
  ['No doubled options in gap', !c.includes('ZONES.some')],
];
checks.forEach(([name, ok]) => console.log(ok ? 'OK' : 'FAIL', name));
