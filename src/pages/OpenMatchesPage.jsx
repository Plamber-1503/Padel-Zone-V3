import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { padelService, useOpenMatches, useAvailabilities, useUsers } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import CreateOpenMatchModal from '@/components/social/CreateOpenMatchModal';
import AvailablePlayersModal from '@/components/social/AvailablePlayersModal';
import { Zap, Clock, MapPin, Users, PlusCircle, CheckCircle2, MessageCircle, UserCheck } from 'lucide-react';

export default function OpenMatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: matches = [], refetch: refreshMatches } = useOpenMatches();
  const { data: availabilities = [] } = useAvailabilities();
  const { data: usersList = [] } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAvailableModalOpen, setIsAvailableModalOpen] = useState(false);

  const availableCount = availabilities.length;

  const handleSumarme = (match) => {
    if (match.host_id === user?.id || match.host_name === user?.full_name) {
      alert('Esta búsqueda fue creada por ti.');
      return;
    }

    const isFlexible = match.is_flexible_date || match.date === 'Partido Abierto' || match.time === 'A convenir' || match.time === 'Fecha a convenir';
    const courtName = match.court_name || 'la cancha';
    let defaultMsg = '';

    if (!isFlexible && match.date && match.time && match.date !== 'Partido Abierto') {
      defaultMsg = `Hola ${match.host_name}! Me quiero sumar al partido que estás organizando en ${courtName} el ${match.date} a las ${match.time}.`;
    } else {
      defaultMsg = `Hola ${match.host_name}! Me quiero sumar al partido que estás organizando en ${courtName}. ¿Qué día y a qué hora podemos coordinar?`;
    }

    const hostUser = match.host_id ? { id: match.host_id } : usersList.find(u => u.full_name === match.host_name);
    const targetId = hostUser ? hostUser.id : 'u-lucas';
    navigate(`/chat?user=${targetId}&msg=${encodeURIComponent(defaultMsg)}`);
  };

  return (
    <div className="space-y-6">

      {/* ── HEADER HERO TARJETA PRINCIPAL SUPERIOR ─────────────────────── */}
      <div className="bg-[#0b1322] border border-amber-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        {/* Glow de fondo cálido idéntico a la imagen de referencia */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Badges superiores */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-[#1c180b] border border-amber-500/50 text-amber-400 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-md">
                <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Búsqueda de 4to Jugador</span>
              </div>

              <button
                onClick={() => setIsAvailableModalOpen(true)}
                className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-md transition-all cursor-pointer hover:scale-105"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{availableCount} Jugador{availableCount !== 1 ? 'es' : ''} Disponible{availableCount !== 1 ? 's' : ''} para Jugar</span>
              </button>
            </div>

            {/* Título Principal */}
            <h1 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight leading-tight">
              Partidos Abiertos
            </h1>

            {/* Subtítulo */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ¿Te falta un jugador para completar el partido de hoy? Publicá tu búsqueda o sumate a partidos abiertos cerca de tu zona.
            </p>
          </div>

          {/* Botón Armar Partido */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-2.5 transition-all duration-200 hover:scale-105"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Armar Partido</span>
          </button>
        </div>
      </div>

      {/* ── LISTADO DE PARTIDOS ABIERTOS & BÚSQUEDAS ─────────────────────── */}
      <div className="space-y-4">
        {matches.map(m => {
          const isHost = m.host_id === user?.id || m.host_name === user?.full_name;
          const isUserJoined = m.joined_players?.some(p => p.name === user?.full_name || p.id === user?.id);
          const spotsLeft = m.max_players - (m.joined_players?.length || 0);

          return (
            <div key={m.id} className="bg-[#0b1322] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 hover:border-slate-700/80 transition-all">

              {/* Top row: Organizador e Info Cancha */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">

                {/* Datos del Organizador */}
                <div className="flex items-center gap-3.5">
                  <img src={m.host_avatar} alt={m.host_name} className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-md shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">Organiza</span>
                      <h4 className="font-bold text-sm text-white">{m.host_name}</h4>
                    </div>
                    <p className="text-xs text-emerald-400 font-medium">{m.host_level || m.level_required}</p>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">🏟️ {m.court_name}</p>
                  </div>
                </div>

                {/* Fecha, Hora y Tipo de Búsqueda */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-amber-400" />
                    {m.search_type === 'partner' ? 'Buscando Pareja' : 'Buscando 4to Jugador'}
                  </span>

                  <span className="text-xs text-slate-200 font-semibold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {m.is_flexible_date ? 'Fecha y hora a convenir' : `${m.date} • ${m.time}`}
                  </span>
                </div>
              </div>

              {/* Match details & CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="space-y-2">
                  <p className="text-xs text-slate-300">
                    Nivel Requerido: <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">{m.level_required}</span>
                  </p>

                  {/* Joined players avatars */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <span className="text-xs text-slate-400 font-medium">Jugadores anotados ({m.joined_players?.length || 1}/{m.max_players}):</span>
                    <div className="flex -space-x-2">
                      {m.joined_players?.map((p, i) => (
                        <img key={i} src={p.avatar} alt={p.name} title={p.name} className="w-7 h-7 rounded-full object-cover border-2 border-slate-900" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Botón Me quiero sumar */}
                <div>
                  {isHost ? (
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Tu Búsqueda Creada
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSumarme(m)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <MessageCircle className="w-4 h-4 fill-slate-950" />
                      <span>Me quiero sumar</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal para Armar Partido */}
      <CreateOpenMatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMatchCreated={refreshMatches}
      />

      {/* Modal para Listado de Jugadores Disponibles */}
      <AvailablePlayersModal
        isOpen={isAvailableModalOpen}
        onClose={() => setIsAvailableModalOpen(false)}
      />
    </div>
  );
}
