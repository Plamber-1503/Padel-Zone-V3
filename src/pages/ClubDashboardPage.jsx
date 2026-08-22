import React, { useState, useEffect } from 'react';
import {
  useMyClubCourts,
  useMyClubMetrics,
  useCancelledBookingsForOwner,
  usePosts,
  useSetClubCommentsAllowed
} from '@/api/padelService';
import PostCard from '@/components/social/PostCard';
import CourtCard from '@/components/social/CourtCard';
import CourtFormModal from '@/components/social/CourtFormModal';
import ClubPostComposerModal from '@/components/social/ClubPostComposerModal';
import Logo from '@/components/ui/Logo';
import {
  Building2,
  Plus,
  BarChart3,
  Lock,
  CalendarX,
  Repeat,
  Loader2,
  LayoutGrid,
  ArrowRight,
  Megaphone,
  Sun,
  Moon,
  MessageCircle,
  Pencil,
  Clock
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ClubEditModal from '@/components/social/ClubEditModal';
import ClubScheduleTab from '@/components/social/ClubScheduleTab';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
  { id: 'inventory', label: 'Canchas', icon: Building2 },
  { id: 'schedule', label: 'Horarios y Turnos', icon: Clock },
  { id: 'posts', label: 'Publicaciones', icon: Megaphone },
  { id: 'metrics', label: 'Métricas & Facturación', icon: BarChart3 },
  { id: 'locks', label: 'Bloqueo de Turnos', icon: Lock },
  { id: 'cancellations', label: 'Cancelaciones', icon: CalendarX }
];

const THEME_KEY = 'pz3_theme_club_panel';

// Elige entre dos clases según el tema — se usa en todo el panel para tener
// modo oscuro/claro propio, independiente del tema general de la app y del
// panel privado de PadelZone (cada uno guarda su preferencia por separado).
const cx = (isDark, dark, light) => (isDark ? dark : light);

export default function ClubDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('resumen');

  // Panel de un club puntual (?clubId=...): lo usa el panel privado para
  // abrir el panel de un club de demo, que no tiene dueño con quien
  // resolverlo. Solo se honra si quien mira es staff — un jugador cualquiera
  // que pegue el parámetro a mano sigue viendo su propio club (y las RLS lo
  // frenan igual del lado del servidor).
  const isStaff = user?.role === 'admin' || (user?.staff_permissions || []).includes('active_clubs');
  const requestedClubId = searchParams.get('clubId');
  const clubId = isStaff ? requestedClubId : null;

  const { data: clubData, isLoading: isLoadingCourts } = useMyClubCourts(clubId);
  const club = clubData?.club || null;
  const courtsList = clubData?.courts || [];
  const { data: metrics } = useMyClubMetrics(clubId);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    try { return (localStorage.getItem(THEME_KEY) || 'dark') === 'dark'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch { /* noop */ }
  }, [isDark]);

  // courtModal: null (cerrado) | 'add' | objeto de cancha (editando esa cancha)
  const [courtModal, setCourtModal] = useState(null);

  const handleLogoutSocio = () => navigate(clubId ? '/panel-padelzone' : '/');

  return (
    <div className={cx(isDark, 'min-h-screen bg-[#080c14] text-slate-100', 'min-h-screen bg-slate-50 text-slate-900') + ' p-4 md:p-8'}>
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── TIRA DE MARCA (página propia, fuera del layout social) ──────── */}
      <div className="flex items-center justify-between">
        <Link to="/"><Logo size="sm" /></Link>
        <div className="flex items-center gap-3">
          <span className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[11px] font-bold uppercase tracking-wider'}>Portal de Club</span>
          <button
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={cx(isDark, 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-white', 'bg-white border-slate-200 text-slate-600 hover:text-slate-900') + ' flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all'}
          >
            {isDark ? <><Sun className="w-3.5 h-3.5 text-amber-400" /> Claro</> : <><Moon className="w-3.5 h-3.5 text-indigo-500" /> Oscuro</>}
          </button>
        </div>
      </div>

      {/* ── HEADER DEL SOCIO CLUB B2B ───────────────────────────────────── */}
      <div className={cx(isDark, 'bg-gradient-to-br from-[#151d33] to-[#0e1738] border-amber-500/40', 'bg-gradient-to-br from-amber-50 to-white border-amber-300') + ' border rounded-3xl p-6 shadow-2xl space-y-5'}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 shrink-0 font-black text-lg">
              {(club?.name || 'PZ').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                  Socio Club Verificado
                </span>
                <span className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>{club?.name || 'Tu club'}</span>
              </div>
              <h1 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-extrabold text-2xl tracking-tight mt-0.5'}>Portal de Administración</h1>
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs mt-0.5'}>Tu plataforma de gestión — canchas, torneos, profesores y eventos.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setIsEditOpen(true)}
              disabled={!club}
              className={cx(isDark, 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700', 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300') + ' flex-1 md:flex-none font-bold text-xs px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50'}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar Club</span>
            </button>
            <button
              onClick={() => setCourtModal('add')}
              className="flex-1 md:flex-none bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Agregar Cancha</span>
            </button>
            <button
              onClick={handleLogoutSocio}
              className={cx(isDark, 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700', 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300') + ' flex-1 md:flex-none font-bold text-xs px-4 py-2.5 rounded-xl border transition-colors cursor-pointer'}
            >
              {clubId ? 'Volver al panel' : 'Salir de Socio'}
            </button>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className={cx(isDark, 'border-slate-800/80', 'border-slate-200') + ' flex items-center gap-2 pt-4 border-t overflow-x-auto'}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : cx(isDark, 'text-slate-400 hover:text-white hover:bg-slate-800/50', 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.id === 'inventory' ? `${t.label} (${courtsList.filter((c) => c.is_active).length} Activas)` : t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── RESUMEN ──────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Kpi isDark={isDark} label="Facturación Este Mes" value={metrics ? `$${metrics.revenueThisMonth.toLocaleString()}` : '—'} sub="Reservas confirmadas del mes" accent />
            <Kpi isDark={isDark} label="Horas Reservadas" value={metrics ? `${metrics.hoursBooked} hs` : '—'} sub="Este mes" />
            <Kpi isDark={isDark} label="Reservas Este Mes" value={metrics ? metrics.bookingsCount : '—'} sub="Turnos confirmados" />
            <Kpi isDark={isDark} label="Canchas Activas" value={courtsList.filter((c) => c.is_active).length} sub={`${courtsList.length} en total`} />
          </div>

          <div>
            <h2 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base mb-3'}>Accesos rápidos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <QuickCard isDark={isDark} icon={Building2} title="Agregar cancha" sub="Fotos, precio y diferenciales" onClick={() => setCourtModal('add')} />
              <QuickCard isDark={isDark} icon={Megaphone} title="Publicar novedad" sub="Compartí fotos y novedades del club" onClick={() => setActiveTab('posts')} />
              <QuickCard isDark={isDark} icon={BarChart3} title="Ver métricas" sub="Facturación y ocupación reales" onClick={() => setActiveTab('metrics')} />
              <QuickCard isDark={isDark} icon={CalendarX} title="Cancelaciones" sub="Compromiso de tus jugadores" onClick={() => setActiveTab('cancellations')} />
            </div>
          </div>
        </div>
      )}

      {/* ── CANCHAS ──────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className={cx(isDark, 'bg-slate-900/90 border-slate-800', 'bg-white border-slate-200') + ' flex justify-between items-center p-4 rounded-2xl border'}>
            <div>
              <h2 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base'}>Inventario de Canchas del Club</h2>
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>Administrá las canchas disponibles para los jugadores de la aplicación.</p>
            </div>
            <button
              onClick={() => setCourtModal('add')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Agregar Cancha</span>
            </button>
          </div>

          {isLoadingCourts && (
            <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs flex items-center gap-2 py-6 justify-center'}>
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando canchas...
            </p>
          )}
          {!isLoadingCourts && !club && (
            <EmptyState isDark={isDark}>No encontramos un club asociado a tu cuenta todavía.</EmptyState>
          )}
          {!isLoadingCourts && club && courtsList.length === 0 && (
            <EmptyState isDark={isDark}>Todavía no cargaste ninguna cancha. Usá "Agregar Cancha" para sumar la primera.</EmptyState>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courtsList.map((c) => (
              <CourtCard key={c.id} isDark={isDark} court={c} onEdit={() => setCourtModal(c)} />
            ))}
          </div>
        </div>
      )}

      {/* ── METRICAS ─────────────────────────────────────────────────── */}
      {activeTab === 'metrics' && <MetricsTab isDark={isDark} />}

      {/* ── BLOQUEO DE TURNOS ────────────────────────────────────────── */}
      {activeTab === 'locks' && (
        <div className={cx(isDark, 'bg-slate-900 border-slate-800', 'bg-white border-slate-200') + ' p-6 rounded-3xl border space-y-3 text-center'}>
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base'}>Bloqueo de Turnos por Mantenimiento o Clases</h3>
          <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs max-w-md mx-auto'}>
            Próximamente vas a poder seleccionar una cancha y bloquear un rango horario para que no pueda ser
            reservado por jugadores. Todavía no está disponible.
          </p>
          <span className={cx(isDark, 'bg-slate-800 text-slate-400 border-slate-700', 'bg-slate-100 text-slate-500 border-slate-300') + ' inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border'}>
            <Lock className="w-4 h-4" /> Próximamente
          </span>
        </div>
      )}

      {/* ── PUBLICACIONES DEL CLUB ──────────────────────────────────────── */}
      {activeTab === 'schedule' && <ClubScheduleTab isDark={isDark} club={club} courtsList={courtsList} />}
      {activeTab === 'posts' && <ClubPostsTab isDark={isDark} club={club} courtsList={courtsList} />}

      {/* ── CANCELACIONES ────────────────────────────────────────────── */}
      {activeTab === 'cancellations' && <CancellationsTab isDark={isDark} clubId={clubId} />}

      {/* ── MODAL AGREGAR / EDITAR CANCHA ───────────────────────────── */}
      {isEditOpen && club && (
        <ClubEditModal isDark={isDark} club={club} onClose={() => setIsEditOpen(false)} />
      )}

      {courtModal && (
        club ? (
          <CourtFormModal isDark={isDark} club={club} court={courtModal === 'add' ? null : courtModal} onClose={() => setCourtModal(null)} />
        ) : (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className={cx(isDark, 'bg-[#0e1738] border-red-500/40', 'bg-white border-red-300') + ' border rounded-3xl w-full max-w-sm p-6 space-y-3 text-center shadow-2xl'}>
              <p className={cx(isDark, 'text-white', 'text-slate-900') + ' text-sm font-bold'}>No encontramos un club asociado a tu cuenta.</p>
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>
                Para agregar canchas primero necesitás una solicitud de club aprobada. Si ya tenés un club, avisale a soporte que
                tu cuenta no aparece vinculada.
              </p>
              <button onClick={() => setCourtModal(null)} className={cx(isDark, 'bg-slate-800 hover:bg-slate-700 text-slate-200', 'bg-slate-100 hover:bg-slate-200 text-slate-700') + ' text-xs font-bold px-4 py-2 rounded-xl cursor-pointer'}>
                Entendido
              </button>
            </div>
          </div>
        )
      )}
    </div>
    </div>
  );
}

function EmptyState({ isDark, children }) {
  return (
    <div className={cx(isDark, 'bg-slate-900 border-slate-800 text-slate-400', 'bg-white border-slate-200 text-slate-500') + ' p-8 rounded-3xl border text-center text-sm'}>
      {children}
    </div>
  );
}

function Kpi({ isDark, label, value, sub, accent }) {
  return (
    <div className={cx(isDark, 'bg-slate-900', 'bg-white') + ` p-4 rounded-2xl border space-y-1 ${accent ? 'border-emerald-500/30' : cx(isDark, 'border-slate-800', 'border-slate-200')}`}>
      <span className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>{label}</span>
      <p className={`font-black text-2xl ${accent ? 'text-emerald-500' : cx(isDark, 'text-white', 'text-slate-900')}`}>{value}</p>
      <p className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[10px] font-semibold'}>{sub}</p>
    </div>
  );
}

function QuickCard({ isDark, icon: Icon, title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cx(isDark, 'bg-slate-900 border-slate-800 hover:border-emerald-500/50', 'bg-white border-slate-200 hover:border-emerald-500/50') + ' border rounded-2xl p-4 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 cursor-pointer'}
    >
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm'}>{title}</p>
        <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[11px]'}>{sub}</p>
      </div>
      <ArrowRight className={cx(isDark, 'text-slate-600', 'text-slate-400') + ' w-4 h-4 shrink-0'} />
    </button>
  );
}

// Métricas reales del club (mes en curso), calculadas en
// padelService.getMyClubMetrics() a partir de las reservas confirmadas de
// las canchas del club — ya no son valores fijos inventados en el código.
function MetricsTab({ isDark }) {
  const { data: metrics, isLoading } = useMyClubMetrics();

  if (isLoading) {
    return (
      <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs flex items-center gap-2 py-6 justify-center'}>
        <Loader2 className="w-4 h-4 animate-spin" /> Calculando métricas...
      </p>
    );
  }

  if (!metrics) {
    return <EmptyState isDark={isDark}>No encontramos un club asociado a tu cuenta todavía.</EmptyState>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <Kpi isDark={isDark} label="Facturación Este Mes" value={`$${metrics.revenueThisMonth.toLocaleString()}`} sub="Reservas confirmadas del mes" accent />
      <Kpi isDark={isDark} label="Horas Reservadas" value={`${metrics.hoursBooked} hs`} sub="Este mes" />
      <Kpi isDark={isDark} label="Reservas Este Mes" value={metrics.bookingsCount} sub="Turnos confirmados" />
      <Kpi isDark={isDark} label="Cancha Más Reservada" value={metrics.topCourt?.name || '—'} sub={metrics.topCourt ? `${metrics.topCourtSharePct}% del total` : 'Sin reservas todavía'} />
    </div>
  );
}

// Cancelaciones y modificaciones de reservas de las canchas del club — para
// ver qué tan seguido cancelan/modifican los jugadores y con quién.
function CancellationsTab({ isDark, clubId }) {
  const { data: rows = [], isLoading } = useCancelledBookingsForOwner(clubId);

  if (isLoading) return <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>Cargando...</p>;
  if (rows.length === 0) {
    return <EmptyState isDark={isDark}>Todavía no hay cancelaciones ni modificaciones registradas en tus canchas.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs max-w-2xl'}>
        Reservas canceladas o modificadas en tus canchas — usalo para ver qué jugadores cumplen sus turnos y cuáles
        cancelan seguido, y pensar cómo mejorar esos índices.
      </p>
      <div className={cx(isDark, 'bg-[#0b1322] border-slate-800', 'bg-white border-slate-200') + ' border rounded-2xl overflow-x-auto'}>
        <table className="w-full text-xs">
          <thead>
            <tr className={cx(isDark, 'text-slate-500 border-slate-800', 'text-slate-400 border-slate-200') + ' text-left uppercase text-[10px] border-b'}>
              <th className="p-3">Cancha</th>
              <th className="p-3">Turno original</th>
              <th className="p-3">Reservado por</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Cancelado por</th>
              <th className="p-3">Cuándo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className={cx(isDark, 'border-slate-800/60', 'border-slate-100')}>
                <td className={cx(isDark, 'text-slate-200', 'text-slate-800') + ' p-3 font-semibold'}>{b.court_name}</td>
                <td className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' p-3'}>{b.date} · {(b.start_time || '').slice(0, 5)}</td>
                <td className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' p-3'}>{b.booker_name}</td>
                <td className="p-3">
                  {b.was_modification ? (
                    <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 w-fit">
                      <Repeat className="w-2.5 h-2.5" /> Modificada
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Cancelada</span>
                  )}
                </td>
                <td className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' p-3'}>{b.cancelled_by_name || '—'}</td>
                <td className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' p-3'}>{b.cancelled_at ? new Date(b.cancelled_at).toLocaleString('es-AR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Publicaciones/novedades del club (fotos, avisos) — se muestran en el feed
// social general de la app con la marca "Club Oficial", pero se cargan y se
// ven acá, en el propio panel del club, no en el feed de otros socios.
function ClubPostsTab({ isDark, club, courtsList }) {
  const { data: allPosts = [], refetch } = usePosts('all');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const setCommentsAllowed = useSetClubCommentsAllowed();
  const courtIds = new Set(courtsList.map((c) => c.id));
  const clubPosts = allPosts.filter((p) => courtIds.has(p.court_id));
  const commentsAllowed = club?.allow_comments !== false;

  return (
    <div className="space-y-4">
      <div className={cx(isDark, 'bg-slate-900/90 border-slate-800', 'bg-white border-slate-200') + ' flex justify-between items-center p-4 rounded-2xl border'}>
        <div>
          <h2 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base'}>Publicaciones del Club</h2>
          <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>Compartí fotos y novedades — se muestran en el feed social de la app con el sello "Club Oficial".</p>
        </div>
        <button
          onClick={() => setIsComposerOpen(true)}
          disabled={courtsList.length === 0}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
        >
          <Megaphone className="w-4 h-4" />
          <span>Publicar Novedad</span>
        </button>
      </div>

      {club && (
        <div className={cx(isDark, 'bg-slate-900/90 border-slate-800', 'bg-white border-slate-200') + ' flex items-center justify-between gap-3 p-4 rounded-2xl border'}>
          <div className="flex items-center gap-3">
            <div className={cx(isDark, 'bg-slate-800 text-slate-300', 'bg-slate-100 text-slate-600') + ' w-9 h-9 rounded-xl flex items-center justify-center shrink-0'}>
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <p className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm'}>Comentarios de tus seguidores</p>
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>
                Aplica a todas tus publicaciones — {commentsAllowed ? 'tus seguidores pueden comentarlas.' : 'los comentarios están desactivados.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCommentsAllowed.mutate({ clubId: club.id, allowed: !commentsAllowed })}
            disabled={setCommentsAllowed.isPending}
            className={`shrink-0 text-xs font-bold px-3 py-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-60 ${
              commentsAllowed
                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30'
                : cx(isDark, 'bg-slate-800 text-slate-400 border-slate-700', 'bg-slate-100 text-slate-500 border-slate-300')
            }`}
          >
            {commentsAllowed ? 'Activados' : 'Desactivados'}
          </button>
        </div>
      )}

      {courtsList.length === 0 && (
        <EmptyState isDark={isDark}>Agregá una cancha primero — las novedades del club se publican asociadas a una de tus canchas.</EmptyState>
      )}

      {courtsList.length > 0 && clubPosts.length === 0 && (
        <EmptyState isDark={isDark}>Todavía no publicaste ninguna novedad. Contales a los jugadores sobre promociones, eventos o novedades del club.</EmptyState>
      )}

      <div className="space-y-3 max-w-xl">
        {clubPosts.map((post) => (
          <PostCard key={post.id} post={post} onPostUpdated={refetch} isDark={isDark} />
        ))}
      </div>

      {isComposerOpen && (
        <ClubPostComposerModal isDark={isDark} club={club} courtsList={courtsList} onClose={() => setIsComposerOpen(false)} />
      )}
    </div>
  );
}
