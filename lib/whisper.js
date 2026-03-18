import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function transcribe(audioBuffer, mimetype) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const audioBase64 = audioBuffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimetype || 'audio/webm',
          data: audioBase64,
        },
      },
      'Transcribí este audio en español. Devolvé ÚNICAMENTE la transcripción textual, sin explicaciones ni comentarios adicionales.',
    ]);

    const text = result.response.text().trim();
    if (!text) throw new Error('Transcripción vacía');

    return text;
  } catch (err) {
    console.error('[Gemini Transcription] Error transcribiendo audio:', err.message);
    throw new Error('No se pudo transcribir el audio');
  }
}
