import { update } from '../lib/claude.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { report, transcripcion } = await readJsonBody(req);
    if (!report || !transcripcion) {
      return res.status(400).json({ error: 'Faltan campos: report y transcripcion' });
    }

    console.log('[Update] Actualizando reporte con corrección de voz...');
    const updated = await update(report, transcripcion);
    console.log('[Update] Reporte actualizado:', JSON.stringify(updated));

    return res.status(200).json(updated);
  } catch (err) {
    console.error('[Update] Error:', err.message);
    return res.status(500).json({ error: 'No se pudo actualizar el reporte' });
  }
}
