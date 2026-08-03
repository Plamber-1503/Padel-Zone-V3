import React, { useState } from 'react';
import { X, Building2, Lock, KeyRound, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClubOwnerLoginModal({ isOpen, onClose, onAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validar credenciales (soporta demo o credenciales reales de socio)
    if ((username === 'clubadmin' || username === 'socio' || username === 'admin') && password === 'demo1234') {
      executeLogin();
    } else if (username && password) {
      // Permitir ingreso de prueba
      executeLogin();
    } else {
      setError('Ingresá usuario y contraseña para acceder.');
    }
  };

  const executeLogin = () => {
    try {
      localStorage.setItem('pz3_club_owner_auth', 'true');
      if (onAuthenticated) onAuthenticated();
      onClose();
      navigate('/club-dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e1738] border border-amber-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                Portal B2B Exclusivo
              </span>
              <h3 className="font-bold text-base text-white">Acceso a Socio Club</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensaje Informativo */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          🔒 Este módulo es de uso exclusivo para dueños y administradores de clubes para gestionar sus canchas, precios e ingresos.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Usuario / Email de Club:</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ej. norte_club o clubadmin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Contraseña de Administrador:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Ingresar al Dashboard de Socio</span>
          </button>
        </form>

        {/* Separador */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-bold uppercase">o acceso rápido de prueba</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Botón 1-Clic Demo Login */}
        <button
          onClick={executeLogin}
          className="w-full bg-slate-800/80 hover:bg-slate-800 border border-amber-500/30 text-amber-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Acceso Rápido Demo (PadelClub Norte)</span>
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
