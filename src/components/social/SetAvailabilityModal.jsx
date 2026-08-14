import React, { useState, useEffect } from 'react';
import { useCourts, useSetAvailability } from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { X, Calendar, Clock, MapPin, Users, Zap, CheckCircle2, UserCheck } from 'lucide-react';

export default function SetAvailabilityModal({ isOpen, onClose, onAvailabilitySaved, initialData }) {
  const { user } = useAuth();
  const { data: courts = [] } = useCourts();
  const setAvailabilityMutation = useSetAvailability();

  const [availabilityType, setAvailabilityType] = useState(initialData?.availability_type || 'partner'); // 'partner' | 'any'
  const [courtId, setCourtId] = useState(initialData?.court_id || courts[0]?.id || '');
  const [dateMode, setDateMode] = useState(initialData?.is_flexible ? 'flexible' : 'manual'); // 'manual' | 'flexible'
  const [date, setDate] = useState(initialData?.date || 'Hoy');
  const [time, setTime] = useState(initialData?.time || '19:00 - 20:30');

  useEffect(() => {
    if (isOpen) {
      setAvailabilityType(initialData?.availability_type || 'partner');
      setCourtId(initialData?.court_id || courts[0]?.id || '');
      setDateMode(initialData?.is_flexible ? 'flexible' : 'manual');
      setDate(initialData?.date || 'Hoy');
      setTime(initialData?.time || '19:00 - 20:30');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedCourt = courts.find(c => c.id === courtId);
    const isFlexible = dateMode === 'flexible';
    const finalDate = isFlexible ? 'Partido Abierto' : date;
    const finalTime = isFlexible ? 'Abierto a coordinar' : time;

    try {
      const result = await setAvailabilityMutation.mutateAsync({
        availability_type: availabilityType,
        court_id: courtId,
        court_name: selectedCourt?.name || 'Cancha a convenir',
        date: finalDate,
        time: finalTime,
        is_flexible: isFlexible
      });

      if (onAvailabilitySaved) onAvailabilitySaved(result);
      onClose();
      toast.success('Disponibilidad publicada');
    } catch (err) {
      toast.error(err.message || 'Error al guardar la disponibilidad');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c1424] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0f1a2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Disponible para jugar</h3>
              <p className="text-xs text-slate-400">Publicá tu disponibilidad para ser convocado</p>
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
          
          {/* 1. Modalidad de Disponibilidad */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. ¿Cómo deseas estar disponible?
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setAvailabilityType('partner')}
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  availabilityType === 'partner'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">👥</span>
                  <input
                    type="radio"
                    name="availability_type"
                    checked={availabilityType === 'partner'}
                    onChange={() => setAvailabilityType('partner')}
                    className="accent-emerald-500"
                  />
                </div>
                <div>
                  <p className="font-bold text-xs">Armar Pareja</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Buscas un compañero de equipo</p>
                </div>
              </div>

              <div
                onClick={() => setAvailabilityType('any')}
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  availabilityType === 'any'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">🎾</span>
                  <input
                    type="radio"
                    name="availability_type"
                    checked={availabilityType === 'any'}
                    onChange={() => setAvailabilityType('any')}
                    className="accent-emerald-500"
                  />
                </div>
                <div>
                  <p className="font-bold text-xs">Partido con cualquier jugador</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Listo para sumarte a cualquier partido</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cancha Preferida */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              2. Cancha Preferida
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

          {/* 3. Fecha y Horario */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              3. Horario de Disponibilidad
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDateMode('manual')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  dateMode === 'manual'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                Horario Específico
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
                Abierto a Coordinar ⚡
              </button>
            </div>

            {dateMode === 'manual' ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">Día / Fecha</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Ej: Hoy, Mañana, Sábado"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">Horario disponible</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="Ej: 19:00 - 21:00"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2 pt-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Quedará registrado como <strong>"Abierto a coordinar con el usuario que busca jugadores"</strong>.</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
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
              disabled={setAvailabilityMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
            >
              {setAvailabilityMutation.isPending ? 'Guardando...' : 'Guardar Disponibilidad'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
