import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOpenMatches } from '@/api/padelService';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/lib/toast';
import { Zap, Clock, ChevronLeft, ChevronRight, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OpenMatchesCarousel() {
  const { isDark } = useTheme();
  const { data: matches = [] } = useOpenMatches();
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
      className={`rounded-3xl p-5 shadow-xl relative overflow-hidden group transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-[#064e3b]/35 via-[#0d1322]/90 to-[#065f46]/35 backdrop-blur-xl border border-emerald-500/40 text-white shadow-emerald-950/50'
          : 'bg-white border border-emerald-500/30 text-slate-900 shadow-slate-200/80'
      }`}
    >
      {/* Background emerald neon glow */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`} />

      {/* Header Bar */}
      <div className={`flex items-center justify-between mb-3 pb-2.5 border-b ${isDark ? 'border-emerald-500/20' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2.5">
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-1.5 rounded-xl font-bold shadow-md shadow-emerald-500/20">
            <Zap className="w-4 h-4 fill-white" />
          </span>
          <div>
            <h3 className={`font-heading font-extrabold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Partidos Abiertos
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                Falta 4to
              </span>
            </h3>
            <p className={`text-[10px] font-medium ${isDark ? 'text-emerald-200/70' : 'text-slate-500'}`}>Pasan automáticamente • Deslizá manualmente</p>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow ${
              isDark
                ? 'bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300'
                : 'bg-slate-100 border border-slate-200 hover:bg-emerald-500 hover:text-white text-slate-700'
            }`}
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow ${
              isDark
                ? 'bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300'
                : 'bg-slate-100 border border-slate-200 hover:bg-emerald-500 hover:text-white text-slate-700'
            }`}
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
                <Link to={`/profile/${currentMatch.host_id}`}>
                  <img
                    src={currentMatch.host_avatar}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md"
                  />
                </Link>
                <div>
                  <h4 className={`font-bold text-sm leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {currentMatch.court_name}
                  </h4>
                  <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <MapPin className="w-3 h-3 text-emerald-500" /> Organiza{' '}
                    <Link to={`/profile/${currentMatch.host_id}`} className={`font-semibold hover:underline ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {currentMatch.host_name}
                    </Link>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className={`font-black text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>${currentMatch.price_per_player}</span>
                <p className={`text-[9px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>por jugador</p>
              </div>
            </div>

            {/* Match info row */}
            <div className={`rounded-2xl p-2.5 flex items-center justify-between text-xs border ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-500/30 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>{currentMatch.date} • {currentMatch.time}</span>
              </div>
              <span className={`font-semibold text-[10px] px-2.5 py-0.5 rounded-md border ${
                isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {currentMatch.level_required}
              </span>
            </div>

            {/* Bottom action row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {currentMatch.joined_players?.map((p, i) => (
                    <img key={i} src={p.avatar} alt={p.name} title={p.name} className="w-6 h-6 rounded-full object-cover border-2 border-white shadow" />
                  ))}
                </div>
                <span className={`text-[11px] font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  ¡Falta {currentMatch.max_players - (currentMatch.joined_players?.length || 0)}!
                </span>
              </div>

              <button
                onClick={() => toast.success(`Te has sumado al partido en ${currentMatch.court_name}`)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4.5 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 cursor-pointer mr-1.5"
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
              idx === currentIndex
                ? 'w-6 bg-emerald-500 shadow-sm shadow-emerald-400'
                : isDark ? 'w-1.5 bg-emerald-950 border border-emerald-500/30 hover:bg-emerald-700' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

