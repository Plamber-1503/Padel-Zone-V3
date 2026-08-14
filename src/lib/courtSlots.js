// Arma la grilla de turnos de una cancha a partir de su horario configurado
// (opening_time/closing_time/slot_duration_minutes). Si la cancha todavía no
// tiene esos campos cargados, cae al horario histórico fijo (9:00-22:30,
// turnos de 90 min) para no romper canchas creadas antes de este módulo.
const DEFAULT_OPENING_TIME = '09:00';
const DEFAULT_CLOSING_TIME = '22:30';
const DEFAULT_SLOT_MINUTES = 90;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function generateCourtSlots(court) {
  const opening = (court?.opening_time || DEFAULT_OPENING_TIME).slice(0, 5);
  const closing = (court?.closing_time || DEFAULT_CLOSING_TIME).slice(0, 5);
  const duration = Number(court?.slot_duration_minutes) || DEFAULT_SLOT_MINUTES;

  const openMin = toMinutes(opening);
  const closeMin = toMinutes(closing);
  const slots = [];
  for (let start = openMin; start + duration <= closeMin; start += duration) {
    const end = start + duration;
    slots.push({ start: toHHMM(start), end: toHHMM(end), label: `${toHHMM(start)} - ${toHHMM(end)}` });
  }
  return slots;
}
