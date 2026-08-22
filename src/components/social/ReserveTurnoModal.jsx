import React, { useState, useEffect, useMemo } from 'react';
import { useCourts, useBookings } from '@/api/padelService';
import { useBookingModal } from '@/context/BookingModalContext';
import RecurringBookingModal from './RecurringBookingModal';
import BookingConfirmModal from './BookingConfirmModal';
import { generateCourtSlots, getCourtDurations, isClubOpenOn } from '@/lib/courtSlots';
import { X, MapPin, CalendarClock, Pencil, Info } from 'lucide-react';

const WEEKDAY_LABELS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function getNextDays(count = 7) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${WEEKDAY_LABELS[d.getDay()]} ${d.getDate()}`;
    days.push({ value, label });
  }
  return days;
}

// Popup único de reserva/modificación, montado una vez en AppLayout y
// disparado desde cualquier botón "Reservar Turno" vía useBookingModal().
// Reemplaza la vieja tarjeta de "Turnos Disponibles" embebida en cada
// cancha: ahora club, día y horario se eligen todos acá.
export default function ReserveTurnoModal() {
  const { state, close } = useBookingModal();
  const { data: allCourts = [] } = useCourts();
  const [bookingDays] = useState(() => getNextDays(7));
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [selectedDate, setSelectedDate] = useState(bookingDays[0].value);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringSlot, setRecurringSlot] = useState(null);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);

  const isOpen = !!state;
  const modifyBooking = state?.modifyBooking || null;
  // Modificar una reserva SIEMPRE queda anclado al club de esa reserva —
  // nunca se puede cambiar de club al modificar.
  const lockedCourtId = modifyBooking?.court_id || state?.courtId || null;

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCourtId(lockedCourtId || allCourts[0]?.id || '');
    setSelectedDate(bookingDays[0].value);
    setIsRecurring(!!state?.isRecurring);
    setRecurringSlot(null);
    setPendingSlot(null);
    setSelectedDuration(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lockedCourtId]);

  const court = allCourts.find((c) => c.id === selectedCourtId);
  const club = court?.clubs || null;
  const { data: courtBookings = [] } = useBookings(selectedCourtId, selectedDate);
  const takenSlots = courtBookings.map((b) => (b.start_time || '').slice(0, 5));

  const durations = useMemo(() => getCourtDurations(court), [court]);
  const activeDuration = durations.includes(selectedDuration) ? selectedDuration : durations[0];
  const bookingSlots = useMemo(() => generateCourtSlots(court, activeDuration), [court, activeDuration]);
  const isClubOpen = isClubOpenOn(club, selectedDate);

  if (!isOpen) return null;

  const handleSlotClick = (slot) => {
    if (isRecurring && !modifyBooking) {
      setRecurringSlot(slot);
      return;
    }
    setPendingSlot(slot);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0f1a2e] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{modifyBooking ? 'Modificar Reserva' : 'Reservar Turno'}</h3>
              <p className="text-xs text-slate-400">Elegí club, día y horario disponible</p>
            </div>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {modifyBooking && (
            <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-200">
              <Pencil className="w-4 h-4 shrink-0" />
              <span>
                Modificando tu turno del {modifyBooking.date} a las {(modifyBooking.start_time || '').slice(0, 5)} — elegí el nuevo día y horario.
              </span>
            </div>
          )}

          {/* 1. Club */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">1. Club</label>
            {lockedCourtId ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold">{court?.name || 'Cancha'}</span>
              </div>
            ) : (
              <select
                value={selectedCourtId}
                onChange={(e) => setSelectedCourtId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {allCourts.map((c) => (
                  <option key={c.id} value={c.id}>🏟️ {c.name} ({c.city})</option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Día */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">2. Día</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {bookingDays.map((day) => {
                const dayClosed = !isClubOpenOn(club, day.value);
                return (
                  <button
                    key={day.value}
                    disabled={dayClosed}
                    title={dayClosed ? 'El club no abre este día' : undefined}
                    onClick={() => setSelectedDate(day.value)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      dayClosed
                        ? 'bg-slate-800/40 text-slate-600 border-slate-800 line-through cursor-not-allowed'
                        : selectedDate === day.value
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 cursor-pointer'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50 cursor-pointer'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!modifyBooking && (
            <label className="flex items-center gap-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-200">Reserva recurrente (30 días) — mismo día y horario cada semana</span>
            </label>
          )}

          {/* Aviso que dejó el club */}
          {club?.notice_message && (
            <div className="flex items-start gap-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl px-4 py-3 text-xs text-sky-200">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>{club.notice_message}</span>
            </div>
          )}

          {/* Duración del turno — solo si el club ofrece más de una */}
          {durations.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Duración del turno</label>
              <div className="flex gap-2">
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeDuration === d
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50'
                    }`}
                  >
                    {d === 60 ? '1 hora' : '1 hora y media'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Horario */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">3. Horario</label>
            {court && court.is_bookable === false && (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                Esta cancha es de exhibición — no está disponible para reservar.
              </p>
            )}
            {court && court.is_bookable !== false && !isClubOpen && (
              <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                El club está cerrado este día — no se pueden reservar turnos.
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              {bookingSlots.map((slot) => {
                const isTaken = takenSlots.includes(slot.start);
                const isDisabled = isTaken || !selectedCourtId || court?.is_bookable === false || !isClubOpen;
                return (
                  <button
                    key={slot.start}
                    disabled={isDisabled}
                    onClick={() => handleSlotClick(slot)}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDisabled
                        ? 'bg-slate-800/40 border-slate-800 opacity-50 cursor-not-allowed'
                        : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border-slate-700 hover:border-emerald-400 cursor-pointer shadow-md'
                    }`}
                  >
                    <p className="font-bold text-xs">{slot.label}</p>
                    <p className="text-[10px] mt-1">
                      {isTaken ? 'Ocupado' : court?.is_bookable === false ? 'No reservable' : !isClubOpen ? 'Cerrado' : 'Disponible'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {recurringSlot && (
        <RecurringBookingModal
          court={court}
          anchorDate={selectedDate}
          initialSlot={recurringSlot}
          today={bookingDays[0].value}
          slots={bookingSlots}
          onClose={() => setRecurringSlot(null)}
        />
      )}

      {pendingSlot && (
        <BookingConfirmModal
          court={court}
          date={selectedDate}
          slot={pendingSlot}
          modifyBooking={modifyBooking}
          onClose={() => setPendingSlot(null)}
        />
      )}
    </div>
  );
}
