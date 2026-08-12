import React, { useMemo, useState } from 'react';
import { useMyBookings, useCancelBooking } from '@/api/padelService';
import { useBookingModal } from '@/context/BookingModalContext';
import { CalendarClock, MapPin, Repeat, User, XCircle, Pencil, Loader2, MessageCircle, X } from 'lucide-react';

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

// Agrupa las reservas recurrentes (mismo recurrence_id) en un solo bloque;
// las sueltas quedan una por una.
function groupBookings(bookings) {
  const groups = new Map();
  const singles = [];
  bookings.forEach((b) => {
    if (b.recurrence_id) {
      if (!groups.has(b.recurrence_id)) groups.set(b.recurrence_id, []);
      groups.get(b.recurrence_id).push(b);
    } else {
      singles.push({ ...b, items: [b] });
    }
  });
  const seriesGroups = [...groups.values()].map((items) => ({
    ...items[0],
    items: items.sort((a, b) => a.date.localeCompare(b.date))
  }));
  return [...singles, ...seriesGroups].sort((a, b) => a.items[0].date.localeCompare(b.items[0].date));
}

export default function MyBookingsPage() {
  const { data: bookings = [], isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const { open: openBookingModal } = useBookingModal();
  const [cancellingGroup, setCancellingGroup] = useState(null); // group actualmente eligiendo alcance
  const [cancelWaLinks, setCancelWaLinks] = useState(null); // invitados externos a avisar tras cancelar

  const groups = useMemo(() => groupBookings(bookings), [bookings]);

  const handleModify = (group) => {
    if (group.items.length > 1) {
      // Modificar toda la serie: la cancelamos y abrimos el popup de reserva
      // recurrente, ya anclado a esta misma cancha, para armar una nueva.
      if (!window.confirm('Esto va a cancelar toda la serie actual para que armes una nueva. ¿Continuar?')) return;
      cancelBooking.mutate({ booking: group, scope: 'series' }, {
        onSuccess: () => openBookingModal({ courtId: group.court_id, isRecurring: true })
      });
    } else {
      openBookingModal({ courtId: group.court_id, modifyBooking: group });
    }
  };

  const handleCancel = (group, scope) => {
    cancelBooking.mutate({ booking: group, scope }, {
      onSuccess: (result) => {
        setCancellingGroup(null);
        if (result?.external_guest_links?.length > 0) setCancelWaLinks(result.external_guest_links);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-slate-950">
          <CalendarClock className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white">Mis Reservas</h1>
          <p className="text-xs text-slate-400">Tus turnos activos, propios y los de tu pareja de equipo.</p>
        </div>
      </div>

      {cancelWaLinks && (
        <div className="bg-slate-900 border border-[#25D366]/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Avisar a los invitados externos</p>
            <button onClick={() => setCancelWaLinks(null)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {cancelWaLinks.map((g) => (
            <a
              key={g.phone}
              href={g.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 rounded-xl px-3 py-2.5 text-xs text-emerald-200"
            >
              <span className="font-semibold">{g.name}</span>
              <span className="flex items-center gap-1.5 font-bold text-[#25D366]"><MessageCircle className="w-3.5 h-3.5" /> Enviar</span>
            </a>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-slate-400 flex items-center gap-2 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
        </p>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
          Todavía no tenés turnos reservados.
        </div>
      )}

      {groups.map((group) => {
        const isSeries = group.items.length > 1;
        const groupKey = group.recurrence_id || group.id;
        const isChoosingScope = cancellingGroup !== null && cancellingGroup === groupKey;

        return (
          <div key={groupKey} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">{group.court_name || 'Cancha'}</h3>
                  {isSeries && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                      <Repeat className="w-2.5 h-2.5" /> Recurrente
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {(group.start_time || '').slice(0, 5)}
                  {group.end_time ? ` - ${group.end_time.slice(0, 5)}` : ''}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {isSeries ? group.items.map((i) => formatDate(i.date)).join(' · ') : formatDate(group.date)}
                </p>
                {!group.is_mine && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Reservada por tu pareja de equipo
                  </p>
                )}
              </div>
            </div>

            {group.is_mine && (
              isChoosingScope ? (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    {isSeries ? '¿Cancelar solo un día o toda la serie?' : '¿Confirmás la cancelación?'}
                  </span>
                  {isSeries && (
                    <button onClick={() => handleCancel(group.items[0], 'single')} className="text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700">
                      Solo el próximo
                    </button>
                  )}
                  <button onClick={() => handleCancel(group, isSeries ? 'series' : 'single')} className="text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg">
                    {isSeries ? 'Toda la serie' : 'Sí, cancelar'}
                  </button>
                  <button
                    onClick={() => { setCancellingGroup(null); handleModify(group); }}
                    className="text-[11px] font-bold text-emerald-400 hover:underline px-2 flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Modificar en cambio
                  </button>
                  <button onClick={() => setCancellingGroup(null)} className="text-[11px] text-slate-400 px-2">Volver</button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleModify(group)}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modificar reserva
                  </button>
                  <button
                    onClick={() => setCancellingGroup(groupKey)}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-500/20 text-red-400 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/30"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancelar reserva
                  </button>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
