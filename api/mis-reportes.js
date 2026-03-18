import { buscarReportes } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const q = req.query?.q ?? '';
    const resultados = buscarReportes(q);
    console.log(`[mis-reportes] q="${q}" → ${resultados.length} resultados`);
    return res.status(200).json(resultados);
  } catch (err) {
    console.error('[mis-reportes] Error:', err.message);
    return res.status(500).json({ error: 'Error al buscar reportes' });
  }
}
