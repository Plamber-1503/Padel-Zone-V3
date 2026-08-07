import React, { useState, useEffect } from 'react';
import { useCourts, useBookings, useCreateOpenMatch, useUpdateOpenMatch } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import { X, Calendar, Clock, MapPin, Users, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CreateOpenMatchModal({ isOpen, onClose, onMatchCreated, editMatch }) {
  const { user } = useAuth();
  const { data: courts = [] } = useCourts();
  const { data: allBookings = [] } = useBookings();
  const createMatchMutation = useCreateOpenMatch();
  const updateMatchMutation = useUpdateOpenMatch();
  const isEditMode = !!editMatch;
  const userBookings = allBookings.filter(b => b.user_id === user?.id);

  // Form State
  const [dateMode, setDateMode] = useState('manual'); // 'manual' | 'booking' | 'flexible'
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [date, setDate] = useState('Hoy');
  const [time, setTime] = useState('20:00 - 21:30');
  const [courtId, setCourtId] = useState(courts[0]?.id || '');
  const [includeTeamPartner, setIncludeTeamPartner] = useState(!!user?.team_partner_name);
  const [searchType, setSearchType] = useState(user?.team_partner_name ? 'rivals' : 'player'); // 'player' | 'partner' | 'rivals'
  const [levelRequired, setLevelRequired] = useState(user?.level || '4ta Categoría (Intermedio)');
  const [pricePerPlayer, setPricePerPlayer] = useState(1200);

  useEffect(() => {
    if (isOpen && editMatch) {
      setDateMode(editMatch.is_flexible_date ? 'flexible' : 'manual');
      setDate(editMatch.date || 'Hoy');
      setTime(editMatch.time || '20:00 - 21:30');
      setCourtId(editMatch.court_id || courts[0]?.id || '');
      setIncludeTeamPartner(editMatch.search_type === 'rivals');
      setSearchType(editMatch.search_type || 'player');
      setLevelRequired(editMatch.level_required || user?.level || '4ta Categoría (Intermedio)');
      setPricePerPlayer(editMatch.price_per_player || 1200);
    } else if (isOpen && !editMatch) {
      setDateMode('manual');
      setDate('Hoy');
      setTime('20:00 - 21:30');
      setCourtId(courts[0]?.id || '');
      setIncludeTeamPartner(!!user?.team_partner_name);
      setSearchType(user?.team_partner_name ? 'rivals' : 'player');
      setLevelRequired(user?.level || '4ta Categoría (Intermedio)');
      setPricePerPlayer(1200);
    }
  }, [isOpen, editMatch]);

  if (!isOpen) return null;

  // Handle booking selection: autoselects court, date and time
  const handleBookingChange = (bId) => {
    setSelectedBookingId(bId);
    const booking = userBookings.find(b => b.id === bId);
    if (booking) {
      setDate(booking.date || 'Hoy');
      setTime(booking.time || '20:00');
      if (booking.court_id) {
        setCourtId(booking.court_id);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedCourt = courts.find(c => c.id === courtId);

    const isFlexible = dateMode === 'flexible';
    const finalDate = isFlexible ? 'Partido Abierto' : date;
    const finalTime = isFlexible ? 'Fecha a convenir' : time;

    const matchPayload = {
      court_id: courtId,
      court_name: selectedCourt?.name || 'Cancha Seleccionada',
      date: finalDate,
      time: finalTime,
      is_flexible_date: isFlexible,
      search_type: includeTeamPartner ? 'rivals' : searchType,
      include_team_partner: includeTeamPartner,
      level_required: levelRequired,
      price_per_player: Number(pricePerPlayer) || 1200
    };

    try {
      const resultMatch = isEditMode
        ? await updateMatchMutation.mutateAsync({ matchId: editMatch.id, updates: matchPayload })
        : await createMatchMutation.mutateAsync(matchPayload);

      if (onMatchCreated) onMatchCreated(resultMatch);
      onClose();
    } catch (err) {
      alert(err.message || 'Error al guardar la búsqueda de partido');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0f1a2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{isEditMode ? 'Editar Búsqueda' : 'Armar Partido Abierto'}</h3>
              <p className="text-xs text-slate-400">{isEditMode ? 'Modificá los datos de tu búsqueda activa' : 'Publicá tu búsqueda para encontrar jugadores o pareja'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* 1. Modalidad de Fecha y Hora */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. Fecha y Hora del Partido
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDateMode('manual')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  dateMode === 'manual'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setDateMode('booking')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  dateMode === 'booking'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Desde Reserva
              </button>
              <button
                type="button"
                onClick={() => setDateMode('flexible')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  dateMode === 'flexible'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Fecha Abierta ⚡
              </button>
            </div>

            {/* Inputs dependiendo de la modalidad */}
            {dateMode === 'manual' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">Día / Fecha</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Ej: Hoy, Mañana, 15/08"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">Horario</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="Ej: 20:00 - 21:30"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
            )}

            {dateMode === 'booking' && (
              <div className="pt-2 space-y-2">
                <label className="text-[11px] text-slate-400 font-medium block">Seleccionar Reserva Confirmada</label>
                {userBookings.length > 0 ? (
                  <select
                    value={selectedBookingId}
                    onChange={(e) => handleBookingChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">-- Elige una reserva previa --</option>
                    {userBookings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.court_name} • {b.date} ({b.time})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>No tienes reservas previas. Podés elegir la opción Manual o Fecha Abierta.</span>
                  </div>
                )}
              </div>
            )}

            {dateMode === 'flexible' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2 pt-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Quedará registrado como <strong>"Fecha y hora a convenir"</strong>. Los interesados se contactarán por chat.</span>
              </div>
            )}
          </div>

          {/* 2. Selección de Cancha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              2. Cancha Seleccionada
            </label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            >
              {courts.map(c => (
                <option key={c.id} value={c.id}>
                  🏟️ {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* 3. ¿Qué buscas? (Jugador, Pareja o Rivales con tu Pareja Habitual) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              3. ¿Qué estás buscando?
            </label>

            {/* Si el usuario TIENE pareja de equipo vinculada en su perfil */}
            {user?.team_partner_name ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={user.team_partner_avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"}
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover border border-emerald-400"
                    />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1">
                        👥 Pareja habitual: <span className="text-emerald-400">{user.team_partner_name}</span>
                      </p>
                      <p className="text-[10px] text-slate-300">Dupla cargada en tu perfil</p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                    <input
                      type="checkbox"
                      checked={includeTeamPartner}
                      onChange={(e) => {
                        setIncludeTeamPartner(e.target.checked);
                        if (e.target.checked) setSearchType('rivals');
                      }}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-emerald-400">Incluir en búsqueda</span>
                  </label>
                </div>

                {includeTeamPartner && (
                  <p className="text-[11px] text-emerald-300 font-medium pt-1 border-t border-emerald-500/20">
                    ⚡ Se publicará como **"Búsqueda de 2 Rivales"** (Ustedes 2 estarán anotados, buscando pareja opositora).
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
                <span>💡 No tenés pareja habitual asignada en tu perfil.</span>
                <span className="text-emerald-400 font-semibold cursor-pointer">Podés asignarla en Mi Perfil</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => {
                  setSearchType('player');
                  setIncludeTeamPartner(false);
                }}
                className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                  searchType === 'player' && !includeTeamPartner
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${searchType === 'player' && !includeTeamPartner ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800'}`}>
                  🎾
                </div>
                <div>
                  <p className="font-bold text-xs">Buscar 4to Jugador</p>
                  <p className="text-[10px] text-slate-400">Falta 1 para partido de 4</p>
                </div>
              </label>

              <label
                onClick={() => {
                  setSearchType('partner');
                  setIncludeTeamPartner(false);
                }}
                className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                  (searchType === 'partner' || includeTeamPartner)
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${(searchType === 'partner' || includeTeamPartner) ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800'}`}>
                  👥
                </div>
                <div>
                  <p className="font-bold text-xs">{includeTeamPartner ? 'Buscar 2 Rivales' : 'Buscar Pareja'}</p>
                  <p className="text-[10px] text-slate-400">{includeTeamPartner ? `Con ${user?.team_partner_name?.split(' ')[0]}` : 'Compañero para jugar'}</p>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Nivel y Precio por jugador */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Nivel Buscado
              </label>
              <select
                value={levelRequired}
                onChange={(e) => setLevelRequired(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Cualquier Nivel">Cualquier Nivel</option>
                <option value="6ta Categoría (Principiante)">6ta Categoría</option>
                <option value="5ta Categoría">5ta Categoría</option>
                <option value="4ta Categoría (Intermedio)">4ta Categoría</option>
                <option value="3ra Categoría (Avanzado)">3ra Categoría</option>
                <option value="2da / 1ra (Profesional)">2da / 1ra Cat.</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Precio /Jugador
              </label>
              <input
                type="number"
                value={pricePerPlayer}
                onChange={(e) => setPricePerPlayer(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="1200"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMatchMutation.isPending || updateMatchMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
            >
              {(createMatchMutation.isPending || updateMatchMutation.isPending)
                ? 'Guardando...'
                : (isEditMode ? 'Guardar Cambios' : 'Publicar Búsqueda')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
