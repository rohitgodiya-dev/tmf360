'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const P = {
  orange: '#F97316', orangeLight: '#FFF7ED', orangeDark: '#EA580C',
  navy: '#0F1E3D', navyLight: '#1E3A5F',
  bg: '#F8FAFC', bgCard: '#FFFFFF',
  border: '#E5EDF6', borderSec: '#D1D5DB',
  text: '#111827', textSec: '#374151', textMuted: '#6B7280',
  green: '#10B981', greenLight: '#ECFDF5',
  red: '#EF4444', redLight: '#FEF2F2',
  blue: '#3B82F6', blueLight: '#EFF6FF',
  purple: '#8B5CF6', purpleLight: '#F5F3FF',
  amber: '#F59E0B', amberLight: '#FFFBEB',
};

type Panel = 'dashboard' | 'study' | 'activation' | 'staff' | 'isf' | 'participants' | 'ip' | 'safety' | 'monitoring' | 'payments' | 'tasks' | 'messages' | 'users';

export default function Site360Page() {
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [site, setSite] = useState<any>(null);
  const [study, setStudy] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [aeReports, setAeReports] = useState<any[]>([]);
  const [deviations, setDeviations] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Participant form
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ full_name: '', email: '', phone: '', participant_code: '', language_preference: 'en' });
  const [addingParticipant, setAddingParticipant] = useState(false);

  // Task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', due_date: '', assigned_to_name: '', linked_panel: '' });

  // AE form
  const [showAddAE, setShowAddAE] = useState(false);
  const [newAE, setNewAE] = useState({ ae_number: '', description: '', onset_date: '', severity: 'Mild', relatedness: 'Unrelated', is_serious: false, status: 'Open' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      setUser(u);

      const { data: ur } = await supabase.from('user_roles').select('org_id, full_name, role').eq('user_id', u.id).single();
      if (!ur) { 
        alert('user_roles query returned null for user: ' + u.id);
        setLoading(false); 
        return; 
      }
      alert('ur found: ' + JSON.stringify(ur));

      // Load site
      const { data: siteData, error: siteError } = await supabase.from('sites').select('*').eq('org_id', ur.org_id).single();
      if (!siteData) { 
        console.error('Site error:', siteError, 'org_id:', ur.org_id);
        setLoading(false); 
        return; 
      }
      setSite({ ...siteData, user_name: ur.full_name || u.email?.split('@')[0] || 'User', user_role: ur.role });

      // Load study
      const { data: studyData } = await supabase.from('studies').select('*').eq('id', siteData.study_id).single();
      if (studyData) setStudy(studyData);

      // Load all data in parallel
      const [
        { data: pData },
        { data: tData },
        { data: vData },
        { data: mData },
        { data: invData },
        { data: aeData },
        { data: devData },
        { data: staffData },
      ] = await Promise.all([
        supabase.from('participants').select('*').eq('site_id', siteData.id).order('created_at', { ascending: false }),
        supabase.from('site_tasks').select('*').eq('site_id', siteData.id).order('due_date', { ascending: true }),
        supabase.from('monitoring_visits').select('*').eq('site_id', siteData.id).order('scheduled_date', { ascending: true }),
        supabase.from('payment_milestones').select('*').eq('site_id', siteData.id).order('due_date', { ascending: true }),
        supabase.from('ip_inventory').select('*').eq('site_id', siteData.id),
        supabase.from('ae_reports').select('*').eq('site_id', siteData.id).order('created_at', { ascending: false }),
        supabase.from('protocol_deviations').select('*').eq('site_id', siteData.id).order('created_at', { ascending: false }),
        supabase.from('site_members').select('*').eq('site_id', siteData.id),
      ]);

      if (pData) setParticipants(pData);
      if (tData) setTasks(tData);
      if (vData) setVisits(vData);
      if (mData) setMilestones(mData);
      if (invData) setInventory(invData);
      if (aeData) setAeReports(aeData);
      if (devData) setDeviations(devData);
      if (staffData) setStaff(staffData);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function addParticipant() {
    if (!newParticipant.full_name || !newParticipant.email || !newParticipant.participant_code) return;
    setAddingParticipant(true);
    try {
      const { data: ur } = await supabase.from('user_roles').select('org_id').eq('user_id', user.id).single();
      await supabase.from('participants').insert([{
        org_id: ur?.org_id,
        study_id: site.study_id,
        site_id: site.id,
        ...newParticipant,
        status: 'screening',
      }]);
      setShowAddParticipant(false);
      setNewParticipant({ full_name: '', email: '', phone: '', participant_code: '', language_preference: 'en' });
      loadData();
    } catch (e) { console.error(e); }
    setAddingParticipant(false);
  }

  async function addTask() {
    if (!newTask.title) return;
    try {
      const { data: ur } = await supabase.from('user_roles').select('org_id').eq('user_id', user.id).single();
      await supabase.from('site_tasks').insert([{ site_id: site.id, org_id: ur?.org_id, ...newTask, status: 'Open', created_by: user.id }]);
      setShowAddTask(false);
      setNewTask({ title: '', priority: 'Medium', due_date: '', assigned_to_name: '', linked_panel: '' });
      loadData();
    } catch (e) { console.error(e); }
  }

  async function addAE() {
    if (!newAE.description) return;
    try {
      const { data: ur } = await supabase.from('user_roles').select('org_id').eq('user_id', user.id).single();
      await supabase.from('ae_reports').insert([{ site_id: site.id, study_id: site.study_id, org_id: ur?.org_id, ...newAE, reported_by: user.id, report_date: new Date().toISOString().split('T')[0] }]);
      setShowAddAE(false);
      setNewAE({ ae_number: '', description: '', onset_date: '', severity: 'Mild', relatedness: 'Unrelated', is_serious: false, status: 'Open' });
      loadData();
    } catch (e) { console.error(e); }
  }

  async function updateTaskStatus(id: string, status: string) {
    await supabase.from('site_tasks').update({ status, completed_at: status === 'Completed' ? new Date().toISOString() : null }).eq('id', id);
    loadData();
  }

  async function updateAEStatus(id: string, status: string) {
    await supabase.from('ae_reports').update({ status, resolved_date: status === 'Resolved' ? new Date().toISOString().split('T')[0] : null }).eq('id', id);
    loadData();
  }

  // Health score calculation
  const enrollmentPct = participants.length > 0 ? Math.min(100, Math.round((participants.filter(p => p.status === 'active' || p.status === 'enrolled').length / 50) * 100)) : 0;
  const openTasks = tasks.filter(t => t.status === 'Open').length;
  const openAEs = aeReports.filter(a => a.status === 'Open').length;
  const healthScore = Math.round((100 + 78 + 90 + 80 + 75) / 5);

  const statusColor = (s: string) => {
    if (['active', 'enrolled', 'Completed', 'Resolved', 'Paid', 'Approved', 'Qualified'].includes(s)) return P.green;
    if (['screening', 'Pending', 'Open', 'Scheduled', 'Draft'].includes(s)) return P.blue;
    if (['withdrawn', 'Overdue', 'Rejected', 'Expired'].includes(s)) return P.red;
    return P.amber;
  };
  const statusBg = (s: string) => {
    if (['active', 'enrolled', 'Completed', 'Resolved', 'Paid', 'Approved', 'Qualified'].includes(s)) return P.greenLight;
    if (['screening', 'Pending', 'Open', 'Scheduled', 'Draft'].includes(s)) return P.blueLight;
    if (['withdrawn', 'Overdue', 'Rejected', 'Expired'].includes(s)) return P.redLight;
    return P.amberLight;
  };
  const priorityColor = (p: string) => p === 'High' ? P.red : p === 'Medium' ? P.amber : P.green;

  const card = (extra: any = {}): React.CSSProperties => ({ background: P.bgCard, border: `0.5px solid ${P.border}`, borderRadius: '12px', padding: '16px 18px', ...extra });

  const navItem = (id: Panel, label: string, icon: string, badge?: number) => (
    <button key={id} onClick={() => setPanel(id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: '12px', background: panel === id ? 'rgba(249,115,22,0.12)' : 'transparent', color: panel === id ? P.orange : '#94A3B8', fontWeight: panel === id ? 600 : 400 }}>
      <span style={{ fontSize: '15px' }}>{icon}</span>
      {label}
      {badge ? <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: P.red, color: '#fff', fontWeight: 600 }}>{badge}</span> : null}
    </button>
  );

  const field = (label: string, el: React.ReactNode) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: P.textSec, display: 'block', marginBottom: '5px' }}>{label}</label>
      {el}
    </div>
  );

  const input = (value: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${P.border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
  );

  const select = (value: string, onChange: (v: string) => void, options: string[]) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${P.border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', background: P.bgCard }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const badge = (text: string, color: string, bg: string) => (
    <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', color, background: bg, whiteSpace: 'nowrap' as const }}>{text}</span>
  );

  const modal = (title: string, onClose: () => void, children: React.ReactNode, onSave: () => void, saving = false) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: P.bgCard, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: P.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: P.textMuted }}>×</button>
        </div>
        {children}
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: `0.5px solid ${P.border}`, borderRadius: '8px', background: P.bgCard, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ flex: 2, padding: '10px', background: P.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: P.bg }}>
      <div style={{ textAlign: 'center', color: P.textMuted }}>Loading Site360...</div>
    </div>
  );

  if (!site) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: P.bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: P.text, marginBottom: '8px' }}>No site found for your account.</div>
        <div style={{ fontSize: '13px', color: P.textMuted }}>Contact your administrator to be assigned to a site.</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: P.bg }}>

      {/* Sidebar */}
      <aside style={{ width: '210px', background: P.navy, display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '0 8px 8px' }}>
        <div style={{ padding: '16px 8px 12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Site<span style={{ color: P.orange }}>360</span></div>
          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>Site Operations</div>
        </div>

        {/* Site info */}
        <div style={{ margin: '0 0 10px', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{site.site_name}</div>
          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>{site.site_code} · {study?.study_id || 'Study'}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#475569', padding: '6px 8px 3px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Overview</p>
          {navItem('dashboard', 'Dashboard', '⊞', openTasks > 0 ? openTasks : undefined)}
          {navItem('study', 'Study Overview', '◎')}
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#475569', padding: '8px 8px 3px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Start-Up</p>
          {navItem('activation', 'Site Activation', '✓')}
          {navItem('staff', 'Staff & Delegation', '👤')}
          {navItem('isf', 'ISF', '📁')}
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#475569', padding: '8px 8px 3px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Clinical Ops</p>
          {navItem('participants', 'Participants', '👥', participants.filter(p => p.status === 'screening').length || undefined)}
          {navItem('ip', 'IP & Supplies', '💊')}
          {navItem('safety', 'Safety Reporting', '⚠', openAEs || undefined)}
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#475569', padding: '8px 8px 3px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Monitoring</p>
          {navItem('monitoring', 'Monitoring Visits', '🔍')}
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#475569', padding: '8px 8px 3px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Finance</p>
          {navItem('payments', 'Payments', '💰')}
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#475569', padding: '8px 8px 3px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Work</p>
          {navItem('tasks', 'Tasks', '✓', openTasks || undefined)}
          {navItem('messages', 'Messages', '✉')}
          {navItem('users', 'User Management', '⚙')}
        </div>

        <div style={{ borderTop: '1px solid #1E3A5F', paddingTop: '8px', marginTop: '4px' }}>
          <div style={{ fontSize: '11px', color: '#64748B', padding: '4px 8px' }}>{site.user_name}</div>
          <div style={{ fontSize: '10px', color: '#475569', padding: '0 8px 4px' }}>{site.user_role} · {site.site_code}</div>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/platform'; }} style={{ fontSize: '11px', color: '#64748B', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', textAlign: 'left' as const, width: '100%' }}>← Back to platform</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* ── DASHBOARD ── */}
        {panel === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: P.text }}>Good morning, {site.user_name?.split(' ')[0]} 👋</div>
                <div style={{ fontSize: '12px', color: P.textMuted, marginTop: '2px' }}>
                  {site.site_name} ({site.site_code}) · Study: {study?.study_id || '—'} · PI: {site.pi_name}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: P.textMuted }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              {/* Site Health Score */}
              <div style={{ ...card(), gridColumn: '1' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec, marginBottom: '12px' }}>Site Health Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `conic-gradient(${P.orange} ${healthScore}%, #F3F4F6 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: P.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: P.orange }}>{healthScore}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: P.green }}>On Track</div>
                    <div style={{ fontSize: '11px', color: P.textMuted }}>Out of 100</div>
                  </div>
                </div>
                {[['Site Activation', 100, P.green], ['ISF Completeness', 78, P.amber], ['Safety Compliance', 90, P.green], ['Training Currency', 80, P.green], ['Monitoring Readiness', 75, P.amber]].map(([label, val, color], i) => (
                  <div key={i} style={{ marginBottom: '7px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: P.textSec }}>{label as string}</span>
                      <span style={{ fontWeight: 600, color: color as string }}>{val as number}</span>
                    </div>
                    <div style={{ height: '5px', background: '#F3F4F6', borderRadius: '20px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${val}%`, background: color as string, borderRadius: '20px' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Enrollment + Supplies */}
              <div style={{ gridColumn: '2', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec }}>Enrollment Progress</div>
                    <button onClick={() => setPanel('participants')} style={{ fontSize: '11px', color: P.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View Participants</button>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: P.text }}>{participants.length} <span style={{ fontSize: '14px', color: P.textMuted, fontWeight: 400 }}>/ 50</span></div>
                  <div style={{ fontSize: '11px', color: P.textMuted, marginBottom: '10px' }}>Participants Enrolled · {enrollmentPct}% of target</div>
                  <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '20px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${enrollmentPct}%`, background: P.orange, borderRadius: '20px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec }}>IP & Supplies</div>
                    <button onClick={() => setPanel('ip')} style={{ fontSize: '11px', color: P.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View Supplies</button>
                  </div>
                  {inventory.slice(0, 1).map((inv, i) => (
                    <div key={i}>
                      <div style={{ fontSize: '11px', color: P.green, fontWeight: 600, marginBottom: '8px' }}>95% Inventory Adequate</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                        {[['On Site', inv.quantity_on_site, P.green], ['Pending', inv.quantity_pending, P.blue], ['Expiring', 1, P.red]].map(([l, v, c], j) => (
                          <div key={j} style={{ textAlign: 'center', padding: '8px', background: P.bg, borderRadius: '8px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: c as string }}>{v as number}</div>
                            <div style={{ fontSize: '10px', color: P.textMuted }}>{l as string}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {inventory.length === 0 && <div style={{ fontSize: '12px', color: P.textMuted }}>No inventory data</div>}
                </div>
              </div>

              {/* Attention + Deadlines */}
              <div style={{ gridColumn: '3', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec, marginBottom: '10px' }}>What Needs Attention</div>
                  {[
                    { text: 'SAE report overdue', sub: 'Participant 001-002 · 1 day', color: P.red },
                    { text: '2 training records expiring', sub: 'Within 30 days · 12 days', color: P.amber },
                    { text: `${openTasks} open tasks`, sub: `${tasks.filter(t => t.priority === 'High' && t.status === 'Open').length} high priority`, color: P.orange },
                    { text: 'ISF completeness below target', sub: '78% (target 90%)', color: P.amber },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? `0.5px solid ${P.border}` : 'none' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: '5px' }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: P.text }}>{item.text}</div>
                        <div style={{ fontSize: '10px', color: P.textMuted }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec, marginBottom: '10px' }}>Upcoming Deadlines</div>
                  {visits.slice(0, 1).map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: `0.5px solid ${P.border}` }}>
                      <div style={{ textAlign: 'center', width: '36px', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', color: P.orange, fontWeight: 600 }}>{new Date(v.scheduled_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: P.text }}>{new Date(v.scheduled_date).getDate()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{v.visit_type} Visit</div>
                        <div style={{ fontSize: '10px', color: P.textMuted }}>CRA: {v.cra_name}</div>
                      </div>
                    </div>
                  ))}
                  {milestones.slice(0, 2).map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: i < milestones.length - 1 ? `0.5px solid ${P.border}` : 'none' }}>
                      <div style={{ textAlign: 'center', width: '36px', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', color: P.purple, fontWeight: 600 }}>{new Date(m.due_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: P.text }}>{new Date(m.due_date).getDate()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{m.milestone_name}</div>
                        <div style={{ fontSize: '10px', color: P.textMuted }}>${m.amount?.toLocaleString()} {m.currency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasks + Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={card()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec }}>My Tasks</div>
                  <button onClick={() => setPanel('tasks')} style={{ fontSize: '11px', color: P.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                </div>
                {tasks.filter(t => t.status === 'Open').slice(0, 4).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? `0.5px solid ${P.border}` : 'none' }}>
                    <input type="checkbox" onChange={() => updateTaskStatus(t.id, 'Completed')} style={{ cursor: 'pointer', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{t.title}</div>
                      <div style={{ fontSize: '10px', color: P.textMuted }}>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</div>
                    </div>
                    {badge(t.priority, priorityColor(t.priority), t.priority === 'High' ? P.redLight : t.priority === 'Medium' ? P.amberLight : P.greenLight)}
                  </div>
                ))}
                {tasks.filter(t => t.status === 'Open').length === 0 && <div style={{ fontSize: '12px', color: P.textMuted }}>No open tasks 🎉</div>}
              </div>
              <div style={card()}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec, marginBottom: '12px' }}>Recent Activity</div>
                {[
                  { text: 'Document uploaded', sub: 'Delegation Log – Dr. Chen · 2 hours ago', icon: '📄' },
                  { text: 'Task completed', sub: 'Verify IP storage temperature · 4 hours ago', icon: '✅' },
                  { text: 'Participant enrolled', sub: `Participant ${String(participants.length).padStart(3, '0')}-004 · 6 hours ago`, icon: '👤' },
                  { text: 'Safety event updated', sub: 'AE-2026-003 · 1 day ago', icon: '⚠' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? `0.5px solid ${P.border}` : 'none' }}>
                    <span style={{ fontSize: '16px' }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{a.text}</div>
                      <div style={{ fontSize: '10px', color: P.textMuted }}>{a.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STUDY OVERVIEW ── */}
        {panel === 'study' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>Study Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={card()}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec, marginBottom: '14px' }}>Study Details</div>
                {[
                  ['Study ID', study?.study_id || '—'],
                  ['Protocol', study?.protocol || '—'],
                  ['Phase', study?.phase || '—'],
                  ['Status', study?.status || '—'],
                  ['Sponsor', study?.sponsor || '—'],
                  ['Principal Investigator', site.pi_name],
                  ['Site', `${site.site_name} (${site.site_code})`],
                  ['Activation Date', site.activation_date ? new Date(site.activation_date).toLocaleDateString() : '—'],
                ].map(([l, v], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 7 ? `0.5px solid ${P.border}` : 'none' }}>
                    <span style={{ fontSize: '12px', color: P.textMuted }}>{l}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: P.text }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec, marginBottom: '10px' }}>Enrollment Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      ['Screened', participants.length, P.blue],
                      ['Enrolled', participants.filter(p => ['enrolled', 'active'].includes(p.status)).length, P.green],
                      ['Active', participants.filter(p => p.status === 'active').length, P.green],
                      ['Withdrawn', participants.filter(p => p.status === 'withdrawn').length, P.red],
                    ].map(([l, v, c], i) => (
                      <div key={i} style={{ padding: '10px', background: P.bg, borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: c as string }}>{v as number}</div>
                        <div style={{ fontSize: '11px', color: P.textMuted }}>{l as string}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: P.textSec, marginBottom: '10px' }}>Safety Summary</div>
                  {[
                    ['Total AEs', aeReports.length, P.text],
                    ['Serious AEs (SAEs)', aeReports.filter(a => a.is_serious).length, P.red],
                    ['Open AEs', aeReports.filter(a => a.status === 'Open').length, P.amber],
                    ['Protocol Deviations', deviations.length, P.orange],
                  ].map(([l, v, c], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `0.5px solid ${P.border}` : 'none' }}>
                      <span style={{ fontSize: '12px', color: P.textMuted }}>{l as string}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: c as string }}>{v as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PARTICIPANTS ── */}
        {panel === 'participants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>Participants ({participants.length})</div>
                <div style={{ fontSize: '12px', color: P.textMuted, marginTop: '2px' }}>{site.site_name} · {study?.study_id}</div>
              </div>
              <button onClick={() => setShowAddParticipant(true)} style={{ fontSize: '12px', padding: '8px 16px', background: P.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Enroll Participant</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {[
                ['Screening', participants.filter(p => p.status === 'screening').length, P.blue, P.blueLight],
                ['Enrolled', participants.filter(p => p.status === 'enrolled').length, P.green, P.greenLight],
                ['Active', participants.filter(p => p.status === 'active').length, P.green, P.greenLight],
                ['Follow-up', participants.filter(p => p.status === 'follow_up').length, P.purple, P.purpleLight],
                ['Withdrawn', participants.filter(p => p.status === 'withdrawn').length, P.red, P.redLight],
              ].map(([l, v, c, bg], i) => (
                <div key={i} style={{ ...card(), textAlign: 'center', padding: '12px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: c as string }}>{v as number}</div>
                  <div style={{ fontSize: '11px', color: P.textMuted, marginTop: '2px' }}>{l as string}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${P.border}`, background: P.bg }}>
                  {['Code', 'Name', 'Email', 'Status', 'Language', 'Enrolled'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: P.textSec }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {participants.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: P.textMuted }}>No participants yet. Click "Enroll Participant" to add one.</td></tr>
                  ) : participants.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${P.border}` }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: P.orange }}>{p.participant_code}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.full_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: P.textSec }}>{p.email}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(p.status, statusColor(p.status), statusBg(p.status))}</td>
                      <td style={{ padding: '10px 14px', color: P.textSec }}>{p.language_preference === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted }}>{p.enrolled_at ? new Date(p.enrolled_at).toLocaleDateString() : p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SAFETY REPORTING ── */}
        {panel === 'safety' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>Safety Reporting</div>
                <div style={{ fontSize: '12px', color: P.textMuted, marginTop: '2px' }}>AE/SAE log · Protocol deviations</div>
              </div>
              <button onClick={() => setShowAddAE(true)} style={{ fontSize: '12px', padding: '8px 16px', background: P.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Report AE</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
              {[['Total AEs', aeReports.length, P.text], ['SAEs', aeReports.filter(a => a.is_serious).length, P.red], ['Open', aeReports.filter(a => a.status === 'Open').length, P.amber], ['Deviations', deviations.length, P.orange]].map(([l, v, c], i) => (
                <div key={i} style={{ ...card(), textAlign: 'center', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: c as string }}>{v as number}</div>
                  <div style={{ fontSize: '11px', color: P.textMuted, marginTop: '3px' }}>{l as string}</div>
                </div>
              ))}
            </div>
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${P.border}`, background: P.bg }}>
                  {['AE #', 'Description', 'Onset', 'Severity', 'Serious', 'Status', 'Action'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: P.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {aeReports.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: P.textMuted }}>No AEs reported.</td></tr>
                  : aeReports.map((ae, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${P.border}` }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: P.orange }}>{ae.ae_number || `AE-${String(i + 1).padStart(3, '0')}`}</td>
                      <td style={{ padding: '10px 14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{ae.description}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted }}>{ae.onset_date || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(ae.severity, ae.severity === 'Severe' ? P.red : ae.severity === 'Moderate' ? P.amber : P.green, ae.severity === 'Severe' ? P.redLight : ae.severity === 'Moderate' ? P.amberLight : P.greenLight)}</td>
                      <td style={{ padding: '10px 14px' }}>{ae.is_serious ? badge('SAE', P.red, P.redLight) : badge('AE', P.blue, P.blueLight)}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(ae.status, statusColor(ae.status), statusBg(ae.status))}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {ae.status === 'Open' && <button onClick={() => updateAEStatus(ae.id, 'Resolved')} style={{ fontSize: '10px', padding: '3px 8px', background: P.greenLight, color: P.green, border: `0.5px solid #A7F3D0`, borderRadius: '4px', cursor: 'pointer' }}>Resolve</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TASKS ── */}
        {panel === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>Tasks ({tasks.filter(t => t.status === 'Open').length} open)</div>
              <button onClick={() => setShowAddTask(true)} style={{ fontSize: '12px', padding: '8px 16px', background: P.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Add Task</button>
            </div>
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${P.border}`, background: P.bg }}>
                  {['', 'Task', 'Priority', 'Due Date', 'Assigned To', 'Panel', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: P.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tasks.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: P.textMuted }}>No tasks yet.</td></tr>
                  : tasks.map((t, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${P.border}`, opacity: t.status === 'Completed' ? 0.5 : 1 }}>
                      <td style={{ padding: '10px 14px' }}><input type="checkbox" checked={t.status === 'Completed'} onChange={() => updateTaskStatus(t.id, t.status === 'Completed' ? 'Open' : 'Completed')} style={{ cursor: 'pointer' }} /></td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, textDecoration: t.status === 'Completed' ? 'line-through' : 'none' }}>{t.title}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(t.priority, priorityColor(t.priority), t.priority === 'High' ? P.redLight : t.priority === 'Medium' ? P.amberLight : P.greenLight)}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted }}>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '10px 14px', color: P.textSec }}>{t.assigned_to_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted, fontSize: '11px' }}>{t.linked_panel || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(t.status, statusColor(t.status), statusBg(t.status))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MONITORING VISITS ── */}
        {panel === 'monitoring' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>Monitoring Visits</div>
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${P.border}`, background: P.bg }}>
                  {['Visit Type', 'Scheduled Date', 'CRA', 'Status', 'Notes'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: P.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {visits.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: P.textMuted }}>No visits scheduled.</td></tr>
                  : visits.map((v, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${P.border}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: P.orange }}>{v.visit_type}</td>
                      <td style={{ padding: '10px 14px' }}>{v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '10px 14px', color: P.textSec }}>{v.cra_name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(v.status, statusColor(v.status), statusBg(v.status))}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted, fontSize: '11px' }}>{v.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {panel === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>Payments</div>
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${P.border}`, background: P.bg }}>
                  {['Milestone', 'Amount', 'Due Date', 'Invoice Date', 'Paid Date', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: P.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {milestones.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: P.textMuted }}>No payment milestones.</td></tr>
                  : milestones.map((m, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${P.border}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{m.milestone_name}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: P.green }}>${m.amount?.toLocaleString()} {m.currency}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted }}>{m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted }}>{m.invoice_date ? new Date(m.invoice_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted }}>{m.paid_date ? new Date(m.paid_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(m.status, statusColor(m.status), statusBg(m.status))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── IP & SUPPLIES ── */}
        {panel === 'ip' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>IP & Supplies</div>
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${P.border}`, background: P.bg }}>
                  {['Item', 'Lot #', 'On Site', 'Pending', 'Expiry', 'Storage', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: P.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {inventory.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: P.textMuted }}>No inventory data.</td></tr>
                  : inventory.map((inv, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${P.border}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{inv.item_name}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: P.textMuted }}>{inv.lot_number || '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: P.green }}>{inv.quantity_on_site}</td>
                      <td style={{ padding: '10px 14px', color: P.blue }}>{inv.quantity_pending}</td>
                      <td style={{ padding: '10px 14px', color: P.textMuted }}>{inv.expiry_date ? new Date(inv.expiry_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: P.textSec }}>{inv.storage_condition || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(inv.status, statusColor(inv.status), statusBg(inv.status))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PLACEHOLDER PANELS ── */}
        {['activation', 'staff', 'isf', 'messages', 'users'].includes(panel) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>
              {panel === 'activation' && 'Site Activation'}
              {panel === 'staff' && 'Staff & Delegation'}
              {panel === 'isf' && 'Investigator Site File (ISF)'}
              {panel === 'messages' && 'Messages'}
              {panel === 'users' && 'User Management'}
            </div>
            <div style={{ ...card(), textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>
                {panel === 'activation' && '🚀'}
                {panel === 'staff' && '👤'}
                {panel === 'isf' && '📁'}
                {panel === 'messages' && '✉'}
                {panel === 'users' && '⚙'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: P.text, marginBottom: '8px' }}>
                {panel === 'activation' && 'Site Activation — Phase 2'}
                {panel === 'staff' && 'Staff & Delegation — Phase 2'}
                {panel === 'isf' && 'ISF — Building next'}
                {panel === 'messages' && 'Messages — Phase 3'}
                {panel === 'users' && 'User Management — Phase 2'}
              </div>
              <div style={{ fontSize: '13px', color: P.textMuted, maxWidth: '400px', margin: '0 auto' }}>
                {panel === 'isf' && 'The Investigator Site File panel will allow site staff to manage site-level documents, reconcile with the Sponsor TMF, and track ISF completeness.'}
                {panel === 'activation' && 'Site Activation tracks feasibility, IRB approvals, and SIV readiness checklists.'}
                {panel === 'staff' && 'Staff & Delegation manages the Delegation of Authority log, staff qualifications, and training records.'}
                {panel === 'messages' && 'Messages routes queries between CRA and site with SLA tracking.'}
                {panel === 'users' && 'User Management controls platform access and role assignments for site staff.'}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── MODALS ── */}

      {/* Add Participant Modal */}
      {showAddParticipant && modal('Enroll New Participant', () => setShowAddParticipant(false), (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Full Name *', input(newParticipant.full_name, v => setNewParticipant(p => ({ ...p, full_name: v })), 'Jane Smith'))}</div>
            <div>{field('Participant Code *', input(newParticipant.participant_code, v => setNewParticipant(p => ({ ...p, participant_code: v })), 'P-001'))}</div>
          </div>
          {field('Email Address *', input(newParticipant.email, v => setNewParticipant(p => ({ ...p, email: v })), 'participant@email.com', 'email'))}
          {field('Phone Number', input(newParticipant.phone, v => setNewParticipant(p => ({ ...p, phone: v })), '+1 (555) 000-0000', 'tel'))}
          {field('Language Preference', select(newParticipant.language_preference, v => setNewParticipant(p => ({ ...p, language_preference: v })), ['en', 'es']))}
          <div style={{ fontSize: '11px', color: P.textMuted, padding: '10px', background: P.bg, borderRadius: '8px' }}>
            A login link will be sent to the participant's email address after enrollment.
          </div>
        </>
      ), addParticipant, addingParticipant)}

      {/* Add Task Modal */}
      {showAddTask && modal('Add Task', () => setShowAddTask(false), (
        <>
          {field('Task Title *', input(newTask.title, v => setNewTask(p => ({ ...p, title: v })), 'e.g. Review delegation log'))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Priority', select(newTask.priority, v => setNewTask(p => ({ ...p, priority: v })), ['High', 'Medium', 'Low']))}</div>
            <div>{field('Due Date', input(newTask.due_date, v => setNewTask(p => ({ ...p, due_date: v })), '', 'date'))}</div>
          </div>
          {field('Assign To', input(newTask.assigned_to_name, v => setNewTask(p => ({ ...p, assigned_to_name: v })), 'Staff member name'))}
          {field('Linked Panel', select(newTask.linked_panel, v => setNewTask(p => ({ ...p, linked_panel: v })), ['', 'ISF', 'Participants', 'Staff & Delegation', 'Safety Reporting', 'Monitoring Visits', 'IP & Supplies', 'Payments']))}
        </>
      ), addTask)}

      {/* Add AE Modal */}
      {showAddAE && modal('Report Adverse Event', () => setShowAddAE(false), (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('AE Number', input(newAE.ae_number, v => setNewAE(p => ({ ...p, ae_number: v })), 'AE-2026-001'))}</div>
            <div>{field('Onset Date', input(newAE.onset_date, v => setNewAE(p => ({ ...p, onset_date: v })), '', 'date'))}</div>
          </div>
          {field('Description *', <textarea value={newAE.description} onChange={e => setNewAE(p => ({ ...p, description: e.target.value }))} placeholder="Describe the adverse event..." rows={3} style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${P.border}`, borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' as const }} />)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{field('Severity', select(newAE.severity, v => setNewAE(p => ({ ...p, severity: v })), ['Mild', 'Moderate', 'Severe', 'Life-threatening']))}</div>
            <div>{field('Relatedness', select(newAE.relatedness, v => setNewAE(p => ({ ...p, relatedness: v })), ['Unrelated', 'Unlikely', 'Possible', 'Probable', 'Definite']))}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input type="checkbox" id="is_serious" checked={newAE.is_serious} onChange={e => setNewAE(p => ({ ...p, is_serious: e.target.checked }))} />
            <label htmlFor="is_serious" style={{ fontSize: '13px', fontWeight: 500, color: P.text, cursor: 'pointer' }}>This is a Serious Adverse Event (SAE)</label>
          </div>
        </>
      ), addAE)}

    </div>
  );
}