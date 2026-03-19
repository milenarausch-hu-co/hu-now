import { useState, useEffect, useMemo } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────
const ESTADOS_VALIDOS = ['Enviado', 'En revisión', 'En proceso', 'Resuelto', 'Cerrado'];

const URGENCIA_COLORS = {
  Alta:  { badge: 'bg-red-500 text-white',    dot: 'bg-red-500' },
  Media: { badge: 'bg-amber-500 text-white', dot: 'bg-amber-500' },
  Baja:  { badge: 'bg-green-500 text-white', dot: 'bg-green-500' },
};

const ESTADO_COLORS = {
  'Enviado':     'bg-[#0F2B5B] text-white',
  'En revisión': 'bg-[#1E3A8A] text-white',
  'En proceso':  'bg-amber-500 text-white',
  'Resuelto':    'bg-green-500 text-white',
  'Cerrado':     'bg-[#64748B] text-white',
};

// ── Logo Component - Official logo image ───────────────────────────────────
const LOGO_URL = 'https://raw.githubusercontent.com/milenarausch-hu-co/hu-now/main/public/logo-hunow3.png';

function HuNowLogo() {
  return (
    <div className="flex items-center gap-3">
      <img 
        src={LOGO_URL} 
        alt="HU NOW" 
        className="max-w-[100px] h-auto"
      />
      <span className="text-xs font-medium text-[#64748B] border-l border-[#E0EEFF] pl-3">Panel de gestión</span>
    </div>
  );
}

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
  if (!c) return <span className="bg-[#64748B] text-white text-xs font-bold px-3 py-1.5 rounded-full">{urgencia ?? '—'}</span>;
  return <span className={`${c.badge} text-xs font-bold px-3 py-1.5 rounded-full`}>{urgencia}</span>;
}

function EstadoBadge({ estado }) {
  const cls = ESTADO_COLORS[estado] ?? 'bg-[#64748B] text-white';
  return <span className={`${cls} text-xs font-bold px-3 py-1.5 rounded-full`}>{estado ?? '—'}</span>;
}

// ── Field row for detail panel ─────────────────────────────────────────────
function DetailField({ label, value }) {
  if (!value && value !== 0) return null;
  const text = arrayToText(value);
  if (!text) return null;
  return (
    <div className="py-3 border-b border-[#E0EEFF] last:border-0">
      <p className="text-xs text-[#64748B] uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className="text-sm text-[#0F2B5B] whitespace-pre-wrap font-medium">{text}</p>
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
    <aside className="w-full lg:w-[480px] flex-shrink-0 bg-white border-l border-[#E0EEFF] flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0EEFF] bg-[#F0F6FF]">
        <div>
          <p className="font-mono text-lg font-black text-[#0F2B5B]">{reporte.id}</p>
          <p className="text-xs text-[#64748B] mt-0.5">{fmtDate(reporte.fecha_generacion_reporte)}</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#E0EEFF] hover:bg-[#F0F6FF] text-[#64748B] hover:text-[#0F2B5B] transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Notification banner */}
        <div className="bg-[#0F2B5B] rounded-xl px-4 py-4 flex items-center gap-3 border-l-4 border-[#0EA5E9]">
          <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Notificación enviada a Humand</p>
            {fechaGeneracion && <p className="text-xs text-[#7DD3FC]">{fechaGeneracion}</p>}
          </div>
        </div>

        {/* Estado selector */}
        <div className="bg-[#F0F6FF] rounded-xl px-4 py-4 border border-[#E0EEFF]">
          <p className="text-xs text-[#64748B] font-bold mb-3 uppercase tracking-wider">Estado del reporte</p>
          <div className="flex items-center gap-3">
            <select
              value={reporte.estado ?? 'Enviado'}
              onChange={handleEstado}
              disabled={updating}
              className="flex-1 text-sm border-2 border-[#E0EEFF] rounded-xl px-4 py-3 bg-white font-semibold text-[#0F2B5B] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] disabled:opacity-60"
            >
              {ESTADOS_VALIDOS.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            {updating && <div className="w-5 h-5 border-2 border-[#E0EEFF] border-t-[#0EA5E9] rounded-full animate-spin" />}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-[#E0EEFF]">
          <span className="bg-[#0F2B5B] text-white text-sm font-bold px-4 py-2 rounded-full">{reporte.tipo}</span>
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
    <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-[#E0EEFF] bg-white">
      <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider mr-2">Filtrar:</span>

      {/* Estado */}
      <select
        value={filtros.estado}
        onChange={e => onChange('estado', e.target.value)}
        className="text-sm border-2 border-[#E0EEFF] rounded-lg px-3 py-2 bg-white font-semibold text-[#0F2B5B] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9]"
      >
        <option value="Todos">Estado: Todos</option>
        {ESTADOS_VALIDOS.map(e => <option key={e} value={e}>{e}</option>)}
      </select>

      {/* Urgencia */}
      <select
        value={filtros.urgencia}
        onChange={e => onChange('urgencia', e.target.value)}
        className="text-sm border-2 border-[#E0EEFF] rounded-lg px-3 py-2 bg-white font-semibold text-[#0F2B5B] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9]"
      >
        <option value="Todos">Urgencia: Todos</option>
        {['Alta', 'Media', 'Baja'].map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      {/* Tipo */}
      <select
        value={filtros.tipo}
        onChange={e => onChange('tipo', e.target.value)}
        className="text-sm border-2 border-[#E0EEFF] rounded-lg px-3 py-2 bg-white font-semibold text-[#0F2B5B] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9]"
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
        className="text-sm border-2 border-[#E0EEFF] rounded-lg px-3 py-2 bg-white font-medium text-[#0F2B5B] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] w-40"
      />

      {/* Clear */}
      {(filtros.estado !== 'Todos' || filtros.urgencia !== 'Todos' || filtros.tipo !== 'Todos' || filtros.legajo.trim()) && (
        <button
          onClick={() => { onChange('estado', 'Todos'); onChange('urgencia', 'Todos'); onChange('tipo', 'Todos'); onChange('legajo', ''); }}
          className="text-sm text-[#0EA5E9] hover:text-[#0F2B5B] font-bold transition"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

// ── Report row ─────────────────────────────────────────────────────────────
function ReporteRow({ reporte, isSelected, onClick }) {
  const dot = URGENCIA_COLORS[reporte.urgencia]?.dot ?? 'bg-[#64748B]';
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-4 px-6 py-5 border-b border-[#E0EEFF] cursor-pointer transition-all hover:bg-[#F0F6FF] ${
        isSelected 
          ? 'bg-[#E0EEFF] border-l-4 border-l-[#0EA5E9]' 
          : 'border-l-4 border-l-transparent'
      }`}
    >
      {/* Urgency dot */}
      <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${dot}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono text-xs font-bold text-[#0F2B5B] bg-[#F0F6FF] px-2 py-1 rounded border border-[#E0EEFF]">{reporte.id}</span>
          {reporte.legajo && <span className="text-xs bg-[#E0EEFF] text-[#0F2B5B] px-2 py-1 rounded font-semibold">Leg. {reporte.legajo}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <UrgencyBadge urgencia={reporte.urgencia} />
          <EstadoBadge estado={reporte.estado} />
        </div>
        <p className="text-base font-semibold text-[#0F2B5B] truncate mb-1">{reporte.descripcion_corta ?? '—'}</p>
        <div className="flex items-center gap-3 text-sm text-[#64748B]">
          {reporte.area && <span className="font-medium">{reporte.area}</span>}
          {reporte.area && <span>|</span>}
          <span>{fmtDate(reporte.fecha_generacion_reporte)}</span>
        </div>
      </div>

      {/* Ver detalle */}
      <button className="flex-shrink-0 px-4 py-2 bg-[#0EA5E9] text-white text-sm font-bold rounded-full hover:bg-[#38BDF8] transition" style={{ boxShadow: '0 4px 14px rgba(14, 165, 233, 0.25)' }}>
        Ver detalle
      </button>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-[#F0F6FF] border border-[#E0EEFF] flex items-center justify-center">
        <svg className="w-10 h-10 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <p className="text-[#0F2B5B] font-bold text-lg">
        {filtered ? 'Sin resultados para estos filtros' : 'Aún no hay reportes'}
      </p>
      <p className="text-sm text-[#64748B] max-w-xs">
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
    <div className="min-h-screen bg-[#F0F6FF] flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-[#E0EEFF] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <HuNowLogo size="md" />
        <div className="flex items-center gap-4">
          <div className="text-right">
            {loading
              ? <p className="text-[#64748B] text-sm font-medium">Cargando...</p>
              : <p className="text-[#0F2B5B] font-bold text-base">{activos} reporte{activos !== 1 ? 's' : ''} activo{activos !== 1 ? 's' : ''}</p>
            }
          </div>
          <button
            onClick={fetchReportes}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0F2B5B] text-[#0EA5E9] hover:bg-[#1E3A8A] transition"
            title="Actualizar"
            style={{ boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>

        {/* Left panel — list */}
        <div className={`flex flex-col flex-1 overflow-hidden bg-white border-r border-[#E0EEFF] ${selected ? 'hidden lg:flex' : 'flex'}`}>
          <FilterBar filtros={filtros} onChange={handleFiltro} tiposDisponibles={tiposDisponibles} />

          {/* Counter */}
          <div className="px-6 py-3 border-b border-[#E0EEFF] bg-[#F0F6FF]">
            <p className="text-sm text-[#64748B] font-semibold">
              {loading ? 'Cargando reportes...' : `${filtrados.length} reporte${filtrados.length !== 1 ? 's' : ''}${isFiltering ? ' con los filtros aplicados' : ''}`}
            </p>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-20 text-[#64748B] text-base">
                <div className="w-6 h-6 border-3 border-[#E0EEFF] border-t-[#0EA5E9] rounded-full animate-spin" />
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
          <div className="hidden lg:flex w-[480px] flex-shrink-0 items-center justify-center bg-[#F0F6FF] border-l border-[#E0EEFF]">
            <div className="text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E0EEFF] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </div>
              <p className="text-[#64748B] text-sm font-medium">Seleccioná un reporte de la lista para ver su detalle</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
