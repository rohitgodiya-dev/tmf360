'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

const C = {
  orange: '#F97316', orangeLight: '#FFF7ED',
  navy: '#0F1E3D', navyLight: '#1E3A5F',
  bg: '#F9FAFB', bgCard: '#FFFFFF',
  border: '#E5E7EB', borderSec: '#D1D5DB',
  text: '#111827', textSec: '#374151', textMuted: '#6B7280', textTert: '#6B7280',
  green: '#10B981', greenLight: '#ECFDF5',
  red: '#EF4444', redLight: '#FEF2F2',
  blue: '#3B82F6', blueLight: '#EFF6FF',
  purple: '#8B5CF6', purpleLight: '#F5F3FF',
  amber: '#F59E0B', amberLight: '#FFFBEB',
};

type Panel = 'dashboard' | 'sites' | 'documents' | 'artifacts' | 'gap' | 'readiness' | 'report' | 'audit' | 'quality' | 'auditor' | 'queries' | 'messages' | 'users' | 'config' | 'ticket';

// DIA ISF Artifact List — Zones 5-8
const ISF_ARTIFACTS = [
  // Zone 5
  { zone: '5', zname: 'Site Management', section: '5.01', sname: 'Ethics', num: '05.01.01', name: 'IRB/IEC Approval Letter', cl: 'Core' },
  { zone: '5', zname: 'Site Management', section: '5.01', sname: 'Ethics', num: '05.01.02', name: 'Ethics Submission', cl: 'Core' },
  { zone: '5', zname: 'Site Management', section: '5.01', sname: 'Ethics', num: '05.01.03', name: 'Ethics Correspondence', cl: 'Recommended' },
  { zone: '5', zname: 'Site Management', section: '5.01', sname: 'Ethics', num: '05.01.04', name: 'Ethics Committee Membership List', cl: 'Recommended' },
  { zone: '5', zname: 'Site Management', section: '5.02', sname: 'Regulatory', num: '05.02.01', name: 'Regulatory Authority Approval', cl: 'Core' },
  { zone: '5', zname: 'Site Management', section: '5.02', sname: 'Regulatory', num: '05.02.02', name: 'Regulatory Submission', cl: 'Core' },
  { zone: '5', zname: 'Site Management', section: '5.02', sname: 'Regulatory', num: '05.02.03', name: 'Import/Export Licence', cl: 'Recommended' },
  { zone: '5', zname: 'Site Management', section: '5.03', sname: 'Site Agreements', num: '05.03.01', name: 'Clinical Trial Agreement', cl: 'Core' },
  { zone: '5', zname: 'Site Management', section: '5.03', sname: 'Site Agreements', num: '05.03.02', name: 'Financial Agreement', cl: 'Core' },
  { zone: '5', zname: 'Site Management', section: '5.03', sname: 'Site Agreements', num: '05.03.03', name: 'Confidentiality Agreement', cl: 'Recommended' },
  { zone: '5', zname: 'Site Management', section: '5.04', sname: 'Financial', num: '05.04.01', name: 'Financial Disclosure Form', cl: 'Core' },
  { zone: '5', zname: 'Site Management', section: '5.04', sname: 'Financial', num: '05.04.02', name: 'Investigator Payment Records', cl: 'Recommended' },
  // Zone 6
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.01', name: 'IP Receipt Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.02', name: 'IP Accountability Log', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.03', name: 'IP Disposition Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.04', name: 'IP Return and Destruction Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.02', sname: 'IP Storage', num: '06.02.01', name: 'Storage Condition Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.02', sname: 'IP Storage', num: '06.02.02', name: 'Temperature Excursion Log', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.02', sname: 'IP Storage', num: '06.02.03', name: 'Equipment Calibration Records', cl: 'Recommended' },
  // Zone 7
  { zone: '7', zname: 'Site Operations', section: '7.01', sname: 'Staff Qualifications', num: '07.01.01', name: 'Principal Investigator CV', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.01', sname: 'Staff Qualifications', num: '07.01.02', name: 'Sub-Investigator CVs', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.01', sname: 'Staff Qualifications', num: '07.01.03', name: 'GCP Training Certificates', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.01', sname: 'Staff Qualifications', num: '07.01.04', name: 'Medical Licence / Registration', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.01', sname: 'Staff Qualifications', num: '07.01.05', name: 'Protocol Training Records', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.02', sname: 'Delegation', num: '07.02.01', name: 'Delegation of Authority Log', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.02', sname: 'Delegation', num: '07.02.02', name: 'Site Signature and Initials Log', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.03', sname: 'Site Visits', num: '07.03.01', name: 'Site Initiation Visit Report', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.03', sname: 'Site Visits', num: '07.03.02', name: 'Interim Monitoring Visit Reports', cl: 'Core' },
  { zone: '7', zname: 'Site Operations', section: '7.03', sname: 'Site Visits', num: '07.03.03', name: 'Close-Out Visit Report', cl: 'Core' },
  // Zone 8
  { zone: '8', zname: 'Subject Data', section: '8.01', sname: 'Consent', num: '08.01.01', name: 'IRB-Approved Informed Consent Form', cl: 'Core' },
  { zone: '8', zname: 'Subject Data', section: '8.01', sname: 'Consent', num: '08.01.02', name: 'Consent Form Translations', cl: 'Recommended' },
  { zone: '8', zname: 'Subject Data', section: '8.01', sname: 'Consent', num: '08.01.03', name: 'Translation Certificates', cl: 'Recommended' },
  { zone: '8', zname: 'Subject Data', section: '8.02', sname: 'Subject Tracking', num: '08.02.01', name: 'Screening Log', cl: 'Core' },
  { zone: '8', zname: 'Subject Data', section: '8.02', sname: 'Subject Tracking', num: '08.02.02', name: 'Enrollment Log', cl: 'Core' },
  { zone: '8', zname: 'Subject Data', section: '8.02', sname: 'Subject Tracking', num: '08.02.03', name: 'Subject Identification Code List', cl: 'Core' },
  { zone: '8', zname: 'Subject Data', section: '8.03', sname: 'Randomisation', num: '08.03.01', name: 'Randomisation Codes', cl: 'Core' },
  { zone: '8', zname: 'Subject Data', section: '8.03', sname: 'Randomisation', num: '08.03.02', name: 'Unblinding Records', cl: 'Recommended' },
];

const ISF_ZONE_NAMES: Record<string, string> = { '5': 'Site Management', '6': 'IP Management', '7': 'Site Operations', '8': 'Subject Data' };

export default function ISFPage() {
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [site, setSite] = useState<any>(null);
  const [study, setStudy] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  // Filters
  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [artZone, setArtZone] = useState('5');
  const [gapZone, setGapZone] = useState('');

  // Upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', zone: '5', section: '', artifact_num: '', artifact_name: '', version: '1.0', effective_date: '', expiry_date: '', comments: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Query form
  const [showAddQuery, setShowAddQuery] = useState(false);
  const [newQuery, setNewQuery] = useState({ query_number: '', description: '', raised_by_name: '', assigned_to_name: '', priority: 'Medium', due_date: '' });

  // Trinity chat
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Hello! I am the ISF Auditor, powered by Trinity AI. I can help you review your ISF for inspection readiness, identify gaps, and answer questions about ICH E6(R3) site obligations. What would you like to know?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = '/site360/login'; return; }
      setUser(u);

      const { data: ur } = await supabase.from('user_roles').select('org_id, full_name, role').eq('user_id', u.id).single();
      if (!ur) { window.location.href = '/site360/login'; return; }

      const { data: siteData } = await supabase.from('sites').select('*').eq('org_id', ur.org_id).single();
      if (!siteData) { setLoading(false); return; }
      setSite({ ...siteData, user_name: ur.full_name || u.email?.split('@')[0], user_role: ur.role });

      const { data: studyData } = await supabase.from('studies').select('*').eq('id', siteData.study_id).single();
      if (studyData) setStudy(studyData);

      const [{ data: docsData }, { data: auditData }, { data: queryData }, { data: configData }, { data: memberData }] = await Promise.all([
        supabase.from('isf_documents').select('*').eq('site_id', siteData.id).order('created_at', { ascending: false }),
        supabase.from('isf_audit_trail').select('*').eq('site_id', siteData.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('isf_queries').select('*').eq('site_id', siteData.id).order('created_at', { ascending: false }),
        supabase.from('isf_config').select('*').eq('site_id', siteData.id).single(),
        supabase.from('site_members').select('*').eq('site_id', siteData.id),
      ]);

      if (docsData) setDocs(docsData);
      if (auditData) setAuditTrail(auditData);
      if (queryData) setQueries(queryData);
      if (configData) setConfig(configData);
      if (memberData) setMembers(memberData);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function logAudit(action: string, docId?: string, prev?: string, next?: string) {
    if (!site || !user) return;
    await supabase.from('isf_audit_trail').insert([{
      org_id: site.org_id, site_id: site.id, study_id: site.study_id,
      document_id: docId || null, action, actor_id: user.id,
      actor_email: user.email, previous_value: prev || null, new_value: next || null,
    }]);
  }

  async function handleUpload() {
    if (!uploadFile || !uploadForm.title || !site) return;
    setUploading(true);
    try {
      const ext = uploadFile.name.split('.').pop();
      const path = `${site.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('isf-documents').upload(path, uploadFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('isf-documents').getPublicUrl(path);
      const { data: ur } = await supabase.from('user_roles').select('org_id').eq('user_id', user.id).single();
      const { data: newDoc } = await supabase.from('isf_documents').insert([{
        org_id: ur?.org_id, site_id: site.id, study_id: site.study_id,
        ...uploadForm, file_url: urlData?.publicUrl, file_name: uploadFile.name,
        file_size: uploadFile.size, uploaded_by: user.id, status: 'Draft',
      }]).select().single();
      if (newDoc) await logAudit('UPLOAD', newDoc.id, undefined, uploadForm.title);
      setShowUpload(false);
      setUploadForm({ title: '', zone: '5', section: '', artifact_num: '', artifact_name: '', version: '1.0', effective_date: '', expiry_date: '', comments: '' });
      setUploadFile(null);
      loadData();
    } catch (e) { console.error(e); }
    setUploading(false);
  }

  async function approveDoc(doc: any) {
    await supabase.from('isf_documents').update({ status: 'Approved', approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', doc.id);
    await logAudit('APPROVE', doc.id, 'Draft', 'Approved');
    loadData();
  }

  async function addQuery() {
    if (!newQuery.description || !site) return;
    const { data: ur } = await supabase.from('user_roles').select('org_id').eq('user_id', user.id).single();
    await supabase.from('isf_queries').insert([{ org_id: ur?.org_id, site_id: site.id, study_id: site.study_id, ...newQuery, raised_by: user.id, status: 'Open' }]);
    setShowAddQuery(false);
    setNewQuery({ query_number: '', description: '', raised_by_name: '', assigned_to_name: '', priority: 'Medium', due_date: '' });
    loadData();
  }

  async function resolveQuery(id: string) {
    await supabase.from('isf_queries').update({ status: 'Resolved', resolved_at: new Date().toISOString() }).eq('id', id);
    loadData();
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(m => [...m, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const docSummary = docs.slice(0, 20).map(d => `${d.artifact_name || d.title} (Zone ${d.zone}, ${d.status})`).join('; ');
      const missingCore = ISF_ARTIFACTS.filter(a => a.cl === 'Core' && !docs.some(d => d.artifact_num === a.num)).map(a => a.name).join(', ');
      const sysPrompt = `You are the ISF Auditor, a GCP compliance expert powered by Trinity AI. You help site teams manage their Investigator Site File in compliance with ICH E6(R3) and the DIA TMF Reference Model.

Site: ${site?.site_name} (${site?.site_code})
Study: ${study?.study_id || 'Unknown'}
PI: ${site?.pi_name || 'Unknown'}

Current ISF Status:
- Total documents: ${docs.length}
- Approved: ${docs.filter(d => d.status === 'Approved').length}
- Draft: ${docs.filter(d => d.status === 'Draft').length}
- Filed documents: ${docSummary || 'None yet'}
- Missing Core documents: ${missingCore || 'None — all Core documents filed'}

Your role:
- Answer questions about ICH E6(R3) site obligations and ISF requirements
- Identify gaps in the ISF based on the DIA TMF Reference Model Zones 5-8
- Help prepare for monitoring visits and inspections
- Never approve documents, close queries, or take system actions
- When uncertain, recommend checking with the sponsor or CRO monitor
- Be specific, practical, and concise`;

      const resp = await fetch('/api/trinity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatMessages, { role: 'user', content: userMsg }], system: sysPrompt }),
      });
      const data = await resp.json();
      const reply = data.content?.[0]?.text || 'I could not process that request. Please try again.';
      setChatMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setChatMessages(m => [...m, { role: 'assistant', content: 'I encountered an error. Please try again.' }]);
    }
    setChatLoading(false);
  }

  // Computed values
  const approvedDocs = docs.filter(d => d.status === 'Approved');
  const draftDocs = docs.filter(d => d.status === 'Draft');
  const coreMissing = ISF_ARTIFACTS.filter(a => a.cl === 'Core' && !docs.some(d => d.artifact_num === a.num));
  const readinessScore = Math.round(
    (approvedDocs.length / Math.max(ISF_ARTIFACTS.filter(a => a.cl === 'Core').length, 1)) * 60 +
    (docs.length / Math.max(ISF_ARTIFACTS.length, 1)) * 20 +
    (approvedDocs.length / Math.max(docs.length, 1)) * 10 +
    (docs.filter(d => !d.expiry_date || new Date(d.expiry_date) > new Date()).length / Math.max(docs.length, 1)) * 10
  );

  const filteredDocs = docs.filter(d => {
    const matchZone = !zoneFilter || d.zone === zoneFilter;
    const matchStatus = !statusFilter || d.status === statusFilter;
    const matchSearch = !docSearch || d.title?.toLowerCase().includes(docSearch.toLowerCase()) || d.artifact_name?.toLowerCase().includes(docSearch.toLowerCase());
    return matchZone && matchStatus && matchSearch;
  });

  const artifactsByZone = ISF_ARTIFACTS.filter(a => !artZone || a.zone === artZone);
  const gapArtifacts = ISF_ARTIFACTS.filter(a => {
    const filed = docs.some(d => d.artifact_num === a.num);
    return !filed && (!gapZone || a.zone === gapZone);
  });

  const statusColor = (s: string) => ['Approved', 'Resolved', 'Closed'].includes(s) ? C.green : ['Draft', 'Open'].includes(s) ? C.blue : C.amber;
  const statusBg = (s: string) => ['Approved', 'Resolved', 'Closed'].includes(s) ? C.greenLight : ['Draft', 'Open'].includes(s) ? C.blueLight : C.amberLight;
  const priorityColor = (p: string) => p === 'High' ? C.red : p === 'Medium' ? C.amber : C.green;

  const card = (extra: any = {}): React.CSSProperties => ({ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '16px 18px', ...extra });
  const badge = (text: string, color: string, bg: string) => <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', color, background: bg, whiteSpace: 'nowrap' as const }}>{text}</span>;

  const navItem = (id: Panel, label: string, icon: string, badgeCount?: number) => (
    <button key={id} onClick={() => setPanel(id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: '12px', background: panel === id ? C.orangeLight : 'transparent', color: panel === id ? C.orange : C.textSec, fontWeight: panel === id ? 600 : 400 }}>
      <i className={`ti ${icon}`} style={{ fontSize: '15px' }} />
      {label}
      {badgeCount ? <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: C.red, color: '#fff', fontWeight: 600 }}>{badgeCount}</span> : null}
    </button>
  );

  const input = (value: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
  );

  const select = (value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', background: C.bgCard }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
      <div style={{ background: C.bgCard, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      <div style={{ textAlign: 'center', color: C.textMuted }}>Loading ISF...</div>
    </div>
  );

  if (!site) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: C.text, marginBottom: '8px' }}>No site found.</div>
        <button onClick={() => window.location.href = '/site360'} style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px' }}>← Back to Site360</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 1.25rem', height: '48px', borderBottom: `0.5px solid ${C.border}`, background: C.bgCard, flexShrink: 0 }}>
        <span style={{ fontSize: '16px', fontWeight: 500 }}>ISF<span style={{ color: C.orange }}>360</span></span>
        <span style={{ fontSize: '11px', color: C.textMuted }}>Investigator Site File Platform</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: C.textSec }}>{site.site_name} ({site.site_code})</span>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: C.orangeLight, color: C.orange, fontWeight: 500 }}>{site.status || 'Active'}</span>
          <span style={{ fontSize: '11px', color: C.textMuted }}>{user?.email}</span>
          <button onClick={() => window.location.href = '/site360'} style={{ fontSize: '11px', color: C.textMuted, background: 'transparent', border: `0.5px solid ${C.border}`, borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{ width: '192px', borderRight: `0.5px solid ${C.border}`, background: C.bgCard, overflowY: 'auto', flexShrink: 0, padding: '8px' }}>
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '8px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>Overview</p>
          {navItem('dashboard', 'Dashboard', 'ti-layout-dashboard')}
          {navItem('sites', 'Sites', 'ti-building')}
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '10px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>ISF Documents</p>
          {navItem('documents', 'Documents', 'ti-files', draftDocs.length || undefined)}
          {navItem('artifacts', 'Artifact browser', 'ti-layout-grid')}
          {navItem('gap', 'Gap analysis', 'ti-clipboard-check', coreMissing.length || undefined)}
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '10px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>Intelligence</p>
          {navItem('readiness', 'Inspection readiness', 'ti-shield-check')}
          {navItem('report', 'Report', 'ti-file-analytics')}
          {navItem('audit', 'Audit trail', 'ti-lock')}
          {navItem('quality', 'Quality checks', 'ti-clipboard-list')}
          {navItem('auditor', 'ISF Auditor', 'ti-checkup-list')}
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '10px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>Team</p>
          {navItem('queries', 'Queries', 'ti-help-circle', queries.filter(q => q.status === 'Open').length || undefined)}
          {navItem('messages', 'Messages', 'ti-message-2')}
          {navItem('users', 'User management', 'ti-users')}
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '10px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>Settings</p>
          {navItem('config', 'ISF Configuration', 'ti-adjustments')}
          {navItem('ticket', 'Ticket', 'ti-ticket')}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

          {/* DASHBOARD */}
          {panel === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>ISF Dashboard</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{site.site_name} · {study?.study_id} · PI: {site.pi_name}</div>
                </div>
                <button onClick={() => setShowUpload(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Upload Document</button>
              </div>

              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                {[
                  { val: docs.length, label: 'Total Documents', color: C.blue, bg: C.blueLight, icon: 'ti-files' },
                  { val: approvedDocs.length, label: 'Approved', color: C.green, bg: C.greenLight, icon: 'ti-check' },
                  { val: draftDocs.length, label: 'Draft', color: C.amber, bg: C.amberLight, icon: 'ti-edit' },
                  { val: `${readinessScore}%`, label: 'ISF Readiness', color: readinessScore >= 80 ? C.green : readinessScore >= 60 ? C.amber : C.red, bg: readinessScore >= 80 ? C.greenLight : readinessScore >= 60 ? C.amberLight : C.redLight, icon: 'ti-target-arrow' },
                ].map((s, i) => (
                  <div key={i} style={{ ...card(), textAlign: 'center' as const, padding: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: s.color }} />
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '3px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Zone breakdown + Missing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '12px' }}>Documents by Zone</div>
                  {['5', '6', '7', '8'].map(z => {
                    const zoneDocs = docs.filter(d => d.zone === z);
                    const zoneApproved = zoneDocs.filter(d => d.status === 'Approved').length;
                    const zoneTotal = ISF_ARTIFACTS.filter(a => a.zone === z && a.cl === 'Core').length;
                    const pct = zoneTotal > 0 ? Math.round((zoneApproved / zoneTotal) * 100) : 0;
                    return (
                      <div key={z} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: C.textSec, fontWeight: 500 }}>Zone {z} — {ISF_ZONE_NAMES[z]}</span>
                          <span style={{ color: pct >= 80 ? C.green : pct >= 50 ? C.amber : C.red, fontWeight: 600 }}>{zoneApproved}/{zoneTotal}</span>
                        </div>
                        <div style={{ height: '6px', background: C.border, borderRadius: '20px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? C.green : pct >= 50 ? C.amber : C.red, borderRadius: '20px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec }}>Missing Core Documents</div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: coreMissing.length > 0 ? C.redLight : C.greenLight, color: coreMissing.length > 0 ? C.red : C.green }}>{coreMissing.length} missing</span>
                  </div>
                  {coreMissing.length === 0 ? (
                    <div style={{ fontSize: '13px', color: C.green, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ti ti-circle-check" style={{ fontSize: '16px' }} />All Core documents filed!</div>
                  ) : coreMissing.slice(0, 6).map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: i < Math.min(coreMissing.length, 6) - 1 ? `0.5px solid ${C.border}` : 'none' }}>
                      <i className="ti ti-point-filled" style={{ fontSize: '11px', color: C.red }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: C.text }}>{a.name}</div>
                        <div style={{ fontSize: '10px', color: C.textMuted }}>Zone {a.zone} · {a.sname} · {a.num}</div>
                      </div>
                    </div>
                  ))}
                  {coreMissing.length > 6 && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '6px' }}>+{coreMissing.length - 6} more — view Gap Analysis</div>}
                </div>
              </div>

              {/* Recent activity */}
              <div style={card()}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '12px' }}>Recent Activity</div>
                {auditTrail.length === 0 ? (
                  <div style={{ fontSize: '12px', color: C.textMuted }}>No activity yet. Upload your first document to get started.</div>
                ) : auditTrail.slice(0, 8).map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 7 ? `0.5px solid ${C.border}` : 'none' }}>
                    <i className={`ti ${a.action === 'UPLOAD' ? 'ti-upload' : a.action === 'APPROVE' ? 'ti-check' : a.action === 'DOWNLOAD' ? 'ti-download' : 'ti-note'}`} style={{ fontSize: '15px', color: C.textMuted, marginTop: '1px' }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{a.action} — {a.new_value || 'Document'}</div>
                      <div style={{ fontSize: '10px', color: C.textMuted }}>{a.actor_email} · {new Date(a.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SITES */}
          {panel === 'sites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Sites</div>
              <div style={card()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {[
                    ['Site Name', site.site_name],
                    ['Site Code', site.site_code],
                    ['Country', site.country || '—'],
                    ['City', site.city || '—'],
                    ['Principal Investigator', site.pi_name || '—'],
                    ['PI Email', site.pi_email || '—'],
                    ['Study ID', study?.study_id || '—'],
                    ['Protocol', study?.protocol || '—'],
                    ['Status', site.status || 'Active'],
                    ['Activation Date', site.activation_date ? new Date(site.activation_date).toLocaleDateString() : '—'],
                    ['IRB Number', config?.irb_number || '—'],
                    ['ISF Effective Date', config?.effective_date ? new Date(config.effective_date).toLocaleDateString() : '—'],
                  ].map(([l, v], i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: `0.5px solid ${C.border}` }}>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '3px' }}>{l}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {panel === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Documents ({docs.length})</div>
                <button onClick={() => setShowUpload(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Upload Document</button>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search documents..." style={{ flex: 1, minWidth: '200px', fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none' }} />
                <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', background: C.bgCard }}>
                  <option value="">All Zones</option>
                  <option value="5">Zone 5 — Site Management</option>
                  <option value="6">Zone 6 — IP Management</option>
                  <option value="7">Zone 7 — Site Operations</option>
                  <option value="8">Zone 8 — Subject Data</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', background: C.bgCard }}>
                  <option value="">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['Title', 'Zone', 'Artifact', 'Version', 'Status', 'Uploaded', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredDocs.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No documents found. Upload your first ISF document.</td></tr>
                    ) : filteredDocs.map((d, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.title}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(`Zone ${d.zone}`, C.blue, C.blueLight)}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec, fontSize: '11px' }}>{d.artifact_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{d.version}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(d.status, statusColor(d.status), statusBg(d.status))}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{new Date(d.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', padding: '3px 8px', background: C.blueLight, color: C.blue, border: `0.5px solid #BFDBFE`, borderRadius: '4px', textDecoration: 'none' }}>View</a>}
                            {d.status === 'Draft' && <button onClick={() => approveDoc(d)} style={{ fontSize: '10px', padding: '3px 8px', background: C.greenLight, color: C.green, border: `0.5px solid #A7F3D0`, borderRadius: '4px', cursor: 'pointer' }}>Approve</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ARTIFACT BROWSER */}
          {panel === 'artifacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Artifact Browser</div>
                <select value={artZone} onChange={e => setArtZone(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', background: C.bgCard }}>
                  <option value="5">Zone 5 — Site Management</option>
                  <option value="6">Zone 6 — IP Management</option>
                  <option value="7">Zone 7 — Site Operations</option>
                  <option value="8">Zone 8 — Subject Data</option>
                </select>
              </div>
              {Array.from(new Set(artifactsByZone.map(a => a.section))).map(section => {
                const sectionArts = artifactsByZone.filter(a => a.section === section);
                const sname = sectionArts[0]?.sname;
                return (
                  <div key={section} style={card()}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.navy, marginBottom: '10px' }}>Section {section} — {sname}</div>
                    {sectionArts.map((a, i) => {
                      const filed = docs.find(d => d.artifact_num === a.num);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < sectionArts.length - 1 ? `0.5px solid ${C.border}` : 'none' }}>
                          <i className={filed ? 'ti ti-circle-check' : 'ti ti-square'} style={{ fontSize: '15px', color: filed ? C.green : C.textMuted }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: filed ? C.green : C.text }}>{a.num} — {a.name}</div>
                            <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '1px' }}>
                              {badge(a.cl, a.cl === 'Core' ? C.orange : C.textMuted, a.cl === 'Core' ? C.orangeLight : C.bg)}
                              {filed && <span style={{ marginLeft: '6px', fontSize: '10px', color: C.green }}>Filed: {filed.title} (v{filed.version})</span>}
                            </div>
                          </div>
                          {!filed && (
                            <button onClick={() => { setUploadForm(f => ({ ...f, zone: a.zone, section: a.section, artifact_num: a.num, artifact_name: a.name })); setShowUpload(true); }} style={{ fontSize: '10px', padding: '4px 10px', background: C.orangeLight, color: C.orange, border: `0.5px solid ${C.orange}`, borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>Upload</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* GAP ANALYSIS */}
          {panel === 'gap' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Gap Analysis</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{gapArtifacts.length} documents missing</div>
                </div>
                <select value={gapZone} onChange={e => setGapZone(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', background: C.bgCard }}>
                  <option value="">All Zones</option>
                  <option value="5">Zone 5</option>
                  <option value="6">Zone 6</option>
                  <option value="7">Zone 7</option>
                  <option value="8">Zone 8</option>
                </select>
              </div>
              {['Core', 'Recommended'].map(cl => {
                const missing = gapArtifacts.filter(a => a.cl === cl);
                if (missing.length === 0) return null;
                return (
                  <div key={cl} style={card()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{cl} Documents Missing</span>
                      {badge(`${missing.length} missing`, cl === 'Core' ? C.red : C.amber, cl === 'Core' ? C.redLight : C.amberLight)}
                    </div>
                    {missing.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < missing.length - 1 ? `0.5px solid ${C.border}` : 'none' }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: cl === 'Core' ? C.red : C.amber }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: C.text }}>{a.num} — {a.name}</div>
                          <div style={{ fontSize: '10px', color: C.textMuted }}>Zone {a.zone} · {a.sname}</div>
                        </div>
                        <button onClick={() => { setUploadForm(f => ({ ...f, zone: a.zone, section: a.section, artifact_num: a.num, artifact_name: a.name })); setShowUpload(true); setPanel('documents'); }} style={{ fontSize: '10px', padding: '4px 10px', background: C.orangeLight, color: C.orange, border: `0.5px solid ${C.orange}`, borderRadius: '6px', cursor: 'pointer' }}>Upload</button>
                      </div>
                    ))}
                  </div>
                );
              })}
              {gapArtifacts.length === 0 && (
                <div style={{ ...card(), textAlign: 'center' as const, padding: '40px' }}>
                  <i className="ti ti-confetti" style={{ fontSize: '32px', color: C.green, marginBottom: '12px', display: 'block' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: C.green }}>No gaps found!</div>
                  <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '4px' }}>All expected ISF documents have been filed.</div>
                </div>
              )}
            </div>
          )}

          {/* INSPECTION READINESS */}
          {panel === 'readiness' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Inspection Readiness</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div style={{ ...card(), textAlign: 'center' as const, padding: '32px 20px' }}>
                  <div style={{ fontSize: '60px', fontWeight: 800, color: readinessScore >= 80 ? C.green : readinessScore >= 60 ? C.amber : C.red }}>{readinessScore}</div>
                  <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '12px' }}>ISF Readiness Score</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: readinessScore >= 80 ? C.green : readinessScore >= 60 ? C.amber : C.red }}>
                    {readinessScore >= 80 ? 'Inspection Ready' : readinessScore >= 60 ? 'Needs Attention' : 'Not Ready'}
                  </div>
                </div>
                <div style={card()}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '14px' }}>Score Breakdown</div>
                  {[
                    ['Core Document Completeness (60%)', Math.round((approvedDocs.length / Math.max(ISF_ARTIFACTS.filter(a => a.cl === 'Core').length, 1)) * 60), 60],
                    ['Overall Completeness (20%)', Math.round((docs.length / Math.max(ISF_ARTIFACTS.length, 1)) * 20), 20],
                    ['Approval Rate (10%)', Math.round((approvedDocs.length / Math.max(docs.length, 1)) * 10), 10],
                    ['Expiry Status (10%)', Math.round((docs.filter(d => !d.expiry_date || new Date(d.expiry_date) > new Date()).length / Math.max(docs.length, 1)) * 10), 10],
                  ].map(([label, score, max], i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: C.textSec }}>{label as string}</span>
                        <span style={{ fontWeight: 600, color: C.orange }}>{score as number}/{max as number}</span>
                      </div>
                      <div style={{ height: '6px', background: C.border, borderRadius: '20px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${((score as number) / (max as number)) * 100}%`, background: C.orange, borderRadius: '20px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={card()}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSec, marginBottom: '12px' }}>Action Items to Improve Score</div>
                {coreMissing.length > 0 && coreMissing.slice(0, 5).map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 4 ? `0.5px solid ${C.border}` : 'none' }}>
                    <i className="ti ti-point-filled" style={{ fontSize: '11px', color: C.red }} />
                    <div style={{ flex: 1, fontSize: '12px' }}>Upload missing Core document: <strong>{a.name}</strong> (Zone {a.zone})</div>
                    <button onClick={() => { setUploadForm(f => ({ ...f, zone: a.zone, artifact_num: a.num, artifact_name: a.name })); setShowUpload(true); }} style={{ fontSize: '10px', padding: '3px 8px', background: C.orangeLight, color: C.orange, border: `0.5px solid ${C.orange}`, borderRadius: '4px', cursor: 'pointer' }}>Upload</button>
                  </div>
                ))}
                {draftDocs.length > 0 && <div style={{ display: 'flex', gap: '10px', padding: '8px 0' }}>
                  <i className="ti ti-point-filled" style={{ fontSize: '11px', color: C.amber }} />
                  <div style={{ fontSize: '12px' }}>Approve {draftDocs.length} document{draftDocs.length > 1 ? 's' : ''} currently in Draft status</div>
                </div>}
                {coreMissing.length === 0 && draftDocs.length === 0 && <div style={{ fontSize: '13px', color: C.green }}>No immediate action items — ISF is in good shape!</div>}
              </div>
            </div>
          )}

          {/* ISF REPORT */}
          {panel === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>ISF Report</div>
                <button onClick={() => window.print()} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Export PDF</button>
              </div>
              <div style={card()}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '4px' }}>Investigator Site File — Health Report</div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '20px' }}>Generated: {new Date().toLocaleDateString()} · {site.site_name} · {study?.study_id}</div>
                {[
                  ['Site Name', site.site_name],
                  ['Site Code', site.site_code],
                  ['Principal Investigator', site.pi_name || '—'],
                  ['Study ID', study?.study_id || '—'],
                  ['Protocol', study?.protocol || '—'],
                  ['IRB Number', config?.irb_number || '—'],
                  ['ISF Readiness Score', `${readinessScore}/100`],
                  ['Total Documents', docs.length],
                  ['Approved Documents', approvedDocs.length],
                  ['Draft Documents', draftDocs.length],
                  ['Missing Core Documents', coreMissing.length],
                  ['Open Queries', queries.filter(q => q.status === 'Open').length],
                ].map(([l, v], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `0.5px solid ${C.border}` }}>
                    <span style={{ fontSize: '12px', color: C.textMuted }}>{l}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIT TRAIL */}
          {panel === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: C.amberLight, border: '0.5px solid #FDE68A', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#92400E' }}>
                This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions are permanently recorded.
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Audit Trail</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['Action', 'Document', 'Actor', 'Timestamp'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {auditTrail.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No audit entries yet.</td></tr>
                    : auditTrail.map((a, i) => (
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

          {/* QUALITY CHECKS */}
          {panel === 'quality' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Quality Checks</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['Document', 'Zone', 'File Size', 'Has Expiry', 'Version Format', 'Quality Score'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {docs.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No documents to check.</td></tr>
                    : docs.map((d, i) => {
                      const sizeOk = d.file_size && d.file_size > 1024;
                      const hasExpiry = !!d.expiry_date;
                      const versionOk = /^\d+\.\d+$/.test(d.version || '');
                      const score = Math.round((sizeOk ? 40 : 0) + (hasExpiry ? 30 : 0) + (versionOk ? 30 : 0));
                      return (
                        <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                          <td style={{ padding: '10px 14px', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.title}</td>
                          <td style={{ padding: '10px 14px' }}>{badge(`Zone ${d.zone}`, C.blue, C.blueLight)}</td>
                          <td style={{ padding: '10px 14px' }}>{badge(sizeOk ? 'OK' : '!', sizeOk ? C.green : C.red, sizeOk ? C.greenLight : C.redLight)}</td>
                          <td style={{ padding: '10px 14px' }}>{badge(hasExpiry ? 'OK' : '!', hasExpiry ? C.green : C.amber, hasExpiry ? C.greenLight : C.amberLight)}</td>
                          <td style={{ padding: '10px 14px' }}>{badge(versionOk ? 'OK' : '!', versionOk ? C.green : C.red, versionOk ? C.greenLight : C.redLight)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '60px', height: '6px', background: C.border, borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? C.green : score >= 60 ? C.amber : C.red, borderRadius: '20px' }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: score >= 80 ? C.green : score >= 60 ? C.amber : C.red }}>{score}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ISF AUDITOR */}
          {panel === 'auditor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: 'calc(100vh - 80px)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>ISF Auditor <span style={{ fontSize: '12px', fontWeight: 400, color: C.orange }}>Powered by Trinity AI</span></div>
              <div style={{ ...card(), flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: m.role === 'user' ? C.orange : C.bg, color: m.role === 'user' ? '#fff' : C.text, fontSize: '13px', lineHeight: 1.6 }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 2px', background: C.bg, fontSize: '13px', color: C.textMuted }}>Trinity is thinking...</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} placeholder="Ask about your ISF, GCP compliance, inspection readiness..." style={{ flex: 1, fontSize: '13px', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', outline: 'none', fontFamily: 'inherit' }} />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: '10px 20px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', cursor: chatLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', opacity: chatLoading ? 0.7 : 1 }}>Send</button>
                </div>
              </div>
            </div>
          )}

          {/* QUERIES */}
          {panel === 'queries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Monitoring Queries ({queries.filter(q => q.status === 'Open').length} open)</div>
                <button onClick={() => setShowAddQuery(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ New Query</button>
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['#', 'Description', 'Raised By', 'Assigned To', 'Priority', 'Status', 'Due Date', 'Action'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {queries.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No queries yet.</td></tr>
                    : queries.map((q, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.orange, fontSize: '11px' }}>{q.query_number || `Q-${String(i + 1).padStart(3, '0')}`}</td>
                        <td style={{ padding: '10px 14px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{q.description}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{q.raised_by_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{q.assigned_to_name || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(q.priority, priorityColor(q.priority), q.priority === 'High' ? C.redLight : q.priority === 'Medium' ? C.amberLight : C.greenLight)}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(q.status, statusColor(q.status), statusBg(q.status))}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{q.due_date ? new Date(q.due_date).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {q.status === 'Open' && <button onClick={() => resolveQuery(q.id)} style={{ fontSize: '10px', padding: '3px 8px', background: C.greenLight, color: C.green, border: `0.5px solid #A7F3D0`, borderRadius: '4px', cursor: 'pointer' }}>Resolve</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {panel === 'messages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Messages</div>
              <div style={{ ...card(), textAlign: 'center' as const, padding: '60px' }}>
                <i className="ti ti-messages" style={{ fontSize: '40px', color: C.textMuted, marginBottom: '16px', display: 'block' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '8px' }}>Messages — Coming in Phase 2</div>
                <div style={{ fontSize: '13px', color: C.textMuted }}>Site team messaging will be powered by Connect360.</div>
              </div>
            </div>
          )}

          {/* USER MANAGEMENT */}
          {panel === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>User Management</div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['Name', 'Member ID', 'Role', 'Status', 'Joined'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {members.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No team members yet.</td></tr>
                    : members.map((m, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 500, color: C.text }}>{m.full_name || m.name || '—'}</div>
                          <div style={{ fontSize: '11px', color: C.textMuted }}>{m.email || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: C.textMuted }}>{m.user_id?.slice(0, 8)}...</td>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{m.role || 'CRC'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(m.is_active ? 'Active' : 'Inactive', m.is_active ? C.green : C.red, m.is_active ? C.greenLight : C.redLight)}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : (m.added_at ? new Date(m.added_at).toLocaleDateString() : '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ISF CONFIG */}
          {panel === 'config' && (
            <ISFConfigPanel site={site} study={study} user={user} currentUserRole={site.user_role} logAudit={logAudit} />
          )}

          {/* TICKET */}
          {panel === 'ticket' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Support Ticket</div>
              <div style={card()}>
                {field('Subject', input('', () => {}, 'Describe your issue'))}
                {field('Description', <textarea rows={5} placeholder="Provide details about the issue..." style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' as const }} />)}
                {field('Priority', select('Medium', () => {}, [{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Medium' }, { value: 'High', label: 'High' }]))}
                <button style={{ padding: '10px 20px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Submit Ticket</button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && modal('Upload ISF Document', () => setShowUpload(false), (
        <>
          {field('Document Title *', input(uploadForm.title, v => setUploadForm(f => ({ ...f, title: v })), 'e.g. IRB Approval Letter'))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {field('Zone *', select(uploadForm.zone, v => setUploadForm(f => ({ ...f, zone: v })), [{ value: '5', label: 'Zone 5 — Site Management' }, { value: '6', label: 'Zone 6 — IP Management' }, { value: '7', label: 'Zone 7 — Site Operations' }, { value: '8', label: 'Zone 8 — Subject Data' }]))}
            {field('Version', input(uploadForm.version, v => setUploadForm(f => ({ ...f, version: v })), '1.0'))}
          </div>
          {field('Artifact Number', input(uploadForm.artifact_num, v => setUploadForm(f => ({ ...f, artifact_num: v })), 'e.g. 05.01.01'))}
          {field('Artifact Name', input(uploadForm.artifact_name, v => setUploadForm(f => ({ ...f, artifact_name: v })), 'e.g. IRB/IEC Approval Letter'))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {field('Effective Date', input(uploadForm.effective_date, v => setUploadForm(f => ({ ...f, effective_date: v })), '', 'date'))}
            {field('Expiry Date', input(uploadForm.expiry_date, v => setUploadForm(f => ({ ...f, expiry_date: v })), '', 'date'))}
          </div>
          {field('Comments', input(uploadForm.comments, v => setUploadForm(f => ({ ...f, comments: v })), 'Optional notes'))}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '5px' }}>File *</label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" onChange={e => setUploadFile(e.target.files?.[0] || null)} style={{ fontSize: '13px' }} />
            {uploadFile && <div style={{ fontSize: '11px', color: C.green, marginTop: '4px' }}>✓ {uploadFile.name}</div>}
          </div>
        </>
      ), handleUpload, uploading)}

      {/* ADD QUERY MODAL */}
      {showAddQuery && modal('New Monitoring Query', () => setShowAddQuery(false), (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {field('Query Number', input(newQuery.query_number, v => setNewQuery(q => ({ ...q, query_number: v })), 'Q-001'))}
            {field('Priority', select(newQuery.priority, v => setNewQuery(q => ({ ...q, priority: v })), [{ value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }]))}
          </div>
          {field('Description *', <textarea value={newQuery.description} onChange={e => setNewQuery(q => ({ ...q, description: e.target.value }))} placeholder="Describe the monitoring query..." rows={3} style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' as const }} />)}
          {field('Raised By', input(newQuery.raised_by_name, v => setNewQuery(q => ({ ...q, raised_by_name: v })), 'CRA name'))}
          {field('Assigned To', input(newQuery.assigned_to_name, v => setNewQuery(q => ({ ...q, assigned_to_name: v })), 'Site coordinator name'))}
          {field('Due Date', input(newQuery.due_date, v => setNewQuery(q => ({ ...q, due_date: v })), '', 'date'))}
        </>
      ), addQuery)}

    </div>
  );
}

function ISFConfigPanel({ site, study, user, currentUserRole, logAudit }: { site: any; study: any; user: any; currentUserRole: string; logAudit: any }) {
  const [tab, setTab] = useState<'zones' | 'artifacts' | 'subartifacts'>('zones');
  const [config, setConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showAddZone, setShowAddZone] = useState(false);
  const [showAddArtifact, setShowAddArtifact] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [disableTarget, setDisableTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [newZoneNum, setNewZoneNum] = useState('');
  const [newZoneName, setNewZoneName] = useState('');
  const [newArtNum, setNewArtNum] = useState('');
  const [newArtName, setNewArtName] = useState('');
  const [newArtZone, setNewArtZone] = useState('5');
  const [newArtSection, setNewArtSection] = useState('');
  const [newArtCl, setNewArtCl] = useState('Core');
  const [newSubNum, setNewSubNum] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubParent, setNewSubParent] = useState('');
  const [newSubZone, setNewSubZone] = useState('5');

  const isAdmin = ['System Administrator', 'Site Coordinator', 'PI'].includes(currentUserRole);

  useEffect(() => { if (site && study) loadConfig(); }, [site, study]);

  async function loadConfig() {
    setLoading(true);
    const { data } = await supabase.from('isf_config').select('*').eq('site_id', site.id).eq('study_id', study.id).order('zone_num', { ascending: true });
    if (data) setConfig(data);
    setLoading(false);
  }

  async function seedIfEmpty() {
    const { data } = await supabase.from('isf_config').select('id').eq('site_id', site.id).eq('study_id', study.id).limit(1);
    if (data && data.length > 0) return;
    const zoneRows = Object.entries(ISF_ZONE_NAMES).map(([z, zn]) => ({ type: 'zone', zone_num: z, zone_name: zn }));
    const artRows = ISF_ARTIFACTS.map(a => ({ type: 'artifact', zone_num: a.zone, section_num: a.section, artifact_num: a.num, artifact_name: a.name, classification: a.cl }));
    const seed = [...zoneRows, ...artRows].map(r => ({ ...r, org_id: site.org_id, site_id: site.id, study_id: study.id, is_enabled: true, is_locked: false, is_custom: false, created_by: user.email }));
    await supabase.from('isf_config').insert(seed);
    await loadConfig();
  }

  useEffect(() => { if (site && study && !loading && config.length === 0) seedIfEmpty(); }, [loading]);

  async function toggleEnabled(item: any) {
    if (!item.is_enabled) {
      const { error } = await supabase.from('isf_config').update({ is_enabled: true, disabled_reason: null, disabled_by: null, disabled_at: null }).eq('id', item.id);
      if (!error) {
        if (item.type === 'zone') supabase.from('isf_config').update({ is_enabled: true, disabled_reason: null, disabled_by: null, disabled_at: null }).eq('site_id', site.id).eq('study_id', study.id).eq('zone_num', item.zone_num).eq('type', 'artifact').then(() => {});
        await logAudit('ISF config enabled', undefined, 'false', 'true');
        loadConfig();
      }
    } else {
      setDisableTarget(item); setDisableReason(''); setShowDisableModal(true);
    }
  }

  async function submitDisable() {
    if (!disableReason.trim()) { setMsg('Reason is required.'); return; }
    const now = new Date().toISOString();
    const { error } = await supabase.from('isf_config').update({ is_enabled: false, disabled_reason: disableReason.trim(), disabled_by: user.email, disabled_at: now }).eq('id', disableTarget.id);
    if (!error) {
      await logAudit('ISF config disabled', undefined, 'true', 'false');
      if (disableTarget.type === 'zone') supabase.from('isf_config').update({ is_enabled: false, disabled_reason: 'Parent zone disabled', disabled_by: user.email, disabled_at: now }).eq('site_id', site.id).eq('study_id', study.id).eq('zone_num', disableTarget.zone_num).eq('type', 'artifact').then(() => {});
      setShowDisableModal(false); setDisableTarget(null); setDisableReason(''); loadConfig();
    }
  }

  async function toggleLock(item: any) {
    const { error } = await supabase.from('isf_config').update({ is_locked: !item.is_locked }).eq('id', item.id);
    if (!error) { await logAudit(item.is_locked ? 'ISF artifact unlocked' : 'ISF artifact locked'); loadConfig(); }
  }

  async function saveEdit() {
    if (!editName.trim() || !editTarget) return;
    const field = editTarget.type === 'zone' ? 'zone_name' : 'artifact_name';
    const { error } = await supabase.from('isf_config').update({ [field]: editName.trim() }).eq('id', editTarget.id);
    if (!error) { await logAudit('ISF config name edited', undefined, editTarget[field] || '', editName.trim()); setShowEditModal(false); setEditTarget(null); setEditName(''); loadConfig(); setMsg('Name updated.'); }
  }

  async function addZone() {
    if (!newZoneNum.trim() || !newZoneName.trim()) return;
    const { error } = await supabase.from('isf_config').insert([{ org_id: site.org_id, site_id: site.id, study_id: study.id, type: 'zone', zone_num: newZoneNum.trim(), zone_name: newZoneName.trim(), is_enabled: true, is_locked: false, is_custom: true, created_by: user.email }]);
    if (!error) { await logAudit('Custom ISF zone added', undefined, '', newZoneNum.trim()); setShowAddZone(false); setNewZoneNum(''); setNewZoneName(''); loadConfig(); setMsg('Zone added.'); }
  }

  async function addArtifact() {
    if (!newArtNum.trim() || !newArtName.trim() || !newArtZone.trim()) return;
    const { error } = await supabase.from('isf_config').insert([{ org_id: site.org_id, site_id: site.id, study_id: study.id, type: 'artifact', zone_num: newArtZone.trim(), section_num: newArtSection.trim(), artifact_num: newArtNum.trim(), artifact_name: newArtName.trim(), classification: newArtCl, is_enabled: true, is_locked: false, is_custom: true, created_by: user.email }]);
    if (!error) { await logAudit('Custom ISF artifact added', undefined, '', newArtNum.trim()); setShowAddArtifact(false); setNewArtNum(''); setNewArtName(''); setNewArtSection(''); loadConfig(); setMsg('Artifact added.'); }
  }

  async function addSubArtifact() {
    if (!newSubNum.trim() || !newSubName.trim() || !newSubParent.trim()) return;
    const { error } = await supabase.from('isf_config').insert([{ org_id: site.org_id, site_id: site.id, study_id: study.id, type: 'sub_artifact', zone_num: newSubZone.trim(), artifact_num: newSubNum.trim(), artifact_name: newSubName.trim(), parent_artifact_num: newSubParent.trim(), classification: 'Core', is_enabled: true, is_locked: false, is_custom: true, created_by: user.email }]);
    if (!error) { await logAudit('Custom ISF sub-artifact added', undefined, '', newSubNum.trim()); setShowAddSub(false); setNewSubNum(''); setNewSubName(''); setNewSubParent(''); loadConfig(); setMsg('Sub-artifact added.'); }
  }

  async function resetToDefault() {
    if (!confirm('This will delete all custom config and reset to DIA ISF standard. Continue?')) return;
    await supabase.from('isf_config').delete().eq('site_id', site.id).eq('study_id', study.id);
    await logAudit('ISF config reset to DIA standard', undefined, 'custom', 'default');
    await seedIfEmpty();
    setMsg('Reset to DIA TMF Reference Model v3.3.1 (Zones 5-8).');
  }

  const zones = config.filter(c => c.type === 'zone').sort((a, b) => parseFloat(a.zone_num) - parseFloat(b.zone_num));
  const artifacts = config.filter(c => c.type === 'artifact').sort((a, b) => a.artifact_num?.localeCompare(b.artifact_num));
  const subartifacts = config.filter(c => c.type === 'sub_artifact').sort((a, b) => a.artifact_num?.localeCompare(b.artifact_num));

  const clBadge = (cl: string) => {
    const c: Record<string, any> = { Core: { bg: '#FEF2F2', color: '#991B1B' }, Recommended: { bg: '#FFFBEB', color: '#92400E' } };
    const s = c[cl] || c.Core;
    return <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: 600 }}>{cl}</span>;
  };

  if (!study) return <div style={{ fontSize: '12px', color: C.textMuted }}>No study selected.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>ISF Configuration - {study.study_id}</div>
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>Manage zones, artifacts, and sub-artifacts for this site's ISF. Changes are scoped to this site and study only.</div>
        </div>
        {isAdmin && <button onClick={resetToDefault} style={{ fontSize: '12px', padding: '8px 16px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: C.bgCard, cursor: 'pointer', color: C.textSec }}>Reset to DIA standard</button>}
      </div>

      {msg && <div style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', background: C.greenLight, color: C.green }}>{msg}</div>}

      <div style={{ background: C.blueLight, border: '0.5px solid #BFDBFE', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#1E40AF' }}>
        DIA TMF Reference Model v3.3.1 (Site-level Zones 5-8). Disabled zones count as 100% complete. All changes are logged to the audit trail.
      </div>

      <div style={{ display: 'flex', gap: '6px', borderBottom: `0.5px solid ${C.border}` }}>
        {(['zones', 'artifacts', 'subartifacts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ fontSize: '12px', padding: '8px 16px', border: 'none', borderBottom: tab === t ? `2px solid ${C.orange}` : '2px solid transparent', background: 'transparent', color: tab === t ? C.orange : C.textSec, cursor: 'pointer', fontWeight: tab === t ? 600 : 400 }}>
            {t === 'zones' ? 'Zones' : t === 'artifacts' ? 'Artifacts' : 'Sub-artifacts'}
            <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: C.bg, color: C.textMuted }}>{t === 'zones' ? zones.length : t === 'artifacts' ? artifacts.length : subartifacts.length}</span>
          </button>
        ))}
      </div>

      {tab === 'zones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isAdmin && <button onClick={() => setShowAddZone(true)} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}>+ Add zone</button>}
          {loading ? <div style={{ fontSize: '12px', color: C.textMuted }}>Loading...</div> : zones.map(z => (
            <div key={z.id} style={{ background: C.bgCard, border: `0.5px solid ${z.is_enabled ? C.border : '#FCA5A5'}`, borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: z.is_enabled ? C.orangeLight : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: z.is_enabled ? C.orange : '#EF4444', flexShrink: 0 }}>{z.zone_num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{z.zone_name}</span>
                  {z.is_custom && <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: '#F0FDF4', color: '#065F46', fontWeight: 600 }}>Custom</span>}
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: z.is_enabled ? C.greenLight : '#FEF2F2', color: z.is_enabled ? '#065F46' : '#991B1B', fontWeight: 600 }}>{z.is_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                {!z.is_enabled && z.disabled_reason && <div style={{ fontSize: '11px', color: '#991B1B', background: '#FEF2F2', borderRadius: '6px', padding: '6px 10px', marginTop: '4px' }}>Disabled: {z.disabled_reason} <span style={{ color: C.textMuted }}>by {z.disabled_by}</span></div>}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => { setEditTarget(z); setEditName(z.zone_name || ''); setShowEditModal(true); }} style={{ fontSize: '11px', padding: '5px 12px', border: `0.5px solid ${C.border}`, borderRadius: '6px', background: C.bg, color: C.textSec, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => toggleEnabled(z)} style={{ fontSize: '11px', padding: '5px 12px', border: `0.5px solid ${C.border}`, borderRadius: '6px', background: z.is_enabled ? '#FEF2F2' : C.greenLight, color: z.is_enabled ? '#991B1B' : '#065F46', cursor: 'pointer' }}>{z.is_enabled ? 'Disable' : 'Enable'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'artifacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isAdmin && <button onClick={() => setShowAddArtifact(true)} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}>+ Add artifact</button>}
          {loading ? <div style={{ fontSize: '12px', color: C.textMuted }}>Loading...</div> : artifacts.map(a => (
            <div key={a.id} style={{ background: C.bgCard, border: `0.5px solid ${a.is_enabled ? C.border : '#FCA5A5'}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' as const }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: C.textMuted }}>{a.artifact_num}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{a.artifact_name}</span>
                  {clBadge(a.classification || 'Core')}
                  {a.is_custom && <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: '#F0FDF4', color: '#065F46', fontWeight: 600 }}>Custom</span>}
                  {a.is_locked && <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>Locked</span>}
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: a.is_enabled ? C.greenLight : '#FEF2F2', color: a.is_enabled ? '#065F46' : '#991B1B', fontWeight: 600 }}>{a.is_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div style={{ fontSize: '10px', color: C.textMuted }}>Zone {a.zone_num}{a.section_num ? ` - Section ${a.section_num}` : ''}</div>
                {!a.is_enabled && a.disabled_reason && <div style={{ fontSize: '11px', color: '#991B1B', background: '#FEF2F2', borderRadius: '6px', padding: '5px 9px', marginTop: '4px' }}>Disabled: {a.disabled_reason} <span style={{ color: C.textMuted }}>by {a.disabled_by}</span></div>}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => { setEditTarget(a); setEditName(a.artifact_name || ''); setShowEditModal(true); }} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${C.border}`, borderRadius: '6px', background: C.bg, color: C.textSec, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => toggleLock(a)} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${C.border}`, borderRadius: '6px', background: a.is_locked ? '#FFFBEB' : '#F9FAFB', color: a.is_locked ? '#92400E' : C.textSec, cursor: 'pointer' }}>{a.is_locked ? 'Unlock' : 'Lock'}</button>
                  <button onClick={() => toggleEnabled(a)} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${C.border}`, borderRadius: '6px', background: a.is_enabled ? '#FEF2F2' : C.greenLight, color: a.is_enabled ? '#991B1B' : '#065F46', cursor: 'pointer' }}>{a.is_enabled ? 'Disable' : 'Enable'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'subartifacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isAdmin && <button onClick={() => setShowAddSub(true)} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}>+ Add sub-artifact</button>}
          {loading ? <div style={{ fontSize: '12px', color: C.textMuted }}>Loading...</div> : subartifacts.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '2rem', color: C.textMuted, fontSize: '12px' }}>No sub-artifacts yet. Add one to get started.</div>
          ) : subartifacts.map(s => (
            <div key={s.id} style={{ background: C.bgCard, border: `0.5px solid ${s.is_enabled ? C.border : '#FCA5A5'}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' as const }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: C.textMuted }}>{s.artifact_num}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{s.artifact_name}</span>
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: s.is_enabled ? C.greenLight : '#FEF2F2', color: s.is_enabled ? '#065F46' : '#991B1B', fontWeight: 600 }}>{s.is_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div style={{ fontSize: '10px', color: C.textMuted }}>Zone {s.zone_num} - Parent: {s.parent_artifact_num}</div>
                {!s.is_enabled && s.disabled_reason && <div style={{ fontSize: '11px', color: '#991B1B', background: '#FEF2F2', borderRadius: '6px', padding: '5px 9px', marginTop: '4px' }}>Disabled: {s.disabled_reason} <span style={{ color: C.textMuted }}>by {s.disabled_by}</span></div>}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => { setEditTarget(s); setEditName(s.artifact_name || ''); setShowEditModal(true); }} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${C.border}`, borderRadius: '6px', background: C.bg, color: C.textSec, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => toggleEnabled(s)} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${C.border}`, borderRadius: '6px', background: s.is_enabled ? '#FEF2F2' : C.greenLight, color: s.is_enabled ? '#991B1B' : '#065F46', cursor: 'pointer' }}>{s.is_enabled ? 'Disable' : 'Enable'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEditModal && editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', padding: '1.5rem', width: '420px', border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Edit {editTarget.type === 'zone' ? 'zone' : 'artifact'} name</div>
            <div style={{ fontSize: '11px', color: C.textSec, marginBottom: '1rem' }}>{editTarget.zone_name || editTarget.artifact_name}</div>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Enter new name..." style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '8px 10px', marginBottom: '1rem', boxSizing: 'border-box' as const }} onKeyDown={e => e.key === 'Enter' && saveEdit()} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowEditModal(false); setEditTarget(null); setEditName(''); }} style={{ fontSize: '11px', padding: '6px 14px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEdit} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showDisableModal && disableTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', padding: '1.5rem', width: '420px', border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Disable {disableTarget.type === 'zone' ? 'zone' : 'artifact'}</div>
            <div style={{ fontSize: '11px', color: C.textSec, marginBottom: '1rem' }}>{disableTarget.zone_name || disableTarget.artifact_name}</div>
            <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem', fontSize: '11px', color: '#92400E' }}>
              {disableTarget.type === 'zone' ? 'Disabled zones are counted as 100% complete in the ISF dashboard.' : 'Disabled artifacts are excluded from gap analysis and completeness calculations.'}
            </div>
            <textarea value={disableReason} onChange={e => setDisableReason(e.target.value)} placeholder="Reason for disabling (required)..." rows={3} style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '8px 10px', marginBottom: '1rem', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowDisableModal(false); setDisableTarget(null); setDisableReason(''); }} style={{ fontSize: '11px', padding: '6px 14px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitDisable} style={{ fontSize: '11px', padding: '6px 14px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Confirm disable</button>
            </div>
          </div>
        </div>
      )}

      {showAddZone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', padding: '1.5rem', width: '400px', border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>Add custom zone</div>
            <input value={newZoneNum} onChange={e => setNewZoneNum(e.target.value)} placeholder="Zone number e.g. 9" style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '7px 10px', marginBottom: '10px', boxSizing: 'border-box' as const }} />
            <input value={newZoneName} onChange={e => setNewZoneName(e.target.value)} placeholder="Zone name e.g. Quality Management" style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '7px 10px', marginBottom: '1rem', boxSizing: 'border-box' as const }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddZone(false)} style={{ fontSize: '11px', padding: '6px 14px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addZone} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add zone</button>
            </div>
          </div>
        </div>
      )}

      {showAddArtifact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', padding: '1.5rem', width: '440px', border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>Add custom artifact</div>
            {[{ l: 'Zone number', v: newArtZone, s: setNewArtZone, p: 'e.g. 5' }, { l: 'Section number', v: newArtSection, s: setNewArtSection, p: 'e.g. 5.05' }, { l: 'Artifact number', v: newArtNum, s: setNewArtNum, p: 'e.g. 05.05.01' }, { l: 'Artifact name', v: newArtName, s: setNewArtName, p: 'e.g. Training Log' }].map(f => (
              <div key={f.l} style={{ marginBottom: '10px' }}><label style={{ fontSize: '11px', color: C.textSec, display: 'block', marginBottom: '3px' }}>{f.l}</label><input value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.p} style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '7px 10px', boxSizing: 'border-box' as const }} /></div>
            ))}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '11px', color: C.textSec, display: 'block', marginBottom: '3px' }}>Classification</label>
              <select value={newArtCl} onChange={e => setNewArtCl(e.target.value)} style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '7px 10px' }}>
                <option>Core</option><option>Recommended</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddArtifact(false)} style={{ fontSize: '11px', padding: '6px 14px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addArtifact} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add artifact</button>
            </div>
          </div>
        </div>
      )}

      {showAddSub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', padding: '1.5rem', width: '440px', border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>Add sub-artifact</div>
            {[{ l: 'Zone number', v: newSubZone, s: setNewSubZone, p: 'e.g. 5' }, { l: 'Parent artifact number', v: newSubParent, s: setNewSubParent, p: 'e.g. 05.03.01' }, { l: 'Sub-artifact number', v: newSubNum, s: setNewSubNum, p: 'e.g. 05.03.01.01' }, { l: 'Sub-artifact name', v: newSubName, s: setNewSubName, p: 'e.g. Remote Visit Report' }].map(f => (
              <div key={f.l} style={{ marginBottom: '10px' }}><label style={{ fontSize: '11px', color: C.textSec, display: 'block', marginBottom: '3px' }}>{f.l}</label><input value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.p} style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '7px 10px', boxSizing: 'border-box' as const }} /></div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddSub(false)} style={{ fontSize: '11px', padding: '6px 14px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addSubArtifact} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add sub-artifact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}