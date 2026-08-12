import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  usePendingClubs,
  useActiveClubsAdmin,
  useApproveClub,
  useRejectClub,
  useAllUsersAdmin,
  useBusinessMetrics,
  useUpdateStaffPermissions,
  useStaffAccessCandidates
} from '@/api/padelService';
import { Building2, Users, BarChart3, ShieldCheck, CheckCircle2, XCircle, Clock, KeyRound, Sun, Moon } from 'lucide-react';

const PERMISSION_LABELS = {
  pending_clubs: 'Clubes pendientes',
  active_clubs: 'Clubes activos',
  users: 'Usuarios'
};

const THEME_KEY = 'pz3_theme_admin_panel';

// Elige entre dos clases según el tema — modo oscuro/claro propio de este
// panel, independiente del tema general de la app y del panel de club (cada
// uno guarda su preferencia por separado).
const cx = (isDark, dark, light) => (isDark ? dark : light);

// Panel privado de PadelZone — sin ningún link visible en el sitio, se accede
// tipeando la URL directamente. Protegido por StaffRoute (src/App.jsx).
// Gestión de accesos 2026-08-10: reemplaza el viejo rol fijo "moderator" por
// permisos por sección (staff_permissions), otorgables uno a uno desde acá.
export default function BackofficePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const perms = user?.staff_permissions || [];
  const has = (p) => isAdmin || perms.includes(p);

  const [isDark, setIsDark] = useState(() => {
    try { return (localStorage.getItem(THEME_KEY) || 'dark') === 'dark'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch { /* noop */ }
  }, [isDark]);

  const tabs = [
    has('pending_clubs') && { id: 'pending', label: 'Clubes pendientes', icon: Clock },
    has('active_clubs') && { id: 'active', label: 'Clubes activos', icon: Building2 },
    has('users') && { id: 'users', label: 'Usuarios', icon: Users },
    isAdmin && { id: 'metrics', label: 'Métricas del negocio', icon: BarChart3 },
    isAdmin && { id: 'access', label: 'Gestión de accesos', icon: KeyRound }
  ].filter(Boolean);

  const [tab, setTab] = useState(tabs[0]?.id);

  return (
    <div className={cx(isDark, 'bg-[#0a1128] text-slate-100', 'bg-slate-50 text-slate-900') + ' min-h-screen p-4 md:p-8'}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-slate-950">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-lg'}>Panel privado de PadelZone</h1>
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>Sesión de {user?.full_name} · {isAdmin ? 'admin' : 'acceso: ' + (perms.map(p => PERMISSION_LABELS[p]).join(', ') || 'ninguno')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={cx(isDark, 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-white', 'bg-white border-slate-200 text-slate-600 hover:text-slate-900') + ' flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all shrink-0'}
          >
            {isDark ? <><Sun className="w-3.5 h-3.5 text-amber-400" /> Claro</> : <><Moon className="w-3.5 h-3.5 text-indigo-500" /> Oscuro</>}
          </button>
        </div>

        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex flex-wrap gap-2 border-b pb-3'}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === t.id ? 'bg-emerald-500 text-slate-950' : cx(isDark, 'bg-slate-800/60 text-slate-300 hover:text-white', 'bg-slate-100 text-slate-600 hover:text-slate-900')
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'pending' && has('pending_clubs') && <PendingClubsTab isDark={isDark} />}
        {tab === 'active' && has('active_clubs') && <ActiveClubsTab isDark={isDark} />}
        {tab === 'users' && has('users') && <UsersTab isDark={isDark} />}
        {tab === 'metrics' && isAdmin && <MetricsTab isDark={isDark} />}
        {tab === 'access' && isAdmin && <AccessManagementTab isDark={isDark} />}
      </div>
    </div>
  );
}

function PendingClubsTab({ isDark }) {
  const { data: clubs = [], isLoading } = usePendingClubs();
  const approve = useApproveClub();
  const reject = useRejectClub();
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const muted = cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs';
  if (isLoading) return <p className={muted}>Cargando...</p>;
  if (clubs.length === 0) return <p className={muted}>No hay solicitudes pendientes.</p>;

  return (
    <div className="space-y-3">
      {clubs.map((c) => (
        <div key={c.id} className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl p-4 space-y-2'}>
          <div className="flex items-center justify-between">
            <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm'}>{c.name}</h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Pendiente</span>
          </div>
          <p className={muted}>{c.address} · {c.city}</p>
          <p className={muted}>CUIT: {c.cuit || '—'} · Tel: {c.phone || '—'} · Email: {c.contact_email || '—'}</p>

          {rejectingId === c.id ? (
            <div className="space-y-2 pt-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo del rechazo (opcional)"
                className={cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl px-3 py-2 text-xs'}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => reject.mutate({ clubId: c.id, reason }, { onSuccess: () => { setRejectingId(null); setReason(''); } })}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
                >
                  Confirmar rechazo
                </button>
                <button onClick={() => setRejectingId(null)} className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' px-3 text-xs cursor-pointer'}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => approve.mutate(c.id)}
                disabled={approve.isPending}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
              </button>
              <button
                onClick={() => setRejectingId(c.id)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-500/20 text-red-500 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/30 cursor-pointer"
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

function ActiveClubsTab({ isDark }) {
  const { data: clubs = [], isLoading } = useActiveClubsAdmin();
  const muted = cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs';
  if (isLoading) return <p className={muted}>Cargando...</p>;
  if (clubs.length === 0) return <p className={muted}>Todavía no hay clubes activos.</p>;

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {clubs.map((c) => (
        <div key={c.id} className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl p-4 space-y-1'}>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm'}>{c.name}</h3>
          <p className={muted}>{c.address} · {c.city}</p>
          <p className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[11px]'}>Aprobado el {c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString('es-AR') : '—'}</p>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ isDark }) {
  const { data: users = [], isLoading } = useAllUsersAdmin();
  if (isLoading) return <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>Cargando...</p>;

  return (
    <div className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl overflow-x-auto'}>
      <table className="w-full text-xs">
        <thead>
          <tr className={cx(isDark, 'text-slate-500 border-slate-800', 'text-slate-400 border-slate-200') + ' text-left uppercase text-[10px] border-b'}>
            <th className="p-3">Nombre</th>
            <th className="p-3">Email</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Alta</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={cx(isDark, 'border-slate-800/60', 'border-slate-100')}>
              <td className={cx(isDark, 'text-slate-200', 'text-slate-800') + ' p-3 font-semibold'}>{u.full_name}</td>
              <td className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' p-3'}>{u.email}</td>
              <td className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' p-3'}>{u.role}</td>
              <td className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' p-3'}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricsTab({ isDark }) {
  const { data, isLoading } = useBusinessMetrics();
  if (isLoading) return <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>Cargando...</p>;

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
        <div key={it.label} className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl p-4'}>
          <p className={cx(isDark, 'text-white', 'text-slate-900') + ' text-2xl font-black'}>{it.value}</p>
          <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs mt-1'}>{it.label}</p>
        </div>
      ))}
    </div>
  );
}

function AccessManagementTab({ isDark }) {
  // Gestión de accesos 2026-08-10: solo trae a quienes pidieron acceso o ya
  // lo tienen — no la base completa de usuarios registrados.
  const { data: candidates = [], isLoading } = useStaffAccessCandidates();
  const updatePerms = useUpdateStaffPermissions();
  const permKeys = Object.keys(PERMISSION_LABELS);
  const muted = cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs';

  if (isLoading) return <p className={muted}>Cargando...</p>;

  const toggle = (u, perm) => {
    const current = u.staff_permissions || [];
    const next = current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm];
    updatePerms.mutate({ userId: u.id, permissions: next });
  };

  return (
    <div className="space-y-3">
      <p className={muted + ' max-w-2xl'}>
        Acá aparece quien solicitó acceso al panel desde "Continuar con Google" → link privado, y quien ya tiene
        algún permiso otorgado. Tildá qué secciones puede ver cada uno. Las métricas del negocio quedan exclusivas
        de tu cuenta admin y no se pueden otorgar desde acá.
      </p>

      {candidates.length === 0 ? (
        <p className={muted}>Todavía nadie solicitó acceso.</p>
      ) : (
        <div className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl overflow-x-auto'}>
          <table className="w-full text-xs">
            <thead>
              <tr className={cx(isDark, 'text-slate-500 border-slate-800', 'text-slate-400 border-slate-200') + ' text-left uppercase text-[10px] border-b'}>
                <th className="p-3">Usuario</th>
                <th className="p-3">Estado</th>
                {permKeys.map((p) => (
                  <th key={p} className="p-3 text-center">{PERMISSION_LABELS[p]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((u) => {
                const current = u.staff_permissions || [];
                const hasAnyAccess = current.length > 0;
                return (
                  <tr key={u.id} className={cx(isDark, 'border-slate-800/60', 'border-slate-100')}>
                    <td className="p-3">
                      <p className={cx(isDark, 'text-slate-200', 'text-slate-800') + ' font-semibold'}>{u.full_name}</p>
                      <p className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[11px]'}>{u.email}</p>
                    </td>
                    <td className="p-3">
                      {hasAnyAccess ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Habilitado</span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Pendiente</span>
                      )}
                    </td>
                    {permKeys.map((p) => (
                      <td key={p} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={current.includes(p)}
                          onChange={() => toggle(u, p)}
                          disabled={updatePerms.isPending}
                          className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
