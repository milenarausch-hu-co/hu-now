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
  Alta:  'bg-red-500 text-white',
  Media: 'bg-amber-500 text-white',
  Baja:  'bg-green-500 text-white',
};

const ESTADO_COLORS = {
  'Enviado':     'bg-[#0F2B5B] text-white',
  'En revisión': 'bg-[#1E3A8A] text-white',
  'En proceso':  'bg-amber-500 text-white',
  'Resuelto':    'bg-green-500 text-white',
  'Cerrado':     'bg-[#64748B] text-white',
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
  const cls = URGENCIA_COLORS[urgencia] ?? 'bg-[#64748B] text-white';
  return <span className={`${cls} text-xs font-bold px-3 py-1.5 rounded-full`}>{urgencia ?? '—'}</span>;
}

function EstadoBadge({ estado }) {
  const cls = ESTADO_COLORS[estado] ?? 'bg-[#64748B] text-white';
  return <span className={`${cls} text-xs font-bold px-3 py-1.5 rounded-full`}>{estado ?? '—'}</span>;
}

function BackButton({ onClick, label = 'Volver' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm text-[#0F2B5B] font-bold hover:text-[#0EA5E9] transition mb-4 bg-[#F0F6FF] px-4 py-2 rounded-full border border-[#E0EEFF]"
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
    <div className="py-3 border-b border-[#E0EEFF] last:border-0">
      <p className="text-xs text-[#64748B] uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className="text-sm text-[#0F2B5B] font-medium">{text}</p>
    </div>
  );
}

// ── View 2 — List ──────────────────────────────────────────────────────────
function ListView({ reportes, loading, onVerDetalle }) {
  return (
    <div className="flex flex-col px-4 py-4">
      <h2 className="text-2xl font-bold text-[#0F2B5B] mb-4">Mis reportes</h2>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-[#64748B] text-sm">
          <div className="w-6 h-6 border-3 border-[#E0EEFF] border-t-[#0EA5E9] rounded-full animate-spin" />
          Cargando tus reportes...
        </div>
      ) : reportes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-[#F0F6FF] border border-[#E0EEFF] flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-[#0F2B5B] font-bold text-lg">Todavía no enviaste ningún reporte.</p>
          <p className="text-sm text-[#64748B] mt-2">Usá la tab "Reportar" para describir un incidente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#64748B] font-semibold">
            {reportes.length} reporte{reportes.length !== 1 ? 's' : ''} encontrado{reportes.length !== 1 ? 's' : ''}
          </p>

          {reportes.map(r => (
            <div key={r.id} className="bg-white border border-[#E0EEFF] rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#E0EEFF] bg-[#F0F6FF] flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-bold text-[#0F2B5B] bg-white px-2 py-1 rounded border border-[#E0EEFF] inline-block">{r.id}</p>
                  <p className="text-xs text-[#64748B] mt-1">{fmtDate(r.fecha_generacion_reporte)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <UrgencyBadge urgencia={r.urgencia} />
                  <EstadoBadge estado={r.estado} />
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-4">
                <p className="text-base font-semibold text-[#0F2B5B] mb-3">{r.descripcion_corta ?? '—'}</p>

                {/* Estado message */}
                <p className="text-sm text-[#0F2B5B] bg-[#F0F6FF] rounded-xl px-4 py-3 mb-3 font-medium border border-[#E0EEFF]">
                  {getMensajeEstado(r)}
                </p>

                {/* Tiempo estimado */}
                {TIEMPO_URGENCIA[r.urgencia] && (
                  <p className="text-xs text-[#64748B] font-medium">{TIEMPO_URGENCIA[r.urgencia]}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => onVerDetalle(r)}
                  className="w-full py-3 bg-[#0EA5E9] text-white rounded-full text-sm font-bold hover:bg-[#38BDF8] active:scale-[0.98] transition-all"
                  style={{ boxShadow: '0 4px 14px rgba(14, 165, 233, 0.25)' }}
                >
                  Ver detalle completo
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
    return <p className="text-sm text-[#64748B] italic">Sin historial disponible.</p>;
  }

  const estadoColors = {
    'Enviado':     'bg-[#0F2B5B]',
    'En revisión': 'bg-[#1E3A8A]',
    'En proceso':  'bg-amber-500',
    'Resuelto':    'bg-green-500',
    'Cerrado':     'bg-[#64748B]',
  };

  return (
    <div className="space-y-0">
      {historial.map((entry, i) => (
        <div key={i} className="flex gap-3">
          {/* Dot + line */}
          <div className="flex flex-col items-center">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${estadoColors[entry.estado] ?? 'bg-[#64748B]'}`} />
            {i < historial.length - 1 && <div className="w-0.5 flex-1 bg-[#E0EEFF] my-1" />}
          </div>
          {/* Content */}
          <div className={`${i < historial.length - 1 ? 'pb-4' : 'pb-1'}`}>
            <p className="text-sm font-bold text-[#0F2B5B]">{entry.estado}</p>
            <p className="text-xs text-[#64748B]">{fmtDateShort(entry.fecha)}</p>
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
      <BackButton onClick={onBack} label="Volver a mis reportes" />

      {/* ID + badges */}
      <div className="bg-white border border-[#E0EEFF] rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#0F2B5B] px-5 py-4 flex items-center justify-between gap-2">
          <div>
            <p className="font-mono font-black text-[#0EA5E9] text-xl">{reporte.id}</p>
            <p className="text-xs text-[#7DD3FC] mt-0.5">{fmtDate(reporte.fecha_generacion_reporte)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <UrgencyBadge urgencia={reporte.urgencia} />
            <EstadoBadge estado={reporte.estado} />
          </div>
        </div>

        {/* Estado message */}
        <div className="px-5 py-4 border-b border-[#E0EEFF] bg-[#F0F6FF]">
          <p className="text-sm text-[#0F2B5B] font-medium">{getMensajeEstado(reporte)}</p>
          {TIEMPO_URGENCIA[reporte.urgencia] && (
            <p className="text-xs text-[#64748B] mt-1">{TIEMPO_URGENCIA[reporte.urgencia]}</p>
          )}
        </div>

        {/* All fields */}
        <div className="px-5 pb-3">
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
      <div className="bg-white border border-[#E0EEFF] rounded-2xl shadow-sm p-5">
        <h3 className="text-base font-bold text-[#0F2B5B] mb-4">Historial de estados</h3>
        <HistorialTimeline historial={reporte.historial_estados} />
      </div>

      {/* Recomendaciones AI */}
      <div className="bg-white border border-[#E0EEFF] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E0EEFF] bg-[#F0F6FF] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-[#0F2B5B]">Mientras se resuelve tu reporte:</h3>
        </div>

        <div className="p-5">
          {loadingRecs ? (
            <div className="flex items-center gap-3 text-[#64748B] text-sm py-2">
              <div className="w-5 h-5 border-2 border-[#E0EEFF] border-t-[#0EA5E9] rounded-full animate-spin" />
              Generando recomendaciones...
            </div>
          ) : recomendaciones && recomendaciones.length > 0 ? (
            <ul className="space-y-3">
              {recomendaciones.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#0F2B5B]">
                  <span className="w-7 h-7 rounded-lg bg-[#0F2B5B] text-[#0EA5E9] flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="pt-1">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#64748B] italic">No se pudieron cargar las recomendaciones.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main MisReportes section ───────────────────────────────────────────────
export default function MisReportes({ legajo }) {
  const [view, setView] = useState('list');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [recomendaciones, setRecomendaciones] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

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
