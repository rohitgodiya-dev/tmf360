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

type Panel = 'dashboard' | 'documents' | 'artifacts' | 'gap' | 'readiness' | 'report' | 'audit' | 'quality' | 'auditor' | 'queries' | 'users' | 'config' | 'ticket' | 'archived';

const ISF_ARTIFACTS = [
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
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.01', name: 'IP Receipt Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.02', name: 'IP Accountability Log', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.03', name: 'IP Disposition Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.01', sname: 'IP Accountability', num: '06.01.04', name: 'IP Return and Destruction Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.02', sname: 'IP Storage', num: '06.02.01', name: 'Storage Condition Records', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.02', sname: 'IP Storage', num: '06.02.02', name: 'Temperature Excursion Log', cl: 'Core' },
  { zone: '6', zname: 'IP Management', section: '6.02', sname: 'IP Storage', num: '06.02.03', name: 'Equipment Calibration Records', cl: 'Recommended' },
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

function isfCalcQuality(d: any): { score: number; flags: string[] } {
  const flags: string[] = [];
  if (!d.file_url) flags.push('NO_FILE');
  if (!d.effective_date) flags.push('MISSING_DATE');
  if (!d.version || d.version.trim() === '') flags.push('MISSING_VERSION');
  if (d.expiry_date && new Date(d.expiry_date) < new Date()) flags.push('EXPIRED');
  let score = 100;
  if (flags.includes('NO_FILE')) score -= 30;
  if (flags.includes('MISSING_DATE')) score -= 10;
  if (flags.includes('MISSING_VERSION')) score -= 10;
  if (flags.includes('EXPIRED')) score -= 15;
  return { score: Math.max(0, score), flags };
}
const ISF_FLAG_LABELS: Record<string, { label: string; color: string; bg: string; fix: string; pts: number }> = {
  NO_FILE: { label: 'No file uploaded', color: '#991B1B', bg: '#FEF2F2', fix: 'Upload the document file', pts: 30 },
  MISSING_DATE: { label: 'Missing effective date', color: '#92400E', bg: '#FFFBEB', fix: 'Add the effective date', pts: 10 },
  MISSING_VERSION: { label: 'Missing version', color: '#92400E', bg: '#FFFBEB', fix: 'Add version number (e.g. 1.0)', pts: 10 },
  EXPIRED: { label: 'Document expired', color: '#991B1B', bg: '#FEF2F2', fix: 'Renew or replace the expired document', pts: 15 },
};

function appendNote(existing: string | undefined | null, text: string, email: string): string {
  const stamp = `[${new Date().toLocaleString()} - ${email}]: ${text.trim()}`;
  return existing ? `${existing}\n${stamp}` : stamp;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(name?: string): boolean {
  if (!name) return false;
  return /\.(png|jpg|jpeg|gif|webp|pdf)$/i.test(name);
}

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

  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [artZone, setArtZone] = useState('5');
  const [artSearch, setArtSearch] = useState('');
  const [artCl, setArtCl] = useState('core+rec');
  const [gapZone, setGapZone] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', zone: '5', artifact_num: '', artifact_name: '', section: '', version: '1.0', owner: '', status: 'Draft', effective_date: '', expiry_date: '', comments: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showAddQuery, setShowAddQuery] = useState(false);
  const [newQuery, setNewQuery] = useState({ query_number: '', description: '', raised_by_name: '', assigned_to_name: '', priority: 'Medium', due_date: '', artifact_name: '', zone: '', document_id: '' });

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTarget, setCommentTarget] = useState<any>(null);
  const [commentText, setCommentText] = useState('');

  const [previewDoc, setPreviewDoc] = useState<any>(null);

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

      const { data: siteStudies } = await supabase
        .from('site_studies')
        .select('*, studies(*)')
        .eq('site_id', siteData.id)
        .eq('org_id', ur.org_id);
      if (siteStudies && siteStudies.length > 0) {
        setStudy(siteStudies[0].studies);
      }

      setUploadForm(f => ({ ...f, owner: ur.full_name || u.email?.split('@')[0] || '' }));

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
      org_id: site.org_id, site_id: site.id, study_id: study?.id,
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
        org_id: ur?.org_id, site_id: site.id, study_id: study?.id,
        title: uploadForm.title, zone: uploadForm.zone, section: uploadForm.section,
        artifact_num: uploadForm.artifact_num, artifact_name: uploadForm.artifact_name,
        version: uploadForm.version, owner: uploadForm.owner, status: uploadForm.status,
        effective_date: uploadForm.effective_date || null, expiry_date: uploadForm.expiry_date || null,
        comments: uploadForm.comments || null,
        file_url: urlData?.publicUrl, file_name: uploadFile.name,
        file_size: uploadFile.size, uploaded_by: user.id, uploaded_by_email: user.email,
      }]).select().single();
      if (newDoc) await logAudit('UPLOAD', newDoc.id, undefined, uploadForm.title);
      setShowUpload(false);
      setUploadForm(f => ({ title: '', zone: '5', artifact_num: '', artifact_name: '', section: '', version: '1.0', owner: f.owner, status: 'Draft', effective_date: '', expiry_date: '', comments: '' }));
      setUploadFile(null);
      loadData();
    } catch (e) { console.error(e); }
    setUploading(false);
  }

  async function approveDoc(doc: any, comment?: string) {
    const now = new Date().toISOString();
    const updates: any = { status: 'Approved', approved_by: user.id, approved_by_email: user.email, approved_at: now };
    if (comment) updates.comments = appendNote(doc.comments, comment, user.email);
    await supabase.from('isf_documents').update(updates).eq('id', doc.id);
    await logAudit('APPROVE', doc.id, doc.status, 'Approved');
    loadData();
  }

  async function moveToReview(doc: any, comment: string) {
    const updates: any = { status: 'Draft', comments: appendNote(doc.comments, comment, user.email) };
    await supabase.from('isf_documents').update(updates).eq('id', doc.id);
    await logAudit('MOVE_TO_REVIEW', doc.id, doc.status, 'Draft');
    loadData();
  }

  async function addDocComment(doc: any, text: string) {
    if (!text.trim()) return;
    const newComments = appendNote(doc.comments, text, user.email);
    await supabase.from('isf_documents').update({ comments: newComments }).eq('id', doc.id);
    await logAudit('COMMENT', doc.id, undefined, text.trim());
    loadData();
  }

  async function archiveDoc(doc: any, reason: string) {
    const now = new Date().toISOString();
    await supabase.from('isf_documents').update({ status: 'Archived', archived_by: user.email, archived_at: now, archive_reason: reason, pre_archive_status: doc.status }).eq('id', doc.id);
    await logAudit('ARCHIVE', doc.id, doc.status, 'Archived');
    loadData();
  }

  async function restoreDoc(doc: any) {
    const restoreStatus = doc.pre_archive_status || 'Draft';
    await supabase.from('isf_documents').update({ status: restoreStatus, archived_by: null, archived_at: null, archive_reason: null, pre_archive_status: null }).eq('id', doc.id);
    await logAudit('RESTORE', doc.id, 'Archived', restoreStatus);
    loadData();
  }

  async function permanentDeleteDoc(doc: any) {
    if (!confirm('Permanently delete this document? This cannot be undone.')) return;
    await supabase.from('isf_documents').delete().eq('id', doc.id);
    await logAudit('DELETE', doc.id, doc.status, 'Permanently deleted');
    loadData();
  }

  function openQueryForDoc(doc: any) {
    setNewQuery({ query_number: '', description: '', raised_by_name: '', assigned_to_name: '', priority: 'Medium', due_date: '', artifact_name: doc.artifact_name || doc.title, zone: doc.zone, document_id: doc.id });
    setShowAddQuery(true);
  }

  async function addQuery() {
    if (!newQuery.description || !site) return;
    const { data: ur } = await supabase.from('user_roles').select('org_id').eq('user_id', user.id).single();
    await supabase.from('isf_queries').insert([{ org_id: ur?.org_id, site_id: site.id, study_id: study?.id, ...newQuery, raised_by: user.id, status: 'Open' }]);
    if (newQuery.document_id) await logAudit('QUERY', newQuery.document_id, undefined, 'Query: ' + newQuery.description);
    setShowAddQuery(false);
    setNewQuery({ query_number: '', description: '', raised_by_name: '', assigned_to_name: '', priority: 'Medium', due_date: '', artifact_name: '', zone: '', document_id: '' });
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
  const uploadZoneArtifacts = ISF_ARTIFACTS.filter(a => a.zone === uploadForm.zone);

  const statusColor = (s: string) => ['Approved', 'Resolved', 'Closed'].includes(s) ? C.green : ['Draft', 'Open'].includes(s) ? C.blue : s === 'Archived' ? C.textMuted : C.amber;
  const statusBg = (s: string) => ['Approved', 'Resolved', 'Closed'].includes(s) ? C.greenLight : ['Draft', 'Open'].includes(s) ? C.blueLight : s === 'Archived' ? C.bg : C.amberLight;
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
        <aside style={{ width: '192px', borderRight: `0.5px solid ${C.border}`, background: C.bgCard, overflowY: 'auto', flexShrink: 0, padding: '8px' }}>
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '8px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>Overview</p>
          {navItem('dashboard', 'Dashboard', 'ti-layout-dashboard')}
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
          {navItem('archived', 'Archived', 'ti-archive')}
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '10px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>Team</p>
          {navItem('queries', 'Queries', 'ti-help-circle', queries.filter(q => q.status === 'Open').length || undefined)}
          {navItem('users', 'User management', 'ti-users')}
          <p style={{ fontSize: '9px', fontWeight: 500, color: C.textMuted, padding: '10px 10px 4px', textTransform: 'uppercase' as const, letterSpacing: '.06em', margin: 0 }}>Settings</p>
          {navItem('config', 'ISF Configuration', 'ti-adjustments')}
          {navItem('ticket', 'Ticket', 'ti-ticket')}
        </aside>

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

          {panel === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>ISF Dashboard</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{site.site_name} · {study?.study_id} · PI: {site.pi_name}</div>
                </div>
                <button onClick={() => setShowUpload(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Upload Document</button>
              </div>

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

          {panel === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Documents ({docs.length})</div>
                <button onClick={() => setShowUpload(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Add document</button>
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
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['Artifact', 'Zone', 'File name', 'Version', 'Effective', 'Expiry', 'Status', 'Owner', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredDocs.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No documents found. Add your first ISF document.</td></tr>
                    ) : filteredDocs.map((d, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '9px', color: C.textMuted }}>{d.artifact_num || '—'}</div>
                          <div style={{ fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.title}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>{badge(`Zone ${d.zone}`, C.blue, C.blueLight)}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec, fontSize: '11px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.file_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{d.version || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: '11px' }}>{d.effective_date || '—'}</td>
                        <td style={{ padding: '10px 14px', color: d.expiry_date && new Date(d.expiry_date) < new Date() ? C.red : C.textMuted, fontSize: '11px' }}>{d.expiry_date || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(d.status, statusColor(d.status), statusBg(d.status))}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec, fontSize: '11px' }}>{d.owner || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                            {isPreviewable(d.file_name) && d.file_url && <button onClick={() => setPreviewDoc(d)} style={{ fontSize: '9px', padding: '3px 8px', background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: '4px', cursor: 'pointer' }}>Preview</button>}
                            {d.status === 'Draft' && <button onClick={() => approveDoc(d)} style={{ fontSize: '9px', padding: '3px 8px', background: C.blueLight, color: '#1D4ED8', border: `0.5px solid #BFDBFE`, borderRadius: '4px', cursor: 'pointer' }}>Review</button>}
                            <button onClick={() => { setCommentTarget(d); setCommentText(''); setShowCommentModal(true); }} style={{ fontSize: '9px', padding: '3px 8px', background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: '4px', cursor: 'pointer' }}>Comment</button>
                            {d.status !== 'Archived' && <button onClick={() => { const reason = prompt('Reason for archiving:'); if (reason) archiveDoc(d, reason); }} style={{ fontSize: '9px', padding: '3px 8px', background: C.amberLight, color: '#92400E', border: `0.5px solid #FDE68A`, borderRadius: '4px', cursor: 'pointer' }}>Archive</button>}
                            <button onClick={() => openQueryForDoc(d)} style={{ fontSize: '9px', padding: '3px 8px', background: C.blueLight, color: C.blue, border: `0.5px solid #BFDBFE`, borderRadius: '4px', cursor: 'pointer' }}>Query</button>
                          </div>
                          {d.comments && <div style={{ fontSize: '9px', color: C.textMuted, marginTop: '4px' }}>Has comments</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {panel === 'artifacts' && (() => {
            const filtered = ISF_ARTIFACTS.filter(a => {
              if (artZone && a.zone !== artZone) return false;
              if (artCl === 'core' && a.cl !== 'Core') return false;
              if (artCl === 'rec' && a.cl !== 'Recommended') return false;
              if (artSearch && !a.name.toLowerCase().includes(artSearch.toLowerCase()) && !a.num.includes(artSearch)) return false;
              return true;
            });
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Artifact Browser — DIA TMF Reference Model v3.3.1</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input value={artSearch} onChange={e => setArtSearch(e.target.value)} placeholder="Search artifacts..." style={{ flex: 1, fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none' }} />
                  <select value={artZone} onChange={e => setArtZone(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', background: C.bgCard }}>
                    <option value="">All zones</option>
                    <option value="5">Zone 5 — Site Management</option>
                    <option value="6">Zone 6 — IP Management</option>
                    <option value="7">Zone 7 — Site Operations</option>
                    <option value="8">Zone 8 — Subject Data</option>
                  </select>
                  <select value={artCl} onChange={e => setArtCl(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', background: C.bgCard }}>
                    <option value="core+rec">Core + Recommended</option>
                    <option value="core">Core only</option>
                    <option value="rec">Recommended only</option>
                  </select>
                </div>
                <div style={{ fontSize: '11px', color: C.textMuted }}>{filtered.length} artifacts</div>
                {filtered.map((a, i) => {
                  const filed = docs.find(d => d.artifact_num === a.num);
                  return (
                    <div key={i} style={{ ...card(), display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: C.textMuted, flexShrink: 0 }}>{a.num}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{a.name}</div>
                        <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px' }}>Zone {a.zone} · {a.sname}</div>
                        {filed && <div style={{ fontSize: '10px', color: C.green, marginTop: '4px' }}>Filed: {filed.title} (v{filed.version})</div>}
                      </div>
                      {badge(a.cl, a.cl === 'Core' ? C.red : C.textMuted, a.cl === 'Core' ? C.redLight : C.bg)}
                      {!filed && <button onClick={() => { setUploadForm(f => ({ ...f, zone: a.zone, section: a.section, artifact_num: a.num, artifact_name: a.name })); setShowUpload(true); }} style={{ fontSize: '10px', padding: '4px 10px', background: C.orangeLight, color: C.orange, border: `0.5px solid ${C.orange}`, borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>+ Upload document to this artifact</button>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {panel === 'gap' && (() => {
            const critZones = ['5'];
            const majZones = ['7'];
            const minZones = ['6', '8'];
            const bySeverity = (zones: string[]) => ISF_ARTIFACTS.filter(a => a.cl === 'Core' && zones.includes(a.zone) && !docs.some(d => d.artifact_num === a.num) && (!gapZone || a.zone === gapZone));
            const crit = bySeverity(critZones);
            const maj = bySeverity(majZones);
            const min = bySeverity(minZones);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Gap Analysis</div>
                    <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>Comparing filed documents against all Core artifacts in DIA TMF Reference Model v3.3.1</div>
                  </div>
                  <select value={gapZone} onChange={e => setGapZone(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', background: C.bgCard }}>
                    <option value="">All Zones</option>
                    <option value="5">Zone 5</option>
                    <option value="6">Zone 6</option>
                    <option value="7">Zone 7</option>
                    <option value="8">Zone 8</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                  {[{ val: crit.length, label: 'Critical gaps', color: C.red, bg: C.redLight }, { val: maj.length, label: 'Major gaps', color: C.amber, bg: C.amberLight }, { val: min.length, label: 'Minor gaps', color: C.textSec, bg: C.bg }].map((s, i) => (
                    <div key={i} style={{ background: s.bg, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: '11px', color: C.textSec, marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {[{ items: crit, label: 'CRITICAL', color: '#991B1B', bg: C.redLight, border: '#FECACA' }, { items: maj, label: 'MAJOR', color: '#92400E', bg: C.amberLight, border: '#FDE68A' }, { items: min, label: 'MINOR', color: '#374151', bg: '#F9FAFB', border: C.border }].map(({ items, label, color, bg, border }) => items.length > 0 && (
                  <div key={label} style={{ border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ background: bg, color, padding: '8px 12px', fontSize: '11px', fontWeight: 600 }}>{label} — {items.length} gap{items.length !== 1 ? 's' : ''}</div>
                    {items.map((a, i) => (
                      <div key={i} style={{ borderTop: `0.5px solid ${C.border}`, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bgCard }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: C.text }}>{a.name}</div>
                          <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px' }}>Zone {a.zone} · {a.sname}</div>
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: C.textMuted, flexShrink: 0 }}>{a.num}</div>
                      </div>
                    ))}
                  </div>
                ))}
                {crit.length === 0 && maj.length === 0 && min.length === 0 && (
                  <div style={{ ...card(), textAlign: 'center' as const, padding: '40px' }}>
                    <i className="ti ti-confetti" style={{ fontSize: '32px', color: C.green, marginBottom: '12px', display: 'block' }} />
                    <div style={{ fontSize: '15px', fontWeight: 600, color: C.green }}>No gaps found!</div>
                  </div>
                )}
              </div>
            );
          })()}

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

          {panel === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Inspection Package Export — {study?.study_id}</div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>Export all approved ISF documents as an inspection-ready package</div>
              </div>
              <div style={card()}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSec, marginBottom: '12px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Study Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { val: `${readinessScore}%`, label: 'ISF Completeness', color: C.blue, bg: C.blueLight },
                    { val: `${readinessScore}/100`, label: 'Readiness Score', color: readinessScore >= 80 ? C.green : C.red, bg: readinessScore >= 80 ? C.greenLight : C.redLight },
                    { val: coreMissing.length, label: 'Missing Core Docs', color: C.red, bg: C.redLight },
                    { val: approvedDocs.length, label: 'Approved Documents', color: C.green, bg: C.greenLight },
                    { val: draftDocs.length, label: 'Pending Review', color: C.blue, bg: C.blueLight },
                    { val: docs.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 90 * 86400000)).length, label: 'Expiring (90 days)', color: C.amber, bg: C.amberLight },
                  ].map((m, i) => (
                    <div key={i} style={{ background: m.bg, borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: m.color }}>{m.val}</div>
                      <div style={{ fontSize: '11px', color: C.textSec, marginTop: '2px' }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', fontSize: '11px', color: C.textSec }}>
                  <div><strong>Study ID:</strong> {study?.study_id}</div>
                  <div><strong>Protocol:</strong> {study?.protocol}</div>
                  <div><strong>Sponsor:</strong> {study?.sponsor}</div>
                  <div><strong>Phase:</strong> {study?.phase}</div>
                  <div><strong>Site:</strong> {site.site_name} ({site.site_code})</div>
                  <div><strong>Export Date:</strong> {new Date().toLocaleDateString()}</div>
                </div>
              </div>
              <div style={card()}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSec, marginBottom: '12px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Export Inspection Package</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                  <div style={{ border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-spreadsheet" style={{ fontSize: '22px', color: C.green }} /></div>
                    <div><div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Excel</div><div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>Document tracker with full metadata for approved documents.</div></div>
                    <button onClick={() => {
                      if (!approvedDocs.length) { alert('No approved documents to export.'); return; }
                      const headers = ['Artifact', 'Zone', 'Title', 'Version', 'Status', 'Effective Date', 'Expiry Date'];
                      const rows = approvedDocs.map(d => [d.artifact_num, d.zone, d.title, d.version, d.status, d.effective_date || '', d.expiry_date || '']);
                      const csv = [headers, ...rows].map(r => r.map(v => JSON.stringify(v)).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ISF_${study?.study_id}_Tracker_${Date.now()}.xls`; a.click(); URL.revokeObjectURL(url);
                    }} style={{ fontSize: '11px', fontWeight: 500, padding: '8px 14px', background: C.green, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Download Excel</button>
                  </div>
                  <div style={{ border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: C.redLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-type-pdf" style={{ fontSize: '22px', color: C.red }} /></div>
                    <div><div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>PDF Report</div><div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>Formatted inspection report with cover page and document index.</div></div>
                    <button onClick={() => {
                      const rows = approvedDocs.map(d => `<tr><td>${d.artifact_num}</td><td>Zone ${d.zone}</td><td>${d.title}</td><td>${d.version}</td></tr>`).join('');
                      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>ISF Inspection Report</title><style>body{font-family:Arial;margin:30px;}h1{color:#F97316;}table{width:100%;border-collapse:collapse;margin-top:20px;}th{background:#F97316;color:#fff;padding:6px 8px;text-align:left;}td{padding:5px 8px;border-bottom:1px solid #E5E7EB;}</style></head><body><h1>ISF Inspection Readiness Report</h1><p>${site.site_name} — ${study?.study_id} — Generated ${new Date().toLocaleDateString()}</p><p>Readiness Score: ${readinessScore}/100 | Approved Documents: ${approvedDocs.length}</p><table><thead><tr><th>Artifact</th><th>Zone</th><th>Title</th><th>Version</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                      const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
                    }} style={{ fontSize: '11px', fontWeight: 500, padding: '8px 14px', background: C.red, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Open PDF</button>
                  </div>
                  <div style={{ border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-file-type-doc" style={{ fontSize: '22px', color: C.blue }} /></div>
                    <div><div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Word Document</div><div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>Editable Word report with study summary and document index.</div></div>
                    <button onClick={() => {
                      const rows = approvedDocs.map(d => `<tr><td>${d.artifact_num}</td><td>Zone ${d.zone}</td><td>${d.title}</td><td>${d.version}</td></tr>`).join('');
                      const html = `<html><head><meta charset="UTF-8"/></head><body><h1>ISF Inspection Report</h1><p>${site.site_name} — ${study?.study_id}</p><table border="1" cellpadding="6"><tr><th>Artifact</th><th>Zone</th><th>Title</th><th>Version</th></tr>${rows}</table></body></html>`;
                      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ISF_${study?.study_id}_Report_${Date.now()}.doc`; a.click(); URL.revokeObjectURL(url);
                    }} style={{ fontSize: '11px', fontWeight: 500, padding: '8px 14px', background: C.blue, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Download Word</button>
                  </div>
                </div>
                <div style={{ marginTop: '12px', padding: '10px 14px', background: C.bg, borderRadius: '8px', fontSize: '11px', color: C.textMuted }}>
                  Only <strong style={{ color: C.text }}>Approved</strong> documents are included. Currently {approvedDocs.length} approved document{approvedDocs.length !== 1 ? 's' : ''} available.
                </div>
              </div>
            </div>
          )}

          {panel === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: C.amberLight, border: '0.5px solid #FDE68A', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#92400E' }}>
                This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Audit Trail — 21 CFR Part 11</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => {
                    const headers = ['Timestamp', 'User', 'Action', 'Document', 'Old Value', 'New Value', 'Signature Reason'];
                    const rows = auditTrail.map(l => [new Date(l.created_at).toLocaleString(), l.actor_email, l.action, l.document_id || '', l.previous_value || '', l.new_value || '', l.signature_reason || '']);
                    const csv = [headers, ...rows].map(r => r.map(v => JSON.stringify(v)).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'ISF_AuditTrail_' + Date.now() + '.csv'; a.click(); URL.revokeObjectURL(url);
                  }} style={{ fontSize: '11px', fontWeight: 500, padding: '6px 14px', background: C.green, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ti ti-download" style={{ fontSize: '13px' }} />Download CSV</button>
                  <button onClick={() => {
                    const rows = auditTrail.map(l => `<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.actor_email || ''}</td><td>${l.action || ''}</td><td>${l.document_id || ''}</td><td>${l.previous_value || ''}</td><td>${l.new_value || ''}</td><td>${l.signature_reason || ''}</td></tr>`).join('');
                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>ISF Audit Trail</title><style>body{font-family:Arial;font-size:10px;margin:20px;}table{width:100%;border-collapse:collapse;}th{background:#F97316;color:#fff;padding:6px 8px;text-align:left;}td{padding:5px 8px;border-bottom:1px solid #E5E7EB;}</style></head><body><h1>ISF Audit Trail — ${site.site_name}</h1><table><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Document</th><th>Old Value</th><th>New Value</th><th>Signature Reason</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
                  }} style={{ fontSize: '11px', fontWeight: 500, padding: '6px 14px', background: C.red, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ti ti-file-type-pdf" style={{ fontSize: '13px' }} />Download PDF</button>
                </div>
              </div>
              <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                    {['Timestamp', 'User', 'Action', 'Document', 'Old Value', 'New Value', 'Signature Reason'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {auditTrail.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No audit entries yet.</td></tr>
                    : auditTrail.map((a, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '10px', color: C.textMuted, whiteSpace: 'nowrap' as const }}>{new Date(a.created_at).toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec }}>{a.actor_email}</td>
                        <td style={{ padding: '10px 14px' }}>{badge(a.action, a.action === 'APPROVE' ? C.green : a.action === 'UPLOAD' ? C.blue : C.textMuted, a.action === 'APPROVE' ? C.greenLight : a.action === 'UPLOAD' ? C.blueLight : C.bg)}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec, fontSize: '10px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.document_id ? a.document_id.slice(0, 8) : '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textMuted }}>{a.previous_value || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.new_value || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSec, fontSize: '10px' }}>{a.signature_reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {panel === 'quality' && (() => {
            const withQ = docs.map(d => ({ ...d, ...isfCalcQuality(d) }));
            const avg = withQ.length ? Math.round(withQ.reduce((s, d) => s + d.score, 0) / withQ.length) : 0;
            const perfect = withQ.filter(d => d.score === 100).length;
            const needsWork = withQ.filter(d => d.score < 70).length;
            const scoreColor = (s: number) => s >= 90 ? C.green : s >= 70 ? C.amber : C.red;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Quality Checks</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                  {[{ val: avg, label: 'Average quality score', color: scoreColor(avg) }, { val: docs.length, label: 'Total documents', color: C.orange }, { val: perfect, label: 'Perfect score (100)', color: C.green }, { val: needsWork, label: 'Needs attention (<70)', color: C.red }].map((m, i) => (
                    <div key={i} style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderTop: `3px solid ${m.color}`, borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '26px', fontWeight: 700, color: m.color }}>{m.val}</div>
                      <div style={{ fontSize: '11px', color: C.textSec, marginTop: '3px' }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                {Object.keys(ISF_FLAG_LABELS).map(flag => {
                  const affected = withQ.filter(d => d.flags.includes(flag));
                  if (!affected.length) return null;
                  const f = ISF_FLAG_LABELS[flag];
                  return (
                    <div key={flag} style={{ background: f.bg, border: `0.5px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: f.color }}>{f.label}</span>
                      <span style={{ fontSize: '11px', color: C.textMuted, marginLeft: '8px' }}>{affected.length} document{affected.length !== 1 ? 's' : ''}</span>
                      <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px' }}>Fix: {f.fix} — -{f.pts} pts each</div>
                    </div>
                  );
                })}
                <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                      {['Score', 'Artifact', 'Zone', 'File', 'Issues', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {withQ.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No documents to check.</td></tr>
                      : withQ.sort((a, b) => a.score - b.score).map((d, i) => (
                        <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: scoreColor(d.score), border: `1.5px solid ${scoreColor(d.score)}` }}>{d.score}</div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>{d.artifact_num} — {d.title}</td>
                          <td style={{ padding: '10px 14px' }}>{badge(`Zone ${d.zone}`, C.blue, C.blueLight)}</td>
                          <td style={{ padding: '10px 14px', color: C.textSec, fontSize: '11px' }}>{d.file_name || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>{d.flags.length === 0 ? <span style={{ fontSize: '10px', color: C.green }}>No issues</span> : <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' as const }}>{d.flags.map((f: string, fi: number) => <span key={fi} style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: ISF_FLAG_LABELS[f]?.bg, color: ISF_FLAG_LABELS[f]?.color }}>{ISF_FLAG_LABELS[f]?.label}</span>)}</div>}</td>
                          <td style={{ padding: '10px 14px' }}>{badge(d.status, statusColor(d.status), statusBg(d.status))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {panel === 'auditor' && (
            <ISFAuditorPanel site={site} study={study} docs={docs} approveDoc={approveDoc} archiveDoc={archiveDoc} moveToReview={moveToReview} />
          )}

          {panel === 'queries' && (() => {
            const openQ = queries.filter(q => q.status === 'Open').length;
            const closedQ = queries.filter(q => q.status === 'Resolved').length;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Queries — {study?.study_id}</div>
                  <button onClick={() => { setNewQuery({ query_number: '', description: '', raised_by_name: '', assigned_to_name: '', priority: 'Medium', due_date: '', artifact_name: '', zone: '', document_id: '' }); setShowAddQuery(true); }} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ New Query</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                  {[{ val: openQ, label: 'Open queries', color: C.blue, bg: C.blueLight }, { val: closedQ, label: 'Closed queries', color: C.textSec, bg: C.bg }, { val: queries.length, label: 'All queries', color: C.orange, bg: C.orangeLight }].map((s, i) => (
                    <div key={i} style={{ background: s.bg, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: '11px', color: C.textSec, marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {queries.length === 0 ? (
                  <div style={{ textAlign: 'center' as const, padding: '2rem', color: C.textMuted, fontSize: '12px' }}>No queries yet.</div>
                ) : queries.map((q, i) => (
                  <div key={i} style={card()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const }}>
                        {badge(q.status, statusColor(q.status), statusBg(q.status))}
                        {q.status === 'Open' && badge('Missing Info', C.amber, C.amberLight)}
                        <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor(q.priority), display: 'inline-block' }} />{q.priority}</span>
                      </div>
                      {q.due_date && <span style={{ fontSize: '10px', color: new Date(q.due_date) < new Date() ? C.red : C.textMuted }}>Due: {new Date(q.due_date).toLocaleDateString()}</span>}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{q.description?.split('\n')[0] || 'Query'}{q.artifact_name ? ` — ${q.artifact_name}` : ''}{q.zone ? ` (Zone ${q.zone})` : ''}</div>
                    <div style={{ fontSize: '11px', color: C.textSec, marginTop: '4px' }}>{q.description}</div>
                    <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '6px' }}>Raised by {q.raised_by_name || '—'} · {new Date(q.created_at).toLocaleDateString()}</div>
                    {q.status === 'Open' && <button onClick={() => resolveQuery(q.id)} style={{ marginTop: '8px', fontSize: '10px', padding: '4px 10px', background: C.greenLight, color: C.green, border: `0.5px solid #A7F3D0`, borderRadius: '4px', cursor: 'pointer' }}>Resolve</button>}
                  </div>
                ))}
              </div>
            );
          })()}

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

          {panel === 'config' && (
            <ISFConfigPanel site={site} study={study} user={user} currentUserRole={site.user_role} logAudit={logAudit} />
          )}

          {panel === 'ticket' && (
            <ISFTicketPanel site={site} study={study} user={user} currentUserRole={site.user_role} />
          )}

          {panel === 'archived' && (
            <ISFArchivedPanel site={site} docs={docs} restoreDoc={restoreDoc} permanentDeleteDoc={permanentDeleteDoc} currentUserRole={site.user_role} />
          )}

        </main>
      </div>

      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: C.bgCard, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Add document</div>
              <button onClick={() => { setShowUpload(false); setUploadFile(null); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: C.textMuted }}>×</button>
            </div>

            {field('Zone', select(uploadForm.zone, v => {
              const firstArt = ISF_ARTIFACTS.find(a => a.zone === v);
              setUploadForm(f => ({ ...f, zone: v, section: firstArt?.section || '', artifact_num: firstArt?.num || '', artifact_name: firstArt?.name || '' }));
            }, [{ value: '5', label: 'Zone 5 — Site Management' }, { value: '6', label: 'Zone 6 — IP Management' }, { value: '7', label: 'Zone 7 — Site Operations' }, { value: '8', label: 'Zone 8 — Subject Data' }]))}

            {field('Artifact', select(`${uploadForm.artifact_num}|${uploadForm.artifact_name}|${uploadForm.section}`, v => {
              const [num, name, section] = v.split('|');
              setUploadForm(f => ({ ...f, artifact_num: num, artifact_name: name, section }));
            }, uploadZoneArtifacts.map(a => ({ value: `${a.num}|${a.name}|${a.section}`, label: `${a.num} — ${a.name}` }))))}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '5px' }}>File</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
                onClick={() => fileRef.current?.click()}
                style={{ border: `1.5px dashed ${dragOver ? C.orange : C.border}`, borderRadius: '10px', padding: '1.25rem', textAlign: 'center' as const, cursor: 'pointer', background: dragOver ? C.orangeLight : C.bg }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
                {uploadFile ? (
                  <div style={{ fontSize: '12px', color: C.text }}>✓ {uploadFile.name}</div>
                ) : (
                  <div style={{ fontSize: '12px', color: C.textMuted }}>Drag & drop or click to browse</div>
                )}
              </div>
            </div>

            {field('Document name', input(uploadForm.title, v => setUploadForm(f => ({ ...f, title: v })), 'Custom name for this document'))}
            {field('Version', input(uploadForm.version, v => setUploadForm(f => ({ ...f, version: v })), 'e.g. 1.0'))}
            {field('Owner', input(uploadForm.owner, v => setUploadForm(f => ({ ...f, owner: v })), 'Document owner'))}
            {field('Status', select(uploadForm.status, v => setUploadForm(f => ({ ...f, status: v })), [{ value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }]))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {field('Effective date', input(uploadForm.effective_date, v => setUploadForm(f => ({ ...f, effective_date: v })), '', 'date'))}
              {field('Expiry date', input(uploadForm.expiry_date, v => setUploadForm(f => ({ ...f, expiry_date: v })), '', 'date'))}
            </div>
            {field('Comments', <textarea value={uploadForm.comments} onChange={e => setUploadForm(f => ({ ...f, comments: e.target.value }))} placeholder="Optional comments..." rows={3} style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />)}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => { setShowUpload(false); setUploadFile(null); }} style={{ flex: 1, padding: '10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: C.bgCard, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadForm.title} style={{ flex: 2, padding: '10px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: uploading || !uploadFile || !uploadForm.title ? 0.6 : 1 }}>
                {uploading ? 'Adding...' : 'Add document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommentModal && commentTarget && modal('Add Comment', () => setShowCommentModal(false), (
        <>
          <div style={{ fontSize: '12px', color: C.textSec, marginBottom: '10px' }}>{commentTarget.title}</div>
          {commentTarget.comments && (
            <div style={{ background: C.bg, borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', maxHeight: '120px', overflowY: 'auto' }}>
              {commentTarget.comments.split('\n').map((c: string, i: number) => <div key={i} style={{ fontSize: '11px', color: C.textSec, marginBottom: '4px' }}>{c}</div>)}
            </div>
          )}
          {field('New comment', <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add your comment..." rows={3} style={{ width: '100%', fontSize: '13px', padding: '8px 10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />)}
        </>
      ), async () => { await addDocComment(commentTarget, commentText); setShowCommentModal(false); })}

      {showAddQuery && modal('New Monitoring Query', () => setShowAddQuery(false), (
        <>
          {newQuery.artifact_name && <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '10px' }}>{newQuery.artifact_name}{newQuery.zone ? ` — Zone ${newQuery.zone}` : ''}</div>}
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

      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', overflow: 'hidden', maxWidth: '90vw', width: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' as const }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `0.5px solid ${C.border}` }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{previewDoc.title}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', padding: '5px 12px', background: C.bg, color: C.textSec, borderRadius: '6px', textDecoration: 'none' }}>Open in New Tab</a>
                <button onClick={() => setPreviewDoc(null)} style={{ fontSize: '11px', padding: '5px 12px', background: C.redLight, color: '#991B1B', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {previewDoc.file_name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                ? <img src={previewDoc.file_url} alt={previewDoc.file_name} style={{ maxWidth: '100%', height: 'auto' }} />
                : <iframe src={previewDoc.file_url} style={{ width: '100%', height: '70vh', border: 'none' }} />}
            </div>
          </div>
        </div>
      )}

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

function ISFTicketPanel({ site, study, user, currentUserRole }: { site: any; study: any; user: any; currentUserRole: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [replyText, setReplyText] = useState('');
  const canManage = ['System Administrator', 'Site Coordinator', 'PI'].includes(currentUserRole);

  useEffect(() => { if (site) loadTickets(); }, [site]);

  async function loadTickets() {
    setLoading(true);
    let q = supabase.from('isf_tickets').select('*').eq('site_id', site.id).order('created_at', { ascending: false });
    if (!canManage) q = q.eq('created_by', user.id);
    const { data } = await q;
    if (data) setTickets(data);
    setLoading(false);
  }

  async function createTicket() {
    if (!title.trim() || !description.trim()) return;
    await supabase.from('isf_tickets').insert([{ org_id: site.org_id, site_id: site.id, study_id: study?.id, created_by: user.id, created_by_email: user.email, title: title.trim(), description: description.trim(), priority, status: 'Open' }]);
    setShowModal(false); setTitle(''); setDescription(''); setPriority('Medium'); loadTickets();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('isf_tickets').update({ status, resolved_at: status === 'Resolved' ? new Date().toISOString() : null }).eq('id', id);
    setSelected((p: any) => p ? { ...p, status } : null); loadTickets();
  }

  async function addReply() {
    if (!replyText.trim() || !selected) return;
    const existing = selected.replies || '';
    const newReplies = existing + (existing ? '\n' : '') + `[${new Date().toLocaleString()} - ${user.email}]: ${replyText.trim()}`;
    await supabase.from('isf_tickets').update({ replies: newReplies }).eq('id', selected.id);
    setSelected((p: any) => ({ ...p, replies: newReplies })); setReplyText(''); loadTickets();
  }

  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.status === filter);
  const counts = { Open: tickets.filter(t => t.status === 'Open').length, 'In progress': tickets.filter(t => t.status === 'In progress').length, Resolved: tickets.filter(t => t.status === 'Resolved').length };
  const priorityColor = (p: string) => p === 'High' ? C.red : p === 'Medium' ? C.amber : C.green;
  const statusBg = (s: string) => s === 'Open' ? C.blueLight : s === 'In progress' ? C.orangeLight : C.greenLight;
  const statusColor = (s: string) => s === 'Open' ? '#1D4ED8' : s === 'In progress' ? '#C2410C' : '#065F46';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Support Tickets — {study?.study_id}</div>
        <button onClick={() => setShowModal(true)} style={{ fontSize: '12px', padding: '8px 16px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ New ticket</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {[{ label: 'Open', color: '#1D4ED8', bg: C.blueLight }, { label: 'In progress', color: '#C2410C', bg: C.orangeLight }, { label: 'Resolved', color: '#065F46', bg: C.greenLight }].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{counts[s.label as keyof typeof counts] || 0}</div>
            <div style={{ fontSize: '11px', color: C.textSec, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {['All', 'Open', 'In progress', 'Resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '20px', border: `0.5px solid ${filter === f ? C.orange : C.border}`, background: filter === f ? C.orangeLight : 'transparent', color: filter === f ? C.orange : C.textSec, cursor: 'pointer' }}>{f}</button>
        ))}
      </div>
      {loading ? <div style={{ fontSize: '12px', color: C.textMuted }}>Loading...</div>
      : filtered.length === 0 ? <div style={{ textAlign: 'center' as const, padding: '2rem', fontSize: '12px', color: C.textMuted }}>No tickets found.</div>
      : filtered.map(t => (
        <div key={t.id} onClick={() => setSelected(t)} style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '10px', padding: '14px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.title}</span>
            <span style={{ fontSize: '10px', padding: '2px 9px', borderRadius: '20px', fontWeight: 600, background: statusBg(t.status), color: statusColor(t.status) }}>{t.status}</span>
          </div>
          <div style={{ fontSize: '11px', color: C.textSec, marginBottom: '8px' }}>{t.description}</div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: C.textMuted }}>
            <span><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor(t.priority), display: 'inline-block', marginRight: '4px' }} />{t.priority}</span>
            <span>{new Date(t.created_at).toLocaleDateString()}</span>
            <span>{t.created_by_email}</span>
          </div>
        </div>
      ))}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', width: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' as const, border: `0.5px solid ${C.border}` }}>
            <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{selected.title}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              <div style={{ fontSize: '12px', color: C.textSec }}>{selected.description}</div>
              {selected.replies && selected.replies.split('\n').map((r: string, i: number) => <div key={i} style={{ background: C.bg, borderRadius: '8px', padding: '8px 12px', fontSize: '11px' }}>{r}</div>)}
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type a reply..." rows={2} style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '8px', boxSizing: 'border-box' as const }} />
              <button onClick={addReply} style={{ alignSelf: 'flex-start' as const, fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Send reply</button>
              {canManage && (
                <div style={{ display: 'flex', gap: '6px', borderTop: `0.5px solid ${C.border}`, paddingTop: '12px' }}>
                  {['Open', 'In progress', 'Resolved'].map(s => <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '20px', border: `0.5px solid ${selected.status === s ? C.orange : C.border}`, background: selected.status === s ? C.orangeLight : 'transparent', color: selected.status === s ? C.orange : C.textSec, cursor: 'pointer' }}>{s}</button>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.bgCard, borderRadius: '16px', padding: '1.5rem', width: '440px', border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>New support ticket</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief summary" style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' as const }} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue..." rows={4} style={{ width: '100%', fontSize: '12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' as const }} />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
              {['Low', 'Medium', 'High'].map(p => <button key={p} onClick={() => setPriority(p)} style={{ flex: 1, fontSize: '11px', padding: '6px', borderRadius: '8px', border: `0.5px solid ${priority === p ? priorityColor(p) : C.border}`, background: priority === p ? priorityColor(p) + '22' : 'transparent', cursor: 'pointer' }}>{p}</button>)}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '11px', padding: '6px 14px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createTicket} style={{ fontSize: '11px', padding: '6px 14px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ISFArchivedPanel({ site, docs, restoreDoc, permanentDeleteDoc, currentUserRole }: { site: any; docs: any[]; restoreDoc: (d: any) => void; permanentDeleteDoc: (d: any) => void; currentUserRole: string }) {
  const [filterZone, setFilterZone] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const canManage = ['System Administrator', 'Site Coordinator', 'PI'].includes(currentUserRole);
  const archived = docs.filter(d => d.status === 'Archived').filter(d => {
    if (filterZone && d.zone !== filterZone) return false;
    if (filterFrom && d.archived_at && new Date(d.archived_at) < new Date(filterFrom)) return false;
    if (filterTo && d.archived_at && new Date(d.archived_at) > new Date(filterTo + 'T23:59:59')) return false;
    return true;
  });
  function exportCSV() {
    const headers = ['Document', 'Artifact', 'Zone', 'Archive Reason', 'Archived By', 'Archived At', 'Owner'];
    const rows = archived.map(d => [d.title, d.artifact_num, d.zone, d.archive_reason || '', d.archived_by || '', d.archived_at ? new Date(d.archived_at).toLocaleString() : '', d.uploaded_by_email || '']);
    const csv = [headers, ...rows].map(r => r.map(v => JSON.stringify(v)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ISF_Archived_' + Date.now() + '.csv'; a.click(); URL.revokeObjectURL(url);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>Archived Documents</div>
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>Documents archived from the ISF. Restore or permanently delete.</div>
        </div>
        <button onClick={exportCSV} style={{ fontSize: '12px', padding: '8px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ti ti-download" style={{ fontSize: '14px' }} />Export CSV</button>
      </div>
      <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#92400E' }}>
        Archived documents are excluded from ISF completeness, gap analysis, and inspection readiness calculations.
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
        <select value={filterZone} onChange={e => setFilterZone(e.target.value)} style={{ fontSize: '11px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '6px 10px' }}>
          <option value="">All zones</option><option value="5">Zone 5</option><option value="6">Zone 6</option><option value="7">Zone 7</option><option value="8">Zone 8</option>
        </select>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ fontSize: '11px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '6px 10px' }} />
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ fontSize: '11px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '6px 10px' }} />
      </div>
      <div style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `0.5px solid ${C.border}` }}>
            {['Document', 'Artifact', 'Zone', 'Archive Reason', 'Archived By', 'Archived At', 'Owner', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '10px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {archived.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No archived documents.</td></tr>
            : archived.map((d, i) => (
              <tr key={i} style={{ borderBottom: `0.5px solid ${C.bg}` }}>
                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{d.title}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '9px', color: C.textMuted }}>{d.artifact_num}</td>
                <td style={{ padding: '8px 10px' }}>Zone {d.zone}</td>
                <td style={{ padding: '8px 10px', color: '#92400E' }}>{d.archive_reason || '—'}</td>
                <td style={{ padding: '8px 10px' }}>{d.archived_by || '—'}</td>
                <td style={{ padding: '8px 10px' }}>{d.archived_at ? new Date(d.archived_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '8px 10px' }}>{d.uploaded_by_email || '—'}</td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {canManage && <button onClick={() => restoreDoc(d)} style={{ fontSize: '9px', padding: '3px 8px', background: C.greenLight, color: C.green, border: `0.5px solid #A7F3D0`, borderRadius: '4px', cursor: 'pointer' }}>Restore</button>}
                    {canManage && <button onClick={() => permanentDeleteDoc(d)} style={{ fontSize: '9px', padding: '3px 8px', background: '#FEF2F2', color: '#991B1B', border: '0.5px solid #FECACA', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ISFAuditorPanel({ site, study, docs, approveDoc, archiveDoc, moveToReview }: { site: any; study: any; docs: any[]; approveDoc: (d: any, comment?: string) => void; archiveDoc: (d: any, r: string) => void; moveToReview: (d: any, comment: string) => void }) {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set(['5']));
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'review' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function toggleZone(z: string) { setExpandedZones(prev => { const n = new Set(prev); n.has(z) ? n.delete(z) : n.add(z); return n; }); }
  function getArtifactDocs(num: string) { return docs.filter(d => d.artifact_num === num); }
  function getZoneStatus(z: string) {
    const coreArts = ISF_ARTIFACTS.filter(a => a.cl === 'Core' && a.zone === z);
    const approved = coreArts.filter(a => docs.some(d => d.artifact_num === a.num && d.status === 'Approved'));
    if (coreArts.length === 0) return 'empty';
    if (approved.length === coreArts.length) return 'complete';
    if (approved.length > 0) return 'partial';
    return 'missing';
  }
  const statusDot = (s: string) => {
    const colors: Record<string, string> = { complete: C.green, approved: C.green, partial: C.amber, review: C.blue, draft: '#9CA3AF', missing: C.red, empty: C.border };
    return <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[s] || C.border, display: 'inline-block', flexShrink: 0 }} />;
  };

  function selectDoc(d: any) {
    setSelectedDoc(d);
    setActionComment('');
    setActionType(null);
    setShowPreview(false);
  }

  function submitAction() {
    if (!selectedDoc || !actionType || !actionComment.trim()) return;
    if (actionType === 'approve') approveDoc(selectedDoc, actionComment.trim());
    else moveToReview(selectedDoc, actionComment.trim());
    setSelectedDoc(null);
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 110px)', border: `0.5px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden', background: C.bgCard }}>
      <div style={{ width: '320px', borderRight: `0.5px solid ${C.border}`, display: 'flex', flexDirection: 'column' as const, flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>ISF Auditor</div>
          <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{study?.study_id} — Document review</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {['5', '6', '7', '8'].map(z => {
            const zoneArts = ISF_ARTIFACTS.filter(a => a.zone === z);
            const isExp = expandedZones.has(z);
            return (
              <div key={z}>
                <div onClick={() => toggleZone(z)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', background: isExp ? C.orangeLight : 'transparent', borderBottom: `0.5px solid ${C.bg}` }}>
                  <i className={`ti ${isExp ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: '12px', color: C.textMuted }} />
                  {statusDot(getZoneStatus(z))}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: isExp ? C.orange : C.text, flex: 1 }}>Zone {z} — {ISF_ZONE_NAMES[z]}</span>
                  <span style={{ fontSize: '9px', color: C.textMuted }}>{zoneArts.length}</span>
                </div>
                {isExp && zoneArts.map(a => {
                  const aDocs = getArtifactDocs(a.num);
                  return (
                    <div key={a.num}>
                      <div style={{ padding: '6px 12px 6px 28px', fontSize: '10px', color: C.textSec, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {statusDot(aDocs.some(d => d.status === 'Approved') ? 'approved' : aDocs.length ? 'draft' : 'empty')}
                        {a.num} — {a.name}
                      </div>
                      {aDocs.map(d => (
                        <div key={d.id} onClick={() => selectDoc(d)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px 6px 44px', cursor: 'pointer', background: selectedDoc?.id === d.id ? C.orangeLight : 'transparent' }}>
                          {statusDot(d.status === 'Approved' ? 'approved' : 'draft')}
                          <span style={{ fontSize: '10px', color: selectedDoc?.id === d.id ? C.orange : C.textSec }}>{d.title}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {!selectedDoc ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '10px', color: C.textMuted }}>
          <i className="ti ti-file-search" style={{ fontSize: '40px', color: C.border }} />
          <div style={{ fontSize: '13px', fontWeight: 500, color: C.textSec }}>Select a document to review</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: '260px', borderRight: `0.5px solid ${C.border}`, display: 'flex', flexDirection: 'column' as const, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${C.border}` }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{selectedDoc.title}</div>
              <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px' }}>{selectedDoc.artifact_num} — Zone {selectedDoc.zone}</div>
              <span style={{ display: 'inline-block', marginTop: '8px' }}>{selectedDoc.status === 'Approved' ? <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: C.greenLight, color: C.green, fontWeight: 600 }}>Approved</span> : <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: C.blueLight, color: '#1D4ED8', fontWeight: 600 }}>{selectedDoc.status}</span>}</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              <div>
                <div style={{ fontSize: '9px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>File size</div>
                <div style={{ fontSize: '12px', color: C.text, marginTop: '2px' }}>{formatFileSize(selectedDoc.file_size)}</div>
              </div>
              {selectedDoc.status === 'Approved' && (
                <>
                  <div>
                    <div style={{ fontSize: '9px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Approved by</div>
                    <div style={{ fontSize: '12px', color: C.text, marginTop: '2px' }}>{selectedDoc.approved_by_email || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Approved at</div>
                    <div style={{ fontSize: '12px', color: C.text, marginTop: '2px' }}>{selectedDoc.approved_at ? new Date(selectedDoc.approved_at).toLocaleDateString() : '—'}</div>
                  </div>
                </>
              )}
              {selectedDoc.comments && (
                <div>
                  <div style={{ fontSize: '9px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Comments</div>
                  <div style={{ fontSize: '11px', color: C.textSec, marginTop: '4px', whiteSpace: 'pre-wrap' as const }}>{selectedDoc.comments}</div>
                </div>
              )}
              {selectedDoc.file_url && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px', marginTop: '4px' }}>
                  <button onClick={() => setShowPreview(!showPreview)} style={{ fontSize: '11px', padding: '6px 10px', background: showPreview ? C.orange : C.orangeLight, color: showPreview ? '#fff' : C.orange, border: `0.5px solid ${C.orange}`, borderRadius: '6px', cursor: 'pointer' }}>{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
                  <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', padding: '6px 10px', background: C.bg, color: C.textSec, border: `0.5px solid ${C.border}`, borderRadius: '6px', textDecoration: 'none', textAlign: 'center' as const }}>Open in New Tab</a>
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const }}>
            <div style={{ flex: 1, overflow: 'auto', background: C.bg, display: 'flex', alignItems: showPreview ? 'flex-start' : 'center', justifyContent: 'center', padding: '16px' }}>
              {showPreview && selectedDoc.file_url ? (
                selectedDoc.file_name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                  ? <img src={selectedDoc.file_url} alt={selectedDoc.file_name} style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }} />
                  : <iframe src={selectedDoc.file_url} style={{ width: '100%', height: 'calc(100vh - 320px)', border: 'none', borderRadius: '8px', background: '#fff' }} />
              ) : (
                <div style={{ textAlign: 'center' as const, color: C.textMuted }}>
                  <i className="ti ti-file-description" style={{ fontSize: '48px', color: C.border }} />
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>Click "Show Preview" to view</div>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 20px', borderTop: `0.5px solid ${C.border}`, background: C.bgCard, display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: C.textSec, display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    {actionType === 'approve' ? 'Approval reason (required)' : actionType === 'review' ? 'Reason for moving to review (required)' : 'Add a comment to take action'}
                  </label>
                  <textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder={actionType === 'approve' ? 'e.g. Reviewed and approved — document is accurate and complete' : actionType === 'review' ? 'e.g. Missing signature — please update' : 'Select an action below...'} rows={2} style={{ width: '100%', fontSize: '11px', border: `0.5px solid ${C.border}`, borderRadius: '8px', padding: '8px 10px', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => setActionType('approve')} style={{ fontSize: '11px', fontWeight: 600, padding: '8px 16px', background: actionType === 'approve' ? C.green : 'transparent', color: actionType === 'approve' ? '#fff' : C.green, border: `1.5px solid ${C.green}`, borderRadius: '8px', cursor: 'pointer', minWidth: '150px' }}>✓ Mark Complete</button>
                  <button onClick={() => setActionType('review')} style={{ fontSize: '11px', fontWeight: 600, padding: '8px 16px', background: actionType === 'review' ? C.blue : 'transparent', color: actionType === 'review' ? '#fff' : C.blue, border: `1.5px solid ${C.blue}`, borderRadius: '8px', cursor: 'pointer', minWidth: '150px' }}>↩ Move to Review</button>
                  {actionType && (
                    <button onClick={submitAction} disabled={!actionComment.trim()} style={{ fontSize: '11px', fontWeight: 700, padding: '8px 16px', background: actionType === 'approve' ? C.green : C.blue, color: '#fff', border: 'none', borderRadius: '8px', cursor: actionComment.trim() ? 'pointer' : 'not-allowed', opacity: actionComment.trim() ? 1 : 0.5 }}>Confirm</button>
                  )}
                </div>
              </div>
              <button onClick={() => { const r = prompt('Reason for archiving:'); if (r) { archiveDoc(selectedDoc, r); setSelectedDoc(null); } }} style={{ alignSelf: 'flex-start' as const, fontSize: '11px', fontWeight: 600, padding: '6px 14px', background: 'transparent', color: C.amber, border: `1.5px solid ${C.amber}`, borderRadius: '8px', cursor: 'pointer' }}>Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}