import { buscarReportes, buscarPorLegajo } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const legajo = req.query?.legajo ?? '';
    const q = req.query?.q ?? '';
    let resultados;
    if (legajo) {
      resultados = await buscarPorLegajo(legajo);
    } else {
      resultados = await buscarReportes(q);
    }
    console.log(`[mis-reportes] legajo="${legajo}" q="${q}" → ${resultados.length} resultados`);
    return res.status(200).json(resultados);
  } catch (err) {
    console.error('[mis-reportes] Error:', err.message);
    return res.status(500).json({ error: 'Error al buscar reportes' });
  }
}
