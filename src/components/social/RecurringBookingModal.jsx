import React, { useMemo, useState } from 'react';
import { X, Repeat, CalendarCheck, CalendarX, Sparkles, Loader2 } from 'lucide-react';
import { useCourtBookingsInRange, useCreateBooking, useCreateRecurringBooking } from '@/api/padelService';
import { addDays, analyzeRecurringOptions, findFreeSingleSlots, weekdayLabel } from '@/lib/recurringAvailability';

const WINDOW_DAYS = 30;

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// Reserva recurrente: mismo horario, mismo día de la semana, durante 30
// días. Si la combinación elegida choca con algo, en vez de fallar sin más
// se le muestra al jugador exactamente qué días están libres de esa
// combinación, qué otros días/horarios tienen mejor disponibilidad ese mes,
// y qué turnos sueltos hay disponibles esta semana para reservar mientras
// tanto — así siempre se va con una opción concreta, no con un error.
// El padre debe montar este componente solo mientras está abierto (no pasar
// un "isOpen" y dejarlo siempre montado) — así la consulta de disponibilidad
// no corre de más en cada carga de la página de la cancha.
export default function RecurringBookingModal({ onClose, court, anchorDate, initialSlot, today, slots }) {
  const windowEnd = addDays(today, WINDOW_DAYS);
  const { data: bookings = [], isLoading } = useCourtBookingsInRange(court?.id, today, windowEnd);
  const createRecurring = useCreateRecurringBooking();
  const createSingle = useCreateBooking();
  const [result, setResult] = useState(null); // { bookedCount, dates } tras confirmar

  const options = useMemo(() => {
    if (isLoading) return [];
    return analyzeRecurringOptions({ bookings, slots, anchorDate, anchorSlotStart: initialSlot.start, today, windowDays: WINDOW_DAYS });
  }, [isLoading, bookings, slots, anchorDate, initialSlot, today]);

  const singleOptions = useMemo(() => {
    if (isLoading) return [];
    return findFreeSingleSlots({ bookings, slots, fromDate: today, days: 7 }).slice(0, 8);
  }, [isLoading, bookings, slots, today]);

  const original = options[0];
  const alternatives = options.slice(1, 6).filter((o) => o.freeDates.length > 0);

  const confirmRecurring = async (option) => {
    try {
      const data = await createRecurring.mutateAsync({
        courtId: court.id,
        dates: option.freeDates,
        startTime: option.slot.start,
        endTime: option.slot.end
      });
      setResult({ dates: option.freeDates, slot: option.slot, count: data?.length || option.freeDates.length });
    } catch (e) {
      alert(e.message);
    }
  };

  const confirmSingle = async (opt) => {
    try {
      await createSingle.mutateAsync({ courtId: court.id, date: opt.date, startTime: opt.slot.start, endTime: opt.slot.end });
      setResult({ dates: [opt.date], slot: opt.slot, count: 1, single: true });
    } catch (e) {
      alert(e.message);
    }
  };

  const busy = createRecurring.isPending || createSingle.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e1738] border border-emerald-500/30 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-slate-950">
              <Repeat className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                Reserva recurrente · 30 días
              </span>
              <h3 className="font-bold text-base text-white">
                Todos los {weekdayLabel(anchorDate)} a las {initialSlot.label}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading && (
          <p className="text-xs text-slate-400 flex items-center gap-2 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Revisando disponibilidad...
          </p>
        )}

        {!isLoading && result && (
          <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <CalendarCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-200 leading-relaxed">
              <p className="font-semibold">
                {result.single ? '¡Turno reservado!' : `¡${result.count} turno(s) reservado(s)!`}
              </p>
              <p className="mt-1">{result.dates.map(formatDate).join(', ')} a las {result.slot.label}.</p>
              <button onClick={onClose} className="mt-2 text-emerald-300 underline font-semibold">Cerrar</button>
            </div>
          </div>
        )}

        {!isLoading && !result && original && (
          <>
            {original.takenDates.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <CalendarCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-200 leading-relaxed">
                    Libre todos los {weekdayLabel(anchorDate)}: {original.freeDates.map(formatDate).join(', ')}.
                  </p>
                </div>
                <button
                  onClick={() => confirmRecurring(original)}
                  disabled={busy}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4" />
                  {busy ? 'Reservando...' : `Confirmar ${original.freeDates.length} turnos`}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <CalendarX className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    De los {original.occurrences.length} {weekdayLabel(anchorDate)} de acá a 30 días, ya está ocupado:{' '}
                    <strong>{original.takenDates.map(formatDate).join(', ')}</strong>. Libre: {original.freeDates.length > 0 ? original.freeDates.map(formatDate).join(', ') : 'ninguno'}.
                  </p>
                </div>

                {original.freeDates.length > 0 && (
                  <button
                    onClick={() => confirmRecurring(original)}
                    disabled={busy}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-400 font-bold text-xs py-2.5 rounded-xl transition-all disabled:opacity-60"
                  >
                    Reservar igual esos {original.freeDates.length} días libres
                  </button>
                )}

                {alternatives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Mejor disponibilidad este mes</p>
                    {alternatives.map((opt) => (
                      <div key={`${opt.anchorDate}-${opt.slot.start}`} className="flex items-center justify-between gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                        <div className="text-xs">
                          <p className="text-slate-200 font-semibold capitalize">{weekdayLabel(opt.anchorDate)} · {opt.slot.label}</p>
                          <p className="text-slate-400 text-[11px]">{opt.freeDates.length} de {opt.occurrences.length} libres</p>
                        </div>
                        <button
                          onClick={() => confirmRecurring(opt)}
                          disabled={busy}
                          className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                        >
                          Reservar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {singleOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">O reservá un turno suelto esta semana</p>
                    <div className="grid grid-cols-2 gap-2">
                      {singleOptions.map((opt) => (
                        <button
                          key={`${opt.date}-${opt.slot.start}`}
                          onClick={() => confirmSingle(opt)}
                          disabled={busy}
                          className="text-left bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-2.5 text-[11px] transition-all disabled:opacity-60"
                        >
                          <p className="text-slate-200 font-semibold capitalize">{weekdayLabel(opt.date)} {formatDate(opt.date)}</p>
                          <p className="text-slate-400">{opt.slot.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
