import { updateReporteEstado } from '../../lib/storage.js';

const ESTADOS_VALIDOS = ['Enviado', 'En revisión', 'En proceso', 'Resuelto', 'Cerrado'];

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { id } = req.query;
    const { estado } = await readJsonBody(req);

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}` });
    }

    const updated = await updateReporteEstado(id, estado);
    if (!updated) return res.status(404).json({ error: 'Reporte no encontrado' });

    console.log(`[Reportes PATCH] ${id} → ${estado}`);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('[Reportes PATCH] Error:', err.message);
    return res.status(500).json({ error: 'No se pudo actualizar el reporte' });
  }
}
