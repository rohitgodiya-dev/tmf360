const fs = require('fs');
let content = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Fix 1: TicketPanel - pass activeStudy as prop
content = content.replace(
  '<TicketPanel user={user} P={P} supabase={supabase} orgId={orgId} currentUserRole={currentUserRole}/>',
  '<TicketPanel user={user} P={P} supabase={supabase} orgId={orgId} currentUserRole={currentUserRole} activeStudy={activeStudy}/>'
);

// Fix 2: TicketPanel component signature - add activeStudy
content = content.replace(
  'function TicketPanel({user, P, supabase, orgId, currentUserRole}: {user: any, P: any, supabase: any, orgId: string, currentUserRole: string})',
  'function TicketPanel({user, P, supabase, orgId, currentUserRole, activeStudy}: {user: any, P: any, supabase: any, orgId: string, currentUserRole: string, activeStudy: any})'
);

// Fix 3: TicketPanel loadTickets - filter by study_id
content = content.replace(
  'const q = supabase.from("support_tickets").select("*").eq("org_id", orgId).order("created_at", {ascending: false});\n    const {data} = canManage ? await q : await q.eq("created_by", user.id);',
  'const studyId = activeStudy?.study_id||"";\n    const q = supabase.from("support_tickets").select("*").eq("org_id", orgId).eq("study_id", studyId).order("created_at", {ascending: false});\n    const {data} = canManage ? await q : await q.eq("created_by", user.id);'
);

// Fix 4: TicketPanel useEffect - reload when activeStudy changes
content = content.replace(
  'useEffect(() => { if (user) loadTickets(); }, [user]);',
  'useEffect(() => { if (user) loadTickets(); }, [user, activeStudy]);'
);

// Fix 5: TicketPanel createTicket - save study_id
content = content.replace(
  'const {error} = await supabase.from("support_tickets").insert([{\n      org_id: orgId, created_by: user.id, created_by_email: user.email,\n      title: title.trim(), description: description.trim(),\n      priority, status: "Open",\n    }]);',
  'const {error} = await supabase.from("support_tickets").insert([{\n      org_id: orgId, study_id: activeStudy?.study_id||"", created_by: user.id, created_by_email: user.email,\n      title: title.trim(), description: description.trim(),\n      priority, status: "Open",\n    }]);'
);

// Fix 6: TicketPanel header - show study name
content = content.replace(
  '<h1 style={{fontSize:"14px",fontWeight:"500"}}>Support Tickets</h1>',
  '<h1 style={{fontSize:"14px",fontWeight:"500"}}>Support Tickets{activeStudy?" - "+activeStudy.study_id:""}</h1>'
);

fs.writeFileSync('app/platform/page.tsx', content, 'utf8');
console.log('done');
