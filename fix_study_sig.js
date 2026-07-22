const fs = require('fs');
let lines = fs.readFileSync('app/platform/page.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function loadStudiesWithOrg(oid:string)')) {
    lines[i] = lines[i].replace(
      'async function loadStudiesWithOrg(oid:string)',
      'async function loadStudiesWithOrg(oid:string,preserveStudyId?:string)'
    );
    console.log('Fixed signature at line', i + 1);
  }
  if (lines[i].includes('if(data&&data.length>0){setStudies(data);setActiveStudy(data[0]);loadDocsWithOrg(data[0].study_id,oid);}')) {
    lines[i] = `    if(data&&data.length>0){setStudies(data);const savedStudyId=preserveStudyId||(typeof window!=="undefined"?localStorage.getItem("tmf_active_study"):"");const toSelect=savedStudyId?data.find((s:any)=>s.study_id===savedStudyId)||data[0]:data[0];setActiveStudy(toSelect);loadDocsWithOrg(toSelect.study_id,oid);}`;
    console.log('Fixed body at line', i + 1);
  }
}

fs.writeFileSync('app/platform/page.tsx', lines.join('\n'), 'utf8');
console.log('done');
