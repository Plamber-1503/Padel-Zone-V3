import React, { useState } from 'react';
import { X, Building2, ShieldCheck, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyClubApplication, useRequestClubMembership } from '@/api/padelService';

// Auditoría 2026-08-09: reemplaza al viejo login falso de "Socio Club".
// Ahora cualquier jugador puede solicitar sumar su club acá; un moderador o
// admin la revisa desde el panel privado (/panel-padelzone) antes de que
// pueda publicar canchas — nadie entra sin que alguien del equipo lo mire.
export default function ClubApplicationModal({ isOpen, onClose }) {
  const { data: application, isLoading } = useMyClubApplication();
  const requestMembership = useRequestClubMembership();

  const [form, setForm] = useState({ name: '', address: '', city: 'Buenos Aires', phone: '', cuit: '', contact_email: '' });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.address.trim() || !form.cuit.trim()) {
      setError('Completá al menos el nombre del club, la dirección y el CUIT.');
      return;
    }
    try {
      await requestMembership.mutateAsync(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e1738] border border-amber-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">

        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                Portal B2B Exclusivo
              </span>
              <h3 className="font-bold text-base text-white">Sumar mi club</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading && (
          <p className="text-xs text-slate-400 text-center py-6">Cargando...</p>
        )}

        {!isLoading && application?.status === 'pending' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200 leading-relaxed">
                Tu solicitud para <strong>{application.name}</strong> está en revisión. Te contactamos en cuanto la
                aprobemos.
              </p>
            </div>
          </div>
        )}

        {!isLoading && application?.status === 'approved' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-200 leading-relaxed">Tu club ya está aprobado.</p>
            </div>
            <Link
              to="/club-dashboard"
              onClick={onClose}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Ir al panel de socio
            </Link>
          </div>
        )}

        {!isLoading && application?.status === 'rejected' && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200 leading-relaxed">
              <p className="font-semibold">Tu solicitud para {application.name} no fue aprobada.</p>
              {application.rejection_reason && <p className="mt-1">Motivo: {application.rejection_reason}</p>}
              <p className="mt-1">Si creés que es un error, escribinos a hola@padelzone.app.</p>
            </div>
          </div>
        )}

        {!isLoading && !application && (
          <>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              🔒 Completá estos datos para solicitar acceso al panel de socio. Un administrador de PadelZone revisa
              cada solicitud antes de aprobarla.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl font-medium">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nombre del club *</label>
                <input value={form.name} onChange={handleChange('name')} placeholder="ej. PadelClub Norte"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Dirección *</label>
                <input value={form.address} onChange={handleChange('address')} placeholder="Av. Libertador 1250"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Ciudad</label>
                  <input value={form.city} onChange={handleChange('city')}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Teléfono</label>
                  <input value={form.phone} onChange={handleChange('phone')} placeholder="11-xxxx-xxxx"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">CUIT *</label>
                <input value={form.cuit} onChange={handleChange('cuit')} placeholder="20-12345678-9"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Email de contacto</label>
                <input type="email" value={form.contact_email} onChange={handleChange('contact_email')} placeholder="contacto@tuclub.com"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
              </div>

              <button
                type="submit"
                disabled={requestMembership.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{requestMembership.isPending ? 'Enviando...' : 'Enviar solicitud'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
