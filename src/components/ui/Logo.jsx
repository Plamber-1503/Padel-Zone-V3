import React from 'react';

export default function Logo({ size = "md", showText = true }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      {/* Mint Green Badge Icon matching exact user image */}
      <div className={`${sizes[size]} rounded-2xl bg-[#10b981] flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/40 relative group-hover:scale-105 transition-all duration-300 overflow-hidden p-1 shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-full h-full fill-none">
          {/* Dark background cutout path */}
          <path d="M50 18C32 18 20 30 20 48c0 14 8 26 22 30 1.5.4 3 .8 4.5.8 4 0 7.5-2.5 8.8-6.3l.5-1.5c1-3 3.8-5 7-5h5c8 0 15-6 16.5-14 1.8-9.5-4.5-18.5-14.3-20.2-1.6-.3-3.3-.3-5-.1-1.5.2-3-.6-3.8-2C58.8 24.2 54.7 18 50 18z" fill="#080c14"/>
          {/* Top Right Ball Circle */}
          <circle cx="67" cy="35" r="14" fill="#10b981"/>
          {/* Left Dot */}
          <circle cx="37" cy="44" r="5" fill="#10b981"/>
          {/* Lower Handle Base */}
          <path d="M42 66c-5 0-9 4-9 9 0 4.5 3.5 8 8 8h24c8 0 15-7 15-15 0-1.1-.1-2.2-.4-3.2-3.8 2-8.1 3.2-12.6 3.2H42z" fill="#10b981"/>
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <span className="font-heading font-black text-xl tracking-tight text-white flex items-center gap-1.5 leading-none">
            Padel<span className="text-emerald-400">Zone</span>
            <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
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
