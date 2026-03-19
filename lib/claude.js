import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `Sos el sistema de gestión de incidentes de Humand. Recibís la transcripción de un audio donde un operario reporta un incidente. Tu tarea es extraer y estructurar la información.

Instrucciones para la extracción:
- Extraé únicamente lo que el operario menciona explícitamente. No inventes datos.
- Si un campo no se menciona en el audio, usá null como valor.
- Para fecha_hora_incidente, resolvé la expresión relativa del operario a una fecha calendario real usando la fecha y hora actual que se indica al final del prompt. Ejemplos: "hoy" → "19/03/2026", "ayer a las 3 de la tarde" → "18/03/2026 15:00", "hace 3 días" → "16/03/2026", "esta mañana" → "19/03/2026 (mañana)", "el martes pasado" → la fecha exacta del martes anterior. Si el operario da una fecha absoluta ("el 15 de marzo"), conservála tal cual. Si no menciona fecha, usá null. El formato de salida siempre debe ser dd/mm/yyyy con hora si se menciona.
- Para urgencia, inferila según la gravedad del incidente descripto, aunque el operario no la mencione.
- Para responsable_sugerido y acciones_recomendadas, usá criterio propio basado en el tipo de incidente.

Criterios para tipo de incidente:
- Seguridad: riesgo para la integridad física (derrames, caídas, elementos peligrosos, falta de EPP).
- Accidente: daño ya ocurrido a una persona (golpe, corte, caída con lesión).
- Infraestructura: falla en instalaciones o servicios (techos, pisos, electricidad, agua).
- Higiene: condiciones insalubres, contaminación, plagas.
- Ambiental: derrame o emisión con impacto en el medioambiente.
- Otro: cualquier situación que no encaje en las categorías anteriores.

Criterios para inferir urgencia:
- Alta: riesgo inmediato para la integridad física de personas, incendio, accidente activo, sustancias peligrosas. Intervención en menos de 1 hora.
- Media: riesgo potencial, equipamiento dañado, impacto operacional sin riesgo inmediato. Atención en menos de 24 horas.
- Baja: situación controlada, sin riesgo inmediato, seguimiento no urgente. Atención en menos de 72 horas.

Respondé ÚNICAMENTE con un JSON válido. Sin explicaciones, sin markdown, sin texto adicional. El JSON debe tener exactamente esta estructura:
{
  "nombre_reportante": "nombre completo de quien reporta, o null",
  "fecha_hora_incidente": "expresión textual mencionada por el operario, o null",
  "tipo": "uno de: Seguridad | Accidente | Infraestructura | Higiene | Ambiental | Otro",
  "area": "área o sector organizacional mencionado, o null",
  "ubicacion": "ubicación física del incidente, o null",
  "descripcion_corta": "máximo 10 palabras resumiendo el incidente",
  "descripcion_formal": "2 a 3 oraciones en tono formal para el reporte oficial",
  "personas_afectadas": ["persona 1", "persona 2"],
  "testigos": ["testigo 1", "testigo 2"],
  "sistemas_involucrados": ["sistema o herramienta 1", "sistema o herramienta 2"],
  "requiere_atencion_medica": "uno de: sí | no | ya fue atendido",
  "acciones_ya_tomadas": ["acción que el operario menciona haber tomado"],
  "urgencia": "uno de: Alta | Media | Baja",
  "responsable_sugerido": "área responsable: Seguridad e Higiene | Mantenimiento | RRHH | Facilities | Otro",
  "acciones_recomendadas": ["acción recomendada 1", "acción recomendada 2", "acción recomendada 3"]
}`;

function parseJSON(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(t);
}

export async function classify(transcription) {
  // Validate transcription before sending to Gemini
  if (!transcription || typeof transcription !== 'string' || transcription.trim().length < 5) {
    console.error('[Gemini Classification] Transcripción inválida o muy corta:', transcription);
    throw new Error('La transcripción del audio es muy corta o inválida');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const now = new Date();
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fechaContexto = `\n\n[CONTEXTO DE FECHA Y HORA ACTUAL: ${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} hs (Argentina, GMT-3)]`;

    const result = await model.generateContent(transcription + fechaContexto);
    const responseText = result.response.text();

    try {
      return parseJSON(responseText);
    } catch (parseErr) {
      console.error('[Gemini Classification] Error parseando respuesta JSON:', responseText.substring(0, 100));
      throw new Error('La respuesta del modelo no es un JSON válido');
    }
  } catch (err) {
    console.error('[Gemini Classification] Error clasificando reporte:', err.message);
    throw new Error('No se pudo procesar el reporte');
  }
}

export async function recommend(tipo, descripcionFormal) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Sos el sistema de gestión de incidentes de Humand. Un operario reportó el siguiente incidente:

Tipo: ${tipo}
Descripción: ${descripcionFormal}

Generá 2 o 3 recomendaciones cortas y concretas para el operario sobre qué hacer mientras el equipo resuelve el incidente. Hablale de forma directa y amigable, en segunda persona. No repitas información del reporte.

Respondé ÚNICAMENTE con un array JSON de strings. Sin explicaciones ni markdown.
["recomendación 1", "recomendación 2", "recomendación 3"]`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
  } catch (err) {
    console.error('[Gemini Recommend] Error generando recomendaciones:', err.message);
    throw new Error('No se pudieron generar las recomendaciones');
  }
}

export async function update(currentReport, transcription) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Tenés el siguiente reporte de incidente ya clasificado:

${JSON.stringify(currentReport, null, 2)}

El usuario quiere corregir o agregar información con este mensaje:

"${transcription}"

Actualizá el JSON incorporando los cambios que el usuario menciona. Respetá todos los campos que ya tienen datos y sobreescribí solo lo que el usuario indica corregir o agregar. Si el usuario agrega un nombre a una lista existente, agregalo sin borrar los anteriores.

Respondé ÚNICAMENTE con el JSON completo actualizado, sin explicaciones ni markdown.`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
  } catch (err) {
    console.error('[Gemini Update] Error actualizando reporte:', err.message);
    throw new Error('No se pudo actualizar el reporte');
  }
}
