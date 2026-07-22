const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: When a new study is created, auto-add the creator as a member
content = content.replace(
  'if(!error&&data){const ns=data[0];setStudies(prev=>[ns,...prev]);setActiveStudy(ns);setDocs([]);localStorage.setItem("tmf_active_study",ns.study_id);}',
  'if(!error&&data){const ns=data[0];setStudies(prev=>[ns,...prev]);setActiveStudy(ns);setDocs([]);localStorage.setItem("tmf_active_study",ns.study_id);await supabase.from("study_members").insert([{org_id:orgId,study_id:ns.study_id,user_id:user.id,email:user.email,full_name:userFullName||user.email,role:currentUserRole,added_by:user.email,is_active:true}]);}'
);

// Fix 2: Filter studies to only show ones the user is a member of (or all for System Admin)
content = content.replace(
  'async function loadStudiesWithOrg(oid:string,preserveStudyId?:string){\n    const{data}=await supabase.from("studies").select("*").eq("org_id",oid).order("created_at",{ascending:false});\n    if(data&&data.length>0){\n      setStudies(data);\n      const savedStudyId=preserveStudyId||(typeof window!=="undefined"?localStorage.getItem("tmf_active_study"):"");\n      const toSelect=savedStudyId?data.find((s:any)=>s.study_id===savedStudyId)||data[0]:data[0];\n      setActiveStudy(toSelect);\n      loadDocsWithOrg(toSelect.study_id,oid);\n    }\n    else setStudies([]);\n  }',
  'async function loadStudiesWithOrg(oid:string,preserveStudyId?:string){\n    const{data}=await supabase.from("studies").select("*").eq("org_id",oid).order("created_at",{ascending:false});\n    if(data&&data.length>0){\n      // Filter to studies user is a member of (System Admin sees all)\n      let visibleStudies=data;\n      if(currentUserRole!=="System Administrator"){\n        const{data:memberships}=await supabase.from("study_members").select("study_id").eq("user_id",user?.id||"").eq("is_active",true);\n        if(memberships&&memberships.length>0){\n          const memberStudyIds=memberships.map((m:any)=>m.study_id);\n          visibleStudies=data.filter((s:any)=>memberStudyIds.includes(s.study_id));\n        }\n      }\n      if(visibleStudies.length===0){setStudies([]);return;}\n      setStudies(visibleStudies);\n      const savedStudyId=preserveStudyId||(typeof window!=="undefined"?localStorage.getItem("tmf_active_study"):"");\n      const toSelect=savedStudyId?visibleStudies.find((s:any)=>s.study_id===savedStudyId)||visibleStudies[0]:visibleStudies[0];\n      setActiveStudy(toSelect);\n      loadDocsWithOrg(toSelect.study_id,oid);\n    }\n    else setStudies([]);\n  }'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
