import Busboy from 'busboy';
import { transcribe } from '../lib/whisper.js';
import { classify } from '../lib/claude.js';
import { sendNotification } from '../lib/email.js';

export const config = {
  api: { bodyParser: false },
};

function parseMultipart(req) {
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
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('[API] Recibiendo audio...');
    const { audioBuffer, mimetype, fields } = await parseMultipart(req);
    const { communityId, userId } = fields;
    console.log(`[API] Audio: ${audioBuffer.length} bytes | community: ${communityId} | user: ${userId}`);

    console.log('[API] Transcribiendo con Gemini...');
    const transcription = await transcribe(audioBuffer, mimetype);
    console.log('[API] Transcripción:', transcription);

    console.log('[API] Clasificando con Gemini...');
    const report = await classify(transcription);
    report.communityId = communityId;
    report.userId = userId;
    console.log('[API] Reporte generado:', JSON.stringify(report));

    console.log('[API] Enviando notificación...');
    await sendNotification(report);

    return res.status(200).json(report);
  } catch (err) {
    console.error('[API] Error:', err.message);

    if (err.message.includes('transcribir')) {
      return res.status(500).json({ error: 'No se pudo transcribir el audio' });
    }
    if (err.message.includes('procesar') || err.message.includes('JSON')) {
      return res.status(500).json({ error: 'No se pudo procesar el reporte' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
