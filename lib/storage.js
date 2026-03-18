import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const IS_VERCEL = !!process.env.VERCEL;
const KV_KEY = 'reportes';

// --- KV helpers (production) ---
async function kvGet() {
  const { kv } = await import('@vercel/kv');
  const data = await kv.get(KV_KEY);
  return Array.isArray(data) ? data : [];
}

async function kvSet(reportes) {
  const { kv } = await import('@vercel/kv');
  await kv.set(KV_KEY, reportes);
}

// --- File helpers (local dev) ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/reportes.json');

function fileGet() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function fileSet(reportes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(reportes, null, 2), 'utf8');
}

// --- Public API (always async) ---

export async function readReportes() {
  if (IS_VERCEL) return kvGet();
  return fileGet();
}

export async function appendReporte(reporte) {
  const reportes = await readReportes();
  if (!reporte.historial_estados) {
    reporte.historial_estados = [{
      estado: reporte.estado || 'Enviado',
      fecha: reporte.fecha_generacion_reporte || new Date().toISOString(),
    }];
  }
  reportes.push(reporte);
  if (IS_VERCEL) await kvSet(reportes);
  else fileSet(reportes);
}

export async function updateReporteEstado(id, estado) {
  const reportes = await readReportes();
  const idx = reportes.findIndex(r => r.id === id);
  if (idx === -1) return null;
  reportes[idx].estado = estado;
  if (!reportes[idx].historial_estados) reportes[idx].historial_estados = [];
  reportes[idx].historial_estados.push({ estado, fecha: new Date().toISOString() });
  if (IS_VERCEL) await kvSet(reportes);
  else fileSet(reportes);
  return reportes[idx];
}

export async function buscarReportes(query) {
  const reportes = await readReportes();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return reportes
    .filter(r => {
      const nombre = (r.nombre_reportante || '').toLowerCase();
      const id = (r.id || '').toLowerCase();
      return nombre.includes(q) || id === q;
    })
    .sort((a, b) => new Date(b.fecha_generacion_reporte) - new Date(a.fecha_generacion_reporte));
}

export async function buscarPorLegajo(legajo) {
  const reportes = await readReportes();
  return reportes
    .filter(r => String(r.legajo) === String(legajo))
    .sort((a, b) => new Date(b.fecha_generacion_reporte) - new Date(a.fecha_generacion_reporte));
}
