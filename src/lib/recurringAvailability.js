// Lógica de disponibilidad para "reserva recurrente" (mismo horario, mismo
// día de la semana, durante 30 días). Separado de los componentes para que
// sea fácil de revisar/testear de forma aislada.

const WEEKDAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function weekdayLabel(isoDate) {
  return WEEKDAY_LABELS[new Date(`${isoDate}T00:00:00`).getDay()];
}

export function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Todas las fechas con el mismo día de semana que `startIsoDate`, cada 7
// días, hasta (e incluyendo) `windowEndIsoDate`.
export function occurrencesForWeekday(startIsoDate, windowEndIsoDate) {
  const dates = [];
  let d = startIsoDate;
  while (d <= windowEndIsoDate) {
    dates.push(d);
    d = addDays(d, 7);
  }
  return dates;
}

/**
 * Disponibilidad real (no todo-o-nada) para cada combinación de día de la
 * semana × horario, en la ventana de `windowDays` a partir de hoy — así se
 * le puede informar al jugador qué días Y horarios tiene disponibles en vez
 * de exigirle que la combinación elegida esté perfectamente libre.
 *
 * @param {Array<{date:string,start_time:string}>} bookings - reservas del court en la ventana
 * @param {Array<{start:string,end:string,label:string}>} slots - turnos posibles (ej. BOOKING_SLOTS)
 * @param {string} anchorDate - primera fecha elegida por el jugador (ISO)
 * @param {string} anchorSlotStart - horario elegido por el jugador ("HH:MM")
 * @param {string} today - fecha de hoy (ISO)
 * @param {number} windowDays
 * @returns {Array<{isOriginal:boolean, anchorDate:string, slot:object, occurrences:string[], freeDates:string[], takenDates:string[]}>}
 *   La combinación elegida por el jugador va primero (isOriginal: true); el
 *   resto, ordenadas de mayor a menor disponibilidad.
 */
export function analyzeRecurringOptions({ bookings, slots, anchorDate, anchorSlotStart, today, windowDays = 30 }) {
  const windowEnd = addDays(today, windowDays);

  const takenBySlot = {};
  slots.forEach((s) => { takenBySlot[s.start] = new Set(); });
  (bookings || []).forEach((b) => {
    const st = (b.start_time || '').slice(0, 5);
    if (takenBySlot[st]) takenBySlot[st].add(b.date);
  });

  const results = [];
  for (let offset = 0; offset <= 6; offset++) {
    const candidateAnchor = addDays(anchorDate, offset);
    if (candidateAnchor < today || candidateAnchor > windowEnd) continue;
    const occurrences = occurrencesForWeekday(candidateAnchor, windowEnd);
    if (occurrences.length === 0) continue;

    slots.forEach((slot) => {
      const taken = takenBySlot[slot.start] || new Set();
      const takenDates = occurrences.filter((d) => taken.has(d));
      const freeDates = occurrences.filter((d) => !taken.has(d));
      results.push({
        isOriginal: offset === 0 && slot.start === anchorSlotStart,
        anchorDate: candidateAnchor,
        slot,
        occurrences,
        freeDates,
        takenDates
      });
    });
  }

  const original = results.find((r) => r.isOriginal);
  const rest = results.filter((r) => !r.isOriginal).sort((a, b) => b.freeDates.length - a.freeDates.length);
  return original ? [original, ...rest] : rest;
}

// Turnos sueltos libres en los próximos `days` días (cualquier día, cualquier
// horario), para ofrecer una reserva individual mientras se resuelve la
// recurrente.
export function findFreeSingleSlots({ bookings, slots, fromDate, days = 7 }) {
  const taken = new Set((bookings || []).map((b) => `${b.date}|${(b.start_time || '').slice(0, 5)}`));
  const options = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    slots.forEach((slot) => {
      if (!taken.has(`${date}|${slot.start}`)) {
        options.push({ date, slot });
      }
    });
  }
  return options;
}
