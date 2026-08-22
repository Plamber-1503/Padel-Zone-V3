import React, { useState } from 'react';
import { useCreatePost, useUploadCourtPhoto } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import { Megaphone, X, ImagePlus, Loader2 } from 'lucide-react';

const cx = (isDark, dark, light) => (isDark ? dark : light);

// Publicar una novedad a nombre de un club. Lo usan el panel del dueño de
// club (sus propias canchas) y el panel privado de PadelZone (clubes
// virtuales, que no tienen dueño que pueda entrar a publicar) — mismo
// componente para no duplicar el formulario entre ambos paneles.
export default function ClubPostComposerModal({ isDark = true, club, courtsList = [], onClose, onPublished }) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  const uploadPhoto = useUploadCourtPhoto();

  const [content, setContent] = useState('');
  const [courtId, setCourtId] = useState(courtsList[0]?.id || '');
  const [photo, setPhoto] = useState(null); // { url, uploading }
  const [error, setError] = useState('');

  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold';

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    const localUrl = URL.createObjectURL(file);
    setPhoto({ url: localUrl, uploading: true });
    uploadPhoto.mutate(
      { clubId: club.id, file },
      {
        onSuccess: (publicUrl) => setPhoto({ url: publicUrl, uploading: false }),
        onError: (err) => { setPhoto(null); setError(err.message); }
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || !courtId) return;
    setError('');
    const court = courtsList.find((c) => c.id === courtId);
    createPost.mutate(
      {
        author_type: 'court',
        author_name: club?.name || user?.full_name,
        author_avatar: user?.avatar_url,
        court_id: courtId,
        court_name: court?.name || null,
        type: 'standard',
        content,
        media_url: photo?.url || null
      },
      {
        onSuccess: () => { if (onPublished) onPublished(); onClose(); },
        onError: (err) => setError(err.message)
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <div>
            <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base flex items-center gap-2'}>
              <Megaphone className="w-5 h-5 text-emerald-500" /> Publicar Novedad
            </h3>
            {club?.name && (
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[11px] mt-0.5'}>
                Se publica como <strong>{club.name}</strong>
              </p>
            )}
          </div>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer shrink-0'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {courtsList.length === 0 ? (
          <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>
            Este club todavía no tiene canchas cargadas. Agregá una cancha antes de publicar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {courtsList.length > 1 && (
              <div className="space-y-1">
                <label className={labelCls + ' block'}>Cancha asociada</label>
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className={inputCls}
                >
                  {courtsList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className={labelCls + ' block'}>Novedad</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ej: ¡Reinauguramos la Cancha 2 con nuevas luces LED! Vengan a probarla."
                rows={4}
                className={inputCls + ' resize-none'}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls + ' block'}>Foto (opcional)</label>
              {photo ? (
                <div className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' relative w-24 h-24 rounded-lg overflow-hidden border'}>
                  <img src={photo.url} alt="" className={`w-full h-full object-cover ${photo.uploading ? 'opacity-40' : ''}`} />
                  {photo.uploading && <Loader2 className="w-5 h-5 text-white animate-spin absolute inset-0 m-auto" />}
                  {!photo.uploading && (
                    <button type="button" onClick={() => setPhoto(null)} className="absolute top-0.5 right-0.5 bg-slate-950/80 rounded-full p-0.5 cursor-pointer">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ) : (
                <label className={cx(isDark, 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/60', 'border-slate-300 hover:border-emerald-500/60 bg-slate-50') + ' flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors'}>
                  <ImagePlus className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' w-5 h-5'} />
                  <span className={labelCls}>Agregar una foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </label>
              )}
            </div>

            {error && <p className="text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={createPost.isPending || photo?.uploading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {createPost.isPending ? 'Publicando...' : 'Publicar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
