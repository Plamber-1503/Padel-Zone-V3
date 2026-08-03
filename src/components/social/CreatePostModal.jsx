import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { padelService } from '@/api/padelService';
import { Image, Zap, Trophy, X, Send, MapPin } from 'lucide-react';

export default function CreatePostModal({ isOpen, onClose, onPostCreated, defaultCourtId = null }) {
  const { user } = useAuth();
  const [postType, setPostType] = useState('standard'); // 'standard' | 'open_match' | 'match_result'
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  
  // Court selection
  const courts = padelService.getCourts();
  const [selectedCourtId, setSelectedCourtId] = useState(defaultCourtId || courts[0]?.id || '');
  
  // Match Result state
  const [set1, setSet1] = useState('6-3');
  const [set2, setSet2] = useState('6-4');

  // Open Match state
  const [matchDate, setMatchDate] = useState('Hoy');
  const [matchTime, setMatchTime] = useState('20:00 - 21:30');
  const [matchLevel, setMatchLevel] = useState('4ta Categoría (Intermedio)');
  const [matchPrice, setMatchPrice] = useState('1200');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
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
      } : null
    };

    padelService.createPost(postPayload);
    setContent('');
    setMediaUrl('');
    onClose();
    if (onPostCreated) onPostCreated();
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

          {/* Image URL Optional */}
          {postType === 'standard' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Image className="w-3.5 h-3.5 text-emerald-400" /> URL de Imagen (Opcional):
              </label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
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

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
