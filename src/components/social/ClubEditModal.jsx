import React, { useState } from 'react';
import { useUpdateClubProfile, useUploadCourtPhoto } from '@/api/padelService';
import { Building2, X, ImagePlus, Loader2 } from 'lucide-react';

const cx = (isDark, dark, light) => (isDark ? dark : light);

// Editar el perfil del club: nombre, dirección, contacto, descripción y las
// dos fotos (logo y portada). Lo usa el dueño de un club real desde su panel
// y el panel privado sobre un club virtual — la función server-side decide
// cuál de los dos casos aplica, acá no hay chequeo de permisos.
export default function ClubEditModal({ isDark = true, club, onClose, onSaved }) {
  const updateClub = useUpdateClubProfile();
  const uploadPhoto = useUploadCourtPhoto();

  const [name, setName] = useState(club?.name || '');
  const [address, setAddress] = useState(club?.address || '');
  const [city, setCity] = useState(club?.city || '');
  const [phone, setPhone] = useState(club?.phone || '');
  const [description, setDescription] = useState(club?.description || '');
  const [logo, setLogo] = useState(club?.image_url ? { url: club.image_url, uploading: false } : null);
  const [cover, setCover] = useState(club?.cover_image_url ? { url: club.cover_image_url, uploading: false } : null);
  const [error, setError] = useState('');

  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold';

  const handleFile = (file, setPhoto) => {
    if (!file) return;
    setError('');
    const localUrl = URL.createObjectURL(file);
    setPhoto({ url: localUrl, uploading: true });
    uploadPhoto.mutate(
      { clubId: club.id, file },
      {
        onSuccess: (publicUrl) => setPhoto({ url: publicUrl, uploading: false }),
        onError: (err) => {
          setPhoto(null);
          setError(err.message);
        }
      }
    );
  };

  const busy = updateClub.isPending || logo?.uploading || cover?.uploading;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del club no puede quedar vacío.');
      return;
    }
    setError('');
    updateClub.mutate(
      {
        clubId: club.id,
        name,
        address,
        city,
        phone,
        description,
        imageUrl: logo?.uploading ? null : logo?.url,
        coverImageUrl: cover?.uploading ? null : cover?.url
      },
      {
        onSuccess: (saved) => {
          onSaved?.(saved);
          onClose();
        },
        onError: (err) => setError(err.message)
      }
    );
  };

  const PhotoField = ({ label, hint, photo, setPhoto, aspect }) => (
    <div className="space-y-1.5">
      <label className={labelCls + ' block'}>{label}</label>
      {photo ? (
        <div className={cx(isDark, 'border-slate-700', 'border-slate-300') + ` relative ${aspect} rounded-xl overflow-hidden border`}>
          <img src={photo.url} alt="" className={`w-full h-full object-cover ${photo.uploading ? 'opacity-40' : ''}`} />
          {photo.uploading && <Loader2 className="w-5 h-5 text-white animate-spin absolute inset-0 m-auto" />}
          {!photo.uploading && (
            <button type="button" onClick={() => setPhoto(null)} className="absolute top-1.5 right-1.5 bg-slate-950/80 rounded-full p-1 cursor-pointer">
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      ) : (
        <label className={cx(isDark, 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/60', 'border-slate-300 hover:border-emerald-500/60 bg-slate-50') + ` flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${aspect}`}>
          <ImagePlus className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' w-5 h-5'} />
          <span className={labelCls + ' text-[11px]'}>Elegir foto</span>
          <span className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[10px]'}>{hint}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], setPhoto)} />
        </label>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base flex items-center gap-2'}>
            <Building2 className="w-5 h-5 text-emerald-500" /> Editar Club
          </h3>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <PhotoField
            label="Foto de portada"
            hint="Se muestra de fondo en el perfil del club"
            photo={cover}
            setPhoto={setCover}
            aspect="h-28"
          />

          <PhotoField
            label="Logo del club"
            hint="Cuadrado, se ve junto al nombre"
            photo={logo}
            setPhoto={setLogo}
            aspect="w-20 h-20"
          />

          <div className="space-y-1">
            <label className={labelCls}>Nombre del club</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Dirección</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Ciudad</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Teléfono de contacto</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ej. 11 5555-5555" className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contá qué tiene de especial tu club..."
              className={inputCls + ' resize-none'}
            />
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {updateClub.isPending ? 'Guardando...' : busy ? 'Subiendo foto...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
