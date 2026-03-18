import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/reportes.json');

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

export function readReportes() {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function appendReporte(reporte) {
  const reportes = readReportes();
  // Initialize historial_estados if not present
  if (!reporte.historial_estados) {
    reporte.historial_estados = [{
      estado: reporte.estado || 'Enviado',
      fecha: reporte.fecha_generacion_reporte || new Date().toISOString(),
    }];
  }
  reportes.push(reporte);
  fs.writeFileSync(DATA_FILE, JSON.stringify(reportes, null, 2), 'utf8');
}

export function updateReporteEstado(id, estado) {
  const reportes = readReportes();
  const idx = reportes.findIndex(r => r.id === id);
  if (idx === -1) return null;
  reportes[idx].estado = estado;
  // Append to historial_estados
  if (!reportes[idx].historial_estados) reportes[idx].historial_estados = [];
  reportes[idx].historial_estados.push({ estado, fecha: new Date().toISOString() });
  fs.writeFileSync(DATA_FILE, JSON.stringify(reportes, null, 2), 'utf8');
  return reportes[idx];
}

export function buscarReportes(query) {
  const reportes = readReportes();
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

export function buscarPorLegajo(legajo) {
  const reportes = readReportes();
  return reportes
    .filter(r => String(r.legajo) === String(legajo))
    .sort((a, b) => new Date(b.fecha_generacion_reporte) - new Date(a.fecha_generacion_reporte));
}
