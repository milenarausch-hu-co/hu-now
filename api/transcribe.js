import Busboy from 'busboy';
import { transcribe } from '../lib/whisper.js';

export const config = { api: { bodyParser: false } };

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let audioBuffer = null;
    let mimetype = null;

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

    busboy.on('finish', () => {
      if (!audioBuffer) reject(new Error('No se recibió archivo de audio'));
      else resolve({ audioBuffer, mimetype });
    });

    busboy.on('error', reject);
    req.pipe(busboy);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { audioBuffer, mimetype } = await parseMultipart(req);
    console.log(`[Transcribe] Audio recibido: ${audioBuffer.length} bytes`);
    const transcripcion = await transcribe(audioBuffer, mimetype);
    console.log('[Transcribe] Resultado:', transcripcion);
    return res.status(200).json({ transcripcion });
  } catch (err) {
    console.error('[Transcribe] Error:', err.message);
    return res.status(500).json({ error: 'No se pudo transcribir el audio' });
  }
}
