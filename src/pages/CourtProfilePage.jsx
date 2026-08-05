import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { padelService, useCourt, useCourts, usePosts, useBookings } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/social/PostCard';
import CreatePostModal from '@/components/social/CreatePostModal';
import CourtBusinessDashboardModal from '@/components/social/CourtBusinessDashboardModal';
import { MapPin, Star, Calendar, MessageSquare, ShieldCheck, Plus, Sparkles, Building2, Wifi, Car, Utensils, Zap, BarChart3 } from 'lucide-react';

export default function CourtProfilePage() {
  const { id } = useParams();
  const { user, toggleFollow } = useAuth();
  const { data: courtDetail } = useCourt(id);
  const { data: allCourts = [] } = useCourts();
  const court = courtDetail || allCourts.find(c => c.id === id) || allCourts[0] || { id, name: 'Cancha', rating: 4.8 };
  
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'booking' | 'tournaments' | 'reviews'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const isFollowingClub = user?.following_ids?.includes(court.id);

  const { data: allPosts = [], refetch: reloadPosts } = usePosts('all');
  const courtPosts = allPosts.filter(p => p.court_id === court.id);

  const today = new Date().toISOString().split('T')[0];
  const { data: courtBookings = [], refetch: refetchBookings } = useBookings(court.id, today);
  const takenSlots = courtBookings.map(b => b.start_time || b.time);

  const handleBookSlot = async (time) => {
    try {
      await padelService.createBooking({ courtId: court.id, date: today, time });
      alert('¡Reserva confirmada con éxito!');
      refetchBookings();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── COURT HERO & HEADER ────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Cover image */}
        <div className="h-48 md:h-64 relative">
          <img src={court.cover_image_url || court.image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        {/* Profile Details */}
        <div className="p-6 relative -mt-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <img
              src={court.image_url}
              alt=""
              className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-950 shadow-xl"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-2xl text-white tracking-tight">{court.name}</h1>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Club Oficial
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {court.address}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" /> {court.rating} ({court.reviews_count} reseñas)
                </span>
                <span>•</span>
                <span>👥 {court.followers_count} Seguidores</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => toggleFollow(court.id)}
              className={`flex-1 md:flex-none font-bold text-xs px-4 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                isFollowingClub
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
              }`}
            >
              {isFollowingClub ? '✓ Siguiendo Club' : '+ Seguir Club'}
            </button>
            <button
              onClick={() => setActiveTab('booking')}
              className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 cursor-pointer"
            >
              Reservar Turno
            </button>
          </div>
        </div>

        {/* Amenity tags */}
        <div className="px-6 pb-6 pt-2 flex flex-wrap gap-2 text-xs">
          {court.amenities?.map((a, i) => (
            <span key={i} className="bg-slate-800/80 text-slate-300 px-3 py-1 rounded-xl border border-slate-700/60 font-medium">
              {a}
            </span>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-t border-slate-800 px-6 bg-slate-950/40 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('feed')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Feed Social del Club ({courtPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('booking')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'booking'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Turnos Disponibles</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Reseñas & Fotos</span>
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT: DEDICATED COURT FEED ──────────────────────────── */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          
          {/* Post button for this court */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-white">¿Jugaste en {court.name}?</p>
              <p className="text-xs text-slate-400">Publicá tu marcador o buscá rivales específicamente para esta cancha.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all hover:scale-105 shrink-0"
            >
              <Plus className="w-4 h-4" /> Publicar en el Club
            </button>
          </div>

          {/* Feed Posts tagged to this court */}
          {courtPosts.map(post => (
            <PostCard key={post.id} post={post} onPostUpdated={reloadPosts} />
          ))}

          {courtPosts.length === 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <Building2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
              <p className="font-bold text-white text-base">Aún no hay publicaciones en el Feed de {court.name}</p>
              <p className="text-xs">Sé el primero en compartir un marcador o aviso sobre este club.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: BOOKING SHIFTS ────────────────────────────────── */}
      {activeTab === 'booking' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-lg text-white">Turnos Disponibles — {court.name}</h3>
              <p className="text-xs text-slate-400">Superficie: {court.surface} • ${court.price_per_hour?.toLocaleString()} / hora</p>
            </div>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
              Hoy
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {['17:00 - 18:30', '18:30 - 20:00', '20:00 - 21:30', '21:30 - 23:00'].map((time) => {
              const isTaken = takenSlots.includes(time);
              return (
                <button
                  key={time}
                  disabled={isTaken}
                  onClick={() => handleBookSlot(time)}
                  className={`p-4 rounded-2xl border transition-all ${
                    isTaken
                      ? 'bg-slate-800/40 border-slate-800 opacity-50 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border-slate-700 hover:border-emerald-400 cursor-pointer shadow-md'
                  }`}
                >
                  <p className="font-bold text-sm">{time}</p>
                  <p className="text-[11px] mt-1">{isTaken ? 'Ocupado' : 'Disponible'}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: REVIEWS ────────────────────────────────────────── */}
      {activeTab === 'reviews' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white">Reseñas de Jugadores ({court.reviews_count})</h3>
          <div className="space-y-3">
            {(court.reviews || []).map((review, i) => (
              <div key={i} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-white">{review.author}</span>
                  <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {review.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-slate-300">"{review.text}"</p>
              </div>
            ))}
            {(!court.reviews || court.reviews.length === 0) && (
              <p className="text-xs text-slate-400">Este club todavía no tiene reseñas.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal para Crear Post */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={reloadPosts}
        defaultCourtId={court.id}
      />

      {/* Modal Dashboard Ejecutivo "Ver mi negocio" (B2B) */}
      <CourtBusinessDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        court={court}
      />
    </div>
  );
}
