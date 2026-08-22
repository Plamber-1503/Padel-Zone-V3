import React, { useState } from 'react';
import { useUpdateClubSchedule } from '@/api/padelService';
import { getCourtDurations } from '@/lib/courtSlots';
import { toast } from '@/lib/toast';
import { CalendarDays, Clock, Timer, DoorClosed, MessageSquare, Loader2 } from 'lucide-react';

const cx = (isDark, dark, light) => (isDark ? dark : light);

// 0=domingo … 6=sábado, mismo criterio que Date.getDay() y que la policy de
// bookings en la base (EXTRACT(DOW)).
const WEEK_DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' }
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Igual que en el formulario de cancha: el <input type="time"> nativo no
// permite 24:00, así que el cierre usa un select con esa opción explícita.
const CLOSING_TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  const total = i * 30;
  const value = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  return { value, label: value === '24:00' ? '24:00 (medianoche)' : value };
});

export default function ClubScheduleTab({ isDark, club, courtsList = [] }) {
  const updateSchedule = useUpdateClubSchedule();
  const firstCourt = courtsList[0] || null;

  const [openDays, setOpenDays] = useState(
    Array.isArray(club?.open_days) && club.open_days.length > 0 ? club.open_days.map(Number) : [0, 1, 2, 3, 4, 5, 6]
  );
  const [openingTime, setOpeningTime] = useState((firstCourt?.opening_time || '09:00').slice(0, 5));
  const [closingTime, setClosingTime] = useState((firstCourt?.closing_time || '23:00').slice(0, 5));
  const [durations, setDurations] = useState(firstCourt ? getCourtDurations(firstCourt) : [90]);
  const [isClosedToday, setIsClosedToday] = useState((club?.closed_on || '').slice(0, 10) === todayStr());
  const [notice, setNotice] = useState(club?.notice_message || '');
  const [error, setError] = useState('');

  const card = cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl p-5 space-y-3';
  const title = cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm flex items-center gap-2';
  const muted = cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs';
  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white', 'bg-white border-slate-300 text-slate-900') + ' border rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500';

  const toggleDay = (value) =>
    setOpenDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));

  const toggleDuration = (value) =>
    setDurations((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort((a, b) => a - b)));

  const handleSave = () => {
    if (openDays.length === 0) {
      setError('Elegí al menos un día de apertura.');
      return;
    }
    if (durations.length === 0) {
      setError('Elegí al menos una duración de turno.');
      return;
    }
    if (closingTime <= openingTime) {
      setError('La hora de cierre tiene que ser posterior a la de apertura.');
      return;
    }
    setError('');
    updateSchedule.mutate(
      {
        clubId: club.id,
        openDays,
        openingTime,
        closingTime,
        slotDurations: durations,
        closedOn: isClosedToday ? todayStr() : null,
        noticeMessage: notice
      },
      {
        onSuccess: () => toast.success('Horarios guardados'),
        onError: (err) => setError(err.message)
      }
    );
  };

  if (!club) {
    return <p className={muted}>No encontramos el club.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Días de apertura */}
      <div className={card}>
        <div>
          <h3 className={title}><CalendarDays className="w-4 h-4 text-emerald-500" /> Días que abre el club</h3>
          <p className={muted}>Los días que dejes sin tildar no van a poder reservarse.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((d) => {
            const on = openDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors cursor-pointer ${
                  on
                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
                    : cx(isDark, 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600', 'bg-slate-50 text-slate-500 border-slate-300 hover:border-slate-400')
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horario */}
      <div className={card}>
        <div>
          <h3 className={title}><Clock className="w-4 h-4 text-emerald-500" /> Horario de apertura y cierre</h3>
          <p className={muted}>Se aplica a todas las canchas del club ({courtsList.length}).</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div className="space-y-1">
            <span className={muted}>Abre</span>
            <input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} className={inputCls + ' w-full'} />
          </div>
          <div className="space-y-1">
            <span className={muted}>Cierra</span>
            <select value={closingTime} onChange={(e) => setClosingTime(e.target.value)} className={inputCls + ' w-full'}>
              {CLOSING_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Duración de turnos */}
      <div className={card}>
        <div>
          <h3 className={title}><Timer className="w-4 h-4 text-emerald-500" /> Duración de los turnos</h3>
          <p className={muted}>Si elegís las dos, el jugador decide cuál quiere al reservar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ value: 60, label: '1 hora' }, { value: 90, label: '1 hora y media' }].map((d) => {
            const on = durations.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDuration(d.value)}
                className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors cursor-pointer ${
                  on
                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
                    : cx(isDark, 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600', 'bg-slate-50 text-slate-500 border-slate-300 hover:border-slate-400')
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cierre puntual */}
      <div className={card}>
        <div>
          <h3 className={title}><DoorClosed className="w-4 h-4 text-amber-500" /> Cierre de hoy</h3>
          <p className={muted}>Cierra el club solo por hoy — mañana vuelve a abrir solo, sin que tengas que acordarte.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsClosedToday((v) => !v)}
          className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors cursor-pointer ${
            isClosedToday
              ? 'bg-red-500/15 text-red-500 border-red-500/40'
              : cx(isDark, 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600', 'bg-slate-50 text-slate-600 border-slate-300 hover:border-slate-400')
          }`}
        >
          {isClosedToday ? '🚫 HOY CERRADO — tocá para reabrir' : 'Marcar HOY CERRADO'}
        </button>
      </div>

      {/* Mensaje a los jugadores */}
      <div className={card}>
        <div>
          <h3 className={title}><MessageSquare className="w-4 h-4 text-emerald-500" /> Mensaje a los jugadores</h3>
          <p className={muted}>Se muestra en el perfil del club y al reservar. Dejalo vacío para no mostrar nada.</p>
        </div>
        <textarea
          rows={3}
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="ej. Hoy cerramos por lluvia. ¡Los esperamos mañana!"
          className={inputCls + ' w-full resize-none'}
        />
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={updateSchedule.isPending}
        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
      >
        {updateSchedule.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {updateSchedule.isPending ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}
