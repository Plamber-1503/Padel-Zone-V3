import React, { useState } from 'react';
import { padelService } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Calendar, MapPin, Award, Users, CheckCircle2 } from 'lucide-react';

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState(padelService.getTournaments());

  const handleRegister = (tournamentId) => {
    try {
      const updated = padelService.registerForTournament(tournamentId);
      setTournaments(updated);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-2xl text-white tracking-tight">Torneos & Ligas de Pádel</h1>
          <p className="text-xs text-slate-400">Inscribí a tu pareja y competí por premios en efectivo y trofeos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tournaments.map(t => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="h-44 relative">
              <img src={t.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Inscripciones Abiertas
                </span>
                <h3 className="font-bold text-lg text-white mt-1">{t.title}</h3>
              </div>
            </div>

            <div className="p-5 space-y-3 pt-0">
              <div className="space-y-1.5 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Sede: <span className="font-semibold text-white">{t.court_name}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Fecha: <span className="font-semibold text-white">{t.date_range}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-emerald-400" /> Categorías: <span className="font-semibold text-white">{t.category}</span>
                </p>
                <p className="flex items-center gap-2 text-amber-400 font-bold">
                  <Award className="w-3.5 h-3.5" /> Premio: {t.prize}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Parejas: {t.teams_registered}/{t.teams_max}</span>
                {(t.registered_pairs || []).some(r => r.player === user?.full_name) ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Inscripto
                  </span>
                ) : t.teams_registered >= t.teams_max ? (
                  <span className="bg-slate-800 text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700">
                    Cupo Completo
                  </span>
                ) : (
                  <button
                    onClick={() => handleRegister(t.id)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow transition-all hover:scale-105"
                  >
                    Inscribir Pareja
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
