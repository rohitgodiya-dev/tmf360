const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');
const old = 'async function toggleNotifications(id: string, current: boolean) {';
const rep = 'async function toggleDelete(id: string, current: boolean) { supabase.from("user_roles").update({can_delete:!current}).eq("id",id).then(()=>loadUsers()); }  async function toggleNotifications(id: string, current: boolean) {';
content = content.replace(old, rep);
fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
