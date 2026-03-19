import { useState, useRef, useEffect, useCallback } from 'react';
import MisReportes from './MisReportes';

// ── State machine ──────────────────────────────────────────────────────────
const STATES = {
  IDLE: 'idle', RECORDING: 'recording', PROCESSING: 'processing',
  REVIEWING: 'reviewing', SENDING: 'sending', DONE: 'done', ERROR: 'error',
};
const MAX_SECONDS = 30;
const STORAGE_KEY = 'hunow_legajo';

// ── Field config ───────────────────────────────────────────────────────────
const ARRAY_FIELDS = ['personas_afectadas', 'testigos', 'sistemas_involucrados', 'acciones_ya_tomadas'];

const FIELD_LABELS = {
  nombre_reportante:       'Nombre del reportante',
  fecha_hora_incidente:    'Fecha y hora del incidente',
  tipo:                    'Tipo de incidente',
  area:                    'Área / Sector de trabajo',
  ubicacion:               'Ubicación exacta del incidente',
  descripcion_corta:       'Descripción breve',
  descripcion_formal:      'Descripción formal',
  personas_afectadas:      'Personas afectadas',
  testigos:                'Testigos',
  sistemas_involucrados:   'Sistemas involucrados',
  requiere_atencion_medica:'¿Requiere atención médica?',
  acciones_ya_tomadas:     'Acciones ya tomadas',
  urgencia:                'Urgencia',
  responsable_sugerido:    'Responsable sugerido',
};

const FIELD_ICONS = {
  nombre_reportante:       'user',
  fecha_hora_incidente:    'calendar',
  tipo:                    'tag',
  area:                    'building',
  ubicacion:               'location',
  descripcion_corta:       'text',
  descripcion_formal:      'document',
  personas_afectadas:      'users',
  testigos:                'eye',
  sistemas_involucrados:   'gear',
  requiere_atencion_medica:'medical',
  acciones_ya_tomadas:     'check',
  urgencia:                'alert',
  responsable_sugerido:    'person',
};

// ── Validation ─────────────────────────────────────────────────────────────
const CAMPOS_OBLIGATORIOS = [
  { key: 'nombre_reportante',    pregunta: '¿Cuál es tu nombre?' },
  { key: 'fecha_hora_incidente', pregunta: '¿Cuándo ocurrió exactamente?' },
  { key: 'area',                 pregunta: '¿En qué área o sector trabajás?' },
  { key: 'ubicacion',            pregunta: '¿Cuál es el lugar exacto del incidente?' },
  { key: 'requiere_atencion_medica', pregunta: '¿Alguien necesita atención médica?' },
];

const OBLIGATORIO_KEYS = new Set(CAMPOS_OBLIGATORIOS.map(c => c.key));

function campoVacio(valor) {
  if (!valor) return true;
  if (typeof valor === 'string') return valor.trim() === '' || valor.trim() === 'Sin información';
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

function getCamposFaltantes(reporte) {
  return CAMPOS_OBLIGATORIOS.filter(c => campoVacio(reporte[c.key]));
}

function puedeEnviar(reporte) {
  return getCamposFaltantes(reporte).length === 0;
}

// ── Display helpers ────────────────────────────────────────────────────────
function displayVal(key, value) {
  if (value === null || value === undefined || value === '') return null;
  if (ARRAY_FIELDS.includes(key)) return Array.isArray(value) ? value.join(', ') : value;
  return String(value);
}

// ── Logo Component - Official logo image ───────────────────────────────────
const LOGO_URL = 'https://raw.githubusercontent.com/milenarausch-hu-co/hu-now/main/public/logo-hunow3.png';

function HuNowLogo({ size = 'md' }) {
  const maxWidths = {
    sm: 'max-w-[100px]',
    md: 'max-w-[100px]',
    lg: 'max-w-[160px]',
  };
  
  return (
    <img 
      src={LOGO_URL} 
      alt="HU NOW" 
      className={`${maxWidths[size]} h-auto`}
    />
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────
function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FieldIcon({ type, className = "w-4 h-4" }) {
  const icons = {
    user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1" /></>,
    building: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    location: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    text: <><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    medical: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
    check: <><polyline points="20 6 9 17 4 12" /></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    person: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[type] || icons.text}
    </svg>
  );
}

function WaveAnimation({ small, neon }) {
  const bars = small ? 4 : 5;
  const color = neon ? 'bg-[#0EA5E9]' : 'bg-white';
  const cls = small
    ? `wave-bar w-1 h-5 ${color} rounded-full origin-bottom`
    : `wave-bar w-2 h-10 ${color} rounded-full origin-bottom`;
  return (
    <div className={`flex items-center justify-center gap-1 ${small ? 'h-6' : 'h-12'}`}>
      {[...Array(bars)].map((_, i) => <div key={i} className={cls} />)}
    </div>
  );
}

function Spinner({ small, light }) {
  const baseColor = light ? 'border-white/30' : 'border-[#E0EEFF]';
  const spinColor = light ? 'border-t-white' : 'border-t-[#0EA5E9]';
  return (
    <div className={`spinner ${baseColor} ${spinColor} rounded-full ${small ? 'w-5 h-5 border-2' : 'w-12 h-12 border-4'}`} />
  );
}

function UrgencyBadge({ urgencia }) {
  const colors = { 
    Alta: 'bg-red-500 text-white', 
    Media: 'bg-amber-500 text-white', 
    Baja: 'bg-green-500 text-white' 
  };
  return (
    <span className={`${colors[urgencia] || 'bg-[#64748B] text-white'} text-xs font-bold px-3 py-1.5 rounded-full`}>
      {urgencia}
    </span>
  );
}

// ── Mic recorder hook ──────────────────────────────────────────────────────
function useMicRecorder(onBlob) {
  const [recState, setRecState] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const stop = useCallback(() => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    clearInterval(timerRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        setRecState('processing');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onBlob(blob).finally(() => setRecState('idle'));
      };

      mr.start();
      setRecState('recording');
      setSeconds(0);

      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setSeconds(sec);
        if (sec >= MAX_SECONDS) stop();
      }, 1000);
    } catch {
      setRecState('idle');
    }
  }, [onBlob, stop]);

  useEffect(() => () => { clearInterval(timerRef.current); }, []);

  return { recState, seconds, start, stop };
}

// ── MicBlock ───────────────────────────────────────────────────────────────
function MicBlock({ camposFaltantes, currentReport, onUpdated }) {
  const allDone = camposFaltantes.length === 0;

  const handleBlob = useCallback(async (blob) => {
    const fd = new FormData();
    fd.append('audio', blob, 'correction.webm');
    const tRes = await fetch('/api/transcribe', { method: 'POST', body: fd });
    const { transcripcion } = await tRes.json();

    const uRes = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: currentReport, transcripcion }),
    });
    const updated = await uRes.json();
    if (!uRes.ok) throw new Error(updated.error);
    onUpdated(updated);
  }, [currentReport, onUpdated]);

  const { recState, seconds, start, stop } = useMicRecorder(handleBlob);

  if (allDone) {
    return (
      <div className="flex items-center justify-center gap-3 py-4">
        {recState === 'idle' && (
          <button
            onClick={start}
            className="flex items-center gap-2 px-5 py-3 bg-[#0F2B5B] hover:bg-[#1E3A8A] text-white rounded-full text-sm font-bold transition shadow-neon"
          >
            <MicIcon className="w-4 h-4 text-[#0EA5E9]" /> ¿Querés agregar algo más?
          </button>
        )}
        {recState === 'recording' && (
          <div className="flex items-center gap-4 bg-[#0F2B5B] px-5 py-3 rounded-full glow-neon-intense">
            <button onClick={stop} className="flex items-center gap-2 text-white text-sm font-bold">
              <StopIcon className="w-4 h-4" /> Detener
            </button>
            <span className="text-[#0EA5E9] font-mono text-sm font-bold">0:{String(seconds).padStart(2, '0')}</span>
            <WaveAnimation small neon />
          </div>
        )}
        {recState === 'processing' && (
          <div className="flex items-center gap-3 text-[#64748B] text-sm font-medium">
            <Spinner small /> Procesando...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-2xl overflow-hidden">
      {/* Header amber with left border */}
      <div className="bg-amber-50 border-l-4 border-amber-500 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-[#0F2B5B]">Datos requeridos faltantes</p>
            <p className="text-sm text-[#64748B]">Completá estos campos para enviar</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {camposFaltantes.map(c => (
          <div key={c.key} className="flex items-center gap-3 p-3 bg-[#F0F6FF] rounded-xl border border-[#E0EEFF]">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">?</span>
            <span className="text-sm text-[#0F2B5B] font-medium">{c.pregunta}</span>
          </div>
        ))}

        <div className="pt-4 flex flex-col items-center gap-4">
          {recState === 'idle' && (
            <button
              onClick={start}
              className="w-[88px] h-[88px] rounded-full bg-[#0EA5E9] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all glow-neon"
            >
              <MicIcon className="w-11 h-11 text-white" />
            </button>
          )}

          {recState === 'recording' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#0EA5E9] pulse-neon" />
                <button
                  onClick={stop}
                  className="relative w-[88px] h-[88px] rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all z-10 glow-neon-intense"
                >
                  <StopIcon className="w-10 h-10" />
                </button>
              </div>
              <WaveAnimation neon />
              <span className="text-[#0F2B5B] font-mono text-xl font-bold">0:{String(seconds).padStart(2, '0')}</span>
            </div>
          )}

          {recState === 'processing' && (
            <div className="flex flex-col items-center gap-3 text-[#0F2B5B]">
              <Spinner />
              <span className="font-medium">Procesando respuesta...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Review screen ──────────────────────────────────────────────────────────
function ReviewScreen({ initialReport, onSubmitDone, onError }) {
  const [formData, setFormData] = useState(initialReport);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingField && inputRef.current) inputRef.current.focus();
  }, [editingField]);

  const camposFaltantes = getCamposFaltantes(formData);
  const canSubmit = puedeEnviar(formData);
  const faltanCount = camposFaltantes.length;

  const startEdit = (key) => {
    setEditValue(displayVal(key, formData[key]) ?? '');
    setEditingField(key);
  };

  const saveEdit = () => {
    if (!editingField) return;
    const newVal = ARRAY_FIELDS.includes(editingField)
      ? editValue.split(',').map(s => s.trim()).filter(Boolean)
      : (editValue.trim() || null);
    setFormData(prev => ({ ...prev, [editingField]: newVal }));
    setEditingField(null);
  };

  const handleVoiceUpdate = useCallback((updated) => {
    setFormData(prev => ({ ...prev, ...updated }));
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      onSubmitDone(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#0F2B5B]">Revisá tu reporte</h2>
        <p className="text-sm text-[#64748B] mt-1">Tocá el lápiz para corregir cualquier campo</p>
      </div>

      {/* Editable fields */}
      <div className="card-elevated rounded-2xl overflow-hidden divide-y divide-[#E0EEFF]">
        {Object.entries(FIELD_LABELS).map(([key, label]) => {
          const raw = formData[key];
          const display = displayVal(key, raw);
          const isEditing = editingField === key;
          const isRequired = OBLIGATORIO_KEYS.has(key);
          const isEmpty = campoVacio(raw);
          const showAmber = isRequired && isEmpty;

          return (
            <div
              key={key}
              className={`px-5 py-4 transition-colors ${showAmber ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-bold uppercase tracking-wide ${showAmber ? 'text-amber-700' : 'text-[#0F2B5B]'}`}>
                  {label}
                </p>
                {showAmber && (
                  <span className="text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full">
                    REQUERIDO
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    className="flex-1 text-sm text-[#0F2B5B] border-b-2 border-[#0EA5E9] outline-none pb-1 bg-transparent font-medium"
                  />
                ) : (
                  <p className={`flex-1 text-sm ${display ? 'text-[#0F2B5B] font-medium' : showAmber ? 'text-amber-600 italic' : 'text-[#64748B] italic'}`}>
                    {display ?? 'Sin información'}
                  </p>
                )}
                <button
                  onClick={() => isEditing ? saveEdit() : startEdit(key)}
                  className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition ${
                    isEditing 
                      ? 'text-white bg-green-500 hover:bg-green-600' 
                      : showAmber 
                        ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' 
                        : 'text-[#64748B] bg-[#F0F6FF] hover:bg-[#E0EEFF]'
                  }`}
                >
                  {isEditing ? <CheckIcon /> : <PencilIcon />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mic block */}
      <MicBlock
        camposFaltantes={camposFaltantes}
        currentReport={formData}
        onUpdated={handleVoiceUpdate}
      />

      {/* Submit button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`w-full py-4 rounded-full font-bold text-lg transition-all
            ${canSubmit && !submitting
              ? 'bg-[#0EA5E9] text-white hover:bg-[#38BDF8] shadow-neon active:scale-[0.98]'
              : 'bg-[#E0EEFF] text-[#64748B] cursor-not-allowed'
            }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-3">
              <Spinner small light /> Enviando...
            </span>
          ) : 'Enviar reporte'}
        </button>

        {faltanCount > 0 && (
          <p className="text-sm text-amber-600 text-center font-semibold">
            Falta completar {faltanCount} campo{faltanCount !== 1 ? 's' : ''} requerido{faltanCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Confirmation screen ────────────────────────────────────────────────────
function ConfirmacionScreen({ reporte, onReset }) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(reporte.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fechaFormateada = reporte.fecha_generacion_reporte
    ? new Date(reporte.fecha_generacion_reporte).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="w-full max-w-md flex flex-col gap-6 pb-4">
      {/* Hero - Celebratory */}
      <div className="flex flex-col items-center text-center gap-5 pt-6 celebrate">
        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-xl">
          <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-black text-[#0F2B5B]">Reporte enviado</h2>
          <p className="text-[#64748B] mt-2 text-base max-w-xs">El responsable fue notificado y ya está gestionando tu incidente.</p>
        </div>
      </div>

      {/* Report ID - Super prominent */}
      <div className="card-elevated rounded-2xl overflow-hidden">
        <div className="bg-[#0F2B5B] px-5 py-5">
          <p className="text-[#7DD3FC] text-xs uppercase tracking-widest font-semibold mb-2">ID del reporte</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono font-black text-[#0EA5E9] text-3xl tracking-wider">{reporte.id}</p>
            <button
              onClick={copyId}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#E0EEFF]">
          {fechaFormateada && (
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center">
                <FieldIcon type="calendar" className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider font-bold">Fecha y hora</p>
                <p className="text-base text-[#0F2B5B] font-semibold">{fechaFormateada}</p>
              </div>
            </div>
          )}

          <div className="px-5 py-4">
            <p className="text-xs text-[#64748B] uppercase tracking-wider font-bold mb-3">Tipo / Urgencia</p>
            <div className="flex flex-wrap items-center gap-2">
              {reporte.tipo && (
                <span className="bg-[#0F2B5B] text-white text-sm font-bold px-4 py-2 rounded-full">{reporte.tipo}</span>
              )}
              {reporte.urgencia && <UrgencyBadge urgencia={reporte.urgencia} />}
            </div>
          </div>

          {reporte.area && (
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center">
                <FieldIcon type="building" className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider font-bold">Área</p>
                <p className="text-base text-[#0F2B5B] font-semibold">{reporte.area}</p>
              </div>
            </div>
          )}

          {reporte.ubicacion && (
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center">
                <FieldIcon type="location" className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider font-bold">Ubicación</p>
                <p className="text-base text-[#0F2B5B] font-semibold">{reporte.ubicacion}</p>
              </div>
            </div>
          )}

          {reporte.descripcion_corta && (
            <div className="px-5 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center flex-shrink-0">
                <FieldIcon type="text" className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider font-bold">Descripción</p>
                <p className="text-base text-[#0F2B5B] font-semibold">{reporte.descripcion_corta}</p>
              </div>
            </div>
          )}

          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-bold text-[#0F2B5B]">Estado</span>
            </div>
            <span className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-full">
              {reporte.estado ?? 'Enviado'}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-[#64748B] text-center font-medium">
        Guardá el ID para hacer seguimiento de tu reporte.
      </p>

      <button
        onClick={onReset}
        className="w-full py-4 bg-[#0EA5E9] text-white rounded-full font-bold text-lg hover:bg-[#38BDF8] shadow-neon active:scale-[0.98] transition-all"
      >
        Nuevo reporte
      </button>
    </div>
  );
}

// ── Welcome screen ─────────────────────────────────────────────────────────
function WelcomeScreen({ onConfirm }) {
  const [legajo, setLegajo] = useState('');
  const [error, setError] = useState(false);

  const handleConfirm = () => {
    if (!legajo.trim()) { setError(true); return; }
    onConfirm(legajo.trim());
  };

  return (
    <div className="min-h-screen bg-navy-gradient flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-10">
        {/* Logo */}
        <HuNowLogo size="lg" />

        {/* Card */}
        <div className="w-full bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#0F2B5B]">Bienvenido</h1>
            <p className="text-[#64748B] text-sm mt-1">Ingresá tu legajo para continuar</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F2B5B]">Tu legajo</label>
            <input
              type="text"
              value={legajo}
              onChange={e => { setLegajo(e.target.value); setError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="Ej: Juan123"
              className={`w-full border-2 rounded-xl px-4 py-4 text-base focus:outline-none transition ${
                error 
                  ? 'border-red-400 bg-red-50 focus:border-red-500' 
                  : 'border-[#E0EEFF] bg-white focus:border-[#0EA5E9]'
              }`}
            />
            {error && <p className="text-xs text-red-500 font-semibold">Ingresá tu legajo para continuar.</p>}
            {!error && <p className="text-xs text-[#64748B]">Tu legajo se compone de tu primer nombre y número.</p>}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-4 bg-[#0EA5E9] text-white rounded-full font-bold text-lg hover:bg-[#38BDF8] shadow-neon active:scale-[0.98] transition-all"
          >
            Continuar
          </button>
        </div>

        <p className="text-xs text-[#7DD3FC] text-center">
          Tu legajo identifica tus reportes y no se comparte públicamente.
        </p>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────��───����────────────
export default function App() {
  const [legajo, setLegajo] = useState(() => localStorage.getItem(STORAGE_KEY));

  const handleConfirm = (l) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLegajo(l);
  };

  const handleChangeUser = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLegajo(null);
  };

  if (!legajo) return <WelcomeScreen onConfirm={handleConfirm} />;
  return <HuNowApp legajo={legajo} onChangeUser={handleChangeUser} />;
}

// ── Tab bar ────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0EEFF] flex z-20 safe-area-inset-bottom">
      <button
        onClick={() => onChange('reportar')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors
          ${active === 'reportar' ? 'text-[#0EA5E9]' : 'text-[#64748B]'}`}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="1" width="6" height="12" rx="3" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <span className="text-xs font-bold">Reportar</span>
      </button>
      <button
        onClick={() => onChange('mis-reportes')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors
          ${active === 'mis-reportes' ? 'text-[#0EA5E9]' : 'text-[#64748B]'}`}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span className="text-xs font-bold">Mis reportes</span>
      </button>
    </nav>
  );
}

function HuNowApp({ legajo, onChangeUser }) {
  const [activeTab, setActiveTab] = useState('reportar');
  const [state, setState] = useState(STATES.IDLE);
  const [seconds, setSeconds] = useState(0);
  const [report, setReport] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    clearInterval(timerRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await classifyAudio(blob);
      };

      mr.start();
      setState(STATES.RECORDING);
      setSeconds(0);

      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setSeconds(sec);
        if (sec >= MAX_SECONDS) stopRecording();
      }, 1000);
    } catch {
      setErrorMsg('No se pudo acceder al micrófono. Verificá los permisos.');
      setState(STATES.ERROR);
    }
  };

  const classifyAudio = async (blob) => {
    setState(STATES.PROCESSING);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/report', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');

      setReport({ ...data, legajo });
      setState(STATES.REVIEWING);
    } catch (err) {
      setErrorMsg(err.message || 'No pudimos procesar el audio.');
      setState(STATES.ERROR);
    }
  };

  const handleSubmitDone = (submitted) => {
    setFinalReport(submitted);
    setState(STATES.DONE);
  };

  const handleSubmitError = (msg) => {
    setErrorMsg(msg || 'No se pudo enviar el reporte.');
    setState(STATES.ERROR);
  };

  const reset = () => {
    setState(STATES.IDLE);
    setSeconds(0);
    setReport(null);
    setFinalReport(null);
    setErrorMsg('');
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const isRecordingFlow = state === STATES.IDLE || state === STATES.RECORDING || state === STATES.PROCESSING;

  return (
    <div className="min-h-screen bg-app flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E0EEFF] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <HuNowLogo size="sm" />
        <button
          onClick={onChangeUser}
          title="Cambiar usuario"
          className="flex items-center gap-2 bg-[#F0F6FF] hover:bg-[#E0EEFF] rounded-full px-4 py-2 transition"
        >
          <svg className="w-4 h-4 text-[#0F2B5B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-sm font-bold text-[#0F2B5B]">{legajo}</span>
        </button>
      </header>

      {/* Tab: Mis reportes */}
      {activeTab === 'mis-reportes' && (
        <div className="flex-1 flex flex-col pb-20 overflow-hidden">
          <MisReportes legajo={legajo} />
        </div>
      )}

      {/* Tab: Reportar */}
      {activeTab === 'reportar' && (
      <main className={`flex-1 flex flex-col items-center px-4 py-6 pb-24 ${isRecordingFlow ? 'justify-center' : ''} overflow-y-auto`}>

        {/* IDLE */}
        {state === STATES.IDLE && (
          <div className="flex flex-col items-center gap-8 text-center max-w-sm">
            <div>
              <h2 className="text-[#0F2B5B] text-2xl font-bold mb-3">Reportar un incidente</h2>
              <p className="text-[#64748B] text-base leading-relaxed">Tocá el botón y contanos qué pasó. Mencioná tu nombre, área, fecha, lugar y si alguien necesita atención médica.</p>
            </div>
            <button
              onClick={startRecording}
              className="w-[88px] h-[88px] rounded-full bg-[#0EA5E9] flex items-center justify-center hover:scale-105 active:scale-95 transition-all glow-neon"
            >
              <MicIcon className="w-11 h-11 text-white" />
            </button>
            <p className="text-[#64748B] text-sm font-medium">Máximo 30 segundos de grabación</p>
          </div>
        )}

        {/* RECORDING */}
        {state === STATES.RECORDING && (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#0EA5E9] pulse-neon" />
              <button
                onClick={stopRecording}
                className="relative w-[88px] h-[88px] rounded-full bg-[#0EA5E9] text-white flex items-center justify-center active:scale-95 transition-all z-10 glow-neon-intense"
              >
                <StopIcon className="w-10 h-10" />
              </button>
            </div>
            <WaveAnimation neon />
            <div>
              <p className="text-[#0EA5E9] text-4xl font-mono font-black tabular-nums">
                0:{String(seconds).padStart(2, '0')}
              </p>
              <p className="text-[#64748B] text-sm mt-2">Grabando... (máx {MAX_SECONDS}s)</p>
            </div>
            <button 
              onClick={stopRecording} 
              className="px-6 py-2 border-2 border-[#0EA5E9] text-[#0EA5E9] rounded-full font-bold hover:bg-[#F0F6FF] transition"
            >
              Detener
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {state === STATES.PROCESSING && (
          <div className="flex flex-col items-center gap-6 text-center">
            <Spinner />
            <div>
              <p className="text-[#0F2B5B] text-xl font-bold">Procesando audio...</p>
              <p className="text-[#64748B] text-sm mt-1">Estamos analizando tu mensaje</p>
            </div>
          </div>
        )}

        {/* REVIEWING */}
        {state === STATES.REVIEWING && report && (
          <ReviewScreen
            initialReport={report}
            onSubmitDone={handleSubmitDone}
            onError={handleSubmitError}
          />
        )}

        {/* DONE */}
        {state === STATES.DONE && finalReport && (
          <ConfirmacionScreen reporte={finalReport} onReset={reset} />
        )}

        {/* ERROR */}
        {state === STATES.ERROR && (
          <div className="flex flex-col items-center gap-6 text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-[#0F2B5B] text-lg font-bold">
              {errorMsg || 'No pudimos procesar el audio. ¿Intentamos de nuevo?'}
            </p>
            <button 
              onClick={reset} 
              className="px-8 py-3 bg-[#0EA5E9] text-white rounded-full font-bold hover:bg-[#38BDF8] shadow-neon active:scale-[0.98] transition-all"
            >
              Reintentar
            </button>
          </div>
        )}

      </main>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-[#64748B] py-4 mt-auto">
        Powered by <span className="font-bold text-[#0F2B5B]">Humand</span>
      </footer>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
