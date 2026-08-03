import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@padelzone.app');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-600 to-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <span className="text-slate-950 font-black text-3xl">P</span>
          </div>
          <h1 className="font-bold text-2xl text-white">Bienvenido a PadelZone v2</h1>
          <p className="text-xs text-slate-400">Red Social de Pádel & Reserva de Canchas</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Demo Users quick select */}
        <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 space-y-2">
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Cuentas Demo para probar:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => { setEmail('demo@padelzone.app'); setPassword('demo123'); }}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-left border border-slate-700 transition-colors"
            >
              <p className="font-bold text-emerald-400">Martín Gómez</p>
              <p className="text-[10px] text-slate-400">Jugador (4ta)</p>
            </button>
            <button
              onClick={() => { setEmail('carlos.owner@mail.com'); setPassword('demo123'); }}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-left border border-slate-700 transition-colors"
            >
              <p className="font-bold text-amber-400">Carlos R.</p>
              <p className="text-[10px] text-slate-400">Dueño de Club</p>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-xs">
            <label className="text-slate-300 font-semibold">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-slate-300 font-semibold">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            Iniciar Sesión
          </button>
        </form>

      </div>
    </div>
  );
}
