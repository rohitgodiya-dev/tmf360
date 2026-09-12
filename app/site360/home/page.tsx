'use client';
import { useEffect, useState } from 'react';
import {
BarChart3,
FolderSearch,
ShieldCheck,
AlertTriangle,
Activity,
ClipboardCheck,
ArrowRight,
ChevronRight,
Search,
TrendingUp,
Clock,
Users,
Lock,
Sparkles,
FolderOpen,
Briefcase,
FileText,
User,
UserCog,
Building2,
Home,
Grid3x3,
Download,
Lightbulb,
Send,
Link2,
AtSign,
} from 'lucide-react';
const C = {
orange: '#F97316',
orangeLight: '#FFF7ED',
navy: '#0F1E3D',
navyLight: '#1E3A5F',
bg: '#FFFFFF',
bgSec: '#F8FAFC',
border: '#E5EDF6',
text: '#111827',
textSec: '#374151',
textMuted: '#6B7280',
green: '#10B981',
greenLight: '#ECFDF5',
blue: '#3B82F6',
blueLight: '#EFF6FF',
purple: '#8B5CF6',
purpleLight: '#F5F3FF',
amber: '#F59E0B',
};
// ---------------------------------------------------------------------------
// Hero orbit visual — icons genuinely revolve around the sphere.
// Technique: an outer ring spins 0→360 continuously; each node sits at a
// fixed angle+radius (plain numbers, no calc()); an inner wrapper spins
// 0→-360 at the same speed to cancel the outer spin, so the icon+label
// stays upright throughout the orbit instead of tumbling.
// ---------------------------------------------------------------------------
const ORBIT_RADIUS = 230;
const ORBIT_DURATION = '38s';
const orbitNodes = [
{ label: 'Site Health', icon: BarChart3, color: C.orange, bg: C.orangeLight, clockAngle: 30 },
{ label: 'Complete Visibility', icon: ShieldCheck, color: '#4F46E5', bg: '#EEF2FF', clockAngle: 90 },
{ label: 'Risk Intelligence', icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', clockAngle: 150 },
{ label: 'Real-Time Status', icon: Activity, color: C.blue, bg: C.blueLight, clockAngle: 210 },
{ label: 'ISF Filing', icon: FolderSearch, color: C.purple, bg: C.purpleLight, clockAngle: 270 },
{ label: 'Inspection Ready', icon: ClipboardCheck, color: C.green, bg: C.greenLight, clockAngle: 330 },
];
const decorativeDots = [
{ angle: 10, radius: 130, size: 8, color: C.navy, blur: 0, opacity: 0.7 },
{ angle: 55, radius: 300, size: 10, color: C.orange, blur: 2, opacity: 0.6 },
{ angle: 95, radius: 170, size: 6, color: C.blue, blur: 0, opacity: 0.6 },
{ angle: 140, radius: 290, size: 8, color: C.orange, blur: 2, opacity: 0.55 },
{ angle: 195, radius: 150, size: 7, color: C.navy, blur: 0, opacity: 0.6 },
{ angle: 245, radius: 305, size: 9, color: C.orange, blur: 2, opacity: 0.5 },
{ angle: 290, radius: 165, size: 6, color: C.blue, blur: 0, opacity: 0.55 },
{ angle: 320, radius: 285, size: 7, color: C.navy, blur: 0, opacity: 0.6 },
];
function OrbitVisual() {
return (
<div style={{ position: 'relative', width: '560px', height: '560px' }}>
<style>{`
@keyframes site360OrbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes site360OrbitCounter { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
@keyframes site360Pulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.06); } }
`}</style>
{/* dashed boundary ring */}
<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '460px', height: '460px', borderRadius: '50%', border: `1.5px dashed ${C.border}` }} />
{/* soft glow halo behind the sphere — position and animation split across two
elements: animating `transform` on the same element that positions it via
transform:translate(-50%,-50%) would silently drop the positioning half
(the same class of bug noted from the main Trial360 OS orbit build). */}
<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px' }}>
<div style={{
width: '100%', height: '100%', borderRadius: '50%',
background: C.orange, opacity: 0.35, filter: 'blur(35px)',
animation: 'site360Pulse 5s ease-in-out infinite',
}} />
</div>
{/* decorative orbiting dots — slow independent rotation, no content to keep upright */}
<div style={{ position: 'absolute', inset: 0, animation: `site360OrbitSpin 55s linear infinite` }}>
{decorativeDots.map((d, i) => {
const cssAngle = d.angle - 90;
return (
<div key={i} style={{ position: 'absolute', top: '50%', left: '50%', transform: `rotate(${cssAngle}deg) translateX(${d.radius}px)` }}>
<span style={{
display: 'block', width: `${d.size}px`, height: `${d.size}px`, borderRadius: '50%',
background: d.color, opacity: d.opacity, filter: d.blur ? `blur(${d.blur}px)` : undefined,
marginLeft: `-${d.size / 2}px`, marginTop: `-${d.size / 2}px`,
}} />
</div>
);
})}
</div>
{/* orbit ring — lines + nodes rotate together so spokes always track their icon */}
<div style={{ position: 'absolute', inset: 0, animation: `site360OrbitSpin ${ORBIT_DURATION} linear infinite`, zIndex: 2 }}>
<svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
{orbitNodes.map((n, i) => {
const rad = ((n.clockAngle - 90) * Math.PI) / 180;
const x = 280 + Math.cos(rad) * ORBIT_RADIUS;
const y = 280 + Math.sin(rad) * ORBIT_RADIUS;
return <line key={i} x1="280" y1="280" x2={x} y2={y} stroke={C.border} strokeWidth="1" strokeDasharray="3,4" />;
})}
</svg>
{orbitNodes.map((n, i) => {
const Icon = n.icon;
const cssAngle = n.clockAngle - 90;
return (
<div key={i} style={{ position: 'absolute', top: '50%', left: '50%', transform: `rotate(${cssAngle}deg) translateX(${ORBIT_RADIUS}px) rotate(${-cssAngle}deg) translate(-50%, -50%)` }}>
<div style={{ animation: `site360OrbitCounter ${ORBIT_DURATION} linear infinite`, textAlign: 'center' }}>
<div style={{ width: '48px', height: '48px', borderRadius: '13px', background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', boxShadow: '0 6px 14px -6px rgba(15,30,61,0.2)' }}>
<Icon size={21} color={n.color} strokeWidth={2.25} />
</div>
<span style={{ fontSize: '12px', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' }}>{n.label}</span>
</div>
</div>
);
})}
</div>
{/* center sphere — rendered last so it sits above the rotating ring */}
<div style={{
position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
width: '148px', height: '148px', borderRadius: '50%',
background: `radial-gradient(circle at 35% 30%, #FFA857, ${C.orange} 60%, #D9560E)`,
display: 'flex', alignItems: 'center', justifyContent: 'center',
boxShadow: '0 0 0 rgba(0,0,0,0)', zIndex: 3,
}}>
<span style={{ color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em' }}>Site360</span>
</div>
</div>
);
}
// ---------------------------------------------------------------------------
// Shared small components
// ---------------------------------------------------------------------------
function Eyebrow({ children }: { children: React.ReactNode }) {
return <div style={{ fontSize: '13px', fontWeight: 700, color: C.orange, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</div>;
}
function IconTile({ icon: Icon, size = 44, iconSize = 20 }: { icon: any; size?: number; iconSize?: number }) {
return (
<div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '12px', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
<Icon size={iconSize} color={C.orange} strokeWidth={2.25} />
</div>
);
}
function CompactCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
return (
<div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '22px' }}>
<div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
<div style={{ width: '40px', height: '40px', borderRadius: '10px', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
<Icon size={18} color={C.orange} strokeWidth={2.25} />
</div>
<div>
<div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '4px' }}>{title}</div>
<div style={{ fontSize: '13px', color: C.textSec, lineHeight: 1.55 }}>{desc}</div>
</div>
</div>
</div>
);
}
function RoleCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
return (
<div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
<div style={{ width: '52px', height: '52px', borderRadius: '50%', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
<Icon size={22} color={C.orange} strokeWidth={2.25} />
</div>
<div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '6px' }}>{title}</div>
<div style={{ fontSize: '12.5px', color: C.textMuted, lineHeight: 1.5 }}>{desc}</div>
</div>
);
}
function CompliancePill({ icon: Icon, label }: { icon: any; label: string }) {
return (
<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '999px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, color: C.navy }}>
<Icon size={15} color={C.orange} strokeWidth={2.25} /> {label}
</span>
);
}
function CopilotDemo() {
const question = "What's outstanding before my visit?";
const [typed, setTyped] = useState('');
const [rowsShown, setRowsShown] = useState(0);
const [cycle, setCycle] = useState(0);
const [activeExample, setActiveExample] = useState(0);
// Typewriter for the question bubble. Re-runs every time `cycle` bumps,
// so the whole demo loops indefinitely instead of animating once and
// going still.
useEffect(() => {
setTyped('');
setRowsShown(0);
let i = 0;
const typeTimer = setInterval(() => {
i++;
setTyped(question.slice(0, i));
if (i >= question.length) clearInterval(typeTimer);
}, 32);
return () => clearInterval(typeTimer);
}, [cycle]);
// Once typing finishes, reveal rows one by one.
useEffect(() => {
if (typed.length < question.length) return;
const rowTimer = setInterval(() => {
setRowsShown((r) => {
if (r >= copilotRows.length) {
clearInterval(rowTimer);
return r;
}
return r + 1;
});
}, 220);
return () => clearInterval(rowTimer);
}, [typed]);
// Once every row is showing, hold for a beat, then loop the whole demo.
useEffect(() => {
if (rowsShown < copilotRows.length) return;
const resetTimer = setTimeout(() => setCycle((c) => c + 1), 3200);
return () => clearTimeout(resetTimer);
}, [rowsShown]);
// Rotate the highlighted "try this" example every few seconds.
useEffect(() => {
const t = setInterval(() => setActiveExample((a) => (a + 1) % copilotExamples.length), 2600);
return () => clearInterval(t);
}, []);
return (
<div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '18px', alignItems: 'start' }}>
<style>{`
@keyframes site360FadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes site360LivePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
@keyframes site360PillPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); } 50% { box-shadow: 0 0 0 5px rgba(239,68,68,0); } }
@keyframes site360Blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
`}</style>
<div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px -20px rgba(15,30,61,0.2)' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
<span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
<span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
<span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
<span style={{ fontSize: '13px', fontWeight: 600, color: C.navy, marginLeft: '8px' }}>Site360 AI Copilot · MAY-001</span>
<span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: C.green, display: 'flex', alignItems: 'center', gap: '5px' }}>
<span style={{ position: 'relative', width: '6px', height: '6px' }}>
<span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.green }} />
<span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.green, animation: 'site360LivePulse 1.6s ease-in-out infinite' }} />
</span>
LIVE
</span>
</div>
<div style={{ padding: '18px', minHeight: '340px' }}>
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', minHeight: '38px' }}>
<span style={{ background: C.orange, color: '#fff', fontSize: '13px', fontWeight: 600, padding: '10px 16px', borderRadius: '10px' }}>
{typed}
{typed.length < question.length && <span style={{ animation: 'site360Blink 0.9s step-end infinite' }}>|</span>}
</span>
</div>
{copilotRows.map((r, i) => {
const sc = statusColor(r.status);
const visible = i < rowsShown;
return (
<div
key={i}
style={{
display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0',
borderBottom: i < copilotRows.length - 1 ? `1px solid ${C.border}` : 'none',
opacity: visible ? 1 : 0,
animation: visible ? 'site360FadeInUp 0.4s ease-out both' : 'none',
transition: 'opacity 0.3s ease',
}}
>
<div>
<div style={{ fontSize: '13px', fontWeight: 700, color: C.navy }}>{r.doc}</div>
<div style={{ fontSize: '12px', color: C.textMuted }}>{r.zone}</div>
</div>
<span
style={{
fontSize: '11px', fontWeight: 700, color: sc.fg, background: sc.bg, padding: '4px 10px', borderRadius: '999px',
animation: r.status === 'OVERDUE' && visible ? 'site360PillPulse 2s ease-in-out infinite' : 'none',
}}
>
{r.status}
</span>
</div>
);
})}
<div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
<div style={{ flex: 1, background: C.bgSec, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '2px' }}>
Ask anything about your site
<span style={{ display: 'inline-block', width: '1.5px', height: '14px', background: C.textMuted, marginLeft: '3px', animation: 'site360Blink 1s step-end infinite' }} />
</div>
<span style={{ background: C.orange, color: '#fff', fontSize: '13px', fontWeight: 700, padding: '10px 18px', borderRadius: '8px' }}>Send</span>
</div>
</div>
</div>
<div>
<div style={{ fontSize: '12px', fontWeight: 700, color: C.orange, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Try These Examples</div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
{copilotExamples.map((ex, i) => (
<div
key={i}
style={{
display: 'flex', alignItems: 'center', justifyContent: 'space-between',
background: i === activeExample ? C.orangeLight : C.bg,
border: `1px solid ${i === activeExample ? '#F7C79A' : C.border}`,
borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 600, color: C.navy,
transition: 'background 0.4s ease, border-color 0.4s ease',
}}
>
{ex} <ChevronRight size={13} color={C.orange} />
</div>
))}
</div>
<div style={{ background: C.orangeLight, border: `1px solid #FDE0C4`, borderRadius: '12px', padding: '16px' }}>
<div style={{ fontSize: '11px', fontWeight: 700, color: C.orange, marginBottom: '8px' }}>★ AI INSIGHT</div>
<p style={{ fontSize: '12.5px', color: C.textSec, lineHeight: 1.6, margin: 0 }}>
Site MAY-001 has <b>5 outstanding items</b> ahead of the Sep 23 visit. 2 are overdue. Inspection readiness risk is <b>Medium</b>.
</p>
</div>
</div>
</div>
);
}
function AnimatedStat({ prefix, target, suffix, label }: { prefix: string; target: number; suffix: string; label: string }) {
const [value, setValue] = useState(0);
useEffect(() => {
let raf: number;
const duration = 1400;
const start = performance.now();
const tick = (now: number) => {
const t = Math.min(1, (now - start) / duration);
const eased = 1 - Math.pow(1 - t, 3);
setValue(Math.round(eased * target));
if (t < 1) raf = requestAnimationFrame(tick);
};
raf = requestAnimationFrame(tick);
return () => cancelAnimationFrame(raf);
}, [target]);
return (
<div style={{ textAlign: 'center', position: 'relative' }}>
<style>{`
@keyframes site360StatGlow { 0%, 100% { opacity: 0.10; transform: scale(1); } 50% { opacity: 0.24; transform: scale(1.18); } }
@keyframes site360StatDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.25; transform: scale(1.8); } }
`}</style>
<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', width: '100px', height: '100px' }}>
<div style={{ width: '100%', height: '100%', borderRadius: '50%', background: C.orange, filter: 'blur(24px)', animation: 'site360StatGlow 3s ease-in-out infinite' }} />
</div>
<div style={{ position: 'relative', fontSize: '44px', fontWeight: 800, color: C.orange, marginBottom: '6px' }}>
{prefix}{value}{suffix}
</div>
<div style={{ position: 'relative', fontSize: '12px', fontWeight: 700, color: C.navy, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
<span style={{ position: 'relative', width: '6px', height: '6px', flexShrink: 0 }}>
<span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.green }} />
<span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.green, animation: 'site360StatDot 1.8s ease-in-out infinite' }} />
</span>
{label}
</div>
</div>
);
}
// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const features = [
{ icon: Grid3x3, title: 'Site Dashboard', desc: 'Live Site Health Score, enrollment progress, deadlines, and action items — everything a CRC needs every morning.' },
{ icon: FolderOpen, title: 'Investigator Site File', desc: 'Full ISF management aligned to DIA Reference Model. Site-scoped document control with TMF reconciliation.' },
{ icon: Users, title: 'Participant Management', desc: 'Enroll participants, send login credentials, track consent status, and monitor diary compliance in real time.' },
{ icon: AlertTriangle, title: 'Safety Reporting', desc: 'AE/SAE log with severity tracking, protocol deviations, and CAPA management. Always inspection-ready.' },
{ icon: Search, title: 'Monitoring Visits', desc: 'SIV, IMV, and COV scheduling with action item tracking and SDV readiness checklists.' },
{ icon: User, title: 'Staff & Delegation', desc: 'Delegation of Authority log, staff qualifications, GCP training records, and role management — all in one place.' },
{ icon: Briefcase, title: 'IP & Supplies', desc: 'Investigational product accountability, device inventory tracking, temperature logs, and expiry alerts.' },
{ icon: TrendingUp, title: 'Payments', desc: 'Milestone-based payment tracking, invoice status, and financial visibility aligned to your site agreement.' },
{ icon: FileText, title: 'Query Management', desc: 'Route monitoring queries to the right staff, track SLA response times, and maintain a full audit trail.' },
];
const aiCapabilities = [
{ icon: FileText, title: 'Smarter Responses', desc: 'AI understands your site context, not just keywords.' },
{ icon: Sparkles, title: 'Actionable Insights', desc: 'Go beyond answers. Get recommendations.' },
{ icon: ShieldCheck, title: 'Inspection Ready', desc: 'AI helps you stay inspection-ready at all times.' },
{ icon: Lightbulb, title: 'Continuously Learning', desc: 'Improves with every interaction across your sites.' },
];
const intelligenceGrid = [
{ icon: Search, title: 'Intelligent Filing', desc: 'AI suggests ISF placement and flags potential misfiles automatically.' },
{ icon: TrendingUp, title: 'Real-Time Visibility', desc: 'Track completeness, risk, and health across every site panel.' },
{ icon: Clock, title: 'Smart Expectations', desc: 'Knows what documents should exist based on trial phase and milestones.' },
{ icon: ShieldCheck, title: 'Inspection Ready', desc: 'Built-in dashboards keep your site prepared at all times.' },
{ icon: Users, title: 'Human-in-the-Loop', desc: 'AI assists — your delegated staff always lead the way.' },
{ icon: Lock, title: 'Secure & Compliant', desc: '21 CFR Part 11-ready controls and role-based access.' },
];
const peopleGrid = [
{ icon: Sparkles, title: 'AI That Works With You', desc: 'Site360 understands your site context and helps your team make faster, smarter decisions across every task and document.' },
{ icon: FolderOpen, title: 'Complete Control', desc: 'Manage every document, task, review, and safety event in one unified platform — no more scattered systems or manual tracking.' },
{ icon: AlertTriangle, title: 'Proactive Risk Intelligence', desc: 'Identify missing, overdue, expired, and high-risk items before they become findings — not during an inspection.' },
];
const trustGrid = [
{ icon: Home, title: 'Built for Site Teams', desc: 'Designed by CRCs for CRCs. Every panel has a purpose rooted in real site operations.' },
{ icon: TrendingUp, title: 'Scalable for Every Site', desc: 'From single-site studies to multi-site programs — Site360 grows without added complexity or cost.' },
{ icon: ShieldCheck, title: 'Trusted & Reliable', desc: 'Enterprise-grade security, validated processes, and a platform built on the same infrastructure as TMF360.' },
];
const compliancePills = [
{ icon: ShieldCheck, label: 'ICH E6(R3) Aligned' },
{ icon: ClipboardCheck, label: 'DIA TMF Reference Model' },
{ icon: ShieldCheck, label: '21 CFR Part 11 Ready' },
{ icon: Users, label: 'Role-Based Access' },
{ icon: FileText, label: 'Full Audit Trail' },
{ icon: Lock, label: 'Data Security' },
{ icon: Download, label: 'Inspection-Ready Exports' },
];
const roles = [
{ icon: User, title: 'CRCs', desc: 'Day-to-day site operations, from ISF to enrollment.' },
{ icon: Briefcase, title: 'Principal Investigators', desc: 'Oversight visibility without the admin burden.' },
{ icon: FileText, title: 'Sub-Investigators', desc: 'Delegated task visibility and safety sign-off.' },
{ icon: Search, title: 'CRAs / Monitors', desc: 'Visit prep, SDV readiness, and action item tracking.' },
{ icon: Grid3x3, title: 'Sponsors', desc: 'Portfolio-level visibility across every site.' },
{ icon: Building2, title: 'CROs', desc: 'Multi-site management with complete oversight.' },
{ icon: FileText, title: 'Regulatory Coordinators', desc: 'IRB submissions and continuing review tracking.' },
{ icon: Briefcase, title: 'IP & Pharmacy Staff', desc: 'Investigational product accountability and chain of custody.' },
{ icon: ShieldCheck, title: 'QA / Auditors', desc: 'Read-only audit access with full traceability.' },
{ icon: Home, title: 'Site Directors', desc: 'Real-time site health and staffing oversight.' },
];
const stats = [
{ prefix: '', target: 13, decimals: 0, suffix: '', label: 'PANELS IN SITE360' },
{ prefix: '', target: 82, decimals: 0, suffix: '%', label: 'AVG. SITE HEALTH SCORE' },
{ prefix: '< ', target: 2, decimals: 0, suffix: 'H', label: 'QUERY RESPONSE TIME' },
];
const copilotExamples = [
"What's outstanding before my monitoring visit?",
'Who is delegated for informed consent right now?',
'Show overdue safety reports for this site.',
'Draft a note to file for this deviation.',
'Which training records expire this month?',
];
const copilotRows = [
{ doc: 'Delegation Log Update', zone: 'Staff & Delegation', status: 'OVERDUE' },
{ doc: 'SAE Follow-up Report', zone: 'Safety Reporting', status: 'OVERDUE' },
{ doc: 'GCP Refresher Training', zone: 'Staff & Delegation', status: 'EXPIRING' },
{ doc: 'IP Temperature Log', zone: 'IP & Supplies', status: 'MISSING' },
{ doc: 'SIV Follow-up Documents', zone: 'Monitoring Visits', status: 'MISSING' },
];
const statusColor = (s: string) => (s === 'OVERDUE' || s === 'MISSING' ? { bg: '#FEE2E2', fg: '#DC2626' } : { bg: '#FEF3C7', fg: '#D97706' });
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Site360HomePage() {
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
const handleScroll = () => setScrolled(window.scrollY > 20);
window.addEventListener('scroll', handleScroll);
return () => window.removeEventListener('scroll', handleScroll);
}, []);
const navStyle: React.CSSProperties = {
position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
backdropFilter: scrolled ? 'blur(12px)' : 'none',
borderBottom: scrolled ? `0.5px solid ${C.border}` : 'none',
transition: 'all 0.3s ease',
padding: '14px 40px',
display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
return (
<div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text, background: C.bg }}>
{/* Nav */}
<nav style={navStyle}>
<div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', maxWidth: '1060px', margin: '0 auto', width: '100%' }}>
<a href="/site360/home" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', justifySelf: 'start' }}>
<img src="/favicon.ico" alt="Site360" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
<span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
<span style={{ color: C.navy }}>Site</span><span style={{ color: C.orange }}>360</span>
</span>
</a>
<div style={{ display: 'flex', alignItems: 'center', gap: '32px', justifySelf: 'center' }}>
{['Features', 'How It Works', 'Compliance'].map(l => (
<a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '13px', color: C.textMuted, textDecoration: 'none' }}>{l}</a>
))}
</div>
<div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifySelf: 'end' }}>
<a href="/site360" style={{ fontSize: '13px', color: C.textSec, textDecoration: 'none', padding: '8px 16px' }}>Sign in</a>
<a href="/book-demo" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', background: C.orange, padding: '9px 20px', borderRadius: '8px', textDecoration: 'none' }}>Book a demo</a>
</div>
</div>
</nav>
{/* Hero */}
<section style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 1fr', columnGap: '20px', position: 'relative', overflow: 'hidden', alignItems: 'center', maxWidth: '1360px', margin: '0 auto', width: '100%' }}>
<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 20px 80px 60px', position: 'relative', zIndex: 1 }}>
<div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.orangeLight, border: `0.5px solid ${C.orange}`, borderRadius: '20px', padding: '5px 14px', marginBottom: '24px', width: 'fit-content' }}>
<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.orange, display: 'inline-block' }} />
<span style={{ fontSize: '12px', color: C.orange, fontWeight: 600 }}>Part of Trial360 OS — The Clinical Trial Operating System</span>
</div>
<h1 style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1.15, color: C.navy, margin: '0 0 20px' }}>
The site operations<br />platform built for<br /><span style={{ color: C.orange }}>clinical research.</span>
</h1>
<p style={{ fontSize: '16px', color: C.textSec, lineHeight: 1.75, marginBottom: '36px', maxWidth: '460px' }}>
Site360 gives CRCs, PIs, and site coordinators everything they need to run an inspection-ready site — from ISF management to participant enrollment, safety reporting, and monitoring visit preparation.
</p>
<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
<a href="/book-demo" style={{ fontSize: '14px', fontWeight: 700, color: '#fff', background: C.orange, padding: '13px 28px', borderRadius: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
Book a demo <ArrowRight size={16} strokeWidth={2.5} />
</a>
<a href="/site360" style={{ fontSize: '14px', fontWeight: 600, color: C.navy, background: C.bgSec, padding: '13px 28px', borderRadius: '10px', textDecoration: 'none', border: `1px solid ${C.border}` }}>
Sign in to Site360
</a>
</div>
<div style={{ display: 'flex', gap: '20px', marginTop: '36px', flexWrap: 'wrap' }}>
{['ICH E6(R3)', '21 CFR Part 11', 'DIA TMF Reference Model', 'ISO 14155'].map(b => (
<span key={b} style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, padding: '4px 12px', background: C.bgSec, borderRadius: '20px', border: `0.5px solid ${C.border}` }}>{b}</span>
))}
</div>
</div>
<div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-start' }}>
<OrbitVisual />
</div>
</section>
{/* AI Copilot */}
<section style={{ padding: '100px 60px', background: C.bgSec }}>
<div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '48px', alignItems: 'center' }}>
<div>
<Eyebrow>★ AI Copilot</Eyebrow>
<h2 style={{ fontSize: '36px', fontWeight: 800, color: C.navy, margin: '0 0 20px', lineHeight: 1.2 }}>
Ask Anything.<br />Get Intelligent<br />Answers.
</h2>
<p style={{ fontSize: '15px', color: C.textSec, lineHeight: 1.75, marginBottom: '24px' }}>
Your AI site assistant understands your study, your documents, and your workflows.
</p>
<div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
{['Natural language interaction', 'Context-aware responses', 'Actionable insights', 'Always learning, always accurate'].map(t => (
<div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
<span style={{ width: '20px', height: '20px', borderRadius: '50%', background: C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>✓</span>
<span style={{ fontSize: '14px', color: C.textSec }}>{t}</span>
</div>
))}
</div>
<a href="/book-demo" style={{ fontSize: '14px', fontWeight: 700, color: '#fff', background: C.orange, padding: '13px 28px', borderRadius: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
Book a demo <ArrowRight size={16} strokeWidth={2.5} />
</a>
</div>
<CopilotDemo />
</div>
</section>
{/* AI capability strip */}
<section style={{ padding: '80px 60px 40px', background: C.bg }}>
<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
<div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
{aiCapabilities.map((f, i) => (
<div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '20px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
<div style={{ width: '36px', height: '36px', borderRadius: '10px', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
<f.icon size={17} color={C.orange} strokeWidth={2.25} />
</div>
<div>
<div style={{ fontSize: '14px', fontWeight: 700, color: C.navy, marginBottom: '3px' }}>{f.title}</div>
<div style={{ fontSize: '12.5px', color: C.textMuted, lineHeight: 1.5 }}>{f.desc}</div>
</div>
</div>
))}
</div>
</div>
</section>
{/* Everything you need — Powered by Intelligence */}
<section style={{ padding: '60px 60px 100px', background: C.bg, textAlign: 'center' }}>
<div style={{ maxWidth: '1100px', margin: '0 auto' }}>
<Eyebrow>One Platform. Complete Site Control.</Eyebrow>
<h2 style={{ fontSize: '38px', fontWeight: 800, color: C.navy, margin: '0 0 50px', lineHeight: 1.2 }}>
Everything You Need.<br />Powered by <span style={{ color: C.orange }}>Intelligence.</span>
</h2>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '56px' }}>
{intelligenceGrid.map((f, i) => (
<div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '28px 20px', textAlign: 'center' }}>
<div style={{ width: '52px', height: '52px', borderRadius: '50%', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
<f.icon size={22} color={C.orange} strokeWidth={2.25} />
</div>
<div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '8px' }}>{f.title}</div>
<div style={{ fontSize: '13px', color: C.textSec, lineHeight: 1.6 }}>{f.desc}</div>
</div>
))}
</div>
<h3 style={{ fontSize: '30px', fontWeight: 800, color: C.navy, margin: '0 0 40px', lineHeight: 1.25 }}>
Built for <span style={{ color: C.orange }}>Intelligence.</span><br />Designed for People.
</h3>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
{peopleGrid.map((f, i) => (
<div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '26px', textAlign: 'left' }}>
<IconTile icon={f.icon} />
<div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '8px' }}>{f.title}</div>
<div style={{ fontSize: '13px', color: C.textSec, lineHeight: 1.6 }}>{f.desc}</div>
</div>
))}
</div>
</div>
</section>
{/* Platform features (existing 9-panel grid) */}
<section id="features" style={{ padding: '100px 60px', background: C.bgSec }}>
<div style={{ maxWidth: '1100px', margin: '0 auto' }}>
<div style={{ textAlign: 'center', marginBottom: '60px' }}>
<Eyebrow>13 Panels. Every Site Operation.</Eyebrow>
<h2 style={{ fontSize: '38px', fontWeight: 800, color: C.navy, margin: '0 0 16px' }}>Built for the CRC. Ready for the inspector.</h2>
<p style={{ fontSize: '15px', color: C.textSec, maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
Every panel in Site360 is designed around how site teams actually work — not how software engineers think they work.
</p>
</div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
{features.map((f, i) => (
<div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px' }}>
<IconTile icon={f.icon} />
<div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '8px' }}>{f.title}</div>
<div style={{ fontSize: '13px', color: C.textSec, lineHeight: 1.65 }}>{f.desc}</div>
</div>
))}
</div>
</div>
</section>
{/* How it works */}
<section id="how-it-works" style={{ padding: '100px 60px', background: C.bg }}>
<div style={{ maxWidth: '1100px', margin: '0 auto' }}>
<div style={{ textAlign: 'center', marginBottom: '60px' }}>
<Eyebrow>Simple Setup</Eyebrow>
<h2 style={{ fontSize: '38px', fontWeight: 800, color: C.navy, margin: '0 0 16px' }}>From activation to close-out.</h2>
</div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
{[
{ step: '01', title: 'Site setup', desc: 'Your sponsor or CRO creates your site in Trial360 OS and assigns you access via a secure invitation link.' },
{ step: '02', title: 'Configure your ISF', desc: 'Upload your site documents, configure your delegation log, and connect your study instruments.' },
{ step: '03', title: 'Enroll participants', desc: 'Create participant accounts, send login credentials, and start collecting diary data from day one.' },
{ step: '04', title: 'Stay inspection-ready', desc: 'Your Site Health Score updates in real time. Every document, every action, every decision is audit-trailed.' },
].map((s, i) => (
<div key={i} style={{ textAlign: 'center' }}>
<div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, margin: '0 auto 16px', boxShadow: '0 8px 18px -6px rgba(249,115,22,0.5)' }}>{s.step}</div>
<div style={{ fontSize: '15px', fontWeight: 700, color: C.navy, marginBottom: '8px' }}>{s.title}</div>
<div style={{ fontSize: '13px', color: C.textSec, lineHeight: 1.65 }}>{s.desc}</div>
</div>
))}
</div>
</div>
</section>
{/* Trust row */}
<section style={{ padding: '80px 60px', background: C.bgSec }}>
<div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
{trustGrid.map((f, i) => (
<div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '26px' }}>
<IconTile icon={f.icon} />
<div style={{ fontSize: '16px', fontWeight: 700, color: C.navy, marginBottom: '8px' }}>{f.title}</div>
<div style={{ fontSize: '13px', color: C.textSec, lineHeight: 1.6 }}>{f.desc}</div>
</div>
))}
</div>
</section>
{/* Compliance pills */}
<section id="compliance" style={{ padding: '70px 60px', background: C.bgSec, textAlign: 'center' }}>
<div style={{ maxWidth: '900px', margin: '0 auto' }}>
<div style={{ fontSize: '13px', fontWeight: 700, color: C.blue, marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
Designed to Support Compliance with Leading Regulatory Standards
</div>
<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
{compliancePills.map((p, i) => <CompliancePill key={i} icon={p.icon} label={p.label} />)}
</div>
</div>
</section>
{/* Who it's for */}
<section style={{ padding: '100px 60px', background: C.bgSec, borderTop: `1px solid ${C.border}` }}>
<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
<div style={{ textAlign: 'center', marginBottom: '56px' }}>
<Eyebrow>Who It's For</Eyebrow>
<h2 style={{ fontSize: '40px', fontWeight: 800, color: C.navy, margin: 0 }}>Every Role in Site Operations</h2>
</div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '18px' }}>
{roles.map((r, i) => <RoleCard key={i} icon={r.icon} title={r.title} desc={r.desc} />)}
</div>
</div>
</section>
{/* Stats */}
<section style={{ padding: '80px 60px', background: C.bgSec }}>
<div style={{ maxWidth: '900px', margin: '0 auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '48px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', boxShadow: '0 20px 40px -24px rgba(15,30,61,0.15)' }}>
{stats.map((s, i) => <AnimatedStat key={i} {...s} />)}
</div>
</section>
{/* Final CTA */}
<section style={{ padding: '60px 60px 120px', background: C.bgSec, textAlign: 'center' }}>
<div style={{ maxWidth: '640px', margin: '0 auto' }}>
<Eyebrow>Get Started</Eyebrow>
<h2 style={{ fontSize: '44px', fontWeight: 800, color: C.navy, margin: '0 0 16px', lineHeight: 1.2 }}>
Turn Your Site Into<br /><span style={{ color: C.orange }}>Inspection-Ready Operations</span>
</h2>
<p style={{ fontSize: '15px', color: C.textSec, lineHeight: 1.75, marginBottom: '36px' }}>
Move beyond scattered spreadsheets. Site360 gives your team the visibility, control, and AI-powered insight to stay inspection-ready at every stage of the trial.
</p>
<div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
<a href="/book-demo" style={{ fontSize: '14px', fontWeight: 700, color: '#fff', background: C.orange, padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
Book a demo <ArrowRight size={16} strokeWidth={2.5} />
</a>
<a href="/site360" style={{ fontSize: '14px', fontWeight: 600, color: C.navy, background: C.bg, padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', border: `1px solid ${C.border}`, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
<ChevronRight size={13} color={C.orange} /> Explore Platform
</a>
</div>
</div>
</section>
{/* Footer */}
<footer style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '56px 60px 28px' }}>
<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
<div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.2fr', gap: '32px', marginBottom: '40px' }}>
<div>
<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
<img src="/favicon.ico" alt="Site360" style={{ height: '26px', width: '26px', objectFit: 'contain' }} />
<span style={{ fontSize: '20px', fontWeight: 800, color: C.navy }}>Site<span style={{ color: C.orange }}>360</span></span>
</div>
<p style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.7, marginBottom: '16px', maxWidth: '220px' }}>
The site operations platform built for modern clinical research teams worldwide.
</p>
<div style={{ display: 'flex', gap: '10px' }}>
{[Link2, AtSign].map((Icon, i) => (
<span key={i} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
<Icon size={15} color={C.navy} />
</span>
))}
</div>
</div>
<div>
<div style={{ fontSize: '14px', fontWeight: 700, color: C.navy, marginBottom: '14px' }}>Platform</div>
{['Dashboard', 'ISF', 'Participants', 'Tasks'].map(l => (
<div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
<ChevronRight size={12} color={C.orange} />
<a href="#" style={{ fontSize: '13px', color: C.textSec, textDecoration: 'none' }}>{l}</a>
</div>
))}
</div>
<div>
<div style={{ fontSize: '14px', fontWeight: 700, color: C.navy, marginBottom: '14px' }}>Solutions</div>
{['Site Teams', 'CRCs', 'Sponsors', 'CROs'].map(l => (
<div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
<ChevronRight size={12} color={C.orange} />
<a href="#" style={{ fontSize: '13px', color: C.textSec, textDecoration: 'none' }}>{l}</a>
</div>
))}
</div>
<div>
<div style={{ fontSize: '14px', fontWeight: 700, color: C.navy, marginBottom: '14px' }}>Resources</div>
{['DIA TMF Reference Model', 'ICH E6(R3) Guide', '21 CFR Part 11', 'ICH GCP E6'].map(l => (
<div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
<ChevronRight size={12} color={C.orange} />
<a href="#" style={{ fontSize: '13px', color: C.textSec, textDecoration: 'none' }}>{l}</a>
</div>
))}
</div>
<div>
<div style={{ fontSize: '14px', fontWeight: 700, color: C.navy, marginBottom: '14px' }}>Stay Updated</div>
<p style={{ fontSize: '12.5px', color: C.textMuted, lineHeight: 1.6, marginBottom: '12px' }}>
Join site teams getting Site360 product updates, tips and news.
</p>
<div style={{ display: 'flex', gap: '8px' }}>
<div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', color: C.textMuted }}>Enter your email</div>
<span style={{ width: '38px', height: '38px', borderRadius: '8px', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
<Send size={15} color="#fff" />
</span>
</div>
</div>
</div>
<div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
<span style={{ fontSize: '12.5px', color: C.textMuted }}>© 2026 Site360. Part of Trial360 OS. All rights reserved.</span>
<div style={{ display: 'flex', gap: '24px' }}>
{['Privacy Policy', 'Terms of Service'].map(l => (
<a key={l} href="#" style={{ fontSize: '12.5px', color: C.textMuted, textDecoration: 'none' }}>{l}</a>
))}
</div>
</div>
</div>
</footer>
</div>
);
}