import React, { useState } from 'react';
import { X, CalendarCheck, Loader2, MessageCircle } from 'lucide-react';
import { useCreateBooking, useModifyBooking } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import GuestPicker from './GuestPicker';

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

// Confirmación previa a reservar (o a modificar) un turno suelto. Para
// reserva recurrente, el que se usa es RecurringBookingModal — este es
// deliberadamente más simple porque acá siempre hay una sola fecha/hora.
export default function BookingConfirmModal({ court, date, slot, modifyBooking, onClose, onDone }) {
  const { user } = useAuth();
  const createBooking = useCreateBooking();
  const modifyBookingMutation = useModifyBooking();
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { message, externalGuestLinks } tras confirmar
  const [guests, setGuests] = useState({ guestUserIds: [], externalGuests: [] });

  const busy = createBooking.isPending || modifyBookingMutation.isPending;
  const isModify = Boolean(modifyBooking);

  const handleConfirm = async () => {
    setError('');
    try {
      if (isModify) {
        const result = await modifyBookingMutation.mutateAsync({ oldBooking: modifyBooking, newSlot: { date, startTime: slot.start, endTime: slot.end } });
        setDone({
          message: `Tu reserva para el día ${formatDate(modifyBooking.date)} ${(modifyBooking.start_time || '').slice(0, 5)} fue modificada para el día ${formatDate(date)} ${slot.start}.`,
          externalGuestLinks: result?.external_guest_links || []
        });
      } else {
        const result = await createBooking.mutateAsync({
          courtId: court.id,
          date,
          startTime: slot.start,
          endTime: slot.end,
          guestUserIds: guests.guestUserIds,
          externalGuests: guests.externalGuests
        });
        setDone({
          message: `Reserva confirmada para el ${formatDate(date)} a las ${slot.start}.`,
          externalGuestLinks: result.external_guest_links || []
        });
      }
      onDone?.();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e1738] border border-emerald-500/30 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-white">{isModify ? 'Modificar reserva' : 'Confirmar reserva'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <CalendarCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-200 leading-relaxed">{done.message}</p>
            </div>

            {done.externalGuestLinks?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Invitar por WhatsApp</p>
                {done.externalGuestLinks.map((g) => (
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

            <button onClick={onClose} className="text-emerald-300 underline font-semibold text-xs">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
              {isModify && (
                <p className="text-xs text-slate-400">
                  Turno actual: <span className="text-slate-300">{formatDate(modifyBooking.date)} · {(modifyBooking.start_time || '').slice(0, 5)}</span>
                </p>
              )}
              <p className="text-xs text-slate-400">{isModify ? 'Nuevo turno' : 'Cancha'}</p>
              <p className="font-bold text-white text-sm">{court?.name}</p>
              <p className="text-emerald-400 font-bold text-sm capitalize">{formatDate(date)} · {slot.label}</p>
            </div>

            {!isModify && (
              <GuestPicker
                currentUserId={user?.id}
                partnerId={user?.team_partner_id}
                onChange={setGuests}
              />
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={busy}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? 'Confirmando...' : isModify ? 'Confirmar modificación' : 'Aceptar reserva'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
