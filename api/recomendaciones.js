import { recommend } from '../lib/claude.js';

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
    const { tipo, descripcion_formal } = await readJsonBody(req);
    if (!tipo || !descripcion_formal) {
      return res.status(400).json({ error: 'Faltan campos: tipo y descripcion_formal' });
    }
    console.log(`[recomendaciones] Generando para tipo="${tipo}"`);
    const recomendaciones = await recommend(tipo, descripcion_formal);
    return res.status(200).json({ recomendaciones });
  } catch (err) {
    console.error('[recomendaciones] Error:', err.message);
    return res.status(500).json({ error: 'No se pudieron generar las recomendaciones' });
  }
}
