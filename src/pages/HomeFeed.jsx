import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePosts } from '@/api/padelService';
import PostCard from '@/components/social/PostCard';
import CreatePostModal from '@/components/social/CreatePostModal';
import OpenMatchesCarousel from '@/components/social/OpenMatchesCarousel';
import { PlusCircle, Zap, Trophy, Flame, Users } from 'lucide-react';

export default function HomeFeed() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [filter, setFilter] = useState('all'); // 'all' | 'following' | 'open_matches' | 'results'
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: posts = [], refetch } = usePosts(filter);

  const reloadPosts = () => refetch();

  return (
    <div className="space-y-5">
      
      {/* ── 1. CAROUSEL AUTO-SLIDING DE PARTIDOS ABIERTOS ("FALTA 4TO") ──── */}
      <OpenMatchesCarousel />

      {/* ── 2. CREATE POST BAR (FACEBOOK STYLE) ──────────────────────────── */}
      <div className={`rounded-2xl p-4 shadow-md space-y-3 transition-all duration-300 ${
        isDark ? 'bg-[#0d1322]/85 backdrop-blur-xl border border-slate-800/80' : 'bg-white border border-slate-200/90 shadow-slate-200/70'
      }`}>
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
            alt=""
            className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-xs text-left font-medium transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-400'
                : 'bg-[#f1f5f9] hover:bg-slate-200/80 border border-slate-200 text-slate-600'
            }`}
          >
            ¿Qué hay de nuevo en tu juego hoy, {user?.full_name?.split(' ')[0]}?
          </button>
        </div>

        <div className={`flex items-center justify-between pt-2 border-t text-xs ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-300 hover:text-emerald-400 hover:bg-slate-800/50' : 'text-slate-700 hover:text-emerald-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Publicación</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50' : 'text-slate-700 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Buscar 4to</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-300 hover:text-emerald-400 hover:bg-slate-800/50' : 'text-slate-700 hover:text-emerald-600 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Subir Marcador</span>
          </button>
        </div>
      </div>

      {/* ── 3. FEED FILTER TABS ──────────────────────────────────────────── */}
      <div className={`flex items-center p-1.5 rounded-2xl gap-1 overflow-x-auto transition-all duration-300 ${
        isDark ? 'bg-[#0d1322]/85 backdrop-blur-xl border border-slate-800/80' : 'bg-white border border-slate-200/90 shadow-sm'
      }`}>
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === 'all'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Feed Principal</span>
        </button>

        <button
          onClick={() => setFilter('following')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === 'following'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Siguiendo</span>
        </button>

        <button
          onClick={() => setFilter('open_matches')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === 'open_matches'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Partidos Abiertos</span>
        </button>

        <button
          onClick={() => setFilter('results')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === 'results'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Marcadores</span>
        </button>
      </div>

      {/* ── 4. SCROLLABLE POSTS LIST (CON FOTOS, MARCADORES Y COMENTARIOS) ─── */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onPostUpdated={reloadPosts} />
        ))}

        {posts.length === 0 && (
          <div className="bg-[#0d1322]/85 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <p className="font-bold text-white text-base">No hay publicaciones en esta pestaña</p>
            <p className="text-xs">¡Sé el primero en compartir una novedad o crear un partido abierto!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={reloadPosts}
      />
    </div>
  );
}
