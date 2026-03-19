import { useState, useEffect, useMemo } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────
const ESTADOS_VALIDOS = ['Enviado', 'En revisión', 'En proceso', 'Resuelto', 'Cerrado'];

const URGENCIA_COLORS = {
  Alta:  { badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  Media: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  Baja:  { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

const ESTADO_COLORS = {
  'Enviado':     'bg-primary-100 text-primary-700',
  'En revisión': 'bg-cyan-100 text-cyan-700',
  'En proceso':  'bg-amber-100 text-amber-700',
  'Resuelto':    'bg-green-100 text-green-700',
  'Cerrado':     'bg-gray-100 text-gray-500',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function arrayToText(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val.length ? val.join(', ') : null;
  return String(val);
}

// ── Badge components ───────────────────────────────────────────────────────
function UrgencyBadge({ urgencia }) {
  const c = URGENCIA_COLORS[urgencia];
  if (!c) return <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">{urgencia ?? '—'}</span>;
  return <span className={`${c.badge} text-xs font-semibold px-2.5 py-1 rounded-full`}>{urgencia}</span>;
}

function EstadoBadge({ estado }) {
  const cls = ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-500';
  return <span className={`${cls} text-xs font-semibold px-2.5 py-1 rounded-full`}>{estado ?? '—'}</span>;
}

// ── Field row for detail panel ─────────────────────────────────────────────
function DetailField({ label, value }) {
  if (!value && value !== 0) return null;
  const text = arrayToText(value);
  if (!text) return null;
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// ── Detail sidebar ─────────────────────────────────────────────────────────
function DetailPanel({ reporte, onClose, onEstadoChange }) {
  const [updating, setUpdating] = useState(false);

  const handleEstado = async (e) => {
    const nuevoEstado = e.target.value;
    setUpdating(true);
    await onEstadoChange(reporte.id, nuevoEstado);
    setUpdating(false);
  };

  const fechaGeneracion = fmtDate(reporte.fecha_generacion_reporte);

  return (
    <aside className="w-full lg:w-[420px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div>
          <p className="font-mono text-sm font-bold text-gray-900">{reporte.id}</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(reporte.fecha_generacion_reporte)}</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">

        {/* Humand notification banner */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2.5 mb-4 flex items-start gap-2">
          <span className="text-primary-500 text-base leading-none mt-0.5">*</span>
          <p className="text-xs text-primary-700">
            <span className="font-semibold">Notificación enviada a Humand</span>
            {fechaGeneracion && <> · {fechaGeneracion}</>}
          </p>
        </div>

        {/* Estado selector */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Estado del reporte</p>
          <div className="flex items-center gap-3">
            <select
              value={reporte.estado ?? 'Enviado'}
              onChange={handleEstado}
              disabled={updating}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
            >
              {ESTADOS_VALIDOS.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            {updating && <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-100 mb-1">
          <span className="bg-gradient-to-r from-primary-500 to-cyan-500 text-white text-xs font-semibold px-3 py-1 rounded-full">{reporte.tipo}</span>
          <UrgencyBadge urgencia={reporte.urgencia} />
          <EstadoBadge estado={reporte.estado} />
        </div>

        {/* All fields */}
        <DetailField label="Legajo"                      value={reporte.legajo} />
        <DetailField label="Nombre del reportante"     value={reporte.nombre_reportante} />
        <DetailField label="Fecha y hora del incidente" value={reporte.fecha_hora_incidente} />
        <DetailField label="Área / Sector de trabajo"  value={reporte.area} />
        <DetailField label="Ubicación exacta"          value={reporte.ubicacion} />
        <DetailField label="Descripción breve"         value={reporte.descripcion_corta} />
        <DetailField label="Descripción formal"        value={reporte.descripcion_formal} />
        <DetailField label="Personas afectadas"        value={reporte.personas_afectadas} />
        <DetailField label="Testigos"                  value={reporte.testigos} />
        <DetailField label="Sistemas involucrados"     value={reporte.sistemas_involucrados} />
        <DetailField label="¿Requiere atención médica?" value={reporte.requiere_atencion_medica} />
        <DetailField label="Acciones ya tomadas"       value={reporte.acciones_ya_tomadas} />
        <DetailField label="Responsable sugerido"      value={reporte.responsable_sugerido} />
        <DetailField label="Acciones recomendadas"     value={reporte.acciones_recomendadas} />
        <DetailField label="Canal"                     value={reporte.canal} />
        <DetailField label="Fecha de generación"       value={fechaGeneracion} />
      </div>
    </aside>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────
function FilterBar({ filtros, onChange, tiposDisponibles }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Filtrar:</span>

      {/* Estado */}
      <select
        value={filtros.estado}
        onChange={e => onChange('estado', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="Todos">Estado: Todos</option>
        {ESTADOS_VALIDOS.map(e => <option key={e} value={e}>{e}</option>)}
      </select>

      {/* Urgencia */}
      <select
        value={filtros.urgencia}
        onChange={e => onChange('urgencia', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="Todos">Urgencia: Todos</option>
        {['Alta', 'Media', 'Baja'].map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      {/* Tipo */}
      <select
        value={filtros.tipo}
        onChange={e => onChange('tipo', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="Todos">Tipo: Todos</option>
        {tiposDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Legajo */}
      <input
        type="text"
        value={filtros.legajo}
        onChange={e => onChange('legajo', e.target.value)}
        placeholder="Filtrar por legajo"
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
      />

      {/* Clear */}
      {(filtros.estado !== 'Todos' || filtros.urgencia !== 'Todos' || filtros.tipo !== 'Todos' || filtros.legajo.trim()) && (
        <button
          onClick={() => { onChange('estado', 'Todos'); onChange('urgencia', 'Todos'); onChange('tipo', 'Todos'); onChange('legajo', ''); }}
          className="text-xs text-gray-400 hover:text-gray-600 underline transition"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

// ── Report row ─────────────────────────────────────────────────────────────
function ReporteRow({ reporte, isSelected, onClick }) {
  const dot = URGENCIA_COLORS[reporte.urgencia]?.dot ?? 'bg-gray-300';
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-4 px-6 py-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-primary-50/50 ${isSelected ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'}`}
    >
      {/* Urgency dot */}
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-mono text-xs text-gray-500">{reporte.id}</span>
          {reporte.legajo && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">Leg. {reporte.legajo}</span>}
          <UrgencyBadge urgencia={reporte.urgencia} />
          <EstadoBadge estado={reporte.estado} />
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{reporte.descripcion_corta ?? '—'}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {reporte.area && <span>{reporte.area}</span>}
          {reporte.area && <span>·</span>}
          <span>{fmtDate(reporte.fecha_generacion_reporte)}</span>
        </div>
      </div>

      {/* Ver detalle */}
      <button className="flex-shrink-0 text-xs font-medium text-primary-500 hover:text-primary-700 transition mt-1">
        Ver detalle
      </button>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">📋</div>
      <p className="text-gray-700 font-semibold">
        {filtered ? 'Sin resultados para estos filtros' : 'Aún no hay reportes'}
      </p>
      <p className="text-sm text-gray-400 max-w-xs">
        {filtered
          ? 'Probá cambiando los filtros para ver más reportes.'
          : 'Los reportes enviados desde la app aparecerán acá.'}
      </p>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filtros, setFiltros] = useState({ estado: 'Todos', urgencia: 'Todos', tipo: 'Todos', legajo: '' });

  useEffect(() => { fetchReportes(); }, []);

  const fetchReportes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reportes');
      const data = await res.json();
      setReportes(Array.isArray(data) ? data : []);
    } catch {
      setReportes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltro = (key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const handleEstadoChange = async (id, nuevoEstado) => {
    await fetch(`/api/reportes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    setReportes(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
    setSelected(prev => prev?.id === id ? { ...prev, estado: nuevoEstado } : prev);
  };

  const tiposDisponibles = useMemo(
    () => [...new Set(reportes.map(r => r.tipo).filter(Boolean))].sort(),
    [reportes]
  );

  const filtrados = useMemo(() => reportes.filter(r => {
    if (filtros.estado !== 'Todos' && r.estado !== filtros.estado) return false;
    if (filtros.urgencia !== 'Todos' && r.urgencia !== filtros.urgencia) return false;
    if (filtros.tipo !== 'Todos' && r.tipo !== filtros.tipo) return false;
    if (filtros.legajo.trim() && String(r.legajo ?? '') !== filtros.legajo.trim()) return false;
    return true;
  }), [reportes, filtros]);

  const activos = useMemo(() => reportes.filter(r => r.estado !== 'Cerrado').length, [reportes]);
  const isFiltering = filtros.estado !== 'Todos' || filtros.urgencia !== 'Todos' || filtros.tipo !== 'Todos' || filtros.legajo.trim() !== '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded">AI</span>
            <div>
              <h1 className="text-base font-bold leading-none">HU NOW</h1>
              <p className="text-primary-100 text-xs mt-0.5">Panel de gestión</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {loading
              ? <p className="text-primary-100 text-sm">Cargando...</p>
              : <p className="text-white font-semibold text-sm">{activos} reporte{activos !== 1 ? 's' : ''} activo{activos !== 1 ? 's' : ''}</p>
            }
          </div>
          <button
            onClick={fetchReportes}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition"
            title="Actualizar"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>

        {/* Left panel — list */}
        <div className={`flex flex-col flex-1 overflow-hidden bg-white border-r border-gray-200 ${selected ? 'hidden lg:flex' : 'flex'}`}>
          <FilterBar filtros={filtros} onChange={handleFiltro} tiposDisponibles={tiposDisponibles} />

          {/* Counter */}
          <div className="px-6 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              {loading ? 'Cargando reportes...' : `${filtrados.length} reporte${filtrados.length !== 1 ? 's' : ''}${isFiltering ? ' con los filtros aplicados' : ''}`}
            </p>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-20 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
                Cargando reportes...
              </div>
            ) : filtrados.length === 0 ? (
              <EmptyState filtered={isFiltering} />
            ) : (
              filtrados.map(r => (
                <ReporteRow
                  key={r.id}
                  reporte={r}
                  isSelected={selected?.id === r.id}
                  onClick={() => setSelected(r)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        {selected && (
          <DetailPanel
            reporte={selected}
            onClose={() => setSelected(null)}
            onEstadoChange={handleEstadoChange}
          />
        )}

        {/* No selection placeholder (desktop only) */}
        {!selected && (
          <div className="hidden lg:flex w-[420px] flex-shrink-0 items-center justify-center bg-gray-50 border-l border-gray-200">
            <div className="text-center px-8">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl mx-auto mb-3">👈</div>
              <p className="text-sm text-gray-500">Seleccioná un reporte para ver el detalle</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
