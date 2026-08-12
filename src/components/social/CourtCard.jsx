import React from 'react';
import { useSetCourtActive, useSetCourtBookable } from '@/api/padelService';
import { Camera, Pencil, Power, CheckCircle2, Ban } from 'lucide-react';

const cx = (isDark, dark, light) => (isDark ? dark : light);

// Tarjeta de una cancha en el panel de gestión — usada tanto por el dueño
// del club (sus propias canchas) como por el panel privado (canchas de un
// club virtual), así el look es idéntico en los dos lugares. showBookableControl
// solo lo activa el panel privado (para clubes virtuales) — un dueño real
// nunca necesita marcar sus propias canchas como "no reservable".
export default function CourtCard({ isDark = true, court: c, onEdit, showBookableControl = false }) {
  const setCourtActive = useSetCourtActive();
  const setCourtBookable = useSetCourtBookable();
  const isActive = c.is_active;
  const isBookable = c.is_bookable !== false;
  const amenities = c.amenities || [];

  return (
    <div
      className={`border rounded-3xl overflow-hidden transition-all relative ${
        isActive
          ? cx(isDark, 'bg-slate-900/90 border-slate-800 shadow-lg', 'bg-white border-slate-200 shadow-lg')
          : cx(isDark, 'bg-slate-950/60 border-red-500/30 opacity-75', 'bg-red-50 border-red-300 opacity-90')
      }`}
    >
      <div className={cx(isDark, 'bg-slate-800', 'bg-slate-100') + ' h-36 relative'}>
        {c.image_url ? (
          <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
        ) : (
          <div className={cx(isDark, 'text-slate-600', 'text-slate-400') + ' w-full h-full flex items-center justify-center'}>
            <Camera className="w-8 h-8" />
          </div>
        )}
        {showBookableControl ? (
          <button
            onClick={() => setCourtBookable.mutate({ courtId: c.id, isBookable: !isBookable })}
            disabled={setCourtBookable.isPending}
            title="Cambiar si esta cancha se puede reservar de verdad"
            className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer flex items-center gap-1 disabled:opacity-60 ${
              isBookable
                ? 'bg-slate-950/85 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-950/85 text-amber-400 border-amber-500/40'
            }`}
          >
            {isBookable ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
            {isBookable ? 'Reservable' : 'Demo — no reservable'}
          </button>
        ) : (
          !isBookable && (
            <span className="absolute top-2.5 left-2.5 text-[10px] font-bold bg-slate-950/85 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-lg">
              Demo — no reservable
            </span>
          )
        )}
        <button
          onClick={onEdit}
          className={cx(isDark, 'bg-slate-950/80 hover:bg-slate-900 text-slate-200 border-slate-700', 'bg-white/90 hover:bg-white text-slate-700 border-slate-300') + ' absolute top-2.5 right-2.5 p-1.5 rounded-lg border cursor-pointer'}
          title="Editar cancha"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            isActive
              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
              : 'bg-red-500/20 text-red-500 border-red-500/30'
          }`}>
            {isActive ? '✓ Disponible para Reservas' : '⛔ Quitada / Fuera de Servicio'}
          </span>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base pt-1'}>{c.name}</h3>
          <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>{c.surface || 'Superficie de Césped Sintético WPT'}</p>
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 4).map((a) => (
              <span key={a} className={cx(isDark, 'text-slate-400 bg-slate-800 border-slate-700', 'text-slate-600 bg-slate-100 border-slate-200') + ' text-[10px] font-bold border px-2 py-1 rounded-lg'}>{a}</span>
            ))}
            {amenities.length > 4 && (
              <span className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[10px] font-bold px-1 py-1'}>+{amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex justify-between items-center text-xs pt-2 border-t'}>
          <span className={cx(isDark, 'text-slate-400', 'text-slate-500')}>Tarifa por hora:</span>
          <strong className="text-emerald-500 text-sm">${Number(c.price_per_hour || 4500).toLocaleString()}/hs</strong>
        </div>

        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={() => setCourtActive.mutate({ courtId: c.id, isActive: !c.is_active })}
            disabled={setCourtActive.isPending}
            className={`flex-1 font-bold text-xs py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
              isActive
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border-emerald-500/30'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isActive ? 'Quitar de Disponibles' : 'Activar Cancha'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
