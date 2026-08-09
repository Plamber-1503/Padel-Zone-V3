import React from 'react';
import { X, Building2, ShieldCheck, Mail } from 'lucide-react';

// Auditoría 2026-08-09: este modal antes era un formulario de login que
// aceptaba cualquier usuario/contraseña no vacíos (más un botón de acceso
// de un clic sin credenciales), y otorgaba acceso al panel de socio seteando
// una bandera en localStorage. El acceso real ahora depende únicamente de
// profiles.role ('court_owner' | 'admin') verificado server-side por
// ClubOwnerRoute (src/App.jsx) — no existe ningún "login" alternativo acá.
export default function ClubOwnerLoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

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
              <h3 className="font-bold text-base text-white">Acceso restringido</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          🔒 Este módulo es de uso exclusivo para dueños y administradores de clubes verificados por PadelZone. Tu
          cuenta todavía no tiene permisos de socio de club.
        </p>

        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-200 leading-relaxed">
            Si sos dueño de un club y querés sumar tus canchas a la plataforma, escribinos y habilitamos tu cuenta
            manualmente.
          </p>
        </div>

        <a
          href="mailto:hola@padelzone.app?subject=Quiero%20sumar%20mi%20club%20a%20PadelZone"
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          <span>Solicitar acceso de socio</span>
        </a>
      </div>
    </div>
  );
}
