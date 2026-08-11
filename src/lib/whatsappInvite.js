// Genera un link "wa.me" con el mensaje ya escrito para invitar a un
// jugador externo (sin cuenta en la app) a una reserva. No envía nada
// solo — quien organiza tiene que tocar "Enviar" adentro de WhatsApp.
// La automatización completa (mandarlo sin que nadie lo toque) requiere
// contratar la API de WhatsApp Business; queda para más adelante.
export function buildWhatsAppInviteLink({ phone, organizerName, courtName, date }) {
  const digits = (phone || '').replace(/\D/g, '');
  const message =
    `${organizerName} acaba de cargar una reserva para la cancha ${courtName} para el día ${date}. ` +
    `Descargá la app para estar al tanto de lo que pasa en Padel Zone: https://plamber-1503.github.io/Padel-Zone-V3/`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
