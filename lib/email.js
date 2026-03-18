import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function listItems(arr) {
  if (!arr || arr.length === 0) return '<em>No especificado</em>';
  return arr.map((item, i) => `<li>${i + 1}. ${item}</li>`).join('');
}

function val(v) {
  return v !== null && v !== undefined ? v : '<em>No especificado</em>';
}

export async function sendNotification(report) {
  const to = process.env.RESPONSIBLE_EMAIL;
  if (!to) {
    console.warn('[Email] RESPONSIBLE_EMAIL no configurada, omitiendo envío');
    return;
  }

  const urgencyColor = { Alta: '#dc2626', Media: '#f59e0b', Baja: '#16a34a' }[report.urgencia] || '#6b7280';

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 620px; margin: 0 auto;">
      <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">🎙️ Hu Now · Nuevo Incidente</h1>
        ${report.communityId ? `<p style="margin: 6px 0 0; opacity: 0.8; font-size: 13px;">Community: ${report.communityId} · Usuario: ${report.userId || '-'}</p>` : ''}
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
          ${report.legajo ? `<span style="background: #374151; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">Legajo ${report.legajo}</span>` : ''}
          <span style="background: #7c3aed; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">${report.tipo}</span>
          <span style="background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">Urgencia ${report.urgencia}</span>
          ${report.requiere_atencion_medica === 'sí' ? '<span style="background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">⚕ Requiere atención médica</span>' : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 40%;">Legajo</td><td style="padding: 6px 0; font-weight: 600;">${val(report.legajo)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; width: 40%;">Reportado por</td><td style="padding: 6px 0;">${val(report.nombre_reportante)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Fecha/hora</td><td style="padding: 6px 0;">${val(report.fecha_hora_incidente)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Área</td><td style="padding: 6px 0;">${val(report.area)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Ubicación</td><td style="padding: 6px 0;">${val(report.ubicacion)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Responsable sugerido</td><td style="padding: 6px 0;">${val(report.responsable_sugerido)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Atención médica</td><td style="padding: 6px 0;">${val(report.requiere_atencion_medica)}</td></tr>
        </table>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />

        <p style="margin: 0 0 4px; font-weight: 600;">Descripción</p>
        <p style="margin: 0 0 16px; color: #374151;">${val(report.descripcion_formal)}</p>

        ${report.personas_afectadas?.length ? `<p style="margin: 0 0 4px; font-weight: 600;">Personas afectadas</p><ul style="margin: 0 0 16px; padding-left: 16px;">${listItems(report.personas_afectadas)}</ul>` : ''}
        ${report.testigos?.length ? `<p style="margin: 0 0 4px; font-weight: 600;">Testigos</p><ul style="margin: 0 0 16px; padding-left: 16px;">${listItems(report.testigos)}</ul>` : ''}
        ${report.sistemas_involucrados?.length ? `<p style="margin: 0 0 4px; font-weight: 600;">Sistemas involucrados</p><ul style="margin: 0 0 16px; padding-left: 16px;">${listItems(report.sistemas_involucrados)}</ul>` : ''}
        ${report.acciones_ya_tomadas?.length ? `<p style="margin: 0 0 4px; font-weight: 600;">Acciones ya tomadas</p><ul style="margin: 0 0 16px; padding-left: 16px;">${listItems(report.acciones_ya_tomadas)}</ul>` : ''}

        <p style="margin: 0 0 4px; font-weight: 600;">Acciones recomendadas</p>
        <ul style="margin: 0 0 16px; padding-left: 16px;">${listItems(report.acciones_recomendadas)}</ul>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">Generado automáticamente por Hu Now · Humand</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'Hu Now <onboarding@resend.dev>',
      to,
      subject: `[Hu Now] ${report.tipo} — Urgencia ${report.urgencia} — Legajo ${report.legajo ?? '-'}`,
      html,
    });
    console.log('[Email] Notificación enviada a', to);
  } catch (err) {
    console.error('[Email] Error enviando notificación:', err.message);
  }
}
