import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  usePendingClubs,
  useActiveClubsAdmin,
  useApproveClub,
  useRejectClub,
  useAllUsersAdmin,
  useBusinessMetrics
} from '@/api/padelService';
import { Building2, Users, BarChart3, ShieldCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';

// Panel privado de PadelZone — sin ningún link visible en el sitio, se accede
// tipeando la URL directamente. Protegido por StaffRoute (src/App.jsx), que
// exige role 'moderator' o 'admin' en la cuenta ya logueada.
export default function BackofficePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('pending');

  const tabs = [
    { id: 'pending', label: 'Clubes pendientes', icon: Clock },
    { id: 'active', label: 'Clubes activos', icon: Building2 },
    { id: 'users', label: 'Usuarios', icon: Users },
    ...(isAdmin ? [{ id: 'metrics', label: 'Métricas del negocio', icon: BarChart3 }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#0a1128] text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-slate-950">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Panel privado de PadelZone</h1>
            <p className="text-xs text-slate-400">Sesión de {user?.full_name} · rol {user?.role}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800/60 text-slate-300 hover:text-white'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'pending' && <PendingClubsTab />}
        {tab === 'active' && <ActiveClubsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'metrics' && isAdmin && <MetricsTab />}
      </div>
    </div>
  );
}

function PendingClubsTab() {
  const { data: clubs = [], isLoading } = usePendingClubs();
  const approve = useApproveClub();
  const reject = useRejectClub();
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  if (isLoading) return <p className="text-xs text-slate-400">Cargando...</p>;
  if (clubs.length === 0) return <p className="text-xs text-slate-400">No hay solicitudes pendientes.</p>;

  return (
    <div className="space-y-3">
      {clubs.map((c) => (
        <div key={c.id} className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">{c.name}</h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Pendiente</span>
          </div>
          <p className="text-xs text-slate-400">{c.address} · {c.city}</p>
          <p className="text-xs text-slate-400">CUIT: {c.cuit || '—'} · Tel: {c.phone || '—'} · Email: {c.contact_email || '—'}</p>

          {rejectingId === c.id ? (
            <div className="space-y-2 pt-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo del rechazo (opcional)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => reject.mutate({ clubId: c.id, reason }, { onSuccess: () => { setRejectingId(null); setReason(''); } })}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-xl"
                >
                  Confirmar rechazo
                </button>
                <button onClick={() => setRejectingId(null)} className="px-3 text-xs text-slate-400">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => approve.mutate(c.id)}
                disabled={approve.isPending}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
              </button>
              <button
                onClick={() => setRejectingId(c.id)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-500/20 text-red-400 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/30"
              >
                <XCircle className="w-3.5 h-3.5" /> Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ActiveClubsTab() {
  const { data: clubs = [], isLoading } = useActiveClubsAdmin();
  if (isLoading) return <p className="text-xs text-slate-400">Cargando...</p>;
  if (clubs.length === 0) return <p className="text-xs text-slate-400">Todavía no hay clubes activos.</p>;

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {clubs.map((c) => (
        <div key={c.id} className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 space-y-1">
          <h3 className="font-bold text-sm text-white">{c.name}</h3>
          <p className="text-xs text-slate-400">{c.address} · {c.city}</p>
          <p className="text-[11px] text-slate-500">Aprobado el {c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString('es-AR') : '—'}</p>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { data: users = [], isLoading } = useAllUsersAdmin();
  if (isLoading) return <p className="text-xs text-slate-400">Cargando...</p>;

  return (
    <div className="bg-[#0b1322] border border-slate-800 rounded-2xl overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 uppercase text-[10px] border-b border-slate-800">
            <th className="p-3">Nombre</th>
            <th className="p-3">Email</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Alta</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-slate-800/60">
              <td className="p-3 text-slate-200 font-semibold">{u.full_name}</td>
              <td className="p-3 text-slate-400">{u.email}</td>
              <td className="p-3 text-slate-400">{u.role}</td>
              <td className="p-3 text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricsTab() {
  const { data, isLoading } = useBusinessMetrics();
  if (isLoading) return <p className="text-xs text-slate-400">Cargando...</p>;

  const items = [
    { label: 'Usuarios totales', value: data?.totalUsers },
    { label: 'Clubes activos', value: data?.activeClubs },
    { label: 'Canchas activas', value: data?.activeCourts },
    { label: 'Reservas totales', value: data?.bookingsTotal },
    { label: 'Reservas de hoy', value: data?.bookingsToday }
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-white">{it.value}</p>
          <p className="text-xs text-slate-400 mt-1">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
