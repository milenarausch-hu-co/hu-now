import { readReportes } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const reportes = await readReportes();
    
    // Ensure reportes is always an array
    if (!Array.isArray(reportes)) {
      console.error('[API/reportes GET] reportes no es un array:', typeof reportes);
      return res.status(200).json([]);
    }
    
    const ordenados = reportes.sort(
      (a, b) => new Date(b.fecha_generacion_reporte) - new Date(a.fecha_generacion_reporte)
    );
    return res.status(200).json(ordenados);
  } catch (err) {
    console.error('[API/reportes GET] Error:', err.message);
    return res.status(500).json({ error: 'No se pudieron obtener los reportes' });
  }
}
