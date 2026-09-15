'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const C = {
  orange: '#F97316', orangeLight: '#FFF7ED', orangeDark: '#EA580C',
  navy: '#0F1E3D', navyLight: '#1E3A5F',
  bg: '#F5F8FF', bgCard: '#FFFFFF',
  border: '#E7ECF6', divider: '#EEF2FA',
  text: '#111827', textSec: '#3E5273', textMuted: '#6B7280',
  green: '#16A34A', greenLight: '#E9FBF0',
  red: '#EF4444', redLight: '#FDEDEA',
  blue: '#2563EB', blueLight: '#EAF1FE',
  amber: '#F59E0B', amberLight: '#FEF3E2',
  purple: '#8B5CF6', purpleLight: '#F5F3FF',
};

type Panel = 'dashboard' | 'activation' | 'isf' | 'artifacts' | 'gap' |
  'participants' | 'supplies' | 'safety' | 'monitoring' | 'payments' |
  'readiness' | 'report' | 'auditor' | 'audit' | 'quality' | 'archived' |
  'tasks' | 'messages' | 'queries' | 'users' | 'siteconfig' | 'ticket' | 'studies';

const NAV_GROUPS = [
  { label: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', icon: '⊞' }] },
  { label: 'Site', items: [
    { key: 'activation', label: 'Site Activation', icon: '✓' },
    { key: 'isf', label: 'ISF', icon: '📁' },
    { key: 'artifacts', label: 'Artifact Browser', icon: '🗂' },
    { key: 'gap', label: 'Gap Analysis', icon: '⚠' },
    { key: 'participants', label: 'Participants', icon: '👥' },
    { key: 'supplies', label: 'IP & Supplies', icon: '💊' },
    { key: 'safety', label: 'Safety Reporting', icon: '🛡' },
    { key: 'monitoring', label: 'Monitoring Visits', icon: '🔍' },
    { key: 'payments', label: 'Payments', icon: '💰' },
  ]},
  { label: 'Intelligence', items: [
    { key: 'readiness', label: 'Inspection Readiness', icon: '🎯' },
    { key: 'report', label: 'Report', icon: '📊' },
    { key: 'auditor', label: 'ISF Auditor', icon: '🤖' },
    { key: 'audit', label: 'Audit Trail', icon: '🔒' },
    { key: 'quality', label: 'Quality Checks', icon: '⭐' },
    { key: 'archived', label: 'Archived', icon: '📦' },
  ]},
  { label: 'Team', items: [
    { key: 'tasks', label: 'Tasks', icon: '✓' },
    { key: 'users', label: 'User Management', icon: '👤' },
    { key: 'messages', label: 'Messages', icon: '✉' },
    { key: 'queries', label: 'Queries', icon: '💬' },
  ]},
  { label: 'Settings', items: [
    { key: 'siteconfig', label: 'Site Configuration', icon: '⚙' },
    { key: 'ticket', label: 'Ticket', icon: '🎫' },
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
        supabase.from('site_tasks').select('*').eq('site_id', site.id).order('due_date', { ascending: true }),
        supabase.from('monitoring_visits').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('scheduled_date', { ascending: false }),
        supabase.from('payment_milestones').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('due_date', { ascending: true }),
        supabase.from('ip_inventory').select('*').eq('site_id', site.id),
        supabase.from('ae_reports').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('protocol_deviations').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('site_activation_items').select('*').eq('site_id', site.id),
        supabase.from('monitoring_action_items').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
        supabase.from('isf_documents').select('*').eq('site_id', site.id).eq('study_id', activeStudy.id).order('created_at', { ascending: false }),
        supabase.from('isf_audit_trail').select('*').eq('site_id', site.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('isf_queries').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
      ]);

      if (pData) setParticipants(pData);
      if (tData) setTasks(tData);
      if (vData) setVisits(vData);
      if (mData) setMilestones(mData);
      if (invData) setInventory(invData);
      if (aeData) setAeReports(aeData);
      if (devData) setDeviations(devData);
      if (actData) setActivationItems(actData);
      if (aiData) setActionItems(aiData);
      if (isfData) setIsfDocs(isfData);
      if (auditData) setAuditTrail(auditData);
      if (queryData) setQueries(queryData);
    } catch (e) { console.error(e); }
  }

  async function addTask() {
    if (!newTask.title || !site) return;
    await supabase.from('site_tasks').insert([{ site_id: site.id, org_id: userRole?.org_id, ...newTask, status: 'Open', created_by: user.id }]);
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

  async function addAE() {
    if (!newAE.description || !site || !activeStudy) return;
    await supabase.from('ae_reports').insert([{ org_id: userRole?.org_id, site_id: site.id, study_id: activeStudy.id, ...newAE, report_date: new Date().toISOString().split('T')[0], reported_by: user.id, status: 'Open' }]);
    setShowAddAE(false);
    setNewAE({ ae_number: '', description: '', onset_date: '', severity: 'Mild', relatedness: 'Unrelated', is_serious: false });
    loadStudyData();
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
    (activationItems.filter(i => i.status === 'Completed').length / Math.max(activationItems.length, 1)) * 20 +
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
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: C.bg }}>

      {/* Sidebar */}
      <aside style={{ width: '212px', background: C.navy, display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '0 8px 8px', overflowY: 'auto' }}>
        <div style={{ padding: '16px 8px 10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Site<span style={{ color: C.orange }}>360</span></div>
          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>Site Operations Platform</div>
        </div>

        {/* Site info */}
        <div style={{ margin: '0 0 10px', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{site.site_name}</div>
          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>{site.site_code}</div>
        </div>

        {/* Nav groups */}
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p style={{ fontSize: '9px', fontWeight: 600, color: '#475569', padding: '6px 8px 2px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>{group.label}</p>
            {group.items.map(item => {
              const badgeCount = item.key === 'tasks' ? openTasks : item.key === 'safety' ? openAEs : item.key === 'queries' ? openQueries : 0;
              return (
                <button key={item.key} onClick={() => {
                  if (item.key === 'isf') { window.location.href = '/site360/isf'; return; }
                  setPanel(item.key as Panel);
                }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: '12px', background: panel === item.key ? 'rgba(249,115,22,0.12)' : 'transparent', color: panel === item.key ? C.orange : '#94A3B8', fontWeight: panel === item.key ? 600 : 400, marginBottom: '1px' }}>
                  <span style={{ fontSize: '13px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badgeCount > 0 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: C.red, color: '#fff', fontWeight: 600 }}>{badgeCount}</span>}
                </button>
              );
            })}
          </div>
        ))}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1E3A5F', paddingTop: '8px', marginTop: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#64748B', padding: '2px 8px' }}>{site.user_name}</div>
          <div style={{ fontSize: '10px', color: '#475569', padding: '0 8px 2px' }}>{site.user_role}</div>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/site360/login'; }} style={{ fontSize: '11px', color: '#64748B', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', textAlign: 'left' as const, width: '100%' }}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ background: C.bgCard, borderBottom: `0.5px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{site.site_name}</div>
            <div style={{ width: '1px', height: '16px', background: C.border }} />
            {/* Study switcher */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowStudyDropdown(!showStudyDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: C.orangeLight, border: `0.5px solid ${C.orange}`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: C.orange, fontWeight: 600 }}>
                {activeStudy ? `${activeStudy.study_id} — ${activeStudy.protocol || 'Study'}` : 'Select Study'}
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {showStudyDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '240px', overflow: 'hidden' }}>
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
            {activeStudy && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: C.greenLight, color: C.green, fontWeight: 600 }}>● Active</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: C.textMuted }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
              {site.user_name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Panel content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} onClick={() => showStudyDropdown && setShowStudyDropdown(false)}>

          {/* DASHBOARD */}
          {panel === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>Good morning, {site.user_name?.split(' ')[0]} 👋</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
                    {site.site_name} · {activeStudy ? `${activeStudy.study_id} — ${activeStudy.protocol || 'Study'}` : 'No study selected'} · PI: {site.pi_name || '—'}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: C.textMuted }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              </div>

              {/* Health score + stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '14px' }}>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '12px' }}>Site Health Score</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `conic-gradient(${healthScore >= 80 ? C.green : healthScore >= 60 ? C.amber : C.red} ${healthScore}%, #F3F4F6 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: C.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '17px', fontWeight: 700, color: healthScore >= 80 ? C.green : healthScore >= 60 ? C.amber : C.red }}>{healthScore}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: healthScore >= 80 ? C.green : healthScore >= 60 ? C.amber : C.red }}>{healthScore >= 80 ? 'Inspection Ready' : healthScore >= 60 ? 'Needs Attention' : 'Not Ready'}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted }}>Out of 100</div>
                    </div>
                  </div>
                  {[
                    ['Site Activation', activationItems.length > 0 ? Math.round((activationItems.filter(i => i.status === 'Completed').length / activationItems.length) * 100) : 0],
                    ['ISF Completeness', isfDocs.length > 0 ? Math.round((isfApproved / isfDocs.length) * 100) : 0],
                    ['Safety Compliance', aeReports.length > 0 ? Math.round((aeReports.filter(a => a.status !== 'Open').length / aeReports.length) * 100) : 100],
                    ['Participant Retention', participants.length > 0 ? Math.round((participants.filter(p => p.status !== 'withdrawn').length / participants.length) * 100) : 100],
                    ['Monitoring Readiness', visits.length > 0 ? Math.round((visits.filter(v => v.status === 'Report Finalized').length / visits.length) * 100) : 0],
                  ].map(([label, val], i) => (
                    <div key={i} style={{ marginBottom: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                        <span style={{ color: C.textSec }}>{label as string}</span>
                        <span style={{ fontWeight: 600, color: (val as number) >= 80 ? C.green : (val as number) >= 60 ? C.amber : C.red }}>{val as number}%</span>
                      </div>
                      <div style={{ height: '5px', background: '#F3F4F6', borderRadius: '20px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${val}%`, background: (val as number) >= 80 ? C.green : (val as number) >= 60 ? C.amber : C.red, borderRadius: '20px' }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { val: participants.length, label: 'Participants', sub: `${enrolled} enrolled`, color: C.blue, icon: '👥', action: () => setPanel('participants') },
                    { val: openTasks, label: 'Open Tasks', sub: `${tasks.filter(t => t.priority === 'High' && t.status === 'Open').length} high priority`, color: C.amber, icon: '✓', action: () => setPanel('tasks') },
                    { val: openAEs, label: 'Open AEs', sub: `${aeReports.filter(a => a.is_serious && a.status === 'Open').length} SAEs`, color: openAEs > 0 ? C.red : C.green, icon: '⚠', action: () => setPanel('safety') },
                    { val: inventory.length, label: 'IP Items', sub: `${inventory.filter(i => i.expiry_date && new Date(i.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length} expiring`, color: C.purple, icon: '💊', action: () => setPanel('supplies') },
                    { val: visits.filter(v => v.status === 'Scheduled').length, label: 'Upcoming Visits', sub: visits[0]?.scheduled_date ? new Date(visits[0].scheduled_date).toLocaleDateString() : '—', color: C.orange, icon: '🔍', action: () => setPanel('monitoring') },
                    { val: milestones.filter(m => m.status === 'Pending').length, label: 'Pending Payments', sub: `$${milestones.filter(m => m.status === 'Pending').reduce((s, m) => s + (m.amount || 0), 0).toLocaleString()}`, color: C.green, icon: '💰', action: () => setPanel('payments') },
                  ].map((s, i) => (
                    <div key={i} style={{ ...card(), cursor: 'pointer', padding: '14px' }} onClick={s.action}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{s.icon}</span>
                        <span style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.val}</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action items + Tasks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '12px' }}>What Needs Attention</div>
                  {openAEs > 0 && <div style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}><span style={{ color: C.red }}>●</span><div><div style={{ fontSize: '12px', fontWeight: 500 }}>{openAEs} open AE report{openAEs > 1 ? 's' : ''}</div><div style={{ fontSize: '10px', color: C.textMuted }}>Review and update status</div></div></div>}
                  {tasks.filter(t => t.priority === 'High' && t.status === 'Open').length > 0 && <div style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}><span style={{ color: C.orange }}>●</span><div><div style={{ fontSize: '12px', fontWeight: 500 }}>{tasks.filter(t => t.priority === 'High' && t.status === 'Open').length} high priority tasks</div><div style={{ fontSize: '10px', color: C.textMuted }}>Action required</div></div></div>}
                  {inventory.filter(i => i.expiry_date && new Date(i.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length > 0 && <div style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}><span style={{ color: C.amber }}>●</span><div><div style={{ fontSize: '12px', fontWeight: 500 }}>IP expiring within 30 days</div><div style={{ fontSize: '10px', color: C.textMuted }}>Check inventory</div></div></div>}
                  {openQueries > 0 && <div style={{ display: 'flex', gap: '8px', padding: '8px 0' }}><span style={{ color: C.blue }}>●</span><div><div style={{ fontSize: '12px', fontWeight: 500 }}>{openQueries} open monitoring quer{openQueries > 1 ? 'ies' : 'y'}</div><div style={{ fontSize: '10px', color: C.textMuted }}>Response required</div></div></div>}
                  {openAEs === 0 && openTasks === 0 && openQueries === 0 && <div style={{ fontSize: '13px', color: C.green }}>✅ No immediate action items!</div>}
                </div>

                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec }}>My Tasks</div>
                    <button onClick={() => setPanel('tasks')} style={{ fontSize: '11px', color: C.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                  </div>
                  {tasks.filter(t => t.status === 'Open').slice(0, 4).map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: i < 3 ? `0.5px solid ${C.border}` : 'none' }}>
                      <input type="checkbox" onChange={() => updateTask(t.id, 'Completed')} style={{ cursor: 'pointer', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{t.title}</div>
                        <div style={{ fontSize: '10px', color: C.textMuted }}>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</div>
                      </div>
                      {badge(t.priority, priorityColor(t.priority), priorityBg(t.priority))}
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'Open').length === 0 && <div style={{ fontSize: '12px', color: C.textMuted }}>No open tasks 🎉</div>}
                </div>
              </div>
            </div>
          )}

          {/* STUDIES */}
          {panel === 'studies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Studies ({studies.length})</div>
              {studies.map((s, i) => (
                <div key={i} style={{ ...card(), cursor: 'pointer', border: activeStudy?.id === s.id ? `1px solid ${C.orange}` : `0.5px solid ${C.border}` }} onClick={() => setActiveStudy(s)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '4px' }}>{s.study_id} — {s.protocol || 'Protocol TBD'}</div>
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
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Site Activation — {activeStudy?.study_id || '—'}</div>
              <div style={card()}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '12px' }}>Activation Checklist</div>
                {activationItems.length === 0 ? (
                  <div style={{ fontSize: '12px', color: C.textMuted }}>No activation items found. Add items via site setup.</div>
                ) : activationItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < activationItems.length - 1 ? `0.5px solid ${C.border}` : 'none' }}>
                    <span style={{ fontSize: '16px' }}>{item.status === 'Completed' ? '✅' : item.status === 'In Progress' ? '🔄' : '⬜'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: item.status === 'Completed' ? C.textMuted : C.text, textDecoration: item.status === 'Completed' ? 'line-through' : 'none' }}>{item.item_name}</div>
                      {item.notes && <div style={{ fontSize: '10px', color: C.textMuted }}>{item.notes}</div>}
                    </div>
                    {badge(item.status || 'Pending', statusColor(item.status || 'Pending'), statusBg(item.status || 'Pending'))}
                  </div>
                ))}
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

          {/* SITE CONFIG */}
          {panel === 'siteconfig' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Site Configuration</div>
              <div style={card()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {[['Site Name', site.site_name], ['Site Code', site.site_code], ['Country', site.country || '—'], ['City', site.city || '—'], ['Principal Investigator', site.pi_name || '—'], ['PI Email', site.pi_email || '—'], ['Status', site.status || 'Active'], ['Activation Date', site.activation_date ? new Date(site.activation_date).toLocaleDateString() : '—']].map(([l, v], i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: `0.5px solid ${C.border}` }}>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '3px' }}>{l}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
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
          {['artifacts', 'gap', 'readiness', 'report', 'auditor', 'quality', 'archived', 'messages', 'users'].includes(panel) && comingSoon(
            panel === 'artifacts' ? 'Artifact Browser' : panel === 'gap' ? 'Gap Analysis' : panel === 'readiness' ? 'Inspection Readiness' : panel === 'report' ? 'ISF Report' : panel === 'auditor' ? 'ISF Auditor' : panel === 'quality' ? 'Quality Checks' : panel === 'archived' ? 'Archived' : panel === 'messages' ? 'Messages' : 'User Management'
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

    </div>
  );
}