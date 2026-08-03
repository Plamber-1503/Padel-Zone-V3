import React from 'react';

export default function Logo({ size = "md", showText = true }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      {/* Icono de Pádel Verde Esmeralda (Imagen Exacta del Usuario) */}
      <div className={`${sizes[size]} rounded-2xl bg-[#10b981] flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40 relative group-hover:scale-105 transition-all duration-300 overflow-hidden p-1 shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Mango de la raqueta hacia abajo a la izquierda */}
          <path d="M 20 80 L 36 64" stroke="#0a1128" strokeWidth="13" strokeLinecap="round"/>
          <path d="M 20 80 L 36 64" stroke="#ffffff" strokeWidth="7" strokeLinecap="round"/>

          {/* Cuello triangular oscuro */}
          <path d="M 33 63 L 44 52 L 30 49 Z" fill="#0a1128"/>

          {/* Cabeza de la raqueta en blanco con borde oscuro */}
          <path d="M 33 58 C 22 45 30 25 48 20 C 65 15 80 26 80 45 C 80 62 62 76 46 72 C 38 70 34 62 33 58 Z" fill="#ffffff" stroke="#0a1128" strokeWidth="4.5" strokeLinejoin="round"/>
          
          {/* Grilla de perforaciones (Puntos oscuros) */}
          <circle cx="48" cy="35" r="2.2" fill="#0a1128"/>
          <circle cx="55" cy="33" r="2.2" fill="#0a1128"/>
          <circle cx="62" cy="35" r="2.2" fill="#0a1128"/>
          <circle cx="44" cy="42" r="2.2" fill="#0a1128"/>
          <circle cx="51" cy="41" r="2.2" fill="#0a1128"/>
          <circle cx="58" cy="41" r="2.2" fill="#0a1128"/>
          <circle cx="65" cy="43" r="2.2" fill="#0a1128"/>
          <circle cx="47" cy="49" r="2.2" fill="#0a1128"/>
          <circle cx="54" cy="49" r="2.2" fill="#0a1128"/>
          <circle cx="61" cy="50" r="2.2" fill="#0a1128"/>
          <circle cx="50" cy="56" r="2.2" fill="#0a1128"/>
          <circle cx="57" cy="57" r="2.2" fill="#0a1128"/>

          {/* Pelota en esquina superior izquierda */}
          <circle cx="36" cy="31" r="11.5" fill="#ffffff" stroke="#0a1128" strokeWidth="4"/>
          <path d="M 29 24 C 34 28 34 34 29 38" stroke="#0a1128" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 43 24 C 38 28 38 34 43 38" stroke="#0a1128" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Brand Text: Padel (Blanco) + Zone (Verde Esmeralda) */}
      {showText && (
        <div className="flex flex-col">
          <span className="font-heading font-black text-xl tracking-tight flex items-center gap-1.5 leading-none">
            <span className="text-white dark:text-white font-extrabold">Padel</span>
            <span className="text-[#10b981] font-black">ZONE</span>
            <span className="text-[9px] font-mono bg-emerald-500/20 text-[#10b981] px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
              SOCIAL
            </span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
            Red Social & Canchas
          </span>
        </div>
      )}
    </div>
  );
}
