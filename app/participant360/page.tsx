'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ── Translation strings ──────────────────────────────────────────────────────
const STRINGS = {
  en: {
    appName: 'Participant360',
    tagline: 'Your journey matters',
    dashboard: 'Dashboard',
    activities: 'Activities',
    diary: 'Diary',
    messages: 'Messages',
    settings: 'Settings',
    welcome: 'Welcome back',
    thankYou: 'Thank you for being part of this important research study.',
    studyDetails: 'Study details',
    upcomingActivities: 'Upcoming activities',
    activitiesCompleted: 'Activities completed',
    actionNeeded: 'Action needed',
    participation: 'Study participation',
    onTrack: 'On track',
    myUpcomingActivities: 'My upcoming activities',
    viewAll: 'View all',
    myProgress: 'My progress',
    diaryCompletion: 'Diary completion',
    visitAttendance: 'Visit attendance',
    questionnaires: 'Questionnaires',
    myStudyJourney: 'My study journey',
    enrolled: 'Enrolled',
    screening: 'Screening',
    activeTreatment: 'Active treatment',
    followUp: 'Follow-up',
    completed: 'Completed',
    currentStage: 'Current stage',
    upcoming: 'Upcoming',
    recentMessages: 'Messages',
    quickLinks: 'Quick links',
    myDiary: 'My diary',
    visitCompanion: 'Visit companion',
    studyResources: 'Study resources',
    contactStudyTeam: 'Contact study team',
    importantInfo: 'Important information',
    studyHandbook: 'Study handbook',
    emergencyContact: 'Emergency contact',
    privacy: 'Privacy and your data',
    startNow: 'Start now',
    viewDetails: 'View details',
    dueToday: 'Due today',
    dueIn: 'Due in',
    days: 'days',
    getSupport: 'Get support',
    needHelp: 'Need help?',
    contactSiteTeam: 'Contact your study team or get support',
    language: 'Language',
    notifications: 'Notifications',
    accessibility: 'Accessibility',
    textSize: 'Text size',
    highContrast: 'High contrast mode',
    signOut: 'Sign out',
    myStudy: 'My study',
    myConsent: 'My consent',
    completedAt: 'Completed',
    noActivities: 'No upcoming activities',
    noMessages: 'No messages yet',
    enterResponses: 'Enter your responses',
    prepareVisits: 'Prepare for your visits',
    learnMore: 'Learn more',
    sendMessage: 'Send a message',
    keyInfo: 'Key information about your participation',
    support247: '24/7 study support',
    howWeProtect: 'How we protect your information',
    dailyDiary: 'Daily diary',
    completeDailyHealth: 'Complete your daily health diary',
    weeklyPain: 'Weekly pain assessment',
    clinicVisit: 'Clinic visit',
    studyTeam: 'Study team',
    nurseCoordinator: 'Nurse coordinator',
    offlineBanner: 'You are offline — diary entries will sync when connection returns',
    syncPending: 'Syncing entries...',
    percentOnTrack: '% on track',
  },
  es: {
    appName: 'Participant360',
    tagline: 'Tu camino importa',
    dashboard: 'Panel',
    activities: 'Actividades',
    diary: 'Diario',
    messages: 'Mensajes',
    settings: 'Ajustes',
    welcome: 'Bienvenido de nuevo',
    thankYou: 'Gracias por ser parte de este importante estudio de investigación.',
    studyDetails: 'Detalles del estudio',
    upcomingActivities: 'Actividades próximas',
    activitiesCompleted: 'Actividades completadas',
    actionNeeded: 'Acción requerida',
    participation: 'Participación en el estudio',
    onTrack: 'En curso',
    myUpcomingActivities: 'Mis próximas actividades',
    viewAll: 'Ver todo',
    myProgress: 'Mi progreso',
    diaryCompletion: 'Diario completado',
    visitAttendance: 'Asistencia a visitas',
    questionnaires: 'Cuestionarios',
    myStudyJourney: 'Mi camino en el estudio',
    enrolled: 'Inscrito',
    screening: 'Selección',
    activeTreatment: 'Tratamiento activo',
    followUp: 'Seguimiento',
    completed: 'Completado',
    currentStage: 'Etapa actual',
    upcoming: 'Próximo',
    recentMessages: 'Mensajes',
    quickLinks: 'Accesos rápidos',
    myDiary: 'Mi diario',
    visitCompanion: 'Compañero de visita',
    studyResources: 'Recursos del estudio',
    contactStudyTeam: 'Contactar al equipo del estudio',
    importantInfo: 'Información importante',
    studyHandbook: 'Manual del estudio',
    emergencyContact: 'Contacto de emergencia',
    privacy: 'Privacidad y sus datos',
    startNow: 'Empezar ahora',
    viewDetails: 'Ver detalles',
    dueToday: 'Vence hoy',
    dueIn: 'Vence en',
    days: 'días',
    getSupport: 'Obtener apoyo',
    needHelp: '¿Necesita ayuda?',
    contactSiteTeam: 'Comuníquese con su equipo de estudio o solicite apoyo',
    language: 'Idioma',
    notifications: 'Notificaciones',
    accessibility: 'Accesibilidad',
    textSize: 'Tamaño de texto',
    highContrast: 'Modo de alto contraste',
    signOut: 'Cerrar sesión',
    myStudy: 'Mi estudio',
    myConsent: 'Mi consentimiento',
    completedAt: 'Completado',
    noActivities: 'Sin actividades próximas',
    noMessages: 'Sin mensajes aún',
    enterResponses: 'Ingresar respuestas',
    prepareVisits: 'Prepararse para las visitas',
    learnMore: 'Aprender más',
    sendMessage: 'Enviar mensaje',
    keyInfo: 'Información clave sobre su participación',
    support247: 'Apoyo del estudio 24/7',
    howWeProtect: 'Cómo protegemos su información',
    dailyDiary: 'Diario diario',
    completeDailyHealth: 'Complete su diario de salud diario',
    weeklyPain: 'Evaluación semanal del dolor',
    clinicVisit: 'Visita a la clínica',
    studyTeam: 'Equipo del estudio',
    nurseCoordinator: 'Coordinadora de enfermería',
    offlineBanner: 'Está desconectado — las entradas del diario se sincronizarán cuando se restablezca la conexión',
    syncPending: 'Sincronizando entradas...',
    percentOnTrack: '% en curso',
  },
};

// ── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  navy: '#0F1E3D',
  navyLight: '#1E3A5F',
  bg: '#F7FAFE',
  bgCard: '#FFFFFF',
  border: '#E5EDF6',
  textPrimary: '#062B63',
  textSec: '#55719C',
  textMuted: '#8FA3BE',
  green: '#0AAF72',
  greenLight: '#E8F9F2',
  blue: '#1473E6',
  blueLight: '#EAF3FF',
  purple: '#8B3DFF',
  purpleLight: '#F3EAFF',
  red: '#E53935',
  redLight: '#FFF0F1',
};

// ── SVG Icons ────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = 'currentColor' }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z M9 12h6 M9 16h4',
    edit: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
    mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    check: 'M20 6L9 17l-5-5',
    calendar: 'M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M1 10h22',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    bar: 'M18 20V10 M12 20V4 M6 20v-6',
    map: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3',
    chevronRight: 'M9 18l6-6-6-6',
    chevronDown: 'M6 9l6 6 6-6',
    arrowRight: 'M5 12h14 M12 5l7 7-7 7',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    wifi: 'M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01',
    wifiOff: 'M1 1l22 22 M16.72 11.06A10.94 10.94 0 0 1 19 12.55 M5 12.55a10.94 10.94 0 0 1 5.17-2.39 M10.71 5.05A16 16 0 0 1 22.56 9 M1.42 9a15.91 15.91 0 0 1 4.7-2.88 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    headphones: 'M3 18v-6a9 9 0 0 1 18 0v6 M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z',
    fileText: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    fileWarn: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 13v4 M12 11v.01',
    sync: 'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    x: 'M18 6L6 18 M6 6l12 12',
    logOut: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  };
  const d = icons[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  );
};

// ── Logo ─────────────────────────────────────────────────────────────────────
const Logo = ({ size = 36 }: { size?: number }) => (
  <img src="/favicon.ico" alt="Participant360" width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0 }} />
);

// ── Types ────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'es';
type Tab = 'dashboard' | 'activities' | 'diary' | 'messages' | 'settings';

interface Participant {
  id: string;
  full_name: string;
  participant_code: string;
  status: string;
  language_preference: Lang;
  study?: { study_id: string; sponsor?: string; protocol?: string };
}

interface Activity {
  id: string;
  activity_type: string;
  window_start: string;
  window_end: string;
  status: string;
  completed_at?: string;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Participant360Page() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncPending, setSyncPending] = useState(false);
  const [stats, setStats] = useState({ upcoming: 0, completed: 0, actionNeeded: 0, participation: 100 });
  const [messages, setMessages] = useState<any[]>([]);

  const t = STRINGS[lang];

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineEntries(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // Load participant data
  useEffect(() => {
    loadParticipantData();
  }, []);

  async function loadParticipantData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/participant360/login'; return; }

      const { data: p } = await supabase
        .from('participants')
        .select('*, studies(study_id, sponsor, protocol)')
        .eq('email', user.email)
        .single();

      if (!p) { 
        await supabase.auth.signOut();
        window.location.href = '/participant360/login'; 
        return; 
      }
      setParticipant({ ...p, study: p.studies });
        setLang((p.language_preference as Lang) || 'en');

        // Load activities
        const { data: acts } = await supabase
          .from('participant_activities')
          .select('*')
          .eq('participant_id', p.id)
          .order('window_start', { ascending: true });

        if (acts) {
          setActivities(acts);
          const upcoming = acts.filter(a => a.status === 'scheduled' || a.status === 'due').length;
          const completed = acts.filter(a => a.status === 'completed').length;
          const actionNeeded = acts.filter(a => a.status === 'due').length;
          const participation = acts.length > 0 ? Math.round((completed / acts.length) * 100) : 100;
          setStats({ upcoming, completed, actionNeeded, participation });
        }

        // Load messages (placeholder)
        setMessages([
          { id: 1, from: t.studyTeam, text: 'Reminder: complete your diary today', time: '10:24 AM', unread: true, color: C.orange },
          { id: 2, from: t.nurseCoordinator, text: 'Your next visit details', time: 'Apr 18', unread: false, color: C.blue },
          { id: 3, from: t.studyTeam, text: 'New educational resource available', time: 'Apr 15', unread: false, color: C.purple },
        ]);
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  async function syncOfflineEntries() {
    const pending = JSON.parse(localStorage.getItem('p360_pending_responses') || '[]');
    if (pending.length === 0) return;
    setSyncPending(true);
    for (const entry of pending) {
      try {
        await supabase.from('participant_responses').insert([{
          ...entry,
          received_at_server: new Date().toISOString(),
          sync_delay_seconds: Math.round((Date.now() - new Date(entry.entered_at_device).getTime()) / 1000),
          submitted_offline: true,
        }]);
      } catch (e) { console.error('Sync error:', e); }
    }
    localStorage.removeItem('p360_pending_responses');
    setSyncPending(false);
  }

  const getActivityLabel = (a: Activity) => {
    if (a.activity_type === 'diary') return t.dailyDiary;
    if (a.activity_type === 'questionnaire') return t.weeklyPain;
    if (a.activity_type === 'visit') return t.clinicVisit;
    return a.activity_type;
  };

  const getActivitySub = (a: Activity) => {
    if (a.activity_type === 'diary') return t.completeDailyHealth;
    if (a.activity_type === 'questionnaire') return 'Week 4 questionnaire';
    if (a.activity_type === 'visit') return 'Central Hospital — Room 3B';
    return '';
  };

  const getDueLabel = (a: Activity) => {
    const now = new Date();
    const end = new Date(a.window_end);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return t.dueToday;
    return `${t.dueIn} ${diff} ${t.days}`;
  };

  const upcomingActivities = activities.filter(a => a.status === 'scheduled' || a.status === 'due').slice(0, 3);
  const completedActivities = activities.filter(a => a.status === 'completed');

  const journeyStages = [
    { key: 'screening', label: t.screening, done: true, date: 'Completed Jan 5, 2026' },
    { key: 'enrolled', label: t.enrolled, done: true, date: 'Completed Jan 20, 2026' },
    { key: 'active', label: t.activeTreatment, current: true, date: `${t.currentStage} · Jan 20 – Jul 20, 2026` },
    { key: 'followup', label: t.followUp, done: false, date: t.upcoming },
    { key: 'completed', label: t.completed, done: false, date: 'Pending' },
  ];

  // ── Shared card style ──────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: '14px',
    padding: '18px 20px',
    boxShadow: '0 2px 8px rgba(6,43,99,0.035)',
  };

  const cardHead: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  };

  const cardTitle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: C.textPrimary,
  };

  const cardLink: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: C.orange,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <Logo size={48} />
          <div style={{ marginTop: '16px', fontSize: '14px', color: C.textMuted }}>Loading your portal...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.textPrimary, maxWidth: '480px', margin: '0 auto', position: 'relative' }}>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: '#1E3A5F', color: '#fff', fontSize: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="wifiOff" size={14} color="#fff" />
          {t.offlineBanner}
        </div>
      )}
      {syncPending && (
        <div style={{ background: C.orange, color: '#fff', fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="sync" size={14} color="#fff" />
          {t.syncPending}
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={32} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{t.appName}</div>
            <div style={{ fontSize: '10px', color: C.textMuted }}>{t.tagline}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '5px 10px', fontSize: '12px', color: C.textSec, cursor: 'pointer', fontWeight: 500 }}
          >
            <Icon name="globe" size={13} color={C.textSec} />
            {lang === 'en' ? 'EN' : 'ES'}
          </button>
          {/* Avatar */}
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
            {participant?.full_name?.slice(0, 2).toUpperCase() || 'P1'}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── DASHBOARD ──────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <>
            {/* Welcome + Study card */}
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: C.textPrimary }}>{t.welcome}{participant?.full_name ? `, ${participant.full_name.split(' ')[0]}!` : '!'}</div>
              <div style={{ fontSize: '13px', color: C.textSec, marginTop: '3px' }}>{t.thankYou}</div>
            </div>

            {/* Study card */}
            {participant?.study && (
              <div style={{ background: C.orangeLight, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FFE1D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.orange, flexShrink: 0 }}>
                  <Icon name="users" size={18} color={C.orange} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{participant.study.study_id || 'Study'}</div>
                  <div style={{ fontSize: '11px', color: C.textSec, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{participant.study.protocol || participant.study.sponsor || ''}</div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.orange, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {t.studyDetails} <Icon name="chevronRight" size={12} color={C.orange} />
                </div>
              </div>
            )}

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { val: stats.upcoming, label: t.upcomingActivities, detail: 'Next: Daily diary', color: C.orange, bg: C.orangeLight, icon: 'calendar' },
                { val: stats.completed, label: t.activitiesCompleted, detail: 'Great progress!', color: C.green, bg: C.greenLight, icon: 'check' },
                { val: stats.actionNeeded, label: t.actionNeeded, detail: 'Please complete your diary', color: C.orange, bg: C.orangeLight, icon: 'bell' },
                { val: `${stats.participation}%`, label: t.participation, detail: t.onTrack, color: C.blue, bg: C.blueLight, icon: 'bar' },
              ].map((s, i) => (
                <div key={i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={18} color={s.color} />
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary }}>{s.label}</div>
                  <div style={{ fontSize: '11px', color: C.textMuted }}>{s.detail}</div>
                </div>
              ))}
            </div>

            {/* Upcoming activities */}
            <div style={card}>
              <div style={cardHead}>
                <div style={cardTitle}>{t.myUpcomingActivities}</div>
                <div style={cardLink} onClick={() => setTab('activities')}>{t.viewAll} <Icon name="arrowRight" size={12} color={C.orange} /></div>
              </div>
              {upcomingActivities.length === 0 ? (
                <div style={{ fontSize: '13px', color: C.textMuted, textAlign: 'center', padding: '20px 0' }}>{t.noActivities}</div>
              ) : upcomingActivities.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '11px 0', borderBottom: i < upcomingActivities.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={a.activity_type === 'visit' ? 'map' : 'fileText'} size={17} color={C.orange} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{getActivityLabel(a)}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '1px' }}>{getActivitySub(a)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: a.status === 'due' ? C.redLight : C.blueLight, color: a.status === 'due' ? C.red : C.blue, whiteSpace: 'nowrap' }}>{getDueLabel(a)}</span>
                    <button style={{ fontSize: '11px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', background: a.status === 'due' ? C.orange : 'transparent', color: a.status === 'due' ? '#fff' : C.orange, border: `1px solid ${C.orange}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {a.status === 'due' ? t.startNow : t.viewDetails}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={card}>
              <div style={cardHead}>
                <div style={cardTitle}>{t.myProgress}</div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: C.orangeLight, color: C.orange }}>{stats.participation}{t.percentOnTrack}</span>
              </div>
              {[
                { label: t.diaryCompletion, val: completedActivities.filter(a => a.activity_type === 'diary').length, total: activities.filter(a => a.activity_type === 'diary').length },
                { label: t.visitAttendance, val: completedActivities.filter(a => a.activity_type === 'visit').length, total: activities.filter(a => a.activity_type === 'visit').length },
                { label: t.questionnaires, val: completedActivities.filter(a => a.activity_type === 'questionnaire').length, total: activities.filter(a => a.activity_type === 'questionnaire').length },
              ].map((p, i) => {
                const pct = p.total > 0 ? Math.round((p.val / p.total) * 100) : 100;
                return (
                  <div key={i} style={{ marginBottom: i < 2 ? '14px' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: C.textPrimary }}>{p.label}</span>
                      <span style={{ color: C.textMuted }}>{p.val} / {p.total || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', background: C.border, borderRadius: '20px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: C.orange, borderRadius: '20px', transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: C.orange, width: '32px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Journey timeline */}
            <div style={card}>
              <div style={cardHead}>
                <div style={cardTitle}>{t.myStudyJourney}</div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: C.greenLight, color: C.green }}>{t.enrolled}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {journeyStages.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: i < journeyStages.length - 1 ? '20px' : 0, position: 'relative' }}>
                    {i < journeyStages.length - 1 && (
                      <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: 0, width: '2px', background: C.border }} />
                    )}
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? C.orange : (s as any).current ? C.bgCard : C.bgCard, border: s.done ? 'none' : `2px solid ${(s as any).current ? C.orange : C.border}` }}>
                      {s.done && <Icon name="check" size={12} color="#fff" />}
                      {(s as any).current && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.orange }} />}
                    </div>
                    <div style={{ paddingTop: '2px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: (s as any).current ? C.orange : C.textMuted, marginTop: '1px', fontWeight: (s as any).current ? 600 : 400 }}>{s.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages preview */}
            <div style={card}>
              <div style={cardHead}>
                <div style={cardTitle}>{t.recentMessages}</div>
                <div style={cardLink} onClick={() => setTab('messages')}>{t.viewAll} <Icon name="arrowRight" size={12} color={C.orange} /></div>
              </div>
              {messages.slice(0, 3).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '9px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: m.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="mail" size={14} color={m.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary }}>
                        {m.from}
                        {m.unread && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: C.orange, marginLeft: '5px', verticalAlign: 'middle' }} />}
                      </span>
                      <span style={{ fontSize: '10px', color: C.textMuted, whiteSpace: 'nowrap' }}>{m.time}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={card}>
              <div style={{ ...cardHead, marginBottom: '12px' }}>
                <div style={cardTitle}>{t.quickLinks}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: t.myDiary, sub: t.enterResponses, icon: 'fileText', color: C.orange, bg: C.orangeLight, action: () => setTab('diary') },
                  { label: t.visitCompanion, sub: t.prepareVisits, icon: 'map', color: C.orange, bg: C.orangeLight, action: () => {} },
                  { label: t.studyResources, sub: t.learnMore, icon: 'book', color: C.green, bg: C.greenLight, action: () => {} },
                  { label: t.contactStudyTeam, sub: t.sendMessage, icon: 'message', color: C.purple, bg: C.purpleLight, action: () => setTab('messages') },
                ].map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={q.action}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={q.icon} size={16} color={q.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary }}>{q.label}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted }}>{q.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Important information */}
            <div style={card}>
              <div style={{ ...cardHead, marginBottom: '10px' }}>
                <div style={cardTitle}>{t.importantInfo}</div>
              </div>
              {[
                { label: t.studyHandbook, sub: t.keyInfo, icon: 'fileText' },
                { label: t.emergencyContact, sub: t.support247, icon: 'fileWarn' },
                { label: t.privacy, sub: t.howWeProtect, icon: 'shield' },
              ].map((info, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={info.icon} size={15} color={C.orange} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{info.label}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '1px' }}>{info.sub}</div>
                    </div>
                  </div>
                  <Icon name="externalLink" size={14} color={C.textMuted} />
                </div>
              ))}
            </div>

            {/* Help card */}
            <div style={{ ...card, background: C.navy }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="headphones" size={18} color={C.orange} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{t.needHelp}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{t.contactSiteTeam}</div>
                </div>
              </div>
              <button style={{ width: '100%', background: C.orange, color: '#fff', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {t.getSupport}
              </button>
            </div>
          </>
        )}

        {/* ── ACTIVITIES ─────────────────────────────────────── */}
        {tab === 'activities' && (
          <>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary }}>{t.activities}</div>
            {activities.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: C.textMuted, fontSize: '13px' }}>{t.noActivities}</div>
            ) : activities.map((a, i) => (
              <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: a.status === 'completed' ? C.greenLight : C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={a.activity_type === 'visit' ? 'map' : 'fileText'} size={20} color={a.status === 'completed' ? C.green : C.orange} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary }}>{getActivityLabel(a)}</div>
                  <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{getActivitySub(a)}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {a.status === 'completed' ? (
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: C.greenLight, color: C.green }}>{t.completedAt}</span>
                  ) : (
                    <button style={{ fontSize: '11px', fontWeight: 600, padding: '8px 14px', borderRadius: '8px', background: C.orange, color: '#fff', border: 'none', cursor: 'pointer' }}>{t.startNow}</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── DIARY ──────────────────────────────────────────── */}
        {tab === 'diary' && (
          <>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary }}>{t.myDiary}</div>
            <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon name="edit" size={24} color={C.orange} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, marginBottom: '8px' }}>{t.dailyDiary}</div>
              <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px' }}>{t.completeDailyHealth}</div>
              <button
                onClick={() => {
                  const entry = {
                    participant_id: participant?.id,
                    entered_at_device: new Date().toISOString(),
                    device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    payload: { started: true },
                    submitted_offline: !isOnline,
                  };
                  if (!isOnline) {
                    const pending = JSON.parse(localStorage.getItem('p360_pending_responses') || '[]');
                    pending.push(entry);
                    localStorage.setItem('p360_pending_responses', JSON.stringify(pending));
                    alert(lang === 'en' ? 'Saved offline — will sync when connection returns.' : 'Guardado sin conexión — se sincronizará cuando se restablezca la conexión.');
                  } else {
                    alert(lang === 'en' ? 'Diary entry started! (Full diary flow coming in Phase 2)' : '¡Entrada del diario iniciada! (Flujo completo del diario llegará en la Fase 2)');
                  }
                }}
                style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
              >
                {t.startNow}
              </button>
              {!isOnline && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <Icon name="wifiOff" size={12} color={C.textMuted} />
                  Entry will be saved offline with your timestamp
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MESSAGES ───────────────────────────────────────── */}
        {tab === 'messages' && (
          <>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary }}>{t.messages}</div>
            {messages.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: C.textMuted, fontSize: '13px' }}>{t.noMessages}</div>
            ) : messages.map((m, i) => (
              <div key={i} style={{ ...card, display: 'flex', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: m.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="mail" size={18} color={m.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
                      {m.from}
                      {m.unread && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: C.orange, marginLeft: '6px', verticalAlign: 'middle' }} />}
                    </span>
                    <span style={{ fontSize: '10px', color: C.textMuted, whiteSpace: 'nowrap' }}>{m.time}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>{m.text}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── SETTINGS ───────────────────────────────────────── */}
        {tab === 'settings' && (
          <>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary }}>{t.settings}</div>

            {/* Profile */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: C.orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>
                  {participant?.full_name?.slice(0, 2).toUpperCase() || 'P'}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{participant?.full_name || 'Participant'}</div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>{participant?.participant_code || ''}</div>
                  <div style={{ fontSize: '11px', color: C.green, marginTop: '2px', fontWeight: 600 }}>{participant?.status || ''}</div>
                </div>
              </div>
            </div>

            {/* Language */}
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.language}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['en', 'es'] as Lang[]).map(l => (
                  <button key={l} onClick={() => setLang(l)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${lang === l ? C.orange : C.border}`, background: lang === l ? C.orangeLight : C.bgCard, color: lang === l ? C.orange : C.textSec, fontWeight: lang === l ? 700 : 400, cursor: 'pointer', fontSize: '13px' }}>
                    {l === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
                  </button>
                ))}
              </div>
            </div>

            {/* Text size */}
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.accessibility}</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: C.textPrimary, marginBottom: '8px' }}>{t.textSize}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['Small', 'Medium', 'Large', 'XL'].map((s, i) => (
                  <button key={s} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: `1px solid ${i === 1 ? C.orange : C.border}`, background: i === 1 ? C.orangeLight : C.bgCard, color: i === 1 ? C.orange : C.textSec, cursor: 'pointer', fontSize: ['11px', '12px', '13px', '14px'][i] }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/participant360/login'; }}
              style={{ width: '100%', padding: '13px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.bgCard, color: C.red, fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Icon name="logOut" size={16} color={C.red} />
              {t.signOut}
            </button>
          </>
        )}

      </div>

      {/* ── Bottom tab navigation ─────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: C.bgCard, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 200, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: 'dashboard', icon: 'home', label: t.dashboard },
          { id: 'activities', icon: 'clipboard', label: t.activities },
          { id: 'diary', icon: 'edit', label: t.diary },
          { id: 'messages', icon: 'mail', label: t.messages },
          { id: 'settings', icon: 'settings', label: t.settings },
        ] as { id: Tab; icon: string; label: string }[]).map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: tab === item.id ? C.orange : C.textMuted, gap: '3px', minHeight: '56px', position: 'relative' }}
          >
            {item.id === 'messages' && messages.some(m => m.unread) && (
              <div style={{ position: 'absolute', top: '8px', right: 'calc(50% - 14px)', width: '7px', height: '7px', borderRadius: '50%', background: C.orange }} />
            )}
            <Icon name={item.icon} size={20} color={tab === item.id ? C.orange : C.textMuted} />
            <span style={{ fontSize: '10px', fontWeight: tab === item.id ? 700 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
}