import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

// ── Helpers ────────────────────────────────────────────────────────────────
function parseMultipart(req) {
  return import('busboy').then(({ default: Busboy }) => {
    return new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });
      let audioBuffer = null;
      let mimetype = null;
      const fields = {};

      busboy.on('file', (fieldname, file, info) => {
        if (fieldname === 'audio') {
          mimetype = info.mimeType;
          const chunks = [];
          file.on('data', (chunk) => chunks.push(chunk));
          file.on('end', () => { audioBuffer = Buffer.concat(chunks); });
        } else {
          file.resume();
        }
      });
      busboy.on('field', (name, value) => { fields[name] = value; });
      busboy.on('finish', () => {
        if (!audioBuffer) reject(new Error('No se recibió archivo de audio'));
        else resolve({ audioBuffer, mimetype, fields });
      });
      busboy.on('error', reject);
      req.pipe(busboy);
    });
  });
}

function readJsonBody(req) {
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

function jsonRes(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

function cors(res, methods = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── API middleware plugin ──────────────────────────────────────────────────
function apiMiddleware() {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';

        if (!url.startsWith('/api/')) return next();
        if (req.method === 'OPTIONS') { cors(res, 'GET, POST, PATCH, OPTIONS'); res.statusCode = 200; return res.end(); }

        // ── POST /api/report ──────────────────────────────────────────────
        if (url === '/api/report' && req.method === 'POST') {
          cors(res);
          try {
            const { transcribe } = await import('./lib/whisper.js');
            const { classify } = await import('./lib/claude.js');
            const { audioBuffer, mimetype, fields } = await parseMultipart(req);
            const { communityId, userId } = fields;
            console.log(`[API/report] Audio: ${audioBuffer.length}b | community: ${communityId} | user: ${userId}`);
            const transcription = await transcribe(audioBuffer, mimetype);
            console.log('[API/report] Transcripción:', transcription);
            const report = await classify(transcription);
            report.communityId = communityId;
            report.userId = userId;
            return jsonRes(res, 200, report);
          } catch (err) {
            console.error('[API/report] Error:', err.message);
            if (err.message.includes('transcribir')) return jsonRes(res, 500, { error: 'No se pudo transcribir el audio' });
            return jsonRes(res, 500, { error: 'No se pudo procesar el reporte' });
          }
        }

        // ── POST /api/transcribe ──────────────────────────────────────────
        if (url === '/api/transcribe' && req.method === 'POST') {
          cors(res);
          try {
            const { transcribe } = await import('./lib/whisper.js');
            const { audioBuffer, mimetype } = await parseMultipart(req);
            const transcripcion = await transcribe(audioBuffer, mimetype);
            console.log('[API/transcribe]', transcripcion);
            return jsonRes(res, 200, { transcripcion });
          } catch (err) {
            console.error('[API/transcribe] Error:', err.message);
            return jsonRes(res, 500, { error: 'No se pudo transcribir el audio' });
          }
        }

        // ── POST /api/update ──────────────────────────────────────────────
        if (url === '/api/update' && req.method === 'POST') {
          cors(res);
          try {
            const { update } = await import('./lib/claude.js');
            const { report, transcripcion } = await readJsonBody(req);
            if (!report || !transcripcion) return jsonRes(res, 400, { error: 'Faltan campos' });
            const updated = await update(report, transcripcion);
            return jsonRes(res, 200, updated);
          } catch (err) {
            console.error('[API/update] Error:', err.message);
            return jsonRes(res, 500, { error: 'No se pudo actualizar el reporte' });
          }
        }

        // ── POST /api/submit ──────────────────────────────────────────────
        if (url === '/api/submit' && req.method === 'POST') {
          cors(res);
          try {
            const { sendNotification } = await import('./lib/email.js');
            const { appendReporte } = await import('./lib/storage.js');
            const report = await readJsonBody(req);

            const now = new Date();
            const date = now.toISOString().slice(0, 10).replace(/-/g, '');
            const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');

            const finalReport = {
              ...report,
              id: `INC-${date}-${rand}`,
              fecha_generacion_reporte: now.toISOString(),
              canal: 'Hu Now — Voz',
              estado: 'Enviado',
            };

            console.log('[API/submit] Guardando:', finalReport.id);
            appendReporte(finalReport);
            await sendNotification(finalReport);
            return jsonRes(res, 200, finalReport);
          } catch (err) {
            console.error('[API/submit] Error:', err.message);
            return jsonRes(res, 500, { error: 'No se pudo enviar el reporte' });
          }
        }

        // ── GET /api/reportes ─────────────────────────────────────────────
        if (url === '/api/reportes' && req.method === 'GET') {
          cors(res, 'GET, OPTIONS');
          try {
            const { readReportes } = await import('./lib/storage.js');
            const reportes = readReportes();
            const ordenados = [...reportes].sort(
              (a, b) => new Date(b.fecha_generacion_reporte) - new Date(a.fecha_generacion_reporte)
            );
            return jsonRes(res, 200, ordenados);
          } catch (err) {
            console.error('[API/reportes GET] Error:', err.message);
            return jsonRes(res, 500, { error: 'No se pudieron obtener los reportes' });
          }
        }

        // ── GET /api/mis-reportes?legajo= ─────────────────────────────────
        if (req.url?.startsWith('/api/mis-reportes') && req.method === 'GET') {
          cors(res, 'GET, OPTIONS');
          try {
            const { buscarPorLegajo, buscarReportes } = await import('./lib/storage.js');
            const rawUrl = new URL(req.url, 'http://localhost');
            const legajo = rawUrl.searchParams.get('legajo') || '';
            const q = rawUrl.searchParams.get('q') || '';
            const resultados = legajo ? buscarPorLegajo(legajo) : buscarReportes(q);
            console.log(`[API/mis-reportes] legajo="${legajo}" q="${q}" → ${resultados.length} resultados`);
            return jsonRes(res, 200, resultados);
          } catch (err) {
            console.error('[API/mis-reportes] Error:', err.message);
            return jsonRes(res, 500, { error: 'Error al buscar reportes' });
          }
        }

        // ── POST /api/recomendaciones ─────────────────────────────────────
        if (url === '/api/recomendaciones' && req.method === 'POST') {
          cors(res);
          try {
            const { recommend } = await import('./lib/claude.js');
            const { tipo, descripcion_formal } = await readJsonBody(req);
            if (!tipo || !descripcion_formal) return jsonRes(res, 400, { error: 'Faltan campos' });
            const recomendaciones = await recommend(tipo, descripcion_formal);
            console.log(`[API/recomendaciones] tipo="${tipo}"`);
            return jsonRes(res, 200, { recomendaciones });
          } catch (err) {
            console.error('[API/recomendaciones] Error:', err.message);
            return jsonRes(res, 500, { error: 'No se pudieron generar las recomendaciones' });
          }
        }

        // ── PATCH /api/reportes/:id ───────────────────────────────────────
        const patchMatch = url.match(/^\/api\/reportes\/([^/]+)$/);
        if (patchMatch && req.method === 'PATCH') {
          cors(res, 'PATCH, OPTIONS');
          const ESTADOS_VALIDOS = ['Enviado', 'En revisión', 'En proceso', 'Resuelto', 'Cerrado'];
          try {
            const { updateReporteEstado } = await import('./lib/storage.js');
            const id = decodeURIComponent(patchMatch[1]);
            const { estado } = await readJsonBody(req);
            if (!ESTADOS_VALIDOS.includes(estado)) {
              return jsonRes(res, 400, { error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}` });
            }
            const updated = updateReporteEstado(id, estado);
            if (!updated) return jsonRes(res, 404, { error: 'Reporte no encontrado' });
            console.log(`[API/reportes PATCH] ${id} → ${estado}`);
            return jsonRes(res, 200, updated);
          } catch (err) {
            console.error('[API/reportes PATCH] Error:', err.message);
            return jsonRes(res, 500, { error: 'No se pudo actualizar el reporte' });
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiMiddleware()],
  server: { port: 5173 },
});
