import React from 'react';
import { useNavigate } from 'react-router-dom';
import { padelService } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import { X, Users, MessageCircle, MapPin, Clock, Zap, UserCheck } from 'lucide-react';

export default function AvailablePlayersModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const availabilities = padelService.getAvailabilities();

  if (!isOpen) return null;

  const handleInvite = (player) => {
    if (player.user_id === user?.id) {
      alert('Esta es tu propia publicación de disponibilidad.');
      return;
    }

    const defaultMsg = `Hola ${player.user_name}, ¿jugamos juntos?`;
    navigate(`/chat?user=${player.user_id}&msg=${encodeURIComponent(defaultMsg)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0f1a2e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Jugadores Disponibles ({availabilities.length})</h3>
              <p className="text-xs text-slate-400">Jugadores buscando cancha, pareja o partido hoy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Players List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {availabilities.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No hay jugadores disponibles en este momento. ¡Sé el primero en publicar tu disponibilidad desde tu perfil!
            </div>
          ) : (
            availabilities.map((p) => {
              const isCurrentUser = p.user_id === user?.id;

              return (
                <div
                  key={p.id}
                  className="bg-[#0f192d] border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/40 transition-all shadow-md"
                >
                  {/* Info Jugador */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={p.user_avatar}
                      alt={p.user_name}
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-md shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white truncate">{p.user_name}</h4>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                            Tú
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                          {p.availability_type === 'partner' ? '👥 Armar Pareja' : '🎾 Cualquier Partido'}
                        </span>
                      </div>

                      <p className="text-xs text-emerald-400 font-semibold">{p.user_level}</p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                        <span className="flex items-center gap-1 font-medium">
                          🏟️ {p.court_name}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          {p.is_flexible ? 'Abierto a coordinar' : `${p.date} • ${p.time}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0 pt-2 sm:pt-0">
                    {isCurrentUser ? (
                      <span className="text-xs text-slate-400 bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 font-medium inline-block">
                        Tu Disponibilidad
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInvite(p)}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
                      >
                        <MessageCircle className="w-4 h-4 fill-slate-950" />
                        <span>Invitar a jugar</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-[#0f1a2e] text-center text-xs text-slate-400 shrink-0">
          Tip: Podés gestionar o modificar tu disponibilidad desde tu perfil de usuario.
        </div>

      </div>
    </div>
  );
}
