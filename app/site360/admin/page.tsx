'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const C = {
  orange: '#F97316', orangeLight: '#FFF7ED',
  navy: '#0F1E3D', navyLight: '#1E3A5F',
  bg: '#F8FAFC', bgCard: '#FFFFFF',
  border: '#E5EDF6', text: '#111827',
  textSec: '#374151', textMuted: '#6B7280',
  green: '#10B981', greenLight: '#ECFDF5',
  red: '#EF4444', redLight: '#FEF2F2',
  blue: '#3B82F6', blueLight: '#EFF6FF',
  amber: '#F59E0B', amberLight: '#FFFBEB',
};

type AdminPanel = 'demo_requests' | 'sites' | 'tokens';

export default function Site360AdminPage() {
  const [panel, setPanel] = useState<AdminPanel>('demo_requests');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [demoRequests, setDemoRequests] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [showSendInvite, setShowSendInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', site_name: '', demo_request_id: '' });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState('');

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/site360/login'; return; }

    const { data: ur } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (!ur || ur.role !== 'System Administrator') {
      window.location.href = '/site360';
      return;
    }
    setAuthorized(true);
    loadData();
  }

  async function loadData() {
    const [{ data: dr }, { data: s }, { data: t }] = await Promise.all([
      supabase.from('demo_requests').select('*').eq('source', 'site360').order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('created_at', { ascending: false }),
      supabase.from('site360_signup_tokens').select('*').order('created_at', { ascending: false }),
    ]);
    if (dr) setDemoRequests(dr);
    if (s) setSites(s);
    if (t) setTokens(t);
    setLoading(false);
  }

  async function updateDemoStatus(id: string, status: string) {
    await supabase.from('demo_requests').update({ status }).eq('id', id);
    loadData();
  }

  async function sendInvite() {
    if (!inviteForm.email || !inviteForm.site_name) return;
    setSendingInvite(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: token, error } = await supabase
      .from('site360_signup_tokens')
      .insert([{
        email: inviteForm.email,
        site_name: inviteForm.site_name,
        demo_request_id: inviteForm.demo_request_id || null,
        created_by: user?.id,
      }])
      .select()
      .single();

    if (error || !token) {
      setSendingInvite(false);
      return;
    }

    const signupLink = `${window.location.origin}/site360/signup?token=${token.token}`;
    setInviteSent(signupLink);

    // Update demo request status if linked
    if (inviteForm.demo_request_id) {
      await supabase.from('demo_requests').update({ status: 'invited' }).eq('id', inviteForm.demo_request_id);
    }

    setShowSendInvite(false);
    setInviteForm({ email: '', site_name: '', demo_request_id: '' });
    setSendingInvite(false);
    loadData();
  }

  const badge = (text: string, color: string, bg: string) => (
    <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', color, background: bg, whiteSpace: 'nowrap' as const }}>{text}</span>
  );

  const statusColor = (s: string) => s === 'approved' || s === 'invited' || s === 'active' ? C.green : s === 'pending' ? C.amber : C.red;
  const statusBg = (s: string) => s === 'approved' || s === 'invited' || s === 'active' ? C.greenLight : s === 'pending' ? C.amberLight : C.redLight;

  const card = (extra: any = {}): React.CSSProperties => ({ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px', ...extra });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      <div style={{ color: C.textMuted }}>Loading...</div>
    </div>
  );

  if (!authorized) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: C.bg }}>

      {/* Sidebar */}
      <aside style={{ width: '220px', background: C.navy, display: 'flex', flexDirection: 'column', padding: '0 8px 8px', flexShrink: 0 }}>
        <div style={{ padding: '16px 8px 12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Site360 <span style={{ color: C.orange }}>Admin</span></div>
          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>Trial360 OS Internal</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { key: 'demo_requests', label: 'Demo Requests', icon: '📋', count: demoRequests.filter(d => d.status === 'pending').length },
            { key: 'sites', label: 'Active Sites', icon: '🏥', count: 0 },
            { key: 'tokens', label: 'Invite Tokens', icon: '🔑', count: 0 },
          ].map(item => (
            <button key={item.key} onClick={() => setPanel(item.key as AdminPanel)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: '12px', background: panel === item.key ? 'rgba(249,115,22,0.12)' : 'transparent', color: panel === item.key ? C.orange : '#94A3B8', fontWeight: panel === item.key ? 600 : 400 }}>
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count > 0 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: C.red, color: '#fff', fontWeight: 600 }}>{item.count}</span>}
            </button>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #1E3A5F', paddingTop: '8px', marginTop: 'auto' }}>
          <button onClick={() => window.location.href = '/platform'} style={{ fontSize: '11px', color: '#64748B', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', width: '100%', textAlign: 'left' as const }}>← Back to Platform</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* DEMO REQUESTS */}
        {panel === 'demo_requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>Demo Requests</div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{demoRequests.filter(d => d.status === 'pending').length} pending · {demoRequests.length} total</div>
              </div>
              <button onClick={() => { setInviteForm({ email: '', site_name: '', demo_request_id: '' }); setShowSendInvite(true); }} style={{ fontSize: '12px', padding: '9px 18px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Send Invite</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
              {[['Total', demoRequests.length, C.blue], ['Pending', demoRequests.filter(d => d.status === 'pending').length, C.amber], ['Invited', demoRequests.filter(d => d.status === 'invited').length, C.orange], ['Approved', demoRequests.filter(d => d.status === 'approved').length, C.green]].map(([l, v, c], i) => (
                <div key={i} style={{ ...card(), textAlign: 'center' as const, padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: c as string }}>{v as number}</div>
                  <div style={{ fontSize: '11px', color: C.textMuted }}>{l as string}</div>
                </div>
              ))}
            </div>

            {inviteSent && (
              <div style={{ ...card(), background: C.greenLight, border: `1px solid ${C.green}` }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.green, marginBottom: '6px' }}>✅ Invite link generated!</div>
                <div style={{ fontSize: '11px', color: C.textSec, marginBottom: '8px' }}>Send this link to the site coordinator:</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: C.navy, background: '#fff', padding: '8px 12px', borderRadius: '6px', wordBreak: 'break-all' as const }}>{inviteSent}</div>
                <button onClick={() => { navigator.clipboard.writeText(inviteSent); }} style={{ marginTop: '8px', fontSize: '12px', padding: '6px 14px', background: C.navy, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Copy Link</button>
              </div>
            )}

            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                  {['Name', 'Site', 'Institution', 'Email', 'Status', 'Date', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {demoRequests.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No demo requests yet.</td></tr>
                  ) : demoRequests.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{d.name}</td>
                      <td style={{ padding: '10px 14px', color: C.textSec }}>{d.message?.split('|')[0]?.replace('Site: ', '') || '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.textSec }}>{d.company || '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.textSec, fontSize: '11px' }}>{d.email}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(d.status || 'pending', statusColor(d.status || 'pending'), statusBg(d.status || 'pending'))}</td>
                      <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: '11px' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {d.status === 'pending' && (
                            <>
                              <button onClick={() => { setInviteForm({ email: d.email, site_name: d.message?.split('|')[0]?.replace('Site: ', '').trim() || '', demo_request_id: d.id }); setShowSendInvite(true); }} style={{ fontSize: '10px', padding: '4px 10px', background: C.orangeLight, color: C.orange, border: `0.5px solid ${C.orange}`, borderRadius: '4px', cursor: 'pointer' }}>Send Invite</button>
                              <button onClick={() => updateDemoStatus(d.id, 'rejected')} style={{ fontSize: '10px', padding: '4px 10px', background: C.redLight, color: C.red, border: `0.5px solid #FECACA`, borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                            </>
                          )}
                          {d.status === 'invited' && <span style={{ fontSize: '11px', color: C.green, fontWeight: 500 }}>Invite sent ✓</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTIVE SITES */}
        {panel === 'sites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>Active Sites ({sites.length})</div>
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                  {['Site Name', 'Code', 'PI', 'Country', 'Status', 'Created'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {sites.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No sites yet.</td></tr>
                  ) : sites.map((s, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.site_name}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.orange }}>{s.site_code || '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.textSec }}>{s.pi_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.textSec }}>{s.country || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(s.status || 'active', statusColor(s.status || 'active'), statusBg(s.status || 'active'))}</td>
                      <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: '11px' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVITE TOKENS */}
        {panel === 'tokens' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>Invite Tokens ({tokens.length})</div>
              <button onClick={() => { setInviteForm({ email: '', site_name: '', demo_request_id: '' }); setShowSendInvite(true); }} style={{ fontSize: '12px', padding: '9px 18px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Generate Token</button>
            </div>
            <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
                  {['Email', 'Site Name', 'Status', 'Expires', 'Created', 'Link'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: C.textSec }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tokens.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>No tokens generated yet.</td></tr>
                  ) : tokens.map((t, i) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                      <td style={{ padding: '10px 14px', color: C.textSec }}>{t.email}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{t.site_name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{badge(t.used ? 'Used' : 'Active', t.used ? C.textMuted : C.green, t.used ? C.bg : C.greenLight)}</td>
                      <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: '11px' }}>{new Date(t.expires_at).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 14px', color: C.textMuted, fontSize: '11px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {!t.used && (
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/site360/signup?token=${t.token}`); }} style={{ fontSize: '10px', padding: '4px 10px', background: C.blueLight, color: C.blue, border: `0.5px solid #BFDBFE`, borderRadius: '4px', cursor: 'pointer' }}>Copy Link</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Send Invite Modal */}
      {showSendInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: C.bgCard, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Send Site360 Invite</div>
              <button onClick={() => setShowSendInvite(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: C.textMuted }}>×</button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '5px' }}>Email Address *</label>
              <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="coordinator@site.com" style={{ width: '100%', fontSize: '13px', padding: '9px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: C.textSec, display: 'block', marginBottom: '5px' }}>Site Name *</label>
              <input type="text" value={inviteForm.site_name} onChange={e => setInviteForm(f => ({ ...f, site_name: e.target.value }))} placeholder="Mayo Clinic — Rochester" style={{ width: '100%', fontSize: '13px', padding: '9px 12px', border: `0.5px solid ${C.border}`, borderRadius: '8px', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ fontSize: '12px', color: C.textMuted, padding: '10px 12px', background: C.bg, borderRadius: '8px', marginBottom: '16px' }}>
              A unique signup link will be generated valid for 7 days. The site coordinator uses this link to create their account and set up their site.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowSendInvite(false)} style={{ flex: 1, padding: '10px', border: `0.5px solid ${C.border}`, borderRadius: '8px', background: C.bgCard, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={sendInvite} disabled={sendingInvite || !inviteForm.email || !inviteForm.site_name} style={{ flex: 2, padding: '10px', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: sendingInvite ? 0.7 : 1 }}>
                {sendingInvite ? 'Generating...' : 'Generate Invite Link'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}