import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePosts, useOpenMatches, useAvailabilities, useUsers, useRemoveAvailability, useCancelOpenMatch } from '@/api/padelService';
import { toast, confirmToast } from '@/lib/toast';
import PostCard from '@/components/social/PostCard';
import SetAvailabilityModal from '@/components/social/SetAvailabilityModal';
import CreateOpenMatchModal from '@/components/social/CreateOpenMatchModal';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { User, Trophy, Users, ShieldCheck, Calendar, Flame, Zap, UserCheck, Clock, Edit2, Trash2, MessageCircle, XCircle, CalendarClock } from 'lucide-react';

export default function ProfilePage() {
  return (
    <ErrorBoundary>
      <ProfilePageContent />
    </ErrorBoundary>
  );
}

function ProfilePageContent() {
  const { id } = useParams();
  const { user: authUser, toggleFollow } = useAuth();
  const [, setRefreshKey] = useState(0);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);

  const { data: postsData = [] } = usePosts('all');
  const { data: openMatchesData = [] } = useOpenMatches();
  const { data: availabilitiesData = [] } = useAvailabilities();
  const { data: usersData = [] } = useUsers();

  const isOwnProfile = !id || id === authUser?.id;
  const user = isOwnProfile ? authUser : (usersData.find(u => u?.id === id) || authUser);
  const isFollowing = !isOwnProfile && authUser?.following_ids?.includes(user?.id);
  // "Mis Reservas" siempre muestra TUS reservas (no las de la otra persona) —
  // el botón aparece en tu propio perfil y en el de tu pareja de equipo, como
  // acceso rápido desde los dos lugares.
  const showMyBookingsButton = isOwnProfile || user?.id === authUser?.team_partner_id;

  const handleToggleFollow = () => {
    if (user?.id) toggleFollow(user.id);
  };

  const myPosts = user?.id ? postsData.filter(p => p && p.author_id === user.id) : [];
  const myAvailability = user?.id ? availabilitiesData.find(a => a.user_id === user.id) : null;
  const myOpenMatches = user?.id ? openMatchesData.filter(m => m && (m.host_id === user.id || m.host_name === user.full_name)) : [];

  const reloadData = () => setRefreshKey(prev => prev + 1);
  const removeAvailabilityMutation = useRemoveAvailability();
  const cancelMatchMutation = useCancelOpenMatch();

  const handleRemoveAvailability = () => {
    confirmToast('¿Deseas quitar tu estado de disponibilidad para jugar?', async () => {
      try {
        await removeAvailabilityMutation.mutateAsync();
        toast.success('Disponibilidad quitada');
      } catch (err) {
        toast.error(err.message || 'Error al quitar la disponibilidad');
      }
    });
  };

  const handleCancelMatch = (matchId) => {
    confirmToast('¿Deseas cerrar esta búsqueda de partido? Ya no será visible para otros jugadores.', async () => {
      try {
        await cancelMatchMutation.mutateAsync(matchId);
        toast.success('Búsqueda cerrada');
      } catch (err) {
        toast.error(err.message || 'Error al cerrar la búsqueda');
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5 min-w-0">
            <img
              src={user?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
              alt=""
              className="w-24 h-24 rounded-2xl object-cover border-4 border-emerald-500/40 shadow-xl shrink-0"
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="font-bold text-2xl text-white">{user?.full_name || 'Usuario'}</h1>
                <span className="bg-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full font-black border border-amber-500/40 flex items-center gap-1 shadow-md">
                  🏆 {user?.elo_rating || 1450} ELO
                </span>
              </div>
              <p className="text-xs text-emerald-400 font-bold">{user?.level || '4ta Categoría (Intermedio Alta)'}</p>
              <p className="text-xs text-slate-300 max-w-md">{user?.bio || 'Jugador de revés ⚡ Apasionado por la bajada de pared y los torneos.'}</p>
            </div>
          </div>

          {/* Botón Disponible para jugar (dueño) o Enviar mensaje (visitante) */}
          <div className="shrink-0 flex items-center gap-2 flex-wrap justify-center">
            {showMyBookingsButton && (
              <Link
                to="/mis-reservas"
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-5 py-3 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 transition-all hover:scale-105"
              >
                <CalendarClock className="w-4 h-4 stroke-[2.5]" />
                <span>Mis Reservas</span>
              </Link>
            )}
            {isOwnProfile ? (
              <button
                onClick={() => setIsAvailabilityModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-3 rounded-2xl font-bold text-xs shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{myAvailability ? 'Editar Disponibilidad' : 'Disponible para jugar'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFollow}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer border ${
                    isFollowing
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>{isFollowing ? 'Siguiendo' : 'Seguir'}</span>
                </button>
                <Link
                  to={`/chat?userId=${user?.id}`}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-3 rounded-2xl font-bold text-xs shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>Enviar Mensaje</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-800/50 py-1.5 px-2.5 rounded-md border border-slate-700/50">
            <span className="font-black text-xs text-emerald-400">{user?.matches_played || 34}</span>
            <span className="text-[9px] text-slate-400 font-medium uppercase whitespace-nowrap">Partidos</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/50 py-1.5 px-2.5 rounded-md border border-slate-700/50">
            <span className="font-black text-xs text-amber-400">{user?.matches_won || 22}</span>
            <span className="text-[9px] text-slate-400 font-medium uppercase whitespace-nowrap">Victorias</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/50 py-1.5 px-2.5 rounded-md border border-slate-700/50">
            <span className="font-black text-xs text-emerald-300">{(((user?.matches_won || 22) / (user?.matches_played || 34)) * 100).toFixed(0)}%</span>
            <span className="text-[9px] text-slate-400 font-medium uppercase whitespace-nowrap">Efectividad</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/50 py-1.5 px-2.5 rounded-md border border-slate-700/50">
            <span className="font-black text-xs text-white">{user?.followers_count || 89}</span>
            <span className="text-[9px] text-slate-400 font-medium uppercase whitespace-nowrap">Seguidores</span>
          </div>
        </div>
      </div>

      {/* ── ESTADO DISPONIBLE PARA JUGAR (SI ESTÁ ACTIVO) ─────────────────── */}
      {myAvailability && (
        <div className="bg-[#0c192d] border border-emerald-500/40 rounded-3xl p-5 shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  Estás Disponible para jugar
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {myAvailability.availability_type === 'partner' ? '👥 Armar Pareja' : '🎾 Cualquier Partido'}
                </span>
              </div>

              <h4 className="font-bold text-sm text-white flex items-center gap-1.5 pt-1">
                🏟️ Cancha preferida: <span className="text-emerald-300">{myAvailability.court_name || 'Cancha a convenir'}</span>
              </h4>

              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Horario: <strong>{myAvailability.is_flexible ? 'Abierto a coordinar con quien busca jugadores' : `${myAvailability.date || 'Hoy'} • ${myAvailability.time || 'A convenir'}`}</strong></span>
              </p>
            </div>

            {isOwnProfile && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsAvailabilityModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={handleRemoveAvailability}
                  className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 hover:border-red-500/40 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Desactivar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAREJA DE EQUIPO HABITUAL (solo en el propio perfil) ────────── */}
      {isOwnProfile && <TeamPartnerSection user={user} onPartnerUpdated={reloadData} />}

      {/* Active Searches / Open Matches Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> {isOwnProfile ? 'Mis Búsquedas y Partidos Abiertos' : `Búsquedas y Partidos Abiertos de ${user?.full_name?.split(' ')[0] || 'este jugador'}`}
        </h3>

        {myOpenMatches.map(m => {
          if (!m) return null;
          return (
            <div key={m.id || Math.random()} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 uppercase">
                    {m.search_type === 'partner' ? '👥 Buscando Pareja' : '⚡ Buscando 4to Jugador'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{m.level_required || 'Cualquier nivel'}</span>
                </div>
                <h4 className="font-bold text-white text-sm mt-1">🏟️ {m.court_name || 'Cancha'}</h4>
                <p className="text-xs text-slate-300">
                  {m.is_flexible_date ? 'Fecha y hora a convenir' : `${m.date || 'Partido'} • ${m.time || 'A convenir'}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <button
                      onClick={() => setEditingMatch(m)}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleCancelMatch(m.id)}
                      className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 hover:border-red-500/40 flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cerrar Búsqueda</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                    {`Organizado por ${user?.full_name?.split(' ')[0] || 'este jugador'}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {myOpenMatches.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center text-slate-400 text-xs">
            {isOwnProfile ? 'No tienes búsquedas activas de jugador o pareja en este momento.' : 'Este jugador no tiene búsquedas activas en este momento.'}
          </div>
        )}
      </div>

      {/* User's posts */}
      <div className="space-y-4 pt-2">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Flame className="w-4 h-4 text-emerald-400" /> {isOwnProfile ? 'Mis Publicaciones & Resultados' : 'Publicaciones & Resultados'}
        </h3>

        {myPosts.map(post => {
          if (!post) return null;
          return <PostCard key={post.id} post={post} onPostUpdated={reloadData} />;
        })}

        {myPosts.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            {isOwnProfile ? 'Aún no realizaste publicaciones.' : 'Este jugador todavía no realizó publicaciones.'}
          </div>
        )}
      </div>

      {/* Modal para Disponibilidad */}
      <SetAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        onAvailabilitySaved={reloadData}
        initialData={myAvailability}
      />

      {/* Modal para Editar Búsqueda de Partido */}
      <CreateOpenMatchModal
        isOpen={!!editingMatch}
        editMatch={editingMatch}
        onClose={() => setEditingMatch(null)}
        onMatchCreated={reloadData}
      />
    </div>
  );
}

function TeamPartnerSection({ user, onPartnerUpdated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { setTeamPartner, removeTeamPartner } = useAuth();

  const { data: usersData = [] } = useUsers();
  const allUsers = usersData.filter(u => u && u.id !== user?.id);

  // La pareja se resuelve siempre en vivo a partir de team_partner_id (la
  // única fuente real, persistida en la base) contra el listado de
  // usuarios — así nunca se puede ver desactualizada ni "duplicada" entre
  // sesiones, a diferencia de antes que dependía de nombre/foto/nivel
  // cacheados que nunca se guardaban en la tabla.
  const partner = user?.team_partner_id ? allUsers.find(u => u.id === user.team_partner_id) : null;

  // Sugeridos por partidos jugados recurrentes
  const suggestedPartners = allUsers.slice(0, 3);

  const filteredUsers = searchQuery.trim()
    ? allUsers.filter(u => u && ((u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.level || '').toLowerCase().includes(searchQuery.toLowerCase())))
    : suggestedPartners;

  const handleSelectPartner = async (partnerId) => {
    setIsSaving(true);
    try {
      await setTeamPartner(partnerId);
      setIsEditing(false);
      setSearchQuery('');
      if (onPartnerUpdated) onPartnerUpdated();
      toast.success('¡Pareja de juego vinculada correctamente!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePartner = async () => {
    setIsSaving(true);
    try {
      await removeTeamPartner();
      if (onPartnerUpdated) onPartnerUpdated();
      toast.success('Pareja de juego desvinculada');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Mi Pareja de Equipo Habitual</h3>
            <p className="text-xs text-slate-400">Se asociará automáticamente al armar partidos para buscar rivales</p>
          </div>
        </div>

        {partner && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-bold text-emerald-400 hover:underline"
          >
            {isEditing ? 'Cancelar' : 'Cambiar Pareja'}
          </button>
        )}
      </div>

      {/* Si tiene pareja asignada y NO está editando */}
      {partner && !isEditing ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={partner.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"}
              alt={partner.full_name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                Pareja Habitual Cargada
              </span>
              <h4 className="font-bold text-sm text-white truncate mt-0.5">{partner.full_name}</h4>
              <p className="text-xs text-slate-300 truncate">{partner.level || '4ta Categoría'}</p>
            </div>
          </div>

          <button
            onClick={handleRemovePartner}
            disabled={isSaving}
            className="text-xs font-bold text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-red-500/40 transition-colors shrink-0 disabled:opacity-60"
          >
            Desvincular
          </button>
        </div>
      ) : (
        /* Si NO tiene pareja asignada o está editando */
        <div className="space-y-3 pt-1">
          <input
            type="text"
            placeholder="Buscar usuario o compañero por nombre o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />

          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              {searchQuery ? 'Resultados de búsqueda:' : 'Sugerencias (Jugadores frecuentes):'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {filteredUsers.map(u => {
                if (!u) return null;
                return (
                  <div key={u.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center space-y-2 hover:border-emerald-500/40 transition-all">
                    <img src={u.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                    <div className="min-w-0 w-full">
                      <p className="font-bold text-xs text-white truncate">{u.full_name}</p>
                      <p className="text-[10px] text-emerald-400 truncate">{u.level}</p>
                    </div>
                    <button
                      onClick={() => handleSelectPartner(u.id)}
                      disabled={isSaving}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] py-1.5 rounded-xl shadow transition-colors disabled:opacity-60"
                    >
                      Vincular Pareja
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
