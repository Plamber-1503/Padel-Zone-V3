import React, { useState, useEffect } from 'react';
import { padelService } from '@/api/padelService';
import { Zap, Clock, ChevronLeft, ChevronRight, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OpenMatchesCarousel() {
  const matches = padelService.getOpenMatches();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play right to left every 4.5 seconds
  useEffect(() => {
    if (isPaused || matches.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % matches.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, matches.length]);

  if (!matches.length) return null;

  const currentMatch = matches[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % matches.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-gradient-to-br from-[#064e3b]/35 via-[#0d1322]/90 to-[#065f46]/35 backdrop-blur-xl border border-emerald-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden group shadow-emerald-950/50"
    >
      {/* Background emerald neon glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 p-1.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30">
            <Zap className="w-4 h-4 fill-slate-950" />
          </span>
          <div>
            <h3 className="font-heading font-extrabold text-sm text-white flex items-center gap-2">
              Partidos Abiertos
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                Falta 4to
              </span>
            </h3>
            <p className="text-[10px] text-emerald-200/70 font-medium">Pasan automáticamente • Deslizá manualmente</p>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 flex items-center justify-center transition-all shadow"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 flex items-center justify-center transition-all shadow"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sliding Content */}
      <div className="relative min-h-[120px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMatch.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <img
                  src={currentMatch.host_avatar}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400/50 shadow-md"
                />
                <div>
                  <h4 className="font-bold text-sm text-white leading-tight flex items-center gap-1">
                    {currentMatch.court_name}
                  </h4>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" /> Organiza <span className="text-emerald-200 font-semibold">{currentMatch.host_name}</span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-black text-sm text-emerald-300">${currentMatch.price_per_player}</span>
                <p className="text-[9px] text-slate-300 font-medium">por jugador</p>
              </div>
            </div>

            {/* Match info row */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center justify-between text-xs backdrop-blur-md">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentMatch.date} • {currentMatch.time}</span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                {currentMatch.level_required}
              </span>
            </div>

            {/* Bottom action row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {currentMatch.joined_players?.map((p, i) => (
                    <img key={i} src={p.avatar} alt={p.name} title={p.name} className="w-6 h-6 rounded-full object-cover border-2 border-slate-950 shadow" />
                  ))}
                </div>
                <span className="text-[11px] text-emerald-300 font-bold">
                  ¡Falta {currentMatch.max_players - (currentMatch.joined_players?.length || 0)}!
                </span>
              </div>

              <button
                onClick={() => alert(`Te has sumado al partido en ${currentMatch.court_name}`)}
                className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs px-4.5 py-2 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
              >
                Sumarme al Partido
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center items-center gap-1.5 mt-3">
        {matches.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-6 bg-emerald-400 shadow-sm shadow-emerald-400' : 'w-1.5 bg-emerald-950 border border-emerald-500/30 hover:bg-emerald-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
