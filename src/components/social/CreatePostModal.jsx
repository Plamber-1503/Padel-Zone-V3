import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { padelService, useCourts, useUsers, useUploadPostPhoto } from '@/api/padelService';
import { Image, ImagePlus, Loader2, Zap, Trophy, X, Send, MapPin, Tag, Search } from 'lucide-react';

export default function CreatePostModal({ isOpen, onClose, onPostCreated, defaultCourtId = null }) {
  const { user } = useAuth();
  const [postType, setPostType] = useState('standard'); // 'standard' | 'open_match' | 'match_result'
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const uploadPhoto = useUploadPostPhoto();

  // Court selection
  const { data: courts = [] } = useCourts();
  const [selectedCourtId, setSelectedCourtId] = useState(defaultCourtId || courts[0]?.id || '');

  // Etiquetar personas — en cualquier tipo de publicación
  const { data: allUsers = [] } = useUsers();
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const tagResults = tagSearch.trim()
    ? allUsers.filter(u => u.id !== user?.id && !taggedUsers.some(t => t.id === u.id) && (u.full_name || '').toLowerCase().includes(tagSearch.toLowerCase())).slice(0, 5)
    : [];
  const addTag = (u) => { setTaggedUsers(prev => [...prev, u]); setTagSearch(''); };
  const removeTag = (id) => setTaggedUsers(prev => prev.filter(u => u.id !== id));

  const handlePhotoSelect = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploadError('');
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    uploadPhoto.mutate(file, {
      onSuccess: (publicUrl) => setMediaUrl(publicUrl),
      onError: (err) => {
        setPhotoPreview('');
        setMediaUrl('');
        setUploadError(err.message);
      }
    });
  };

  const removePhoto = () => {
    setPhotoPreview('');
    setMediaUrl('');
    setUploadError('');
  };

  // Match Result state
  const [set1, setSet1] = useState('6-3');
  const [set2, setSet2] = useState('6-4');

  // Open Match state
  const [matchDate, setMatchDate] = useState('Hoy');
  const [matchTime, setMatchTime] = useState('20:00 - 21:30');
  const [matchLevel, setMatchLevel] = useState('4ta Categoría (Intermedio)');
  const [matchPrice, setMatchPrice] = useState('1200');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && postType === 'standard') return;

    const courtObj = courts.find(c => c.id === selectedCourtId);

    const postPayload = {
      author_type: 'user',
      author_id: user.id,
      author_name: user.full_name,
      author_avatar: user.avatar_url,
      court_id: courtObj?.id || null,
      court_name: courtObj?.name || null,
      type: postType,
      content,
      media_url: mediaUrl.trim() || null,
      score: postType === 'match_result' ? { set1, set2 } : null,
      open_match_details: postType === 'open_match' ? {
        match_id: `m-${Date.now()}`,
        date: matchDate,
        time: matchTime,
        category: matchLevel,
        spot_needed: 1,
        price_per_player: `$${matchPrice}`
      } : null,
      tagged_user_ids: taggedUsers.map(u => u.id)
    };

    setError('');
    setIsSubmitting(true);
    try {
      await padelService.createPost(postPayload);
      setContent('');
      setMediaUrl('');
      setPhotoPreview('');
      setTaggedUsers([]);
      onClose();
      if (onPostCreated) onPostCreated();
    } catch (err) {
      setError(err.message || 'No se pudo publicar. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 relative animate-in fade-in zoom-in duration-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg text-white">Crear Publicación en PadelZone</h3>

        {/* Tabs for post types */}
        <div className="flex bg-slate-800/60 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setPostType('standard')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              postType === 'standard' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            💬 Estado / Foto
          </button>
          <button
            type="button"
            onClick={() => setPostType('open_match')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              postType === 'open_match' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> Buscar 4to
          </button>
          <button
            type="button"
            onClick={() => setPostType('match_result')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              postType === 'match_result' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Resultado
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Main textarea */}
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === 'open_match'
                ? 'Detallá tu búsqueda (ej. Buscamos drive de 4ta para partido parejo hoy...)'
                : postType === 'match_result'
                ? '¡Comentá cómo estuvo el partido!'
                : '¿Qué tenés para compartir con la comunidad de pádel?'
            }
            className="w-full bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
          />

          {/* Etiquetar personas */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Etiquetar personas (opcional):
            </label>
            {taggedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {taggedUsers.map(u => (
                  <span key={u.id} className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold pl-2.5 pr-1.5 py-1 rounded-full">
                    {u.full_name}
                    <button type="button" onClick={() => removeTag(u.id)} className="hover:text-white cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Buscar jugador por nombre..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {tagResults.length > 0 && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden">
                {tagResults.map(u => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => addTag(u)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <img src={u.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"} alt="" className="w-6 h-6 rounded-lg object-cover" />
                    {u.full_name} <span className="text-slate-500">· {u.level}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Court selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Seleccionar Cancha / Club:
            </label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {courts.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
              ))}
            </select>
          </div>

          {/* Foto (Opcional) */}
          {postType === 'standard' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Image className="w-3.5 h-3.5 text-emerald-400" /> Foto (Opcional):
              </label>
              {photoPreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                  <img src={photoPreview} alt="" className={`w-full h-full object-cover ${uploadPhoto.isPending ? 'opacity-40' : ''}`} />
                  {uploadPhoto.isPending && <Loader2 className="w-5 h-5 text-white animate-spin absolute inset-0 m-auto" />}
                  {!uploadPhoto.isPending && (
                    <button type="button" onClick={removePhoto} className="absolute top-1 right-1 bg-slate-950/80 rounded-full p-0.5 cursor-pointer">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/60 rounded-xl p-4 cursor-pointer transition-colors">
                  <ImagePlus className="w-5 h-5 text-slate-500" />
                  <span className="text-xs font-bold text-slate-300">Hacé click para elegir una foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e.target.files)} />
                </label>
              )}
              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            </div>
          )}

          {/* Extra fields for Open Match */}
          {postType === 'open_match' && (
            <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Día & Horario</span>
                <input
                  type="text"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
              <div>
                <span className="text-slate-400 font-medium">Categoría Requerida</span>
                <input
                  type="text"
                  value={matchLevel}
                  onChange={(e) => setMatchLevel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
            </div>
          )}

          {/* Extra fields for Match Result */}
          {postType === 'match_result' && (
            <div className="flex gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 text-xs">
              <div className="flex-1">
                <span className="text-slate-400 font-medium">Set 1 Score</span>
                <input
                  type="text"
                  value={set1}
                  onChange={(e) => setSet1(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white mt-1 text-center font-bold"
                />
              </div>
              <div className="flex-1">
                <span className="text-slate-400 font-medium">Set 2 Score</span>
                <input
                  type="text"
                  value={set2}
                  onChange={(e) => setSet2(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white mt-1 text-center font-bold"
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || uploadPhoto.isPending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publicando...' : uploadPhoto.isPending ? 'Subiendo foto...' : 'Publicar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
