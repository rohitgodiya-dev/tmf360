'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const C = {
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  navy: '#0F1E3D',
  bg: '#F7FAFE',
  bgCard: '#FFFFFF',
  border: '#E5EDF6',
  textPrimary: '#062B63',
  textSec: '#55719C',
  textMuted: '#8FA3BE',
  green: '#0AAF72',
  greenLight: '#E8F9F2',
  red: '#E53935',
  redLight: '#FFF0F1',
};

interface InstrumentItem {
  id: string;
  item_order: number;
  item_type: string;
  label_en: string;
  label_es: string;
  required: boolean;
  min_value: number | null;
  max_value: number | null;
  options_json: string[] | null;
}

type Lang = 'en' | 'es';

export default function DiaryFlowPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [items, setItems] = useState<InstrumentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentValue, setCurrentValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState('');

  const LABELS: Record<string, Record<Lang, string>> = {
    next: { en: 'Next', es: 'Siguiente' },
    back: { en: 'Back', es: 'Atrás' },
    submit: { en: 'Submit diary', es: 'Enviar diario' },
    submitting: { en: 'Submitting...', es: 'Enviando...' },
    skip: { en: 'Skip', es: 'Omitir' },
    required: { en: 'This question is required', es: 'Esta pregunta es obligatoria' },
    question: { en: 'Question', es: 'Pregunta' },
    of: { en: 'of', es: 'de' },
    submitted: { en: 'Diary submitted!', es: '¡Diario enviado!' },
    submittedSub: { en: 'Thank you for completing your diary today.', es: 'Gracias por completar su diario hoy.' },
    savedOffline: { en: 'Saved offline — will sync when connection returns.', es: 'Guardado sin conexión — se sincronizará cuando se restablezca la conexión.' },
    backToDashboard: { en: 'Back to dashboard', es: 'Volver al panel' },
    noInstrument: { en: 'No diary configured for your study.', es: 'No hay diario configurado para su estudio.' },
    strongly_disagree: { en: 'Strongly disagree', es: 'Muy en desacuerdo' },
    disagree: { en: 'Disagree', es: 'En desacuerdo' },
    neutral: { en: 'Neutral', es: 'Neutral' },
    agree: { en: 'Agree', es: 'De acuerdo' },
    strongly_agree: { en: 'Strongly agree', es: 'Muy de acuerdo' },
    yes: { en: 'Yes', es: 'Sí' },
    no: { en: 'No', es: 'No' },
    pain_none: { en: 'No pain', es: 'Sin dolor' },
    pain_worst: { en: 'Worst pain', es: 'Peor dolor' },
    type_answer: { en: 'Type your answer here...', es: 'Escriba su respuesta aquí...' },
    select_all: { en: 'Select all that apply', es: 'Seleccione todo lo que aplique' },
    offline: { en: 'Offline — entry will be saved locally', es: 'Sin conexión — la entrada se guardará localmente' },
  };

  const t = (key: string) => LABELS[key]?.[lang] || key;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    loadDiary();
    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  async function loadDiary() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get participant
      const { data: p } = await supabase
        .from('participants')
        .select('id, language_preference, study_id')
        .eq('email', user.email)
        .single();

      if (p) {
        setParticipantId(p.id);
        setLang((p.language_preference as Lang) || 'en');

        // Get active instrument for study
        const { data: config } = await supabase
          .from('study_instrument_config')
          .select('instrument_version_id')
          .eq('study_id', p.study_id)
          .eq('active', true)
          .eq('frequency', 'daily')
          .single();

        if (config) {
          const { data: itemData } = await supabase
            .from('instrument_items')
            .select('*')
            .eq('instrument_version_id', config.instrument_version_id)
            .order('item_order', { ascending: true });

          if (itemData) setItems(itemData);
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }

  const currentItem = items[currentIndex];
  const isLast = currentIndex === items.length - 1;
  const progress = items.length > 0 ? ((currentIndex) / items.length) * 100 : 0;

  function handleNext() {
    if (currentItem?.required && (currentValue === null || currentValue === '' || currentValue === undefined)) {
      setError(t('required'));
      return;
    }
    setError('');
    if (currentValue !== null && currentValue !== undefined) {
      setResponses(prev => ({ ...prev, [currentItem.id]: currentValue }));
    }
    setCurrentValue(responses[items[currentIndex + 1]?.id] ?? null);
    setCurrentIndex(i => i + 1);
  }

  function handleBack() {
    setError('');
    if (currentValue !== null) {
      setResponses(prev => ({ ...prev, [currentItem.id]: currentValue }));
    }
    setCurrentValue(responses[items[currentIndex - 1]?.id] ?? null);
    setCurrentIndex(i => i - 1);
  }

  function handleSkip() {
    setError('');
    setCurrentValue(null);
    setCurrentIndex(i => i + 1);
  }

  async function handleSubmit() {
    if (currentItem?.required && (currentValue === null || currentValue === '' || currentValue === undefined)) {
      setError(t('required'));
      return;
    }
    setError('');
    const finalResponses = { ...responses };
    if (currentValue !== null && currentValue !== undefined) {
      finalResponses[currentItem.id] = currentValue;
    }

    const enteredAt = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const entry = {
      participant_id: participantId,
      instrument_version_id: items[0] ? (await supabase.from('instrument_items').select('instrument_version_id').eq('id', items[0].id).single()).data?.instrument_version_id : null,
      payload: finalResponses,
      entered_at_device: enteredAt,
      device_timezone: timezone,
      submitted_offline: !isOnline,
    };

    if (!isOnline) {
      const pending = JSON.parse(localStorage.getItem('p360_pending_responses') || '[]');
      pending.push(entry);
      localStorage.setItem('p360_pending_responses', JSON.stringify(pending));
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      await supabase.from('participant_responses').insert([{
        ...entry,
        received_at_server: new Date().toISOString(),
        clock_integrity_status: 'trusted',
      }]);
      setSubmitted(true);
    } catch (e) {
      console.error('Submit error:', e);
    }
    setSubmitting(false);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: C.textMuted, fontSize: '14px' }}>Loading diary...</div>
      </div>
    );
  }

  // ── No instrument ────────────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '20px' }}>{t('noInstrument')}</div>
          <button onClick={() => window.location.href = '/participant360'} style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: C.textPrimary, marginBottom: '8px', textAlign: 'center' }}>{t('submitted')}</div>
        <div style={{ fontSize: '14px', color: C.textSec, textAlign: 'center', marginBottom: '8px' }}>{t('submittedSub')}</div>
        {!isOnline && (
          <div style={{ fontSize: '12px', color: C.orange, textAlign: 'center', marginBottom: '20px', padding: '8px 14px', background: C.orangeLight, borderRadius: '8px' }}>{t('savedOffline')}</div>
        )}
        <button
          onClick={() => window.location.href = '/participant360'}
          style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '12px', width: '100%', maxWidth: '320px' }}
        >
          {t('backToDashboard')}
        </button>
      </div>
    );
  }

  // ── Diary flow ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: C.navy, color: '#fff', fontSize: '11px', padding: '8px 16px', textAlign: 'center' }}>
          {t('offline')}
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => window.location.href = '/participant360'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: C.textSec, fontSize: '13px', padding: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          {t('back')}
        </button>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
          {t('question')} {currentIndex + 1} {t('of')} {items.length}
        </div>
        <div style={{ width: '40px' }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: C.border }}>
        <div style={{ height: '100%', width: `${((currentIndex + 1) / items.length) * 100}%`, background: C.orange, transition: 'width 0.3s ease', borderRadius: '0 4px 4px 0' }} />
      </div>

      {/* Question area */}
      <div style={{ flex: 1, padding: '28px 20px 24px', display: 'flex', flexDirection: 'column' }}>
        {currentItem && (
          <>
            {/* Question label */}
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary, lineHeight: 1.4, marginBottom: '28px' }}>
              {lang === 'en' ? currentItem.label_en : (currentItem.label_es || currentItem.label_en)}
              {!currentItem.required && (
                <span style={{ fontSize: '12px', fontWeight: 400, color: C.textMuted, marginLeft: '8px' }}>(optional)</span>
              )}
            </div>

            {/* ── PAIN SCALE ───────────────────────────────────── */}
            {currentItem.item_type === 'pain_scale' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: C.textMuted }}>{t('pain_none')}</span>
                  <span style={{ fontSize: '12px', color: C.textMuted }}>{t('pain_worst')}</span>
                </div>
                {/* Number buttons 0-10 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '6px' }}>
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentValue(i)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '10px',
                        border: `2px solid ${currentValue === i ? C.orange : C.border}`,
                        background: currentValue === i ? C.orange : C.bgCard,
                        color: currentValue === i ? '#fff' : i >= 7 ? C.red : C.textPrimary,
                        fontSize: '14px',
                        fontWeight: currentValue === i ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                {/* Colour track */}
                <div style={{ height: '8px', borderRadius: '20px', background: 'linear-gradient(to right, #0AAF72, #F59E0B, #E53935)', opacity: 0.4 }} />
                {currentValue !== null && (
                  <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, color: currentValue >= 7 ? C.red : currentValue >= 4 ? '#F59E0B' : C.green }}>
                    {currentValue} / 10
                  </div>
                )}
              </div>
            )}

            {/* ── YES / NO ─────────────────────────────────────── */}
            {currentItem.item_type === 'yes_no' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => setCurrentValue(val)}
                    style={{
                      padding: '18px',
                      borderRadius: '14px',
                      border: `2px solid ${currentValue === val ? C.orange : C.border}`,
                      background: currentValue === val ? C.orangeLight : C.bgCard,
                      color: currentValue === val ? C.orange : C.textPrimary,
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{val ? '✓' : '✗'}</span>
                    {val ? t('yes') : t('no')}
                  </button>
                ))}
              </div>
            )}

            {/* ── LIKERT ───────────────────────────────────────── */}
            {currentItem.item_type === 'likert' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map((val, i) => {
                  const labels = [t('strongly_disagree'), t('disagree'), t('neutral'), t('agree'), t('strongly_agree')];
                  return (
                    <button
                      key={val}
                      onClick={() => setCurrentValue(val)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: `2px solid ${currentValue === val ? C.orange : C.border}`,
                        background: currentValue === val ? C.orangeLight : C.bgCard,
                        color: currentValue === val ? C.orange : C.textPrimary,
                        fontSize: '14px',
                        fontWeight: currentValue === val ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: currentValue === val ? C.orange : C.border, color: currentValue === val ? '#fff' : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{val}</span>
                      {labels[i]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── MULTIPLE CHOICE ──────────────────────────────── */}
            {currentItem.item_type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{t('select_all')}</div>
                {(currentItem.options_json || []).map((opt: string, i: number) => {
                  const selected = Array.isArray(currentValue) && currentValue.includes(opt);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const prev = Array.isArray(currentValue) ? currentValue : [];
                        if (prev.includes(opt)) {
                          setCurrentValue(prev.filter((v: string) => v !== opt));
                        } else {
                          setCurrentValue([...prev, opt]);
                        }
                      }}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: `2px solid ${selected ? C.orange : C.border}`,
                        background: selected ? C.orangeLight : C.bgCard,
                        color: selected ? C.orange : C.textPrimary,
                        fontSize: '14px',
                        fontWeight: selected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${selected ? C.orange : C.border}`, background: selected ? C.orange : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── NUMERIC ─────────────────────────────────────── */}
            {currentItem.item_type === 'numeric' && (
              <div>
                <input
                  type="number"
                  value={currentValue ?? ''}
                  min={currentItem.min_value ?? undefined}
                  max={currentItem.max_value ?? undefined}
                  onChange={e => setCurrentValue(e.target.value === '' ? null : Number(e.target.value))}
                  style={{ width: '100%', fontSize: '28px', fontWeight: 700, textAlign: 'center', padding: '20px', borderRadius: '14px', border: `2px solid ${C.border}`, color: C.textPrimary, background: C.bgCard, outline: 'none' }}
                  placeholder="0"
                />
                {(currentItem.min_value !== null || currentItem.max_value !== null) && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: C.textMuted, marginTop: '8px' }}>
                    {currentItem.min_value !== null && `Min: ${currentItem.min_value}`}
                    {currentItem.min_value !== null && currentItem.max_value !== null && ' · '}
                    {currentItem.max_value !== null && `Max: ${currentItem.max_value}`}
                  </div>
                )}
              </div>
            )}

            {/* ── FREE TEXT ────────────────────────────────────── */}
            {currentItem.item_type === 'free_text' && (
              <textarea
                value={currentValue ?? ''}
                onChange={e => setCurrentValue(e.target.value)}
                placeholder={t('type_answer')}
                rows={5}
                style={{ width: '100%', fontSize: '15px', padding: '16px', borderRadius: '14px', border: `2px solid ${C.border}`, color: C.textPrimary, background: C.bgCard, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: C.red, padding: '10px 14px', background: C.redLight, borderRadius: '8px' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ padding: '16px 20px 32px', background: C.bgCard, borderTop: `1px solid ${C.border}`, display: 'flex', gap: '10px' }}>
        {currentIndex > 0 && (
          <button
            onClick={handleBack}
            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bgCard, color: C.textSec, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            {t('back')}
          </button>
        )}
        {!currentItem?.required && !isLast && (
          <button
            onClick={handleSkip}
            style={{ padding: '14px 20px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMuted, fontSize: '14px', cursor: 'pointer' }}
          >
            {t('skip')}
          </button>
        )}
        <button
          onClick={isLast ? handleSubmit : handleNext}
          disabled={submitting}
          style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: C.orange, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.15s' }}
        >
          {submitting ? t('submitting') : isLast ? t('submit') : t('next')}
        </button>
      </div>

    </div>
  );
}