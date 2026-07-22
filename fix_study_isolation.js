const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: In loadStudiesWithOrg, preserve current active study instead of always going to data[0]
content = content.replace(
  'async function loadStudiesWithOrg(oid:string){\n    const{data}=await supabase.from("studies").select("*").eq("org_id",oid).order("created_at",{ascending:false});\n    if(data&&data.length>0){setStudies(data);setActiveStudy(data[0]);loadDocsWithOrg(data[0].study_id,oid);}\n    else setStudies([]);\n  }',
  'async function loadStudiesWithOrg(oid:string,preserveStudyId?:string){\n    const{data}=await supabase.from("studies").select("*").eq("org_id",oid).order("created_at",{ascending:false});\n    if(data&&data.length>0){\n      setStudies(data);\n      const savedStudyId=preserveStudyId||localStorage.getItem("tmf_active_study");\n      const toSelect=savedStudyId?data.find((s:any)=>s.study_id===savedStudyId)||data[0]:data[0];\n      setActiveStudy(toSelect);\n      loadDocsWithOrg(toSelect.study_id,oid);\n    }\n    else setStudies([]);\n  }'
);

// Fix 2: Save active study to localStorage when it changes via dropdown
content = content.replace(
  'onChange={e=>{const s=studies.find(x=>x.study_id===e.target.value);if(s){setActiveStudy(s);if(orgId)loadDocsWithOrg(s.study_id,orgId);}}}',
  'onChange={e=>{const s=studies.find(x=>x.study_id===e.target.value);if(s){setActiveStudy(s);localStorage.setItem("tmf_active_study",s.study_id);if(orgId)loadDocsWithOrg(s.study_id,orgId);}}}'
);

// Fix 3: Save active study when new study is created
content = content.replace(
  'if(!error&&data){const ns=data[0];setStudies(prev=>[ns,...prev]);setActiveStudy(ns);setDocs([]);}',
  'if(!error&&data){const ns=data[0];setStudies(prev=>[ns,...prev]);setActiveStudy(ns);setDocs([]);localStorage.setItem("tmf_active_study",ns.study_id);}'
);

// Fix 4: Pass preserved study ID when loading studies from auth state change
content = content.replace(
  'else{const saved=typeof window!=="undefined"?localStorage.getItem("tmf_panel"):null;setPanel(saved&&saved!=="auth"?saved:"dashboard");loadUserRole(session.user.id);}',
  'else{const saved=typeof window!=="undefined"?localStorage.getItem("tmf_panel"):null;setPanel(saved&&saved!=="auth"?saved:"dashboard");loadUserRole(session.user.id);}'
);

// Fix 5: Update loadUserRole to pass current active study
content = content.replace(
  'if(data.org_id){setOrgId(data.org_id);loadStudiesWithOrg(data.org_id);}',
  'if(data.org_id){setOrgId(data.org_id);const savedStudyId=typeof window!=="undefined"?localStorage.getItem("tmf_active_study"):"";loadStudiesWithOrg(data.org_id,savedStudyId||undefined);}'
);

// Fix 6: Clear active study on sign out
content = content.replace(
  'async function handleSignOut(){\n    await supabase.auth.signOut();\n    setUser(null);setPanel("auth");setStudies([]);setDocs([]);setActiveStudy(null);\n    setOrgId("");setCurrentUserRole("");\n  }',
  'async function handleSignOut(){\n    await supabase.auth.signOut();\n    localStorage.removeItem("tmf_active_study");\n    setUser(null);setPanel("auth");setStudies([]);setDocs([]);setActiveStudy(null);\n    setOrgId("");setCurrentUserRole("");\n  }'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
