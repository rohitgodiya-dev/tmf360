'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Design tokens — matched 1:1 to TMF360's palette (app/platform/page.tsx `P` object)
// so Site360 and TMF360 read as one product. Key names kept as before so every
// panel below keeps working unchanged; only the hex values moved to match TMF360.
const C = {
  orange: '#F97316', orangeLight: '#FFEDD5', orangeDark: '#EA580C',
  bg: '#F9FAFB', bgCard: '#FFFFFF', bgTert: '#F3F4F6',
  border: '#E5E7EB', divider: '#E5E7EB',
  text: '#111827', textSec: '#374151', textMuted: '#6B7280',
  green: '#10B981', greenLight: '#ECFDF5',
  red: '#EF4444', redLight: '#FEF2F2',
  blue: '#3B82F6', blueLight: '#EFF6FF',
  amber: '#F59E0B', amberLight: '#FFFBEB',
  purple: '#8B5CF6', purpleLight: '#F5F3FF',
};

type Panel = 'dashboard' | 'activation' | 'isf' |
  'participants' | 'supplies' | 'safety' | 'monitoring' | 'payments' |
  'readiness' | 'report' | 'audit' | 'archived' |
  'tasks' | 'messages' | 'queries' | 'users' | 'ticket' | 'studies';

// Icon classes are Tabler Icons font classes (`ti ti-*`), loaded via the same
// CDN link TMF360 uses — see the <link> tag in the header below. This is the
// icon system TMF360 uses; Site360 previously used emoji, which is one of the
// two things that made it look like a different, unrelated product.
const NAV_GROUPS = [
  { label: 'Overview', items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { key: 'studies', label: 'Studies', icon: 'ti-flask' },
  ]},
  { label: 'Site', items: [
    { key: 'activation', label: 'Site Activation', icon: 'ti-list-check' },
    { key: 'isf', label: 'ISF', icon: 'ti-files' },
    { key: 'participants', label: 'Participants', icon: 'ti-users' },
    { key: 'supplies', label: 'IP & Supplies', icon: 'ti-pill' },
    { key: 'safety', label: 'Safety Reporting', icon: 'ti-shield-exclamation' },
    { key: 'monitoring', label: 'Monitoring Visits', icon: 'ti-clipboard-search' },
    { key: 'payments', label: 'Payments', icon: 'ti-cash' },
  ]},
  { label: 'Intelligence', items: [
    { key: 'readiness', label: 'Inspection Readiness', icon: 'ti-shield-check' },
    { key: 'report', label: 'Report', icon: 'ti-file-analytics' },
    { key: 'audit', label: 'Audit Trail', icon: 'ti-lock' },
    { key: 'archived', label: 'Archived', icon: 'ti-archive' },
  ]},
  { label: 'Team', items: [
    { key: 'tasks', label: 'Tasks', icon: 'ti-checkbox' },
    { key: 'users', label: 'User Management', icon: 'ti-users-group' },
    { key: 'messages', label: 'Messages', icon: 'ti-message-2' },
    { key: 'queries', label: 'Queries', icon: 'ti-help-circle' },
  ]},
  { label: 'Settings', items: [
    { key: 'ticket', label: 'Ticket', icon: 'ti-ticket' },
  ]},
];

export default function Site360Page() {
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [site, setSite] = useState<any>(null);
  const [studies, setStudies] = useState<any[]>([]);
  const [activeStudy, setActiveStudy] = useState<any>(null);
  const [showStudyDropdown, setShowStudyDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<any>(null);

  // Panel data
  const [participants, setParticipants] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [aeReports, setAeReports] = useState<any[]>([]);
  const [deviations, setDeviations] = useState<any[]>([]);
  const [activationItems, setActivationItems] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [isfDocs, setIsfDocs] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);

  // Forms
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', due_date: '', assigned_to_name: '', linked_panel: '' });
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ full_name: '', email: '', phone: '', participant_code: '', language_preference: 'en' });
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [showAddAE, setShowAddAE] = useState(false);
  const [newAE, setNewAE] = useState({ ae_number: '', description: '', onset_date: '', severity: 'Mild', relatedness: 'Unrelated', is_serious: false });
  const [showNewStudy, setShowNewStudy] = useState(false);
  const [newStudy, setNewStudy] = useState({ study_id: '', protocol: '', sponsor: '', phase: 'Phase I', status: 'Startup' });
  const [creatingStudy, setCreatingStudy] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (activeStudy && site) loadStudyData(); }, [activeStudy]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = '/site360/login'; return; }
      setUser(u);

      const { data: ur } = await supabase.from('user_roles').select('org_id, full_name, role').eq('user_id', u.id).single();
      if (!ur) { window.location.href = '/site360/login'; return; }
      setUserRole(ur);

      const { data: siteData } = await supabase.from('sites').select('*').eq('org_id', ur.org_id).single();
      if (!siteData) { setLoading(false); return; }
      setSite({ ...siteData, user_name: ur.full_name || u.email?.split('@')[0], user_role: ur.role });

      // Load all studies for this site via bridge table
      const { data: siteStudies } = await supabase
        .from('site_studies')
        .select('*, studies(*)')
        .eq('site_id', siteData.id)
        .eq('org_id', ur.org_id);

      if (siteStudies && siteStudies.length > 0) {
        const studyList = siteStudies.map(ss => ({ ...ss.studies, site_study_id: ss.id, site_study_status: ss.status, activation_date: ss.activation_date }));
        setStudies(studyList);
        setActiveStudy(studyList[0]);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadStudyData() {
    if (!activeStudy || !site) return;
    try {
      const [
        { data: pData }, { data: tData }, { data: vData }, { data: mData },
        { data: invData }, { data: aeData }, { data: devData }, { data: actData },
        { data: aiData }, { data: isfData }, { data: auditData }, { data: queryData },
      ] = await Promise.all([
        supabase.from('participants').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('site_tasks').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('due_date', { ascending: true }),
        supabase.from('monitoring_visits').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('scheduled_date', { ascending: false }),
        supabase.from('payment_milestones').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('due_date', { ascending: true }),
        supabase.from('ip_inventory').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id),
        supabase.from('ae_reports').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('protocol_deviations').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('site_activation_items').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id),
        supabase.from('monitoring_action_items').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('isf_documents').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('isf_audit_trail').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('isf_queries').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
      ]);

      if (pData) setParticipants(pData);
      if (tData) setTasks(tData);
      if (vData) setVisits(vData);
      if (mData) setMilestones(mData);
      if (invData) setInventory(invData);
      if (aeData) setAeReports(aeData);
      if (devData) setDeviations(devData);
      if (aiData) setActionItems(aiData);
      if (isfData) setIsfDocs(isfData);
      if (auditData) setAuditTrail(auditData);
      if (queryData) setQueries(queryData);

      if (actData && actData.length === 0) {
        // This study has no checklist yet — seed the default regulatory
        // checklist for THIS study and re-fetch, rather than showing empty.
        await seedActivationChecklist();
      } else if (actData) {
        setActivationItems(actData);
      }
    } catch (e) { console.error(e); }
  }

  async function addTask() {
    if (!newTask.title || !site || !activeStudy) return;
    await supabase.from('site_tasks').insert([{ site_id: site.id, study_id: activeStudy.id, org_id: userRole?.org_id, ...newTask, status: 'Open', created_by: user.id }]);
    setShowAddTask(false);
    setNewTask({ title: '', priority: 'Medium', due_date: '', assigned_to_name: '', linked_panel: '' });
    loadStudyData();
  }

  async function addParticipant() {
    if (!newParticipant.full_name || !newParticipant.email || !site || !activeStudy) return;
    setAddingParticipant(true);
    await supabase.from('participants').insert([{ org_id: userRole?.org_id, study_id: activeStudy.id, site_id: site.id, ...newParticipant, status: 'screening' }]);
    setShowAddParticipant(false);
    setNewParticipant({ full_name: '', email: '', phone: '', participant_code: '', language_preference: 'en' });
    setAddingParticipant(false);
    loadStudyData();
  }

  // Default site regulatory checklist — seeded into site_activation_items for a
  // site the first time its checklist is empty (see the effect below). After
  // that, the table is the source of truth and this constant is never read again.
  const DEFAULT_ACTIVATION_ITEMS = [
    "Investigator's Agreement completed, signed and dated by the Principal Investigator.",
    'IRB/IEC Approval Letter',
    'Current medical license in the state of which the PI and any sub-investigator (if applicable) is conducting the trial.',
    'IRB/IEC Approved Informed Consent',
    'Signed Informed Consent Approval Checklist',
    'Current IRB/IEC membership list, statement of compliance or FWA number',
    'Curriculum vitae (CV) of PI and Sub-Investigators',
    'Protocol Signature Page: Signed and dated by PI.',
    'Financial Disclosure Forms: Financial disclosure forms must be completed, signed and dated by principal investigator and all sub-investigators listed.',
    'Check all investigators against the FDA Debarment List or Disqualified/Restricted/Assurances List',
    'Fully executed Clinical Trial Research Agreement (CTRA)',
  ];

  async function seedActivationChecklist() {
    if (!site || !userRole || !activeStudy) return;
    await supabase.from('site_activation_items').insert(
      DEFAULT_ACTIVATION_ITEMS.map(item_name => ({ site_id: site.id, study_id: activeStudy.id, org_id: userRole.org_id, item_name, status: 'Open' }))
    );
    loadStudyData();
  }

  async function addActivationItem() {
    if (!site || !userRole || !activeStudy) return;
    await supabase.from('site_activation_items').insert([{ site_id: site.id, study_id: activeStudy.id, org_id: userRole.org_id, item_name: 'New item', status: 'Open' }]);
    loadStudyData();
  }

  async function updateActivationItem(id: string, fields: Record<string, any>) {
    await supabase.from('site_activation_items').update(fields).eq('id', id);
    loadStudyData();
  }

  async function deleteActivationItem(id: string) {
    await supabase.from('site_activation_items').delete().eq('id', id);
    loadStudyData();
  }

  async function addAE() {
    if (!newAE.description || !site || !activeStudy) return;
    await supabase.from('ae_reports').insert([{ org_id: userRole?.org_id, site_id: site.id, study_id: activeStudy.id, ...newAE, report_date: new Date().toISOString().split('T')[0], reported_by: user.id, status: 'Open' }]);
    setShowAddAE(false);
    setNewAE({ ae_number: '', description: '', onset_date: '', severity: 'Mild', relatedness: 'Unrelated', is_serious: false });
    loadStudyData();
  }

  // Creates a new study, then links it to this site via the same site_studies
  // bridge table loadData() reads from — so it immediately shows up in the
  // header switcher and the Studies panel, same as any sponsor-created study.
  async function addStudy() {
    if (!newStudy.study_id || !site || !userRole) return;
    setCreatingStudy(true);
    try {
      const { data: study, error } = await supabase.from('studies').insert([{
        org_id: userRole.org_id,
        study_id: newStudy.study_id,
        protocol: newStudy.protocol,
        sponsor: newStudy.sponsor,
        phase: newStudy.phase,
        status: newStudy.status,
      }]).select().single();
      if (error || !study) { console.error(error); setCreatingStudy(false); return; }

      await supabase.from('site_studies').insert([{
        org_id: userRole.org_id,
        site_id: site.id,
        study_id: study.id,
        status: newStudy.status,
        activation_date: new Date().toISOString().split('T')[0],
      }]);

      setShowNewStudy(false);
      setNewStudy({ study_id: '', protocol: '', sponsor: '', phase: 'Phase I', status: 'Startup' });
      setCreatingStudy(false);
      loadData();
    } catch (e) { console.error(e); setCreatingStudy(false); }
  }

  async function updateTask(id: string, status: string) {
    await supabase.from('site_tasks').update({ status, completed_at: status === 'Completed' ? new Date().toISOString() : null }).eq('id', id);
    loadStudyData();
  }

  // Computed
  const openTasks = tasks.filter(t => t.status === 'Open').length;
  const openAEs = aeReports.filter(a => a.status === 'Open').length;
  const openQueries = queries.filter(q => q.status === 'Open').length;
  const enrolled = participants.filter(p => ['enrolled', 'active'].includes(p.status)).length;
  const isfApproved = isfDocs.filter(d => d.status === 'Approved').length;
  const healthScore = Math.min(100, Math.round(
    (activationItems.filter(i => i.status === 'Closed').length / Math.max(activationItems.length, 1)) * 20 +
    (isfApproved / Math.max(isfDocs.length, 1)) * 25 +
    (aeReports.filter(a => a.status !== 'Open').length / Math.max(aeReports.length, 1)) * 20 +
    (participants.filter(p => p.status !== 'withdrawn').length / Math.max(participants.length, 1)) * 20 +
    (visits.filter(v => v.status === 'Completed' || v.status === 'Report Finalized').length / Math.max(visits.length, 1)) * 15
  ));

  // UI helpers
  const card = (extra: any = {}): React.CSSProperties => ({ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px', ...extra });
  const badge = (text: string, color: string, bg: string) => <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', color, background: bg, whiteSpace: 'nowrap' as const }}>{text}</span>;
  const priorityColor = (p: string) => p === 'High' ? C.red : p === 'Medium' ? C.amber : C.green;
  const priorityBg = (p: string) => p === 'High' ? C.redLight : p === 'Medium' ? C.amberLight : C.greenLight;
  const statusColor = (s: string) => ['active', 'enrolled', 'Completed', 'Resolved', 'Paid', 'Approved', 'Report Finalized'].includes(s) ? C.green : ['screening', 'Pending', 'Open', 'Scheduled', 'Draft', 'Under Review'].includes(s) ? C.blue : ['withdrawn', 'Overdue', 'Screen Failed'].includes(s) ? C.red : C.amber;
  const statusBg = (s: string) => ['active', 'enrolled', 'Completed', 'Resolved', 'Paid', 'Approved', 'Report Finalized'].includes(s) ? C.greenLight : ['screening', 'Pending', 'Open', 'Scheduled', 'Draft', 'Under Review'].includes(s) ? C.blueLight : ['withdrawn', 'Overdue', 'Screen Failed'].includes(s) ? C.redLight : C.amberLight;

  const input = (value: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
  );

  const sel = (value: string, onChange: (v: string) => void, options: string[]) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', background: C.bgCard }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  const field = (label: string, el: React.ReactNode) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '5px' }}>{label}</label>
      {el}
    </div>
  );

  const modal = (title: string, onClose: () => void, children: React.ReactNode, onSave: () => void, saving = false) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: C.bgCard, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: C.textMuted }}>×</button>
        </div>
        {children}
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: C.bgCard, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ flex: 2, padding: '10px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  const tableHead = (cols: string[]) => (
    <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
      {cols.map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
    </tr></thead>
  );

  const emptyRow = (cols: number, msg: string) => (
    <tr><td colSpan={cols} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted, fontSize: '12px' }}>{msg}</td></tr>
  );

  // Copied verbatim from TMF360's app/platform/page.tsx so both dashboards
  // render the exact same ring/gauge visuals.
  const miniRing = (pct: number, color: string, size = 48, stroke = 5) => {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (Math.min(pct, 100) / 100) * c;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.bgTert} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
    );
  };

  const readinessGauge = (pct: number, size = 180, stroke = 16) => {
    const r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
    const sweep = 270, startAngle = 225;
    const polar = (ang: number) => { const rad = (ang - 90) * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; };
    const arcPath = (a0: number, a1: number) => { const p0 = polar(a0), p1 = polar(a1); const large = a1 - a0 <= 180 ? 0 : 1; return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`; };
    const endAngle = startAngle + sweep * (Math.min(pct, 100) / 100);
    const color = pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arcPath(startAngle, startAngle + sweep)} fill="none" stroke={C.bgTert} strokeWidth={stroke} strokeLinecap="round" />
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      </svg>
    );
  };

  const comingSoon = (title: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>{title}</div>
      <div style={{ ...card(), textAlign: 'center' as const, padding: '60px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔧</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '8px' }}>{title} — Coming Soon</div>
        <div style={{ fontSize: '13px', color: C.textMuted }}>This panel is in development. Check back soon.</div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      <div style={{ textAlign: 'center', color: C.textMuted }}>Loading Site360...</div>
    </div>
  );

  if (!site) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: C.text, marginBottom: '8px' }}>No site found for your account.</div>
        <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '16px' }}>Contact your administrator to be assigned to a site.</div>
        <button onClick={() => window.location.href = '/site360/login'} style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px' }}>Sign in again</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />

      {/* Header — same 48px flat bar as TMF360's app/platform/page.tsx header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 1.25rem', height: '48px', borderBottom: `0.5px solid ${C.border}`, background: C.bgCard, flexShrink: 0 }}>
        <span style={{ fontSize: '16px', fontWeight: 500 }}>Site<span style={{ color: C.orange }}>360</span></span>
        <span style={{ fontSize: '11px', color: C.textMuted }}>Site Operations Platform</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Study switcher */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowStudyDropdown(!showStudyDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', border: `0.5px solid ${C.border}`, borderRadius: '6px', padding: '3px 8px', background: C.bgCard, color: C.text, cursor: 'pointer' }}>
              {activeStudy ? `${activeStudy.study_id} — ${activeStudy.protocol || 'Study'}` : 'Select study'}
              <i className="ti ti-chevron-down" style={{ fontSize: '12px' }} />
            </button>
            {showStudyDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '240px', overflow: 'hidden' }}>
                {studies.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: '12px', color: C.textMuted }}>No studies found for this site.</div>
                ) : studies.map((s, i) => (
                  <button key={i} onClick={() => { setActiveStudy(s); setShowStudyDropdown(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', border: 'none', background: activeStudy?.id === s.id ? C.orangeLight : 'transparent', cursor: 'pointer', textAlign: 'left' as const, borderBottom: i < studies.length - 1 ? `0.5px solid ${C.border}` : 'none' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: activeStudy?.id === s.id ? C.orange : C.text }}>{s.study_id} — {s.protocol || 'Protocol TBD'}</div>
                      <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '1px' }}>{s.phase || ''} {s.sponsor ? `· ${s.sponsor}` : ''}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: s.status === 'Active' ? C.greenLight : C.amberLight, color: s.status === 'Active' ? C.green : C.amber }}>{s.site_study_status || s.status || 'Active'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {activeStudy && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: C.orangeLight, color: C.orange, fontWeight: 500 }}>Active</span>}
          <span style={{ fontSize: '11px', color: C.textMuted }}>{site.site_name}</span>
          <span style={{ fontSize: '11px', color: C.textMuted }}>{user?.email}</span>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/site360/login'; }} style={{ fontSize: '11px', color: C.textMuted, background: 'transparent', border: `0.5px solid ${C.border}`, borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Sidebar — same 192px white sidebar as TMF360's app/platform/page.tsx aside */}
      <aside style={{ width: '192px', borderRight: `0.5px solid ${C.border}`, background: C.bgCard, overflowY: 'auto', flexShrink: 0, padding: '8px', display: 'flex', flexDirection: 'column' }}>
        {/* Site info — Site360's one addition on top of the TMF360 pattern, since
            (unlike TMF360) a coordinator's identity is tied to one physical site */}
        <div style={{ margin: '4px 4px 8px', padding: '8px 10px', background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{site.site_name}</div>
          <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '1px' }}>{site.site_code}</div>
        </div>

        {/* Nav groups */}
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '8px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>{group.label}</p>
            {group.items.map(item => {
              const badgeCount = item.key === 'tasks' ? openTasks : item.key === 'safety' ? openAEs : item.key === 'queries' ? openQueries : 0;
              return (
                <button key={item.key} onClick={() => {
                  if (item.key === 'isf') { window.location.href = '/site360/isf'; return; }
                  setPanel(item.key as Panel);
                }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: '12px', background: panel === item.key ? C.orangeLight : 'transparent', color: panel === item.key ? C.orange : C.textSec, fontWeight: panel === item.key ? 500 : 400 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badgeCount > 0 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: C.red, color: '#fff', fontWeight: 600 }}>{badgeCount}</span>}
                </button>
              );
            })}
          </div>
        ))}

        {/* Footer */}
        <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: '8px', marginTop: 'auto' }}>
          <div style={{ fontSize: '11px', color: C.text, padding: '2px 10px' }}>{site.user_name}</div>
          <div style={{ fontSize: '10px', color: C.textMuted, padding: '0 10px 2px' }}>{site.user_role}</div>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/site360/login'; }} style={{ fontSize: '11px', color: C.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 10px', textAlign: 'left' as const, width: '100%' }}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }} onClick={() => showStudyDropdown && setShowStudyDropdown(false)}>

          {/* DASHBOARD — restructured to match TMF360's dashboard exactly:
              1) H1 + subtitle, 2) a 5-card metric strip (ring + 4 tinted cards,
              each with a "View X →" link), 3) a 1.15fr/1.4fr two-column row:
              left = category completeness bars + legend, right = two readiness
              gauges + top attention items + a CTA banner. See app/platform/page.tsx
              in TMF360 for the source of this pattern. */}
          {panel === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 700, color: C.text, margin: 0 }}>Dashboard {activeStudy ? `— ${activeStudy.study_id}` : ''}</h1>
                  <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{site.site_name} · Welcome back, {site.user_name?.split(' ')[0]}. Here's what's happening at your site.</p>
                </div>
              </div>

              {!activeStudy ? (
                <div style={{ textAlign: 'center' as const, padding: '3rem', color: C.textMuted, background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: C.text }}>No study selected</div>
                  <div style={{ fontSize: '12px' }}>Select a study from the header to see this site's dashboard.</div>
                </div>
              ) : (
                <>
                  {/* 5-card metric strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
                    {[
                      { val: healthScore, suffix: '%', label: 'Site readiness', sub: 'Overall progress', color: C.blue, tint: C.blueLight, icon: 'ti-chart-donut', link: 'View breakdown', page: 'readiness', ring: true },
                      { val: openTasks, suffix: '', label: 'Open tasks', sub: 'Require attention', color: C.amber, tint: C.amberLight, icon: 'ti-list-check', link: 'View tasks', page: 'tasks' },
                      { val: openAEs, suffix: '', label: 'Open safety events', sub: 'Pending resolution', color: openAEs > 0 ? C.red : C.green, tint: openAEs > 0 ? C.redLight : C.greenLight, icon: 'ti-shield-exclamation', link: 'Review now', page: 'safety' },
                      { val: inventory.filter(i => i.expiry_date && new Date(i.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length, suffix: '', label: 'Expiring supplies', sub: 'Within 30 days', color: C.red, tint: C.redLight, icon: 'ti-pill', link: 'View supplies', page: 'supplies' },
                      { val: openQueries, suffix: '', label: 'Open queries', sub: 'Awaiting response', color: C.blue, tint: C.blueLight, icon: 'ti-help-circle', link: 'View queries', page: 'queries' },
                    ].map((m, i) => (
                      <div key={i} style={{ background: m.tint, border: `0.5px solid ${C.border}`, borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {m.ring ? (
                            <div style={{ position: 'relative' as const, width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {miniRing(m.val, m.color)}
                              <span style={{ position: 'absolute' as const, fontSize: '10px', fontWeight: 700, color: m.color }}>{m.val}%</span>
                            </div>
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: C.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `0.5px solid ${C.border}` }}>
                              <i className={`ti ${m.icon}`} style={{ fontSize: '18px', color: m.color }} />
                            </div>
                          )}
                          <div style={{ fontSize: '22px', fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.val}{m.suffix}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{m.label}</div>
                          <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '1px' }}>{m.sub}</div>
                        </div>
                        <button onClick={() => setPanel(m.page as Panel)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: m.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>{m.link} <i className="ti ti-arrow-right" style={{ fontSize: '12px' }} /></button>
                      </div>
                    ))}
                  </div>

                  {/* Two-column: category completeness (left) + readiness gauges (right) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.4fr', gap: '12px', alignItems: 'start' }}>
                    <div style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '14px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: 700, color: C.text, margin: 0 }}>Site readiness by category</h2>
                      </div>
                      {[
                        ['Site Activation', 'ti-list-check', activationItems.length > 0 ? Math.round((activationItems.filter(i => i.status === 'Closed').length / activationItems.length) * 100) : 0],
                        ['ISF Completeness', 'ti-files', isfDocs.length > 0 ? Math.round((isfApproved / isfDocs.length) * 100) : 0],
                        ['Safety Compliance', 'ti-shield-exclamation', aeReports.length > 0 ? Math.round((aeReports.filter(a => a.status !== 'Open').length / aeReports.length) * 100) : 100],
                        ['Participant Retention', 'ti-users', participants.length > 0 ? Math.round((participants.filter(p => p.status !== 'withdrawn').length / participants.length) * 100) : 100],
                        ['Monitoring Readiness', 'ti-clipboard-search', visits.length > 0 ? Math.round((visits.filter(v => v.status === 'Report Finalized').length / visits.length) * 100) : 0],
                      ].map(([label, icon, pct], i) => {
                        const p = pct as number;
                        const barColor = p >= 75 ? C.green : p >= 50 ? C.blue : p >= 25 ? C.amber : p > 0 ? C.red : C.bgTert;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '6px 0' }}>
                            <i className={`ti ${icon}`} style={{ fontSize: '14px', color: C.textMuted, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: 500, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{label as string}</span>
                            <div style={{ width: '140px', height: '6px', background: C.bgTert, borderRadius: '6px', overflow: 'hidden' }}><div style={{ width: `${p}%`, height: '100%', background: barColor, borderRadius: '6px' }} /></div>
                            <span style={{ fontSize: '11px', fontWeight: 700, width: '32px', textAlign: 'right' as const, color: barColor }}>{p}%</span>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '14px', marginTop: '14px', paddingTop: '12px', borderTop: `0.5px solid ${C.border}` }}>
                        {[{ c: C.green, l: '\u2265 75%' }, { c: C.blue, l: '50 \u2013 74%' }, { c: C.amber, l: '25 \u2013 49%' }, { c: C.red, l: '< 25%' }, { c: C.bgTert, l: '0%' }].map((leg, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: leg.c, display: 'inline-block' }} />
                            <span style={{ fontSize: '10px', color: C.textMuted }}>{leg.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: 700, color: C.text, margin: 0 }}>Site readiness</h2>
                        <button onClick={() => setPanel('readiness')} style={{ fontSize: '11px', fontWeight: 600, color: C.blue, background: C.blueLight, border: `0.5px solid #BFDBFE`, borderRadius: '7px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>View details <i className="ti ti-arrow-right" style={{ fontSize: '12px' }} /></button>
                      </div>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '180px' }}>
                          <div style={{ position: 'relative' as const, width: '180px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {readinessGauge(healthScore)}
                            <div style={{ position: 'absolute' as const, top: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontSize: '30px', fontWeight: 700, color: C.text }}>{healthScore}%</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '-6px' }}>Readiness score</div>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: healthScore >= 80 ? C.green : healthScore >= 60 ? C.amber : C.red, background: healthScore >= 80 ? C.greenLight : healthScore >= 60 ? C.amberLight : C.redLight, borderRadius: '20px', padding: '3px 10px', marginTop: '8px' }}>{healthScore >= 80 ? 'Inspection ready' : healthScore >= 60 ? 'Needs attention' : 'Not ready'}</span>
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '180px' }}>
                          <div style={{ position: 'relative' as const, width: '180px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {readinessGauge(isfDocs.length > 0 ? Math.round((isfApproved / isfDocs.length) * 100) : 0)}
                            <div style={{ position: 'absolute' as const, top: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontSize: '30px', fontWeight: 700, color: C.text }}>{isfDocs.length > 0 ? Math.round((isfApproved / isfDocs.length) * 100) : 0}%</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '-6px' }}>ISF completeness</div>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: isfApproved === isfDocs.length && isfDocs.length > 0 ? C.green : C.amber, background: isfApproved === isfDocs.length && isfDocs.length > 0 ? C.greenLight : C.amberLight, borderRadius: '20px', padding: '3px 10px', marginTop: '8px' }}>{isfApproved} of {isfDocs.length} approved</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                          {[
                            ...aeReports.filter(a => a.status === 'Open').slice(0, 2).map(a => ({ label: a.description || 'Open AE report', sev: a.is_serious ? 'SAE' : 'AE' })),
                            ...tasks.filter(t => t.priority === 'High' && t.status === 'Open').slice(0, 2).map(t => ({ label: t.title, sev: 'Task' })),
                          ].slice(0, 4).map((g, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: g.sev === 'SAE' ? C.redLight : C.amberLight, borderRadius: '9px' }}>
                              <i className="ti ti-alert-triangle" style={{ fontSize: '14px', color: g.sev === 'SAE' ? C.red : C.amber, flexShrink: 0 }} />
                              <span style={{ fontSize: '11px', fontWeight: 500, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{g.label}</span>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: g.sev === 'SAE' ? C.red : '#B45309', flexShrink: 0 }}>{g.sev}</span>
                            </div>
                          ))}
                          {openAEs === 0 && tasks.filter(t => t.priority === 'High' && t.status === 'Open').length === 0 && <div style={{ fontSize: '11px', color: C.green, padding: '8px 10px' }}>No critical or high-priority findings</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.blueLight, border: `0.5px solid #BFDBFE`, borderRadius: '12px', padding: '12px 14px' }}>
                        <i className="ti ti-bulb" style={{ fontSize: '20px', color: C.blue, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: C.text }}>Improve your readiness score</div>
                          <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '1px' }}>Close out open activation items and safety events to raise site readiness.</div>
                        </div>
                        <button onClick={() => setPanel('activation')} style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: C.orange, border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>View action plan</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}


          {/* STUDIES */}
          {panel === 'studies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Studies ({studies.length})</div>
                <button onClick={() => setShowNewStudy(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, padding: '9px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}><i className="ti ti-circle-plus" style={{ fontSize: '14px' }} />New study</button>
              </div>
              {studies.map((s, i) => (
                <div key={i} style={{ ...card(), cursor: 'pointer', border: activeStudy?.id === s.id ? `1px solid ${C.orange}` : `0.5px solid ${C.border}` }} onClick={() => setActiveStudy(s)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>{s.study_id} — {s.protocol || 'Protocol TBD'}</div>
                      <div style={{ fontSize: '12px', color: C.textSec }}>{s.phase || '—'} {s.sponsor ? `· ${s.sponsor}` : ''}</div>
                    </div>
                    {badge(s.site_study_status || s.status || 'Active', statusColor(s.site_study_status || s.status || 'Active'), statusBg(s.site_study_status || s.status || 'Active'))}
                  </div>
                  {activeStudy?.id === s.id && <div style={{ marginTop: '8px', fontSize: '11px', color: C.orange, fontWeight: 600 }}>● Currently active study</div>}
                </div>
              ))}
              {studies.length === 0 && <div style={{ ...card(), textAlign: 'center' as const, padding: '40px', color: C.textMuted, fontSize: '13px' }}>No studies found for this site.</div>}
            </div>
          )}

          {/* SITE ACTIVATION */}
          {panel === 'activation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Site Activation — {activeStudy?.study_id || '—'}</div>
                <button onClick={addActivationItem} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><i className="ti ti-plus" style={{ fontSize: '14px' }} />Add item</button>
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['#', 'Description', 'Reviewer Initials', 'Comment', 'Status', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {activationItems.length === 0 ? emptyRow(6, 'No activation items yet — click "Add item" to start the checklist.') : activationItems.map((item, i) => (
                      <tr key={item.id} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', color: C.textMuted, width: '32px' }}>{i + 1}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <input defaultValue={item.item_name} onBlur={e => e.target.value !== item.item_name && updateActivationItem(item.id, { item_name: e.target.value })} style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: `0.5px solid ${C.border}`, borderRadius: '6px', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                        </td>
                        <td style={{ padding: '8px 14px', width: '120px' }}>
                          <input defaultValue={item.reviewer_initials || ''} onBlur={e => e.target.value !== (item.reviewer_initials || '') && updateActivationItem(item.id, { reviewer_initials: e.target.value })} placeholder="e.g. JD" style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: `0.5px solid ${C.border}`, borderRadius: '6px', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                        </td>
                        <td style={{ padding: '8px 14px', minWidth: '180px' }}>
                          <input defaultValue={item.notes || ''} onBlur={e => e.target.value !== (item.notes || '') && updateActivationItem(item.id, { notes: e.target.value })} placeholder="Comment" style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: `0.5px solid ${C.border}`, borderRadius: '6px', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                        </td>
                        <td style={{ padding: '8px 14px', width: '90px' }}>
                          <button onClick={() => updateActivationItem(item.id, { status: item.status === 'Closed' ? 'Open' : 'Closed' })} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: item.status === 'Closed' ? C.greenLight : C.amberLight, color: item.status === 'Closed' ? C.green : C.amber, width: '100%' }}>{item.status === 'Closed' ? 'Closed' : 'Open'}</button>
                        </td>
                        <td style={{ padding: '8px 14px', width: '36px' }}>
                          <button onClick={() => deleteActivationItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }} title="Delete item"><i className="ti ti-trash" style={{ fontSize: '15px' }} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PARTICIPANTS */}
          {panel === 'participants' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Participants ({participants.length})</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{activeStudy?.study_id} · {site.site_name}</div>
                </div>
                <button onClick={() => setShowAddParticipant(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Enroll Participant</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
                {[['Screening', 'screening'], ['Enrolled', 'enrolled'], ['Active', 'active'], ['Follow-up', 'follow_up'], ['Withdrawn', 'withdrawn']].map(([l, s], i) => (
                  <div key={i} style={{ ...card(), textAlign: 'center' as const, padding: '12px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: statusColor(s) }}>{participants.filter(p => p.status === s).length}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['Code', 'Name', 'Email', 'Status', 'Language', 'Enrolled'])}
                  <tbody>
                    {participants.length === 0 ? emptyRow(6, 'No participants enrolled yet.') : participants.map((p, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.orange, fontWeight: 600 }}>{p.participant_code}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.full_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{p.email}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(p.status, statusColor(p.status), statusBg(p.status))}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{p.language_preference === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{p.enrolled_at ? new Date(p.enrolled_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IP & SUPPLIES */}
          {panel === 'supplies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>IP & Supplies</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['Item', 'Lot #', 'On Site', 'Pending', 'Expiry', 'Storage', 'Status'])}
                  <tbody>
                    {inventory.length === 0 ? emptyRow(7, 'No inventory data.') : inventory.map((inv, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{inv.item_name}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: C.textMuted }}>{inv.lot_number || '—'}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: C.green }}>{inv.quantity_on_site}</td>
                        <td style={{ padding: '10px 14px', color: C.blue }}>{inv.quantity_pending}</td>
                        <td style={{ padding: '10px 14px', color: inv.expiry_date && new Date(inv.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? C.red : C.textMuted }}>{inv.expiry_date ? new Date(inv.expiry_date).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: '11px', color: C.textSec }}>{inv.storage_condition || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(inv.status, statusColor(inv.status), statusBg(inv.status))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SAFETY REPORTING */}
          {panel === 'safety' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Safety Reporting</div>
                <button onClick={() => setShowAddAE(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Report AE</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                {[['Total AEs', aeReports.length, C.text], ['SAEs', aeReports.filter(a => a.is_serious).length, C.red], ['Open', openAEs, C.amber], ['Deviations', deviations.length, C.orange]].map(([l, v, c], i) => (
                  <div key={i} style={{ ...card(), textAlign: 'center' as const, padding: '14px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: c as string }}>{v as number}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted }}>{l as string}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['AE #', 'Description', 'Severity', 'Serious', 'Relatedness', 'Status', 'Reported'])}
                  <tbody>
                    {aeReports.length === 0 ? emptyRow(7, 'No AEs reported.') : aeReports.map((ae, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.orange }}>{ae.ae_number || `AE-${String(i + 1).padStart(3, '0')}`}</td>
                        <td style={{ padding: '10px 14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{ae.description}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(ae.severity, ae.severity === 'Severe' ? C.red : ae.severity === 'Moderate' ? C.amber : C.green, ae.severity === 'Severe' ? C.redLight : ae.severity === 'Moderate' ? C.amberLight : C.greenLight)}</td>
                        <td style={{ padding: '10px 14px' }}>{ae.is_serious ? badge('SAE', C.red, C.redLight) : badge('AE', C.blue, C.blueLight)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '11px', color: C.textSec }}>{ae.relatedness}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(ae.status, statusColor(ae.status), statusBg(ae.status))}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{ae.report_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MONITORING */}
          {panel === 'monitoring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Monitoring Visits</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['Visit Type', 'Date', 'CRA', 'Status'])}
                  <tbody>
                    {visits.length === 0 ? emptyRow(4, 'No visits scheduled.') : visits.map((v, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: C.orange }}>{v.visit_type}</td>
                        <td style={{ padding: '10px 14px' }}>{v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{v.cra_name || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(v.status, statusColor(v.status), statusBg(v.status))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {actionItems.length > 0 && (
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '12px' }}>Open Action Items</div>
                  {actionItems.filter(a => a.status === 'Open').map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}>
                      <span style={{ color: C.red, fontSize: '14px' }}>⚠</span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{a.description}</div>
                        <div style={{ fontSize: '10px', color: C.textMuted }}>Due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</div>
                      </div>
                      {badge(a.priority || 'Medium', priorityColor(a.priority || 'Medium'), priorityBg(a.priority || 'Medium'))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS */}
          {panel === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Payments</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['Milestone', 'Amount', 'Due Date', 'Status'])}
                  <tbody>
                    {milestones.length === 0 ? emptyRow(4, 'No payment milestones.') : milestones.map((m, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{m.milestone_name}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: C.green }}>${m.amount?.toLocaleString()} {m.currency}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(m.status, statusColor(m.status), statusBg(m.status))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TASKS */}
          {panel === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Tasks ({openTasks} open)</div>
                <button onClick={() => setShowAddTask(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Add Task</button>
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['', 'Task', 'Priority', 'Due Date', 'Assigned To', 'Status'])}
                  <tbody>
                    {tasks.length === 0 ? emptyRow(6, 'No tasks yet.') : tasks.map((t, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}`, opacity: t.status === 'Completed' ? 0.5 : 1 }}>
                        <td style={{ padding: '10px 14px' }}><input type="checkbox" checked={t.status === 'Completed'} onChange={() => updateTask(t.id, t.status === 'Completed' ? 'Open' : 'Completed')} style={{ cursor: 'pointer' }} /></td>
                        <td style={{ padding: '10px 14px', fontWeight: 500, textDecoration: t.status === 'Completed' ? 'line-through' : 'none' }}>{t.title}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(t.priority, priorityColor(t.priority), priorityBg(t.priority))}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{t.assigned_to_name || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(t.status, statusColor(t.status), statusBg(t.status))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT TRAIL */}
          {panel === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Audit Trail</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['Action', 'Document', 'Actor', 'Timestamp'])}
                  <tbody>
                    {auditTrail.length === 0 ? emptyRow(4, 'No audit entries yet.') : auditTrail.map((a, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px' }}>{badge(a.action, a.action === 'APPROVE' ? C.green : a.action === 'UPLOAD' ? C.blue : C.textMuted, a.action === 'APPROVE' ? C.greenLight : a.action === 'UPLOAD' ? C.blueLight : C.bg)}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{a.new_value || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: '11px' }}>{a.actor_email}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: '11px' }}>{new Date(a.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QUERIES */}
          {panel === 'queries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Monitoring Queries ({openQueries} open)</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  {tableHead(['#', 'Description', 'Priority', 'Assigned To', 'Status', 'Due'])}
                  <tbody>
                    {queries.length === 0 ? emptyRow(6, 'No queries yet.') : queries.map((q, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.orange, fontSize: '11px' }}>{q.query_number || `Q-${String(i + 1).padStart(3, '0')}`}</td>
                        <td style={{ padding: '10px 14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{q.description}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(q.priority, priorityColor(q.priority), priorityBg(q.priority))}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{q.assigned_to_name || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(q.status, statusColor(q.status), statusBg(q.status))}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{q.due_date ? new Date(q.due_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TICKET */}
          {panel === 'ticket' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Support Ticket</div>
              <div style={card()}>
                {field('Subject', input('', () => {}, 'Describe your issue'))}
                {field('Description', <textarea rows={5} placeholder="Provide details..." style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' as const }} />)}
                {field('Priority', sel('Medium', () => {}, ['Low', 'Medium', 'High']))}
                <button style={{ padding: '10px 20px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Submit Ticket</button>
              </div>
            </div>
          )}

          {/* PLACEHOLDER PANELS */}
          {['readiness', 'report', 'archived', 'messages', 'users'].includes(panel) && comingSoon(
            panel === 'readiness' ? 'Inspection Readiness' : panel === 'report' ? 'ISF Report' : panel === 'archived' ? 'Archived' : panel === 'messages' ? 'Messages' : 'User Management'
          )}

        </main>
      </div>

      {/* MODALS */}
      {showAddTask && modal('Add Task', () => setShowAddTask(false), (
        <>
          {field('Task Title *', input(newTask.title, v => setNewTask(p => ({ ...p, title: v })), 'Task description'))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Priority', sel(newTask.priority, v => setNewTask(p => ({ ...p, priority: v })), ['High', 'Medium', 'Low']))}</div>
            <div>{field('Due Date', input(newTask.due_date, v => setNewTask(p => ({ ...p, due_date: v })), '', 'date'))}</div>
          </div>
          {field('Assign To', input(newTask.assigned_to_name, v => setNewTask(p => ({ ...p, assigned_to_name: v })), 'Staff member name'))}
          {field('Linked Panel', sel(newTask.linked_panel, v => setNewTask(p => ({ ...p, linked_panel: v })), ['', 'ISF', 'Participants', 'Safety Reporting', 'Monitoring Visits', 'IP & Supplies', 'Payments']))}
        </>
      ), addTask)}

      {showAddParticipant && modal('Enroll New Participant', () => setShowAddParticipant(false), (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Full Name *', input(newParticipant.full_name, v => setNewParticipant(p => ({ ...p, full_name: v })), 'Jane Smith'))}</div>
            <div>{field('Participant Code *', input(newParticipant.participant_code, v => setNewParticipant(p => ({ ...p, participant_code: v })), 'P-001'))}</div>
          </div>
          {field('Email *', input(newParticipant.email, v => setNewParticipant(p => ({ ...p, email: v })), 'participant@email.com', 'email'))}
          {field('Phone', input(newParticipant.phone, v => setNewParticipant(p => ({ ...p, phone: v })), '+1 (555) 000-0000', 'tel'))}
          {field('Language', sel(newParticipant.language_preference, v => setNewParticipant(p => ({ ...p, language_preference: v })), ['en', 'es']))}
          <div style={{ fontSize: '11px', color: C.textMuted, padding: '8px 10px', background: C.bg, borderRadius: '8px' }}>A login link will be sent to the participant's email after enrollment.</div>
        </>
      ), addParticipant, addingParticipant)}

      {showAddAE && modal('Report Adverse Event', () => setShowAddAE(false), (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('AE Number', input(newAE.ae_number, v => setNewAE(p => ({ ...p, ae_number: v })), 'AE-2026-001'))}</div>
            <div>{field('Onset Date', input(newAE.onset_date, v => setNewAE(p => ({ ...p, onset_date: v })), '', 'date'))}</div>
          </div>
          {field('Description *', <textarea value={newAE.description} onChange={e => setNewAE(p => ({ ...p, description: e.target.value }))} placeholder="Describe the adverse event..." rows={3} style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' as const }} />)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Severity', sel(newAE.severity, v => setNewAE(p => ({ ...p, severity: v })), ['Mild', 'Moderate', 'Severe', 'Life-threatening']))}</div>
            <div>{field('Relatedness', sel(newAE.relatedness, v => setNewAE(p => ({ ...p, relatedness: v })), ['Unrelated', 'Unlikely', 'Possible', 'Probable', 'Definite']))}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="sae" checked={newAE.is_serious} onChange={e => setNewAE(p => ({ ...p, is_serious: e.target.checked }))} />
            <label htmlFor="sae" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>This is a Serious Adverse Event (SAE)</label>
          </div>
        </>
      ), addAE)}

      {showNewStudy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: C.bgCard, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>New study</div>
              <button onClick={() => setShowNewStudy(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: C.textMuted }}>×</button>
            </div>
            {field('Study ID', input(newStudy.study_id, v => setNewStudy(p => ({ ...p, study_id: v })), 'e.g. OIL-BR-US-10'))}
            {field('Protocol title', input(newStudy.protocol, v => setNewStudy(p => ({ ...p, protocol: v })), 'e.g. A Phase I Study of...'))}
            {field('Sponsor', input(newStudy.sponsor, v => setNewStudy(p => ({ ...p, sponsor: v })), 'e.g. Optiscan Imaging Ltd.'))}
            {field('Phase', sel(newStudy.phase, v => setNewStudy(p => ({ ...p, phase: v })), ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Observational']))}
            {field('Status', sel(newStudy.status, v => setNewStudy(p => ({ ...p, status: v })), ['Startup', 'Active', 'Closeout', 'Completed']))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button onClick={() => setShowNewStudy(false)} style={{ flex: 1, padding: '10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: C.bgCard, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={addStudy} disabled={creatingStudy || !newStudy.study_id} style={{ flex: 2, padding: '10px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: creatingStudy || !newStudy.study_id ? 0.7 : 1 }}>
                {creatingStudy ? 'Creating...' : 'Create study'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}