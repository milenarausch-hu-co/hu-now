import { useState, useEffect } from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function arrayToText(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val.length ? val.join(', ') : null;
  return String(val);
}

// ── Constants ──────────────────────────────────────────────────────────────
const URGENCIA_COLORS = {
  Alta:  'bg-red-100 text-red-700',
  Media: 'bg-amber-100 text-amber-700',
  Baja:  'bg-green-100 text-green-700',
};

const ESTADO_COLORS = {
  'Enviado':     'bg-primary-100 text-primary-700',
  'En revisión': 'bg-cyan-100 text-cyan-700',
  'En proceso':  'bg-amber-100 text-amber-700',
  'Resuelto':    'bg-green-100 text-green-700',
  'Cerrado':     'bg-gray-100 text-gray-500',
};

const TIEMPO_URGENCIA = {
  Alta:  'Tiempo de respuesta estimado: menos de 1 hora',
  Media: 'Tiempo de respuesta estimado: menos de 24 horas',
  Baja:  'Tiempo de respuesta estimado: menos de 72 horas',
};

function getMensajeEstado(reporte) {
  switch (reporte.estado) {
    case 'Enviado':     return 'Tu reporte fue recibido. Pronto un responsable lo va a revisar.';
    case 'En revisión': return 'Un responsable está revisando tu reporte.';
    case 'En proceso':  return `El equipo de ${reporte.responsable_sugerido || 'gestión'} ya está trabajando en tu reporte.`;
    case 'Resuelto':    return 'Tu reporte fue resuelto. Podés ver el detalle abajo.';
    case 'Cerrado':     return 'Este reporte fue cerrado.';
    default:            return 'Tu reporte fue recibido.';
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────
function UrgencyBadge({ urgencia }) {
  const cls = URGENCIA_COLORS[urgencia] ?? 'bg-gray-100 text-gray-500';
  return <span className={`${cls} text-xs font-semibold px-2.5 py-1 rounded-full`}>{urgencia ?? '—'}</span>;
}

function EstadoBadge({ estado }) {
  const cls = ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-500';
  return <span className={`${cls} text-xs font-semibold px-2.5 py-1 rounded-full`}>{estado ?? '—'}</span>;
}

function BackButton({ onClick, label = 'Volver' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-primary-500 font-medium hover:text-primary-700 transition mb-4"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </button>
  );
}

function DetailRow({ label, value }) {
  const text = arrayToText(value);
  if (!text) return null;
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{text}</p>
    </div>
  );
}

// ── View 2 — List ──────────────────────────────────────────────────────────
function ListView({ reportes, loading, onVerDetalle }) {
  return (
    <div className="flex flex-col px-4 py-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Mis reportes</h2>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
          Cargando tus reportes...
        </div>
      ) : reportes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl mx-auto mb-3">📋</div>
          <p className="text-gray-700 font-semibold">Todavía no enviaste ningún reporte.</p>
          <p className="text-sm text-gray-400 mt-1">Usá la tab "Reportar" para describir un incidente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 mb-1">
            {reportes.length} reporte{reportes.length !== 1 ? 's' : ''} encontrado{reportes.length !== 1 ? 's' : ''}
          </p>

          {reportes.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-gray-500">{r.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.fecha_generacion_reporte)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <UrgencyBadge urgencia={r.urgencia} />
                  <EstadoBadge estado={r.estado} />
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900 mb-2">{r.descripcion_corta ?? '—'}</p>

                {/* Estado message */}
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2">
                  {getMensajeEstado(r)}
                </p>

                {/* Tiempo estimado */}
                {TIEMPO_URGENCIA[r.urgencia] && (
                  <p className="text-xs text-gray-400">{TIEMPO_URGENCIA[r.urgencia]}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pb-3">
                <button
                  onClick={() => onVerDetalle(r)}
                  className="w-full py-2 border border-primary-500 text-primary-500 rounded-full text-sm font-medium hover:bg-primary-50 active:scale-[0.98] transition-all"
                >
                  Ver detalle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── State history timeline ─────────────────────────────────────────────────
function HistorialTimeline({ historial }) {
  if (!historial || historial.length === 0) {
    return <p className="text-xs text-gray-400 italic">Sin historial disponible.</p>;
  }

  const estadoColors = {
    'Enviado':     'bg-primary-500',
    'En revisión': 'bg-cyan-500',
    'En proceso':  'bg-amber-500',
    'Resuelto':    'bg-green-500',
    'Cerrado':     'bg-gray-400',
  };

  return (
    <div className="space-y-0">
      {historial.map((entry, i) => (
        <div key={i} className="flex gap-3">
          {/* Dot + line */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${estadoColors[entry.estado] ?? 'bg-gray-300'}`} />
            {i < historial.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
          </div>
          {/* Content */}
          <div className={`${i < historial.length - 1 ? 'pb-4' : 'pb-1'}`}>
            <p className="text-sm font-semibold text-gray-800">{entry.estado}</p>
            <p className="text-xs text-gray-400">{fmtDateShort(entry.fecha)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── View 3 — Detail ────────────────────────────────────────────────────────
function DetailView({ reporte, onBack, recomendaciones, loadingRecs }) {
  return (
    <div className="flex flex-col px-4 py-4 gap-4">
      <BackButton onClick={onBack} label="Volver a resultados" />

      {/* ID + badges */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <div>
            <p className="font-mono font-bold text-gray-900">{reporte.id}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(reporte.fecha_generacion_reporte)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <UrgencyBadge urgencia={reporte.urgencia} />
            <EstadoBadge estado={reporte.estado} />
          </div>
        </div>

        {/* Estado message */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-700">{getMensajeEstado(reporte)}</p>
          {TIEMPO_URGENCIA[reporte.urgencia] && (
            <p className="text-xs text-gray-400 mt-1">{TIEMPO_URGENCIA[reporte.urgencia]}</p>
          )}
        </div>

        {/* All fields */}
        <div className="px-4 pb-2">
          <DetailRow label="Nombre del reportante"      value={reporte.nombre_reportante} />
          <DetailRow label="Fecha y hora del incidente" value={reporte.fecha_hora_incidente} />
          <DetailRow label="Tipo de incidente"          value={reporte.tipo} />
          <DetailRow label="Área / Sector de trabajo"   value={reporte.area} />
          <DetailRow label="Ubicación exacta"           value={reporte.ubicacion} />
          <DetailRow label="Descripción breve"          value={reporte.descripcion_corta} />
          <DetailRow label="Descripción formal"         value={reporte.descripcion_formal} />
          <DetailRow label="Personas afectadas"         value={reporte.personas_afectadas} />
          <DetailRow label="Testigos"                   value={reporte.testigos} />
          <DetailRow label="Sistemas involucrados"      value={reporte.sistemas_involucrados} />
          <DetailRow label="¿Requiere atención médica?" value={reporte.requiere_atencion_medica} />
          <DetailRow label="Acciones ya tomadas"        value={reporte.acciones_ya_tomadas} />
          <DetailRow label="Responsable sugerido"       value={reporte.responsable_sugerido} />
        </div>
      </div>

      {/* Historial de estados */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Historial de estados</h3>
        <HistorialTimeline historial={reporte.historial_estados} />
      </div>

      {/* Recomendaciones AI */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Mientras se resuelve tu reporte:</h3>

        {loadingRecs ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
            Generando recomendaciones...
          </div>
        ) : recomendaciones && recomendaciones.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {recomendaciones.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-primary-500 font-bold flex-shrink-0">{i + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 italic mt-1">No se pudieron cargar las recomendaciones.</p>
        )}
      </div>
    </div>
  );
}

// ── Main MisReportes section ───────────────────────────────────────────────
export default function MisReportes({ legajo }) {
  const [view, setView] = useState('list');         // 'list' | 'detail'
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [recomendaciones, setRecomendaciones] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Auto-fetch on mount using legajo
  useEffect(() => {
    if (!legajo) return;
    setLoading(true);
    fetch(`/api/mis-reportes?legajo=${encodeURIComponent(legajo)}`)
      .then(r => r.json())
      .then(data => setResultados(Array.isArray(data) ? data : []))
      .catch(() => setResultados([]))
      .finally(() => setLoading(false));
  }, [legajo]);

  const handleVerDetalle = async (reporte) => {
    setSelected(reporte);
    setRecomendaciones(null);
    setView('detail');

    if (reporte.tipo && reporte.descripcion_formal) {
      setLoadingRecs(true);
      try {
        const res = await fetch('/api/recomendaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: reporte.tipo, descripcion_formal: reporte.descripcion_formal }),
        });
        const data = await res.json();
        setRecomendaciones(data.recomendaciones ?? []);
      } catch {
        setRecomendaciones([]);
      } finally {
        setLoadingRecs(false);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {view === 'list' && (
        <ListView
          reportes={resultados}
          loading={loading}
          onVerDetalle={handleVerDetalle}
        />
      )}
      {view === 'detail' && selected && (
        <DetailView
          reporte={selected}
          onBack={() => setView('list')}
          recomendaciones={recomendaciones}
          loadingRecs={loadingRecs}
        />
      )}
    </div>
  );
}
