import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSocialLogin = async (provider) => {
    setLoadingProvider(provider);
    setError('');
    try {
      if (isSupabaseConfigured && supabase) {
        const origin = window.location.origin;
        const baseUrl = import.meta.env.BASE_URL || '/';
        const redirectUrl = `${origin}${baseUrl}`.replace(/\/+$/, '/');

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: provider, // 'google' | 'facebook'
          options: {
            redirectTo: redirectUrl
          }
        });

        if (error) throw error;

        // Redirección explícita indispensable para navegadores móviles y webviews integrados
        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        // En modo Demo sin Supabase activo
        login(provider === 'facebook' ? 'sofia.rossi@padelzone.app' : 'demo@padelzone.app', 'demo123');
        navigate('/');
      }
    } catch (err) {
      console.error('Error al iniciar sesión con OAuth:', err);
      setError(err.message || 'No se pudo iniciar sesión con Google. Reintenta.');
    } finally {
      setLoadingProvider(null);
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
          <h1 className="font-bold text-2xl text-white">Bienvenido a PadelZone</h1>
          <p className="text-xs text-slate-400">Ingresá en 1 segundo y unite a partidos en tu zona</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* ── 1. SOCIAL LOGIN BUTTONS (GOOGLE & FACEBOOK - FAST 1-CLICK) ────── */}
        <div className="space-y-3">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={loadingProvider === 'google'}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{loadingProvider === 'google' ? 'Conectando con Google...' : 'Continuar con Google'}</span>
          </button>

          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={loadingProvider === 'facebook'}
            className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>{loadingProvider === 'facebook' ? 'Conectando con Facebook...' : 'Continuar con Facebook'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase">o con email</span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {/* Demo Users quick select */}
        <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/50 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Cuentas Demo solicitadas (Clave: demo1234):</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => { setEmail('jugador1@padelzone.app'); setPassword('demo1234'); }}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-center border border-slate-700 transition-colors"
            >
              <p className="font-bold text-emerald-400">Jugador 1</p>
              <p className="text-[10px] text-slate-400">Nivel 4ta</p>
            </button>
            <button
              onClick={() => { setEmail('jugador2@padelzone.app'); setPassword('demo1234'); }}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-center border border-slate-700 transition-colors"
            >
              <p className="font-bold text-amber-400">Jugador 2</p>
              <p className="text-[10px] text-slate-400">Nivel 5ta</p>
            </button>
            <button
              onClick={() => { setEmail('jugador3@padelzone.app'); setPassword('demo1234'); }}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-center border border-slate-700 transition-colors"
            >
              <p className="font-bold text-emerald-300">Jugador 3</p>
              <p className="text-[10px] text-slate-400">Nivel 3ra</p>
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
            Iniciar Sesión con Email
          </button>
        </form>

      </div>
    </div>
  );
}

