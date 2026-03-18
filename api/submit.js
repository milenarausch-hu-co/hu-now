import { sendNotification } from '../lib/email.js';
import { appendReporte } from '../lib/storage.js';

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

function generateId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `INC-${date}-${rand}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const report = await readJsonBody(req);

    const finalReport = {
      ...report,
      id: generateId(),
      fecha_generacion_reporte: new Date().toISOString(),
      canal: 'Hu Now — Voz',
      estado: 'Enviado',
    };

    console.log('[Submit] Guardando reporte:', finalReport.id);
    appendReporte(finalReport);
    await sendNotification(finalReport);

    return res.status(200).json(finalReport);
  } catch (err) {
    console.error('[Submit] Error:', err.message);
    return res.status(500).json({ error: 'No se pudo enviar el reporte' });
  }
}
