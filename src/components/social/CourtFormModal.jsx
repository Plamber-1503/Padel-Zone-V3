import React, { useState } from 'react';
import { useCreateCourt, useUpdateCourt, useUploadCourtPhoto } from '@/api/padelService';
import { SURFACE_OPTIONS, AMENITY_OPTIONS } from '@/lib/courtOptions';
import { Plus, X, ImagePlus, Loader2 } from 'lucide-react';

const cx = (isDark, dark, light) => (isDark ? dark : light);

// El <input type="time"> nativo no permite elegir 24:00 (medianoche) — su
// máximo es 23:59 — así que el horario de cierre usa un select propio con
// esa opción explícita. Postgres sí acepta '24:00:00' como valor de `time`.
const CLOSING_TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  const totalMinutes = i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  const value = `${h}:${m}`;
  return { value, label: value === '24:00' ? '24:00 (medianoche)' : value };
});

// Modal compartido para "Agregar cancha" (court=null) y "Editar cancha"
// (court=objeto existente) — fotos reales a Supabase Storage y
// diferenciales guardados en courts.amenities. Lo usan tanto el panel del
// dueño de club (sus propias canchas) como el panel privado de PadelZone
// (canchas de un club virtual) — mismo componente, mismo comportamiento.
export default function CourtFormModal({ isDark = true, club, court, onClose, defaultBookable = true }) {
  const isEdit = Boolean(court);
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const uploadPhoto = useUploadCourtPhoto();

  const [name, setName] = useState(court?.name || '');
  const [surface, setSurface] = useState(court?.surface || SURFACE_OPTIONS[0]);
  const [price, setPrice] = useState(court?.price_per_hour || 4800);
  const [openingTime, setOpeningTime] = useState(court?.opening_time?.slice(0, 5) || '09:00');
  const [closingTime, setClosingTime] = useState(court?.closing_time?.slice(0, 5) || '22:30');
  const [slotDuration, setSlotDuration] = useState(court?.slot_duration_minutes || 90);
  const [amenities, setAmenities] = useState(new Set(court?.amenities || []));
  const [photos, setPhotos] = useState(
    (court?.gallery_images?.length ? court.gallery_images : court?.image_url ? [court.image_url] : []).map((url) => ({ url, uploading: false }))
  );
  const [error, setError] = useState('');

  const busy = createCourt.isPending || updateCourt.isPending;
  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold';

  const toggleAmenity = (a) => {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  };

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).slice(0, 6 - photos.length);
    files.forEach((file) => {
      const localUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { url: localUrl, uploading: true }]);
      uploadPhoto.mutate(
        { clubId: club.id, file },
        {
          onSuccess: (publicUrl) => {
            setPhotos((prev) => prev.map((p) => (p.url === localUrl ? { url: publicUrl, uploading: false } : p)));
          },
          onError: (err) => {
            setPhotos((prev) => prev.filter((p) => p.url !== localUrl));
            setError(err.message);
          }
        }
      );
    });
  };

  const removePhoto = (url) => setPhotos((prev) => prev.filter((p) => p.url !== url));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (closingTime <= openingTime) {
      setError('La hora de cierre tiene que ser posterior a la de apertura.');
      return;
    }
    setError('');
    const galleryImages = photos.filter((p) => !p.uploading).map((p) => p.url);
    const payload = {
      name,
      surface,
      price_per_hour: Number(price) || 4500,
      opening_time: openingTime,
      closing_time: closingTime,
      slot_duration_minutes: Number(slotDuration),
      amenities: [...amenities],
      image_url: galleryImages[0] || null,
      gallery_images: galleryImages
    };

    if (isEdit) {
      updateCourt.mutate({ courtId: court.id, patch: payload }, { onSuccess: onClose, onError: (err) => setError(err.message) });
    } else {
      createCourt.mutate(
        {
          clubId: club.id,
          name,
          surface,
          pricePerHour: price,
          openingTime,
          closingTime,
          slotDurationMinutes: Number(slotDuration),
          amenities: [...amenities],
          imageUrl: galleryImages[0],
          galleryImages,
          isBookable: defaultBookable
        },
        { onSuccess: onClose, onError: (err) => setError(err.message) }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base flex items-center gap-2'}>
            <Plus className="w-5 h-5 text-emerald-500 stroke-[3]" /> {isEdit ? 'Editar Cancha' : 'Agregar Nueva Cancha'}
          </h3>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isEdit && !defaultBookable && (
          <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-500">
            Esta cancha es de un club virtual/demo — se va a mostrar en la app, pero no va a poder reservarse.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Fotos */}
          <div className="space-y-1.5">
            <label className={labelCls + ' block'}>Fotos de la cancha</label>
            <label className={cx(isDark, 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/60', 'border-slate-300 hover:border-emerald-500/60 bg-slate-50') + ' flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors'}>
              <ImagePlus className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' w-5 h-5'} />
              <span className={labelCls}>Hacé click para elegir fotos</span>
              <span className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[10.5px]'}>La primera foto es la portada — hasta 6 fotos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={photos.length >= 6} />
            </label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {photos.map((p) => (
                  <div key={p.url} className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' relative w-16 h-16 rounded-lg overflow-hidden border shrink-0'}>
                    <img src={p.url} alt="" className={`w-full h-full object-cover ${p.uploading ? 'opacity-40' : ''}`} />
                    {p.uploading && <Loader2 className="w-4 h-4 text-white animate-spin absolute inset-0 m-auto" />}
                    {!p.uploading && (
                      <button type="button" onClick={() => removePhoto(p.url)} className="absolute top-0.5 right-0.5 bg-slate-950/80 rounded-full p-0.5 cursor-pointer">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Nombre</label>
              <input
                type="text"
                placeholder="ej. Cancha 4 — Panorámica"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Precio por Hora ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls + ' block'}>Horario y duración de turnos</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <span className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[10.5px] block'}>Abre</span>
                <input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} className={inputCls} required />
              </div>
              <div className="space-y-1">
                <span className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[10.5px] block'}>Cierra</span>
                <select value={closingTime} onChange={(e) => setClosingTime(e.target.value)} className={inputCls} required>
                  {CLOSING_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <span className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[10.5px] block'}>Duración turno</span>
                <select value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)} className={inputCls}>
                  <option value={60}>1 hora</option>
                  <option value={90}>1:30 hs</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls + ' block'}>Tipo de Superficie / Estructura</label>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className={inputCls}
            >
              {SURFACE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls + ' block'}>Diferenciales de la cancha</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const on = amenities.has(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                      on
                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
                        : cx(isDark, 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600', 'bg-slate-50 text-slate-500 border-slate-300 hover:border-slate-400')
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Confirmar y Agregar Cancha'}
          </button>
        </form>
      </div>
    </div>
  );
}
