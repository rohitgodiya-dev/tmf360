const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Find "async function loadUsers()" inside UserManagementPanel and add study member functions before it
const target = '  async function loadUsers() {';
const idx = content.indexOf(target);

if (idx !== -1) {
  const newFunctions = `  useEffect(() => { if (activeStudy && orgId) loadStudyMembers(); }, [activeStudy]);

  async function loadStudyMembers() {
    const {data} = await supabase.from("study_members").select("*").eq("study_id", activeStudy?.study_id||"").eq("org_id", orgId).order("added_at", {ascending: false});
    if (data) setStudyMembers(data);
  }

  async function addStudyMember() {
    if (!memberUserId) return;
    const u = users.find((x:any) => x.user_id === memberUserId);
    if (!u) return;
    const {error} = await supabase.from("study_members").upsert([{org_id:orgId,study_id:activeStudy?.study_id,user_id:memberUserId,email:u.email,full_name:u.full_name||u.email,role:memberRole,added_by:user?.email,is_active:true}]);
    if (!error) { setMemberMsg("Member added successfully."); loadStudyMembers(); setShowAddMember(false); setTimeout(()=>setMemberMsg(""),3000); }
  }

  async function removeStudyMember(id: string) {
    await supabase.from("study_members").update({is_active:false}).eq("id", id);
    loadStudyMembers();
  }

  `;
  content = content.slice(0, idx) + newFunctions + content.slice(idx);
  console.log('Inserted study member functions');
} else {
  console.log('Target not found');
}

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
