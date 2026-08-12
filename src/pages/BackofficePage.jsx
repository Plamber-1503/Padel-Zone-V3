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
  useStaffAccessCandidates,
  useCreateVirtualClub,
  useSetClubVisibility,
  useCourtsForClub
} from '@/api/padelService';
import CourtCard from '@/components/social/CourtCard';
import CourtFormModal from '@/components/social/CourtFormModal';
import {
  Building2, Users, BarChart3, ShieldCheck, CheckCircle2, XCircle, Clock, KeyRound, Sun, Moon,
  Sparkles, Power, Plus, X, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

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
  const setVisibility = useSetClubVisibility();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedClubId, setExpandedClubId] = useState(null);
  const muted = cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs';

  return (
    <div className="space-y-4">
      <div className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' flex justify-between items-center p-4 rounded-2xl border'}>
        <div>
          <h2 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base'}>Clubes Activos</h2>
          <p className={muted}>Prendé o apagá la visibilidad de cada club, o sumá clubes virtuales para mostrar la app más poblada.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Crear Club Virtual</span>
        </button>
      </div>

      {isLoading && <p className={muted}>Cargando...</p>}
      {!isLoading && clubs.length === 0 && <p className={muted}>Todavía no hay clubes activos.</p>}

      <div className="space-y-3">
        {clubs.map((c) => {
          const isExpanded = expandedClubId === c.id;
          return (
            <div key={c.id} className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl p-4 space-y-3'}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm'}>{c.name}</h3>
                    {c.is_virtual && (
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Demo / Virtual
                      </span>
                    )}
                    {c.is_visible ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Visible</span>
                    ) : (
                      <span className="text-[10px] bg-slate-500/10 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Oculto</span>
                    )}
                  </div>
                  <p className={muted}>{c.address} · {c.city}</p>
                  <p className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[11px]'}>
                    {c.is_virtual ? 'Creado' : 'Aprobado'} el {(c.is_virtual ? c.created_at : c.reviewed_at) ? new Date(c.is_virtual ? c.created_at : c.reviewed_at).toLocaleDateString('es-AR') : '—'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {c.is_virtual && (
                    <button
                      onClick={() => setExpandedClubId(isExpanded ? null : c.id)}
                      className={cx(isDark, 'bg-slate-800 hover:bg-slate-700 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600') + ' flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer'}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Canchas
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => setVisibility.mutate({ clubId: c.id, isVisible: !c.is_visible })}
                    disabled={setVisibility.isPending}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer disabled:opacity-60 ${
                      c.is_visible
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border-emerald-500/30'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {c.is_visible ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>

              {isExpanded && c.is_virtual && <VirtualClubCourtsPanel isDark={isDark} club={c} />}
            </div>
          );
        })}
      </div>

      {isCreateOpen && (
        <CreateVirtualClubModal
          isDark={isDark}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(club) => setExpandedClubId(club.id)}
        />
      )}
    </div>
  );
}

function CreateVirtualClubModal({ isDark, onClose, onCreated }) {
  const createClub = useCreateVirtualClub();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Buenos Aires');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold text-xs block mb-1';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    setError('');
    createClub.mutate(
      { name, address, city, phone, description },
      { onSuccess: (club) => { onCreated?.(club); onClose(); }, onError: (err) => setError(err.message) }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base flex items-center gap-2'}>
            <Sparkles className="w-5 h-5 text-indigo-400" /> Crear Club Virtual
          </h3>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>
          Queda aprobado y visible al instante, sin dueño real. Después le cargás canchas desde "Canchas" en su tarjeta,
          con el mismo formulario que usa un dueño de club.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Nombre del club</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="ej. Padel Premium Belgrano" required />
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="ej. Av. Cabildo 2400" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ciudad</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono (opcional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Descripción (opcional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={createClub.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60 text-xs"
          >
            {createClub.isPending ? 'Creando...' : 'Crear Club Virtual'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Canchas de un club virtual puntual — mismo CourtCard/CourtFormModal que
// usa el dueño de un club real en su propio panel, para que el look y el
// comportamiento sean idénticos. defaultBookable=false: las canchas nuevas
// de un club virtual nunca se pueden reservar de verdad.
function VirtualClubCourtsPanel({ isDark, club }) {
  const { data: courts = [], isLoading } = useCourtsForClub(club.id);
  const [courtModal, setCourtModal] = useState(null); // null | 'add' | court

  return (
    <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' border-t pt-3 space-y-3'}>
      <div className="flex items-center justify-between">
        <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>
          Las canchas de un club virtual no se pueden reservar — solo se muestran para poblar la app.
        </p>
        <button
          onClick={() => setCourtModal('add')}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Agregar Cancha
        </button>
      </div>

      {isLoading && (
        <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs flex items-center gap-2 py-4 justify-center'}>
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando canchas...
        </p>
      )}
      {!isLoading && courts.length === 0 && (
        <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs py-2'}>Todavía no cargaste ninguna cancha para este club.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {courts.map((c) => (
          <CourtCard key={c.id} isDark={isDark} court={c} onEdit={() => setCourtModal(c)} showBookableControl />
        ))}
      </div>

      {courtModal && (
        <CourtFormModal
          isDark={isDark}
          club={club}
          court={courtModal === 'add' ? null : courtModal}
          defaultBookable={false}
          onClose={() => setCourtModal(null)}
        />
      )}
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
