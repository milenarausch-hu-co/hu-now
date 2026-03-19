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
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WaveAnimation({ small }) {
  const bars = small ? 4 : 5;
  const cls = small
    ? 'wave-bar w-1 h-4 bg-primary-400 rounded-full origin-bottom'
    : 'wave-bar w-1.5 h-8 bg-primary-500 rounded-full origin-bottom';
  return (
    <div className={`flex items-center justify-center gap-1 ${small ? 'h-6' : 'h-10'}`}>
      {[...Array(bars)].map((_, i) => <div key={i} className={cls} />)}
    </div>
  );
}

function Spinner({ small }) {
  return (
    <div className={`spinner border-primary-100 border-t-primary-500 rounded-full ${small ? 'w-5 h-5 border-2' : 'w-12 h-12 border-4'}`} />
  );
}

function UrgencyBadge({ urgencia }) {
  const colors = { Alta: 'bg-red-500', Media: 'bg-yellow-500', Baja: 'bg-green-500' };
  return (
    <span className={`${colors[urgencia] || 'bg-gray-400'} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
      {urgencia}
    </span>
  );
}

// ── Mic recorder hook ──────────────────────────────────────────────────────
function useMicRecorder(onBlob) {
  const [recState, setRecState] = useState('idle'); // idle | recording | processing
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

// ── MicBlock: unified mic UI with required-fields awareness ───────────────
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

  // ── State B — all fields complete ──
  if (allDone) {
    return (
      <div className="flex items-center justify-center gap-3 py-3">
        {recState === 'idle' && (
          <button
            onClick={start}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-full text-sm font-medium transition"
          >
            <MicIcon className="w-4 h-4" /> ¿Querés agregar algo más?
          </button>
        )}
        {recState === 'recording' && (
          <div className="flex items-center gap-3">
            <button onClick={stop} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium">
              <StopIcon className="w-3.5 h-3.5" /> Detener
            </button>
            <span className="text-primary-600 font-mono text-sm">0:{String(seconds).padStart(2, '0')}</span>
            <WaveAnimation small />
          </div>
        )}
        {recState === 'processing' && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Spinner small /> Procesando...
          </div>
        )}
      </div>
    );
  }

  // ── State A — required fields missing ──
  return (
    <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 flex flex-col items-center gap-4">
      <div className="w-full">
        <p className="text-sm font-semibold text-primary-900 mb-3">Para enviar el reporte, contanos:</p>
        <ul className="space-y-2">
          {camposFaltantes.map(c => (
            <li key={c.key} className="flex items-start gap-2 text-sm text-primary-700">
              <span className="mt-0.5 text-primary-400 flex-shrink-0">•</span>
              {c.pregunta}
            </li>
          ))}
        </ul>
      </div>

      {recState === 'idle' && (
        <button
          onClick={start}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center shadow-lg hover:from-primary-500 hover:to-primary-700 active:scale-95 transition-all glow-effect"
        >
          <MicIcon className="w-8 h-8" />
        </button>
      )}

      {recState === 'recording' && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary-500 pulse-ring" />
            <button
              onClick={stop}
              className="relative w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all z-10"
            >
              <StopIcon className="w-7 h-7" />
            </button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <WaveAnimation />
            <span className="text-primary-600 font-mono text-sm">0:{String(seconds).padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {recState === 'processing' && (
        <div className="flex flex-col items-center gap-2 text-gray-600 text-sm">
          <Spinner />
          <span>Procesando respuesta...</span>
        </div>
      )}
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

  // Derived — recalculated on every render when formData changes
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
    <div className="w-full max-w-md flex flex-col gap-4 pb-4">
      <div className="text-center">
        <h2 className="text-base font-semibold text-gray-800">Revisá y editá el reporte</h2>
        <p className="text-xs text-gray-500 mt-0.5">Tocá el lápiz para corregir cualquier campo</p>
      </div>

      {/* Editable fields */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
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
              className={`px-4 py-3 transition-colors ${showAmber ? 'bg-primary-50 border-l-2 border-primary-400' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-xs uppercase tracking-wider font-medium ${showAmber ? 'text-primary-600' : 'text-gray-400'}`}>
                  {label}
                </p>
                {showAmber && (
                  <span className="text-[10px] font-semibold text-primary-500 bg-primary-100 px-1.5 py-0.5 rounded">
                    Requerido
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    className="flex-1 text-sm text-gray-800 border-b border-primary-500 outline-none pb-0.5 bg-transparent"
                  />
                ) : (
                  <p className={`flex-1 text-sm ${display ? 'text-gray-800' : showAmber ? 'text-primary-400 italic' : 'text-gray-400 italic'}`}>
                    {display ?? 'Sin información'}
                  </p>
                )}
                <button
                  onClick={() => isEditing ? saveEdit() : startEdit(key)}
                  className={`flex-shrink-0 p-1.5 rounded-full transition ${isEditing ? 'text-green-600 bg-green-50' : showAmber ? 'text-primary-400 hover:text-primary-600 hover:bg-primary-50' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'}`}
                >
                  {isEditing ? <CheckIcon /> : <PencilIcon />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mic block — required fields + optional correction */}
      <MicBlock
        camposFaltantes={camposFaltantes}
        currentReport={formData}
        onUpdated={handleVoiceUpdate}
      />

      {/* Submit button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`w-full py-3.5 rounded-full font-semibold text-base transition-all shadow-md
            ${canSubmit && !submitting
              ? 'bg-gradient-to-r from-primary-500 to-accent text-white hover:from-primary-600 hover:to-primary-500 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner small /> Enviando...
            </span>
          ) : 'Enviar reporte'}
        </button>

        {/* Counter hint — only shown when fields are missing */}
        <p
          className={`text-xs text-primary-600 text-center transition-opacity duration-300 ${faltanCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          Falta completar {faltanCount} campo{faltanCount !== 1 ? 's' : ''} requerido{faltanCount !== 1 ? 's' : ''}
        </p>
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
    <div className="w-full max-w-md flex flex-col gap-5 pb-4">
      {/* Hero */}
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-9 h-9 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reporte enviado</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">El responsable fue notificado y ya está gestionando tu reporte.</p>
        </div>
      </div>

      {/* Report card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

        {/* ID row */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">ID del reporte</p>
            <p className="font-mono font-bold text-gray-900 text-base">{reporte.id}</p>
          </div>
          <button
            onClick={copyId}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Fecha generación */}
          {fechaFormateada && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Fecha y hora del reporte</p>
              <p className="text-sm text-gray-800">{fechaFormateada}</p>
            </div>
          )}

          {/* Tipo + Urgencia */}
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Tipo / Urgencia</p>
            <div className="flex flex-wrap gap-2">
              {reporte.tipo && (
                <span className="bg-gradient-to-r from-primary-500 to-accent text-white text-xs font-semibold px-3 py-1 rounded-full">{reporte.tipo}</span>
              )}
              <UrgencyBadge urgencia={reporte.urgencia} />
            </div>
          </div>

          {/* Área */}
          {reporte.area && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Área / Sector de trabajo</p>
              <p className="text-sm text-gray-800">{reporte.area}</p>
            </div>
          )}

          {/* Ubicación */}
          {reporte.ubicacion && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Ubicación exacta del incidente</p>
              <p className="text-sm text-gray-800">{reporte.ubicacion}</p>
            </div>
          )}

          {/* Descripción breve */}
          {reporte.descripcion_corta && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Descripción breve</p>
              <p className="text-sm text-gray-800">{reporte.descripcion_corta}</p>
            </div>
          )}

          {/* Estado */}
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Estado</p>
            <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
              {reporte.estado ?? 'Enviado'}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Podés guardar el ID para hacer seguimiento de tu reporte.
      </p>

      <button
        onClick={onReset}
        className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-accent text-white rounded-full font-semibold text-base hover:from-primary-600 hover:to-primary-500 active:scale-[0.98] transition-all shadow-md"
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
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg glow-effect">
            <svg className="w-11 h-11 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-primary-400 bg-primary-50 px-2 py-0.5 rounded-full">AI</span>
            <p className="text-sm font-bold text-primary-600 tracking-wide">HU NOW</p>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-gray-500 text-sm mt-2">Ingresá tu legajo para continuar</p>
        </div>

        {/* Input */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Ingresá tu legajo</label>
            <input
              type="text"
              value={legajo}
              onChange={e => { setLegajo(e.target.value); setError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="Juan123"
              className={`w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
            />
            {error && <p className="text-xs text-red-500">Ingresá tu legajo para continuar.</p>}
            {!error && <p className="text-xs text-gray-400">Tu legajo se compone de tu primer nombre y número. Ejemplo: Juan123</p>}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-accent text-white rounded-full font-semibold text-base hover:from-primary-600 hover:to-primary-500 active:scale-[0.98] transition-all shadow-md"
          >
            Continuar
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Tu legajo identifica tus reportes y no se comparte públicamente.
        </p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
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

// ── Tab bar icons ──────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex z-20 safe-area-inset-bottom">
      <button
        onClick={() => onChange('reportar')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors
          ${active === 'reportar' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="1" width="6" height="12" rx="3" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        Reportar
      </button>
      <button
        onClick={() => onChange('mis-reportes')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors
          ${active === 'mis-reportes' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Mis reportes
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

      // Legajo comes from localStorage, not from audio/Claude
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

  const isScrollable = state === STATES.REVIEWING || state === STATES.DONE;

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-4 flex items-center justify-between shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <MicIcon className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded">AI</span>
            <h1 className="text-lg font-bold tracking-tight">HU NOW</h1>
          </div>
        </div>
        <button
          onClick={onChangeUser}
          title="Cambiar usuario"
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            <path d="M22 11l-3-3-3 3" />
          </svg>
          <span className="text-xs font-semibold">{legajo}</span>
        </button>
      </header>

      {/* Tab: Mis reportes */}
      {activeTab === 'mis-reportes' && (
        <div className="flex-1 flex flex-col pb-16 overflow-hidden">
          <MisReportes legajo={legajo} />
        </div>
      )}

      {/* Tab: Reportar */}
      {activeTab === 'reportar' && (
      <main className={`flex-1 flex flex-col items-center px-4 py-6 pb-20 ${isScrollable ? '' : 'justify-center'}`}>

        {/* IDLE */}
        {state === STATES.IDLE && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div>
              <p className="text-gray-800 text-lg font-semibold">Tocá el botón y contanos qué pasó.</p>
              <p className="text-gray-500 text-sm mt-1">Mencioná tu nombre, área, fecha y hora, lugar exacto y si alguien necesita atención médica.</p>
            </div>
            <button
              onClick={startRecording}
              className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center shadow-lg hover:from-primary-500 hover:to-primary-700 active:scale-95 transition-all glow-effect"
            >
              <MicIcon className="w-9 h-9" />
            </button>
          </div>
        )}

        {/* RECORDING */}
        {state === STATES.RECORDING && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary-500 pulse-ring" />
              <button
                onClick={stopRecording}
                className="relative w-20 h-20 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all z-10"
              >
                <StopIcon className="w-8 h-8" />
              </button>
            </div>
            <WaveAnimation />
            <div>
              <p className="text-primary-600 text-3xl font-mono font-bold tabular-nums">
                0:{String(seconds).padStart(2, '0')}
              </p>
              <p className="text-gray-500 text-sm mt-1">Grabando... (máx {MAX_SECONDS}s)</p>
            </div>
            <button onClick={stopRecording} className="mt-2 px-6 py-2 border border-primary-500 text-primary-500 rounded-full font-medium hover:bg-primary-50 transition">
              Detener
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {state === STATES.PROCESSING && (
          <div className="flex flex-col items-center gap-6 text-center">
            <Spinner />
            <div>
              <p className="text-gray-800 text-lg font-semibold">Procesando con AI...</p>
              <p className="text-gray-500 text-sm mt-2">Transcribiendo · Clasificando · Generando reporte</p>
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
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-3xl">!</span>
            </div>
            <p className="text-gray-800 text-lg font-semibold">
              {errorMsg || 'No pudimos procesar el audio. ¿Intentamos de nuevo?'}
            </p>
            <button onClick={reset} className="px-8 py-3 bg-gradient-to-r from-primary-500 to-accent text-white rounded-full font-semibold hover:from-primary-600 hover:to-primary-500 active:scale-[0.98] transition-all">
              Reintentar
            </button>
          </div>
        )}
        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-4 mt-auto">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-primary-400">AI</span>
            <span>Powered by Humand</span>
          </div>
        </footer>
      </main>
      )}

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
