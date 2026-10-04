---
name: trial360-page-builder
description: Trial360 OS UI conventions — color tokens, navItem, modal, badge, card, field/input, table, sidebar/top bar structure and Montrium-derived UX patterns. Load before building any page, panel, or component.
---

# Trial360 OS — Page Builder Skill

Load this before building any page, panel, or component.

## Color Tokens — Always Use These
```typescript
const C = {
  orange: '#F97316', orangeLight: '#FFF7ED', orangeDark: '#EA580C',
  navy: '#0F1E3D', navyLight: '#1E3A5F',
  bg: '#F8FAFC', bgCard: '#FFFFFF',
  border: '#E5EDF6',
  text: '#111827', textSec: '#374151', textMuted: '#6B7280',
  green: '#10B981', greenLight: '#ECFDF5',
  red: '#EF4444', redLight: '#FEF2F2',
  blue: '#3B82F6', blueLight: '#EFF6FF',
  purple: '#8B5CF6', purpleLight: '#F5F3FF',
  amber: '#F59E0B', amberLight: '#FFFBEB',
};
```

## navItem Function
```typescript
const navItem = (id: string, label: string, icon: string, badge?: number) => (
  <button key={id} onClick={() => setPanel(id as Panel)}
    style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px',
      borderRadius:'8px', border:'none', cursor:'pointer', width:'100%',
      textAlign:'left' as const, fontSize:'12px',
      background: panel===id ? 'rgba(249,115,22,0.12)' : 'transparent',
      color: panel===id ? C.orange : '#94A3B8',
      fontWeight: panel===id ? 600 : 400 }}>
    <span style={{ fontSize:'13px' }}>{icon}</span>
    <span style={{ flex:1 }}>{label}</span>
    {badge && badge > 0 && <span style={{ fontSize:'10px', padding:'1px 6px',
      borderRadius:'20px', background:C.red, color:'#fff', fontWeight:600 }}>{badge}</span>}
  </button>
);
```

## Modal Pattern
```typescript
const modal = (title:string, onClose:()=>void, children:React.ReactNode, onSave:()=>void, saving=false) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
    display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
    <div style={{ background:C.bgCard, borderRadius:'14px', padding:'24px',
      width:'100%', maxWidth:'500px', maxHeight:'85vh', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'18px' }}>
        <div style={{ fontSize:'15px', fontWeight:600, color:C.text }}>{title}</div>
        <button onClick={onClose} style={{ background:'none', border:'none',
          fontSize:'20px', cursor:'pointer', color:C.textMuted }}>×</button>
      </div>
      {children}
      <div style={{ display:'flex', gap:'8px', marginTop:'18px' }}>
        <button onClick={onClose} style={{ flex:1, padding:'10px',
          border:`0.5px solid ${C.border}`, borderRadius:'8px',
          background:C.bgCard, cursor:'pointer', fontSize:'13px' }}>Cancel</button>
        <button onClick={onSave} disabled={saving} style={{ flex:2, padding:'10px',
          background:C.orange, color:'#fff', border:'none', borderRadius:'8px',
          cursor:'pointer', fontSize:'13px', fontWeight:600, opacity:saving?0.7:1 }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
);
```

## Badge Pattern
```typescript
const badge = (text:string, color:string, bg:string) => (
  <span style={{ fontSize:'10px', fontWeight:600, padding:'3px 9px',
    borderRadius:'20px', color, background:bg, whiteSpace:'nowrap' as const }}>{text}</span>
);
```

## Card Pattern
```typescript
const card = (extra:any={}): React.CSSProperties => ({
  background:C.bgCard, border:`0.5px solid ${C.border}`,
  borderRadius:'12px', padding:'18px 20px', ...extra
});
```

## Field + Input Pattern
```typescript
const field = (label:string, el:React.ReactNode) => (
  <div style={{ marginBottom:'12px' }}>
    <label style={{ fontSize:'11px', fontWeight:600, color:C.textSec,
      display:'block', marginBottom:'5px' }}>{label}</label>
    {el}
  </div>
);

const input = (value:string, onChange:(v:string)=>void, placeholder='', type='text') => (
  <input type={type} value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder}
    style={{ width:'100%', fontSize:'13px', padding:'8px 10px',
      border:`0.5px solid ${C.border}`, borderRadius:'8px', outline:'none',
      fontFamily:'inherit', boxSizing:'border-box' as const }} />
);
```

## Table Pattern
```typescript
const tableHead = (cols:string[]) => (
  <thead><tr style={{ borderBottom:`0.5px solid ${C.border}`, background:C.bg }}>
    {cols.map(h => <th key={h} style={{ textAlign:'left', padding:'10px 14px',
      fontSize:'11px', fontWeight:600, color:C.textSec }}>{h}</th>)}
  </tr></thead>
);
```

## Sidebar Structure
- Width: 210-220px, background: C.navy
- Logo top with orange accent
- Nav groups: uppercase 9px labels, color #475569, letterSpacing 0.06em
- navItem for each item
- User info + sign out at bottom
- Site/study info pill below logo

## Top Bar Structure
- Background: C.bgCard, borderBottom: 0.5px solid C.border
- Left: agent name + study/site switcher (orange pill dropdown)
- Right: date + user avatar (orange circle, initials)

## UX Patterns — Always Apply (from Montrium teardown)
- "What happens next" text before every consequential action
- Inline validation — red messages under required fields, submit disabled until valid
- Unsaved-changes guard on forms — Cancel / Discard / Save prompt
- Friendly empty states — illustration + hint for next action
- Live counters — completeness recalculates instantly
- Drill-through — from counts to filtered lists
- Character counters on long text fields (64,000 char limit)
- Async job feedback — toast notifications for background operations

## New Page Checklist
- [ ] 'use client'; at top
- [ ] Import supabase from correct relative path (or call /api/v1 via apiFetch for new TMF360 work)
- [ ] Define C color tokens
- [ ] Define Panel type
- [ ] All state variables declared with TypeScript types
- [ ] loadData function with error handling
- [ ] Loading state shown
- [ ] Empty state for every panel with no data
- [ ] No Tailwind className anywhere (Tabler icon classes `ti ti-*` are fine)
- [ ] No hardcoded hex values in JSX
- [ ] No window.confirm() or window.alert() — use styled modals
- [ ] "What happens next" statements on all consequential actions
