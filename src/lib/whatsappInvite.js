// Genera links "wa.me" con el mensaje ya escrito para avisarle a un jugador
// externo (sin cuenta en la app) sobre una reserva. No envían nada solos —
// quien organiza tiene que tocar "Enviar" adentro de WhatsApp, y sale desde
// SU propio número, no desde el del club. La automatización completa (que
// salga sola desde el número de WhatsApp de cada club) requiere contratar
// la API de WhatsApp Business; queda para más adelante.
const APP_LINK = 'https://plamber-1503.github.io/Padel-Zone-V3/';

function waLink(phone, message) {
  const digits = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppInviteLink({ phone, organizerName, courtName, date }) {
  const message =
    `${organizerName} acaba de cargar una reserva para la cancha ${courtName} para el día ${date}. ` +
    `Descargá la app para estar al tanto de lo que pasa en Padel Zone: ${APP_LINK}`;
  return waLink(phone, message);
}

export function buildWhatsAppCancelLink({ phone, organizerName, courtName, date }) {
  const message =
    `${organizerName} canceló la reserva para la cancha ${courtName} del día ${date}. ` +
    `Descargá la app para estar al tanto de lo que pasa en Padel Zone: ${APP_LINK}`;
  return waLink(phone, message);
}

export function buildWhatsAppModifyLink({ phone, organizerName, courtName, oldDate, newDate }) {
  const message =
    `${organizerName} modificó la reserva para la cancha ${courtName}: pasó del día ${oldDate} al día ${newDate}. ` +
    `Descargá la app para estar al tanto de lo que pasa en Padel Zone: ${APP_LINK}`;
  return waLink(phone, message);
}
