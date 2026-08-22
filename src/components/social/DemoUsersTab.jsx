import React, { useState } from 'react';
import {
  useDemoUsers,
  useUsers,
  useSetProfileDemo,
  useSetDemoUserVisible,
  useUpdateDemoProfile,
  useCreateDemoPost,
  useUploadPostPhoto,
  useCourts
} from '@/api/padelService';
import { toast } from '@/lib/toast';
import { Sparkles, Power, Pencil, Megaphone, X, ImagePlus, Loader2, Plus } from 'lucide-react';

const cx = (isDark, dark, light) => (isDark ? dark : light);

const LEVEL_OPTIONS = [
  '3ra Categoría (Avanzado)',
  '4ta Categoría (Intermedio)',
  '5ta Categoría (Principiante)',
  '6ta Categoría (Iniciación)'
];

export default function DemoUsersTab({ isDark, isAdmin }) {
  const { data: demoUsers = [], isLoading } = useDemoUsers();
  const { data: allUsers = [] } = useUsers();
  const setDemo = useSetProfileDemo();
  const setVisible = useSetDemoUserVisible();

  const [editUser, setEditUser] = useState(null);
  const [composerUser, setComposerUser] = useState(null);
  const [pickedUserId, setPickedUserId] = useState('');

  const muted = cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs';
  const card = cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl p-4';

  const demoIds = new Set(demoUsers.map((u) => u.id));
  const candidates = allUsers.filter((u) => !demoIds.has(u.id));

  const handleMarkDemo = () => {
    if (!pickedUserId) return;
    setDemo.mutate(
      { userId: pickedUserId, isDemo: true },
      {
        onSuccess: () => { setPickedUserId(''); toast.success('Usuario marcado como demo'); },
        onError: (err) => toast.error(err.message)
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className={card + ' flex flex-col sm:flex-row sm:items-center justify-between gap-3'}>
        <div>
          <h2 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base'}>Usuarios Demo</h2>
          <p className={muted}>
            Jugadores de exhibición para mantener el feed activo. La etiqueta DEMO solo se ve acá — los jugadores no la ven.
          </p>
        </div>
      </div>

      {/* Marcar un usuario existente como demo — solo admin */}
      {isAdmin && (
        <div className={card + ' space-y-2'}>
          <p className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-xs'}>Sumar un usuario demo</p>
          <p className={muted}>
            Elegí una de las cuentas que creaste en Supabase. Marcar a alguien como demo habilita publicar y comentar en su nombre — por eso solo puede hacerlo un administrador.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <select
              value={pickedUserId}
              onChange={(e) => setPickedUserId(e.target.value)}
              className={cx(isDark, 'bg-slate-900 border-slate-700 text-white', 'bg-white border-slate-300 text-slate-900') + ' border rounded-xl px-3 py-2 text-xs flex-1 min-w-[220px] focus:outline-none focus:border-emerald-500'}
            >
              <option value="">Elegí un usuario…</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
            <button
              onClick={handleMarkDemo}
              disabled={!pickedUserId || setDemo.isPending}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Marcar como demo
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className={muted}>Cargando...</p>}
      {!isLoading && demoUsers.length === 0 && (
        <p className={muted}>Todavía no hay usuarios demo. {isAdmin ? 'Sumá uno con el selector de arriba.' : 'Pedile a un administrador que sume alguno.'}</p>
      )}

      <div className="space-y-3">
        {demoUsers.map((u) => (
          <div key={u.id} className={card + ' flex flex-col sm:flex-row sm:items-center justify-between gap-3'}>
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={u.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'}
                alt=""
                className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' w-11 h-11 rounded-xl object-cover border shrink-0'}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm truncate'}>{u.full_name}</h3>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Demo
                  </span>
                  {u.is_visible ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Activo</span>
                  ) : (
                    <span className="text-[10px] bg-slate-500/10 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Oculto</span>
                  )}
                </div>
                <p className={muted}>{u.level}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setComposerUser(u)}
                disabled={!u.is_visible}
                title={u.is_visible ? undefined : 'Este usuario demo está desactivado'}
                className={cx(isDark, 'bg-slate-800 hover:bg-slate-700 text-emerald-400', 'bg-slate-100 hover:bg-slate-200 text-emerald-600') + ' flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'}
              >
                <Megaphone className="w-3.5 h-3.5" /> Publicar
              </button>
              <button
                onClick={() => setEditUser(u)}
                className={cx(isDark, 'bg-slate-800 hover:bg-slate-700 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600') + ' flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer'}
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              {/* Habilitar/deshabilitar es exclusivo del admin: es el
                  interruptor que define con qué usuarios demo puede trabajar
                  el resto del equipo. */}
              {isAdmin && (
                <button
                  onClick={() => setVisible.mutate(
                    { userId: u.id, isVisible: !u.is_visible },
                    { onError: (err) => toast.error(err.message) }
                  )}
                  disabled={setVisible.isPending}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer disabled:opacity-60 ${
                    u.is_visible
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border-emerald-500/30'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {u.is_visible ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editUser && <DemoUserEditModal isDark={isDark} user={editUser} onClose={() => setEditUser(null)} />}
      {composerUser && <DemoPostComposer isDark={isDark} user={composerUser} onClose={() => setComposerUser(null)} />}
    </div>
  );
}

function DemoUserEditModal({ isDark, user, onClose }) {
  const updateProfile = useUpdateDemoProfile();
  const uploadPhoto = useUploadPostPhoto();

  const [fullName, setFullName] = useState(user.full_name || '');
  const [level, setLevel] = useState(user.level || LEVEL_OPTIONS[1]);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar_url ? { url: user.avatar_url, uploading: false } : null);
  const [error, setError] = useState('');

  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold text-xs';

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    const localUrl = URL.createObjectURL(file);
    setAvatar({ url: localUrl, uploading: true });
    uploadPhoto.mutate(file, {
      onSuccess: (publicUrl) => setAvatar({ url: publicUrl, uploading: false }),
      onError: (err) => { setAvatar(null); setError(err.message); }
    });
  };

  const busy = updateProfile.isPending || avatar?.uploading;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('El nombre no puede quedar vacío.'); return; }
    setError('');
    updateProfile.mutate(
      { userId: user.id, fullName, level, bio, avatarUrl: avatar?.uploading ? null : avatar?.url },
      {
        onSuccess: () => { toast.success('Perfil actualizado'); onClose(); },
        onError: (err) => setError(err.message)
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base flex items-center gap-2'}>
            <Pencil className="w-4 h-4 text-emerald-500" /> Editar usuario demo
          </h3>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls + ' block'}>Foto de perfil</label>
            {avatar ? (
              <div className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' relative w-24 h-24 rounded-xl overflow-hidden border'}>
                <img src={avatar.url} alt="" className={`w-full h-full object-cover ${avatar.uploading ? 'opacity-40' : ''}`} />
                {avatar.uploading && <Loader2 className="w-5 h-5 text-white animate-spin absolute inset-0 m-auto" />}
                {!avatar.uploading && (
                  <button type="button" onClick={() => setAvatar(null)} className="absolute top-1 right-1 bg-slate-950/80 rounded-full p-1 cursor-pointer">
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ) : (
              <label className={cx(isDark, 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/60', 'border-slate-300 hover:border-emerald-500/60 bg-slate-50') + ' flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl w-24 h-24 cursor-pointer transition-colors'}>
                <ImagePlus className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' w-5 h-5'} />
                <span className={labelCls + ' text-[10px]'}>Elegir</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
            )}
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Nombre</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} required />
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Categoría</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
              {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Descripción</label>
            <textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls + ' resize-none'} placeholder="¡Apasionado del pádel!" />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
          >
            {updateProfile.isPending ? 'Guardando...' : busy ? 'Subiendo foto...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DemoPostComposer({ isDark, user, onClose }) {
  const createPost = useCreateDemoPost();
  const uploadPhoto = useUploadPostPhoto();
  const { data: courts = [] } = useCourts();

  const [content, setContent] = useState('');
  const [courtId, setCourtId] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');

  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold text-xs';

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    const localUrl = URL.createObjectURL(file);
    setPhoto({ url: localUrl, uploading: true });
    uploadPhoto.mutate(file, {
      onSuccess: (publicUrl) => setPhoto({ url: publicUrl, uploading: false }),
      onError: (err) => { setPhoto(null); setError(err.message); }
    });
  };

  const busy = createPost.isPending || photo?.uploading;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) { setError('Escribí algo para publicar.'); return; }
    setError('');
    createPost.mutate(
      { authorId: user.id, content, mediaUrl: photo?.uploading ? null : photo?.url, courtId: courtId || null },
      {
        onSuccess: () => { toast.success(`Publicado como ${user.full_name}`); onClose(); },
        onError: (err) => setError(err.message)
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <div className="min-w-0">
              <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm truncate'}>Publicar como {user.full_name}</h3>
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[11px]'}>Se va a ver como una publicación suya</p>
            </div>
          </div>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer shrink-0'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué está compartiendo este jugador?"
            className={inputCls + ' resize-none'}
            required
          />

          <div className="space-y-1">
            <label className={labelCls}>Cancha (opcional)</label>
            <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className={inputCls}>
              <option value="">Sin cancha asociada</option>
              {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls + ' block'}>Foto (opcional)</label>
            {photo ? (
              <div className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' relative w-24 h-24 rounded-xl overflow-hidden border'}>
                <img src={photo.url} alt="" className={`w-full h-full object-cover ${photo.uploading ? 'opacity-40' : ''}`} />
                {photo.uploading && <Loader2 className="w-5 h-5 text-white animate-spin absolute inset-0 m-auto" />}
                {!photo.uploading && (
                  <button type="button" onClick={() => setPhoto(null)} className="absolute top-1 right-1 bg-slate-950/80 rounded-full p-1 cursor-pointer">
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ) : (
              <label className={cx(isDark, 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/60', 'border-slate-300 hover:border-emerald-500/60 bg-slate-50') + ' flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors'}>
                <ImagePlus className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' w-5 h-5'} />
                <span className={labelCls}>Hacé click para elegir una foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
            )}
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
          >
            {createPost.isPending ? 'Publicando...' : busy ? 'Subiendo foto...' : 'Publicar'}
          </button>
        </form>
      </div>
    </div>
  );
}
