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

// Duraciones que ofrece la cancha, de menor a mayor. `slot_durations` es la
// fuente nueva (un club puede ofrecer 1h y 1:30 a la vez); si una cancha
// todavía no la tiene, se usa el valor único de siempre.
export function getCourtDurations(court) {
  const list = Array.isArray(court?.slot_durations) ? court.slot_durations.map(Number).filter(Boolean) : [];
  if (list.length > 0) return [...new Set(list)].sort((a, b) => a - b);
  return [Number(court?.slot_duration_minutes) || DEFAULT_SLOT_MINUTES];
}

export function generateCourtSlots(court, durationMinutes) {
  const opening = (court?.opening_time || DEFAULT_OPENING_TIME).slice(0, 5);
  const closing = (court?.closing_time || DEFAULT_CLOSING_TIME).slice(0, 5);
  const duration = Number(durationMinutes) || getCourtDurations(court)[0];

  const openMin = toMinutes(opening);
  const closeMin = toMinutes(closing);
  const slots = [];
  for (let start = openMin; start + duration <= closeMin; start += duration) {
    const end = start + duration;
    slots.push({ start: toHHMM(start), end: toHHMM(end), label: `${toHHMM(start)} - ${toHHMM(end)}` });
  }
  return slots;
}

// ¿El club abre ese día? `dateStr` viene en formato YYYY-MM-DD.
export function isClubOpenOn(club, dateStr) {
  if (!club || !dateStr) return true;
  if (club.closed_on && club.closed_on.slice(0, 10) === dateStr) return false;
  const openDays = Array.isArray(club.open_days) ? club.open_days.map(Number) : null;
  if (!openDays || openDays.length === 0) return true;
  // Se parsea a mano (y no con new Date(dateStr)) para que la fecha se lea en
  // horario local: `new Date('2026-08-19')` la interpreta como UTC y en
  // Argentina cae en el día anterior.
  const [y, m, d] = dateStr.split('-').map(Number);
  return openDays.includes(new Date(y, m - 1, d).getDay());
}
