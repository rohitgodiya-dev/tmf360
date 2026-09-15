'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function Site360BookDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    site_name: '',
    role: 'CRC',
    country: 'United States',
    studies_count: '1-3',
    message: '',
    selectedDate: '',
    selectedTime: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function submitDemo() {
    if (!formData.selectedDate || !formData.selectedTime) return;
    setSubmitting(true);
    const { error } = await supabase.from('site360_demo_requests').insert([{
      name: formData.name,
      email: formData.email,
      site_name: formData.site_name,
      role: formData.role,
      country: formData.country,
      studies_count: formData.studies_count,
      message: formData.message,
      selected_date: formData.selectedDate,
      selected_time: formData.selectedTime,
      status: 'Pending',
    }]);
    if (error) {
      console.error('Demo insert error:', error);
      alert('Error saving request: ' + error.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    (window as any).__goStep(3);
  }

  // Canvas orb animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, t = 0;
    let animId: number;

    function resize() {
      w = canvas!.offsetWidth;
      h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
    }
    resize();
    window.addEventListener('resize', resize);

    const orbs = [
      { x: 0.2, y: 0.3, r: 0.2, spd: 0.0007, ox: 0, oy: 0, color: 'rgba(249,115,22,' },
      { x: 0.75, y: 0.65, r: 0.15, spd: 0.001, ox: 1.4, oy: 0.9, color: 'rgba(251,191,36,' },
      { x: 0.5, y: 0.12, r: 0.11, spd: 0.0013, ox: 2.2, oy: 1.6, color: 'rgba(249,115,22,' },
    ];

    function drawOrbs() {
      ctx!.clearRect(0, 0, w, h);
      t++;
      orbs.forEach(o => {
        const x = (o.x + Math.sin(t * o.spd + o.ox) * 0.12) * w;
        const y = (o.y + Math.cos(t * o.spd + o.oy) * 0.1) * h;
        const r = o.r * Math.min(w, h);
        const g = ctx!.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, o.color + '0.2)');
        g.addColorStop(1, o.color + '0)');
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fillStyle = g;
        ctx!.fill();
      });
      animId = requestAnimationFrame(drawOrbs);
    }
    drawOrbs();

    // ISF animated stats
    const docs = [
      { name: 'IRB Approval Letter', status: 'Approved', color: '#10B981' },
      { name: 'Delegation of Authority Log', status: 'Approved', color: '#10B981' },
      { name: 'Monitoring Visit Report', status: 'Review', color: '#3B82F6' },
      { name: 'IP Accountability Log', status: 'Approved', color: '#10B981' },
      { name: 'Staff CV — Dr. Chen', status: 'Draft', color: '#F59E0B' },
      { name: 'Informed Consent v3', status: 'Approved', color: '#10B981' },
      { name: 'Site Signature Sheet', status: 'Review', color: '#3B82F6' },
      { name: 'GCP Training Certificate', status: 'Approved', color: '#10B981' },
      { name: 'Protocol Deviation Report', status: 'Draft', color: '#F59E0B' },
      { name: 'SAE Follow-up Report', status: 'Review', color: '#3B82F6' },
      { name: 'Financial Disclosure Form', status: 'Approved', color: '#10B981' },
      { name: 'Temperature Log — August', status: 'Approved', color: '#10B981' },
    ];
    let docIndex = 0;
    const stats = { isf: 82, missing: 8, approved: 67, readiness: 78 };
    const zonePcts = [100, 85, 78, 90, 82];

    function renderFeed() {
      const feed = document.getElementById('doc-feed');
      if (!feed) return;
      feed.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const d = docs[(docIndex + i) % docs.length];
        const row = document.createElement('div');
        row.className = 'doc-item' + (i === 0 ? ' new-doc' : '');
        row.innerHTML = `<div class="doc-dot" style="background:${d.color};"></div><span class="doc-name">${d.name}</span><span class="doc-status" style="color:${d.color};">${d.status}</span>`;
        feed.appendChild(row);
      }
    }

    function flashStat(id: number, newVal: string | number) {
      const card = document.getElementById('sc-' + id);
      const val = document.getElementById('sv-' + id);
      if (!card || !val) return;
      card.classList.remove('flash');
      void card.offsetWidth;
      val.textContent = String(newVal);
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 400);
    }

    function updateGauge(pct: number) {
      const arc = document.getElementById('gauge-arc');
      const lbl = document.getElementById('gauge-pct');
      if (!arc || !lbl) return;
      (arc as unknown as SVGPathElement).style.strokeDashoffset = String(Math.round(146 * (1 - pct / 100)));
      lbl.textContent = pct + '%';
    }

    const initTimer = setTimeout(() => {
      renderFeed();
      updateGauge(stats.readiness);
      [100, 85, 78, 90, 82].forEach((p, i) => {
        const b = document.getElementById('zb-' + i);
        const l = document.getElementById('zl-' + i);
        if (b) (b as HTMLElement).style.width = p + '%';
        if (l) l.textContent = p + '%';
      });
    }, 700);

    const feedTimer = setInterval(() => {
      docIndex = (docIndex + 1) % docs.length;
      renderFeed();
    }, 2500);

    const statsTimer = setInterval(() => {
      stats.approved = Math.min(80, stats.approved + (Math.random() > 0.5 ? 1 : 0));
      stats.missing = Math.max(4, stats.missing - (Math.random() > 0.6 ? 1 : 0));
      stats.isf = Math.min(99, Math.round(stats.approved / 0.86));
      stats.readiness = Math.min(99, stats.readiness + (Math.random() > 0.5 ? 1 : -1));
      flashStat(0, stats.isf + '%');
      flashStat(1, stats.missing);
      flashStat(2, stats.approved);
      flashStat(3, stats.readiness);
      updateGauge(stats.readiness);
      const zi = Math.floor(Math.random() * 5);
      zonePcts[zi] = Math.min(100, Math.max(30, zonePcts[zi] + (Math.random() > 0.5 ? 1 : -1)));
      const bar = document.getElementById('zb-' + zi);
      const lbl2 = document.getElementById('zl-' + zi);
      if (bar) {
        (bar as HTMLElement).style.transition = 'width 0.7s ease';
        (bar as HTMLElement).style.width = zonePcts[zi] + '%';
      }
      if (lbl2) lbl2.textContent = zonePcts[zi] + '%';
    }, 5000);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(initTimer);
      clearInterval(feedTimer);
      clearInterval(statsTimer);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Step wizard
  useEffect(() => {
    let current = 0;
    const progWidths = ['33%', '66%', '100%', '100%'];
    let calYear = 0, calMonth = 0;
    let selectedDate: string | null = null;
    let selectedTime: string | null = null;

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const TIMES = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

    function updateIndicators(n: number) {
      [0, 1, 2].forEach(i => {
        const ind = document.getElementById('ind-' + i);
        if (!ind) return;
        const circle = ind.querySelector('.ind-circle') as HTMLElement;
        const label = ind.querySelector('.ind-label') as HTMLElement;
        const lineFill = document.getElementById('line-' + i);
        if (i < n) {
          circle.style.cssText = 'background:#10B981;color:#fff;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;transition:all .3s;flex-shrink:0;';
          circle.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          label.style.color = '#10B981';
          if (lineFill) (lineFill as HTMLElement).style.width = '100%';
        } else if (i === n) {
          circle.style.cssText = 'background:#F97316;color:#fff;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;transition:all .3s;flex-shrink:0;';
          circle.innerHTML = String(i + 1);
          label.style.color = '#F97316';
        } else {
          circle.style.cssText = 'background:#F3F4F6;border:0.5px solid #E5E7EB;color:#6B7280;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;transition:all .3s;flex-shrink:0;';
          circle.innerHTML = String(i + 1);
          label.style.color = '#6B7280';
          if (lineFill) (lineFill as HTMLElement).style.width = '0';
        }
      });
    }

    function goStep(n: number) {
      const dir = n > current ? 'left' : 'right';
      const cur = document.getElementById('step-' + current);
      const nxt = document.getElementById('step-' + n);
      if (!cur || !nxt) return;
      cur.style.animation = dir === 'left' ? 'slideOutLeft .2s ease forwards' : 'slideOutRight .2s ease forwards';
      setTimeout(() => {
        cur.classList.remove('active');
        cur.style.animation = '';
        cur.style.display = 'none';
        nxt.style.display = 'flex';
        nxt.style.animation = dir === 'left' ? 'slideInRight .3s ease' : 'slideInLeft .3s ease';
        nxt.classList.add('active');
        current = n;
        const pb = document.getElementById('progress-bar');
        if (pb) pb.style.width = progWidths[n];
        updateIndicators(n);
        if (n === 2) initCal();
      }, 185);
    }

    function initCal() {
      const now = new Date();
      calYear = now.getFullYear();
      calMonth = now.getMonth();
      renderCal();
    }

    function calNav(dir: number) {
      calMonth += dir;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCal();
    }

    function renderCal() {
      const label = document.getElementById('cal-month-label');
      if (label) label.textContent = MONTHS[calMonth] + ' ' + calYear;
      const grid = document.getElementById('cal-grid');
      if (!grid) return;
      grid.innerHTML = '';
      const firstDay = new Date(calYear, calMonth, 1);
      let startDow = firstDay.getDay() - 1;
      if (startDow < 0) startDow = 6;
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < startDow; i++) {
        const empty = document.createElement('div');
        empty.style.cssText = 'height:34px;';
        grid.appendChild(empty);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(calYear, calMonth, d);
        const dow = date.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const isPast = date < today;
        const dateStr = date.toISOString().split('T')[0];
        const isSelected = selectedDate === dateStr;
        const cell = document.createElement('div');
        cell.style.cssText = `height:34px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:12px;font-weight:${isSelected ? '600' : '400'};cursor:${isWeekend || isPast ? 'default' : 'pointer'};background:${isSelected ? '#F97316' : isWeekend || isPast ? 'transparent' : '#FFFFFF'};color:${isSelected ? '#fff' : isWeekend || isPast ? '#E5E7EB' : '#111827'};border:${isSelected ? 'none' : isWeekend || isPast ? 'none' : '0.5px solid #E5E7EB'};transition:all .15s;`;
        cell.textContent = String(d);
        if (!isWeekend && !isPast) {
          cell.onmouseenter = function () { if (!isSelected) (this as HTMLElement).style.borderColor = '#F97316'; };
          cell.onmouseleave = function () { if (!isSelected) (this as HTMLElement).style.borderColor = '#E5E7EB'; };
          cell.onclick = () => selectDate(dateStr, date);
        }
        grid.appendChild(cell);
      }
    }

    function selectDate(dateStr: string, dateObj: Date) {
      selectedDate = dateStr;
      selectedTime = null;
      setFormData(prev => ({ ...prev, selectedDate: dateStr, selectedTime: '' }));
      renderCal();
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const formatted = days[dateObj.getDay()] + ', ' + dateObj.getDate() + ' ' + MONTHS[dateObj.getMonth()] + ' ' + dateObj.getFullYear();
      const display = document.getElementById('selected-date-display');
      const dateText = document.getElementById('selected-date-text');
      if (display) display.style.display = 'flex';
      if (dateText) dateText.textContent = formatted;
      const wrap = document.getElementById('time-slots-wrap');
      const slotsEl = document.getElementById('time-slots');
      if (!slotsEl || !wrap) return;
      slotsEl.innerHTML = '';
      TIMES.forEach(t => {
        const btn = document.createElement('button');
        btn.textContent = t;
        btn.style.cssText = 'padding:8px 4px;border:0.5px solid #E5E7EB;border-radius:8px;background:#FFFFFF;color:#374151;font-size:12px;cursor:pointer;font-family:inherit;transition:all .15s;';
        btn.onmouseenter = function () { if (selectedTime !== t) (this as HTMLElement).style.borderColor = '#F97316'; };
        btn.onmouseleave = function () { if (selectedTime !== t) (this as HTMLElement).style.borderColor = '#E5E7EB'; };
        btn.onclick = () => selectTime(t, btn);
        slotsEl.appendChild(btn);
      });
      wrap.style.display = 'block';
      checkReadyToSubmit();
    }

    function selectTime(t: string, el: HTMLButtonElement) {
      selectedTime = t;
      setFormData(prev => ({ ...prev, selectedTime: t }));
      const slotsEl = document.getElementById('time-slots');
      if (slotsEl) {
        slotsEl.querySelectorAll('button').forEach(b => {
          (b as HTMLElement).style.background = '#FFFFFF';
          (b as HTMLElement).style.color = '#374151';
          (b as HTMLElement).style.borderColor = '#E5E7EB';
          (b as HTMLElement).style.fontWeight = '400';
        });
      }
      el.style.background = '#F97316';
      el.style.color = '#fff';
      el.style.borderColor = '#F97316';
      el.style.fontWeight = '600';
      checkReadyToSubmit();
    }

    function checkReadyToSubmit() {
      const btn = document.getElementById('request-btn');
      if (!btn) return;
      if (selectedDate && selectedTime) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      } else {
        btn.style.opacity = '0.4';
        btn.style.pointerEvents = 'none';
      }
    }

    (window as any).__goStep = goStep;
    (window as any).__calNav = calNav;
    (window as any).__selectPill = (el: HTMLElement, gid: string) => {
      document.getElementById(gid)?.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
    };
    (window as any).__toggleFeature = (el: HTMLElement) => el.classList.toggle('selected');
  }, []);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{--orange:#F97316;--orange-light:#FFF7ED;--orange-dark:#EA580C;--green:#10B981;--green-light:#ECFDF5;--blue:#3B82F6;--red:#EF4444;--purple:#8B5CF6;--amber:#F59E0B;--text:#111827;--text-sec:#374151;--text-muted:#6B7280;--bg:#FFFFFF;--bg-sec:#F9FAFB;--bg-tert:#F3F4F6;--border:#E5E7EB;}
        html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideOutLeft{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-28px)}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideOutRight{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(28px)}}
        @keyframes popIn{0%{transform:scale(0.82);opacity:0}65%{transform:scale(1.07)}100%{transform:scale(1);opacity:1}}
        @keyframes pulseShadow{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.35)}50%{box-shadow:0 0 0 10px rgba(249,115,22,0)}}
        @keyframes checkDraw{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes newDoc{0%{opacity:0;transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes statFlash{0%{transform:scale(1)}40%{transform:scale(1.16)}100%{transform:scale(1)}}
        @keyframes livePulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.7);opacity:0.4}}
        .page-wrap{display:flex;flex-direction:column;min-height:100vh;}
        header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;border-bottom:0.5px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:100;}
        .logo{font-size:18px;font-weight:500;color:var(--text);text-decoration:none;}
        .logo-accent{color:var(--orange);}
        .header-tag{font-size:11px;color:var(--text-muted);}
        .progress-bar-wrap{height:3px;background:var(--bg-tert);overflow:hidden;}
        .progress-bar{height:100%;background:linear-gradient(90deg,var(--orange),#FBBF24);width:33%;transition:width .55s cubic-bezier(.4,0,.2,1);}
        .main-grid{display:grid;grid-template-columns:1fr 1.25fr;flex:1;}
        .left-panel{padding:28px 26px;border-right:0.5px solid var(--border);display:flex;flex-direction:column;position:relative;overflow:hidden;min-height:calc(100vh - 51px);}
        #orb-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.5;}
        .left-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;}
        .left-title{font-size:22px;font-weight:500;line-height:1.35;margin-bottom:10px;animation:fadeUp .5s ease both;}
        .left-sub{font-size:12.5px;color:var(--text-sec);line-height:1.7;margin-bottom:20px;animation:fadeUp .5s ease .1s both;}
        .feature-list{display:flex;flex-direction:column;gap:7px;flex:1;}
        .fcard{display:flex;align-items:flex-start;gap:9px;padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);background:rgba(255,255,255,0.75);backdrop-filter:blur(4px);cursor:pointer;transition:all .2s;flex:1;}
        .fcard:hover{border-color:var(--orange);transform:translateX(3px);background:rgba(255,255,255,0.95);}
        .fcard.selected{border-color:var(--orange);background:rgba(255,247,237,0.92);}
        .fcard.selected .ficon{transform:scale(1.12);}
        .ficon{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .2s;}
        .fcard-title{font-size:12px;font-weight:500;color:var(--text);}
        .fcard-sub{font-size:10.5px;color:var(--text-muted);margin-top:1px;}
        .badges{margin-top:16px;padding-top:14px;border-top:0.5px solid var(--border);display:flex;gap:6px;flex-wrap:wrap;}
        .badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:500;}
        .badge-blue{background:#EFF6FF;color:#1D4ED8;}
        .badge-red{background:#FEF2F2;color:#991B1B;}
        .badge-green{background:#ECFDF5;color:#065F46;}
        .right-panel{padding:28px 26px;display:flex;flex-direction:column;}
        .step-indicators{display:flex;align-items:center;margin-bottom:22px;}
        .ind-item{display:flex;align-items:center;gap:6px;}
        .ind-circle{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;transition:all .3s;flex-shrink:0;background:#F3F4F6;border:0.5px solid #E5E7EB;color:#6B7280;}
        .ind-label{font-size:11px;font-weight:500;transition:color .3s;color:#6B7280;}
        .ind-line{flex:1;height:2px;background:var(--border);margin:0 8px;border-radius:2px;overflow:hidden;}
        .ind-line-fill{height:100%;background:var(--orange);width:0;transition:width .5s .1s;}
        .step{display:none;flex-direction:column;gap:11px;flex:1;animation:slideInRight .3s ease;}
        .step.active{display:flex;}
        label.lbl{font-size:11px;color:var(--text-sec);display:block;margin-bottom:5px;}
        .field{width:100%;font-size:13px;padding:9px 12px;border:0.5px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;}
        .field:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(249,115,22,0.12);}
        textarea.field{resize:vertical;min-height:72px;}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .pill-group{display:flex;flex-wrap:wrap;gap:6px;}
        .pill{font-size:11px;padding:5px 13px;border-radius:20px;border:0.5px solid var(--border);background:var(--bg);color:var(--text-sec);cursor:pointer;transition:all .2s;user-select:none;}
        .pill:hover{border-color:var(--orange);color:#C2410C;transform:translateY(-1px);}
        .pill.active{background:var(--orange-light);border-color:var(--orange);color:#C2410C;animation:popIn .22s ease;}
        .btn-primary{width:100%;padding:11px;background:var(--orange);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:7px;}
        .btn-primary:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 5px 16px rgba(249,115,22,0.32);}
        .btn-primary.pulse{animation:pulseShadow 1.6s ease .6s 2;}
        .btn-back{background:none;border:none;font-size:12px;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;gap:5px;padding:0;transition:color .15s;font-family:inherit;}
        .btn-back:hover{color:var(--orange);}
        .step-label{font-size:13px;font-weight:500;}
        .success-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;flex:1;}
        .success-circle{width:64px;height:64px;border-radius:50%;background:var(--green-light);display:flex;align-items:center;justify-content:center;animation:popIn .4s ease,floatY 3s ease .5s infinite;}
        .success-title{font-size:17px;font-weight:500;}
        .success-sub{font-size:13px;color:var(--text-sec);max-width:250px;line-height:1.65;margin:0 auto;}
        .next-steps{background:var(--bg-sec);border:0.5px solid var(--border);border-radius:11px;padding:14px 18px;text-align:left;width:100%;max-width:280px;}
        .ns-title{font-size:11px;color:var(--text-muted);margin-bottom:10px;font-weight:500;}
        .ns-item{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-sec);margin-bottom:8px;}
        .ns-item:last-child{margin-bottom:0;}
        .mini-dash{background:var(--bg-sec);border:0.5px solid var(--border);border-radius:12px;padding:12px;margin-top:16px;}
        .dash-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
        .dash-logo{font-size:13px;font-weight:600;color:var(--text);}
        .dash-logo-accent{color:var(--orange);}
        .dash-live{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-muted);}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#10B981;animation:livePulse 2s ease-in-out infinite;}
        .live-label{font-size:10px;color:var(--text-muted);}
        .mac-dots{display:flex;gap:4px;}
        .mac-dot{width:8px;height:8px;border-radius:50%;}
        .dash-body{}
        .stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;}
        .stat-card{background:var(--bg);border:0.5px solid var(--border);border-radius:8px;padding:7px 8px;text-align:center;}
        .stat-card.flash{animation:statFlash .35s ease;}
        .stat-val{font-size:15px;font-weight:600;line-height:1.2;}
        .stat-lbl{font-size:9px;color:var(--text-muted);margin-top:1px;}
        .dash-mid{display:flex;gap:10px;margin-bottom:10px;}
        .gauge-wrap{display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;}
        .gauge-sub{font-size:9px;color:var(--text-muted);}
        .feed-box{flex:1;background:var(--bg);border:0.5px solid var(--border);border-radius:8px;padding:7px 9px;overflow:hidden;}
        .feed-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
        .feed-title{font-size:9px;color:var(--text-muted);font-weight:500;}
        .doc-item{display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:0.5px solid var(--border);font-size:10px;}
        .doc-item:last-child{border-bottom:none;}
        .doc-item.new-doc{animation:newDoc .35s ease;}
        .doc-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
        .doc-name{flex:1;color:var(--text-sec);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .doc-status{font-size:9px;font-weight:500;flex-shrink:0;}
        .zones-box{background:var(--bg);border:0.5px solid var(--border);border-radius:8px;padding:8px 10px;}
        .zones-title{font-size:9px;color:var(--text-muted);font-weight:500;margin-bottom:6px;}
        .zone-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;}
        .zone-row:last-child{margin-bottom:0;}
        .zone-name{font-size:9px;color:var(--text-sec);width:70px;flex-shrink:0;}
        .zone-bar-track{flex:1;height:4px;background:var(--bg-tert);border-radius:20px;overflow:hidden;}
        .zone-bar-fill{height:100%;width:0;border-radius:20px;transition:width 1.2s cubic-bezier(.4,0,.2,1);}
        .zone-pct{font-size:9px;color:var(--text-muted);width:26px;text-align:right;flex-shrink:0;}
      `}</style>

      <div className="page-wrap">
        <header>
          <a href="/site360/home" className="logo">
            <img src="/favicon.ico" alt="Site360" width={20} height={20} style={{ objectFit: 'contain', marginRight: '7px', verticalAlign: 'middle' }} />
            Site<span className="logo-accent">360</span>
          </a>
          <span className="header-tag">Book a demo · 1 hour · video call</span>
          <a href="/site360/login" style={{ fontSize: '12px', color: '#6B7280', textDecoration: 'none' }}>Sign in →</a>
        </header>

        <div className="progress-bar-wrap">
          <div className="progress-bar" id="progress-bar"></div>
        </div>

        <div className="main-grid" style={{ flex: 1 }}>
          {/* Left panel */}
          <div className="left-panel">
            <canvas ref={canvasRef} id="orb-canvas"></canvas>
            <div className="left-inner">
              <div className="left-title">
                See Site360 in action.<br />
                <span style={{ color: '#F97316' }}>Built for clinical research sites.</span>
              </div>
              <div className="left-sub">
                In 60 minutes, see how Site360 helps your site manage its ISF, participants, safety reporting, and monitoring visits — all in one inspection-ready platform.
              </div>
              <div className="feature-list">
                {[
                  { title: 'Investigator Site File', sub: 'Full ISF aligned to DIA TMF Reference Model', bg: '#EFF6FF', icon: 'blue' },
                  { title: 'Participant management', sub: 'Enrollment, consent, diary compliance', bg: '#ECFDF5', icon: 'green' },
                  { title: 'Safety reporting', sub: 'AE/SAE log, deviations, CAPA management', bg: '#FEF2F2', icon: 'red' },
                  { title: 'Monitoring visits', sub: 'Visit prep, action items, SDV readiness', bg: '#FFF7ED', icon: 'orange' },
                  { title: 'ISF Auditor (Trinity AI)', sub: 'Your GCP compliance expert, 24/7', bg: '#FAF5FF', icon: 'purple' },
                  { title: 'Inspection readiness score', sub: 'Live site health score by zone', bg: '#FFFBEB', icon: 'amber' },
                ].map((f, i) => (
                  <div key={i} className="fcard selected" onClick={(e) => (window as any).__toggleFeature(e.currentTarget)} style={{ animation: `fadeUp .4s ease ${i * 0.06}s both` }}>
                    <div className="ficon" style={{ background: f.bg }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={f.icon === 'blue' ? '#3B82F6' : f.icon === 'green' ? '#10B981' : f.icon === 'red' ? '#EF4444' : f.icon === 'orange' ? '#F97316' : f.icon === 'purple' ? '#8B5CF6' : '#F59E0B'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div>
                      <div className="fcard-title">{f.title}</div>
                      <div className="fcard-sub">{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="badges">
                <span className="badge badge-blue">ICH E6(R3)</span>
                <span className="badge badge-red">21 CFR Part 11</span>
                <span className="badge badge-green">DIA TMF Ref Model</span>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="right-panel">
            {/* Step indicators */}
            <div className="step-indicators">
              {[['Your details', 0], ['Site info', 1], ['Schedule', 2]].map(([label, i]) => (
                <div key={i} className="ind-item" id={`ind-${i}`} style={{ flex: Number(i) < 2 ? 1 : 0 }}>
                  <div className={`ind-circle${Number(i) === 0 ? '' : ''}`} style={Number(i) === 0 ? { background: '#F97316', color: '#fff', border: 'none' } : {}}>{Number(i) === 0 ? '1' : Number(i) + 1}</div>
                  <span className="ind-label" style={Number(i) === 0 ? { color: '#F97316' } : {}}>{label}</span>
                  {Number(i) < 2 && <div className="ind-line"><div className="ind-line-fill" id={`line-${i}`}></div></div>}
                </div>
              ))}
            </div>

            {/* STEP 0 — Your details */}
            <div className="step active" id="step-0">
              <p className="step-label">Tell us about you</p>
              <div className="field-row">
                <div>
                  <label className="lbl">Your name</label>
                  <input className="field" placeholder="Jane Smith" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="lbl">Your role</label>
                  <div className="pill-group" id="role-pills" style={{ marginTop: '4px' }}>
                    {['CRC', 'CRA', 'PI', 'Sub-I', 'Pharmacist', 'Admin'].map((r, i) => (
                      <span key={r} className={`pill${i === 0 ? ' active' : ''}`} onClick={(e) => { (window as any).__selectPill(e.currentTarget, 'role-pills'); setFormData(p => ({ ...p, role: r })); }}>{r}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="lbl">Work email</label>
                <input className="field" type="email" placeholder="you@site.com" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
              </div>
              <button className="btn-primary pulse" onClick={() => (window as any).__goStep(1)}>
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>

              {/* Mini Site360 dashboard preview */}
              <div className="mini-dash">
                <div className="dash-header">
                  <span className="dash-logo">Site<span className="dash-logo-accent">360</span></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dash-live"><span className="live-dot"></span><span className="live-label">Live</span></div>
                    <div className="mac-dots">
                      <div className="mac-dot" style={{ background: '#EF4444' }}></div>
                      <div className="mac-dot" style={{ background: '#F59E0B' }}></div>
                      <div className="mac-dot" style={{ background: '#10B981' }}></div>
                    </div>
                  </div>
                </div>
                <div className="dash-body">
                  <div className="stat-row">
                    <div className="stat-card" id="sc-0"><div className="stat-val" id="sv-0" style={{ color: '#3B82F6' }}>82%</div><div className="stat-lbl">ISF Complete</div></div>
                    <div className="stat-card" id="sc-1"><div className="stat-val" id="sv-1" style={{ color: '#EF4444' }}>8</div><div className="stat-lbl">Missing</div></div>
                    <div className="stat-card" id="sc-2"><div className="stat-val" id="sv-2" style={{ color: '#10B981' }}>67</div><div className="stat-lbl">Approved</div></div>
                    <div className="stat-card" id="sc-3"><div className="stat-val" id="sv-3" style={{ color: '#F97316' }}>78</div><div className="stat-lbl">Readiness</div></div>
                  </div>
                  <div className="dash-mid">
                    <div className="gauge-wrap">
                      <svg width="78" height="60" viewBox="0 0 78 60">
                        <path d="M 9 56 A 31 31 0 1 1 69 56" fill="none" stroke="#F3F4F6" strokeWidth="8" strokeLinecap="round"/>
                        <path id="gauge-arc" d="M 9 56 A 31 31 0 1 1 69 56" fill="none" stroke="#F97316" strokeWidth="8" strokeLinecap="round" strokeDasharray="146" strokeDashoffset="146" style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1)' }}/>
                        <text x="39" y="52" textAnchor="middle" fontSize="12" fontWeight="600" fill="#111827" id="gauge-pct">78%</text>
                      </svg>
                      <div className="gauge-sub">Readiness</div>
                    </div>
                    <div className="feed-box">
                      <div className="feed-header"><span className="feed-title">ISF activity</span><span className="live-dot" style={{ width: '5px', height: '5px', animationDelay: '.4s' }}></span></div>
                      <div id="doc-feed"></div>
                    </div>
                  </div>
                  <div className="zones-box">
                    <div className="zones-title">Zone completeness</div>
                    {[['Site Activation','#10B981'],['Staff & DoA','#3B82F6'],['IP & Supplies','#F97316'],['Safety','#EC4899'],['Monitoring','#6366F1']].map(([name, color], i) => (
                      <div key={i} className="zone-row">
                        <span className="zone-name">{name}</span>
                        <div className="zone-bar-track"><div className="zone-bar-fill" id={`zb-${i}`} style={{ width: '0', background: color as string }}></div></div>
                        <span className="zone-pct" id={`zl-${i}`}>{[100,85,78,90,82][i]}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 1 — Site info */}
            <div className="step" id="step-1">
              <button className="btn-back" onClick={() => (window as any).__goStep(0)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back
              </button>
              <p className="step-label">Tell us about your site</p>
              <div>
                <label className="lbl">Site name</label>
                <input className="field" placeholder="Mayo Clinic — Rochester" value={formData.site_name} onChange={e => setFormData(p => ({ ...p, site_name: e.target.value }))} />
              </div>
              <div>
                <label className="lbl">Country</label>
                <div className="pill-group" id="country-pills">
                  {['United States', 'United Kingdom', 'Australia', 'Canada', 'Germany', 'Other'].map((c, i) => (
                    <span key={c} className={`pill${i === 0 ? ' active' : ''}`} onClick={(e) => { (window as any).__selectPill(e.currentTarget, 'country-pills'); setFormData(p => ({ ...p, country: c })); }}>{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">How many studies does your site run?</label>
                <div className="pill-group" id="studies-pills">
                  {['1-3', '4-10', '10+'].map((s, i) => (
                    <span key={s} className={`pill${i === 0 ? ' active' : ''}`} onClick={(e) => { (window as any).__selectPill(e.currentTarget, 'studies-pills'); setFormData(p => ({ ...p, studies_count: s })); }}>{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">What are you looking to solve?</label>
                <textarea className="field" placeholder="e.g. We need a better way to manage our ISF and prepare for monitoring visits..." value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}></textarea>
              </div>
              <button className="btn-primary" onClick={() => (window as any).__goStep(2)}>
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>

            {/* STEP 2 — Schedule */}
            <div className="step" id="step-2">
              <button className="btn-back" onClick={() => (window as any).__goStep(1)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back
              </button>
              <p className="step-label">Pick a preferred slot</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sessions are 1 hour via video call, Monday to Friday, 9am–5pm CST.</p>
              <div style={{ background: 'var(--bg-sec)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <button onClick={() => (window as any).__calNav(-1)} style={{ background: 'none', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span id="cal-month-label" style={{ fontSize: '13px', fontWeight: '500' }}></span>
                  <button onClick={() => (window as any).__calNav(1)} style={{ background: 'none', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '500', color: i >= 5 ? 'var(--bg-tert)' : 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
                  ))}
                </div>
                <div id="cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}></div>
              </div>
              <div id="selected-date-display" style={{ display: 'none', fontSize: '12px', fontWeight: '500', color: 'var(--orange)', background: 'var(--orange-light)', border: '0.5px solid var(--orange)', borderRadius: '8px', padding: '8px 12px', alignItems: 'center', gap: '6px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span id="selected-date-text"></span>
              </div>
              <div id="time-slots-wrap" style={{ display: 'none' }}>
                <label className="lbl">Pick a time (CST)</label>
                <div id="time-slots" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', maxHeight: '160px', overflowY: 'auto', paddingRight: '2px' }}></div>
              </div>
              <button className="btn-primary" id="request-btn" onClick={submitDemo} disabled={submitting} style={{ opacity: '0.4', pointerEvents: 'none' }}>
                {submitting ? 'Submitting...' : 'Request demo'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>

            {/* STEP 3 — Success */}
            <div className="step" id="step-3">
              <div className="success-wrap">
                <div className="success-circle">
                  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                    <polyline points="6,15 12,21 24,9" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="40" style={{ animation: 'checkDraw .55s ease .3s forwards' }}/>
                  </svg>
                </div>
                <div style={{ animation: 'fadeUp .4s ease .2s both' }}>
                  <div className="success-title">Request received!</div>
                  <p className="success-sub">We will confirm your Site360 demo within 24 hours. Check your inbox for a calendar invite.</p>
                </div>
                <div className="next-steps" style={{ animation: 'fadeUp .4s ease .35s both' }}>
                  <div className="ns-title">What happens next</div>
                  <div className="ns-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Confirmation email sent
                  </div>
                  <div className="ns-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Calendar invite within 24 hours
                  </div>
                  <div className="ns-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    1-hour personalised video session
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}