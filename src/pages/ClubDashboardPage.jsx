import React, { useState, useEffect } from 'react';
import {
  useMyClubCourts,
  useCreateCourt,
  useUpdateCourt,
  useSetCourtActive,
  useUploadCourtPhoto,
  useMyClubMetrics,
  useCancelledBookingsForOwner,
  usePosts,
  useCreatePost
} from '@/api/padelService';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/social/PostCard';
import Logo from '@/components/ui/Logo';
import {
  Building2,
  Plus,
  Pencil,
  Power,
  BarChart3,
  Lock,
  X,
  CalendarX,
  Repeat,
  Loader2,
  LayoutGrid,
  Camera,
  ImagePlus,
  ArrowRight,
  Megaphone,
  Sun,
  Moon
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const SURFACE_OPTIONS = ['Cristal Panorámico WPT', 'Moqueta Sintética Indoor', 'Techada Climatizada', 'Muro Clásico'];

// Diferenciales que más buscan los jugadores al elegir cancha. Los primeros
// 4 son los mismos strings que ya trae sembrada la base (courts.amenities)
// para no romper continuidad con canchas existentes.
const AMENITY_OPTIONS = [
  'Iluminación LED', 'Vestuarios', 'Estacionamiento', 'Bar & Resto',
  'Paredes de vidrio', 'Techada / Climatizada', 'Aire acondicionado', 'Wifi gratis',
  'Alquiler de paletas', 'Cámara de grabación', 'Acceso accesible', 'Superficie premium'
];

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
  { id: 'inventory', label: 'Canchas', icon: Building2 },
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
  const [activeTab, setActiveTab] = useState('resumen');
  const { data: clubData, isLoading: isLoadingCourts } = useMyClubCourts();
  const club = clubData?.club || null;
  const courtsList = clubData?.courts || [];
  const { data: metrics } = useMyClubMetrics();

  const [isDark, setIsDark] = useState(() => {
    try { return (localStorage.getItem(THEME_KEY) || 'dark') === 'dark'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch { /* noop */ }
  }, [isDark]);

  // courtModal: null (cerrado) | 'add' | objeto de cancha (editando esa cancha)
  const [courtModal, setCourtModal] = useState(null);

  const handleLogoutSocio = () => navigate('/');

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
              Salir de Socio
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
      {activeTab === 'posts' && <ClubPostsTab isDark={isDark} club={club} courtsList={courtsList} />}

      {/* ── CANCELACIONES ────────────────────────────────────────────── */}
      {activeTab === 'cancellations' && <CancellationsTab isDark={isDark} />}

      {/* ── MODAL AGREGAR / EDITAR CANCHA ───────────────────────────── */}
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

function CourtCard({ isDark, court: c, onEdit }) {
  const setCourtActive = useSetCourtActive();
  const isActive = c.is_active;
  const amenities = c.amenities || [];

  return (
    <div
      className={`border rounded-3xl overflow-hidden transition-all relative ${
        isActive
          ? cx(isDark, 'bg-slate-900/90 border-slate-800 shadow-lg', 'bg-white border-slate-200 shadow-lg')
          : cx(isDark, 'bg-slate-950/60 border-red-500/30 opacity-75', 'bg-red-50 border-red-300 opacity-90')
      }`}
    >
      <div className={cx(isDark, 'bg-slate-800', 'bg-slate-100') + ' h-36 relative'}>
        {c.image_url ? (
          <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
        ) : (
          <div className={cx(isDark, 'text-slate-600', 'text-slate-400') + ' w-full h-full flex items-center justify-center'}>
            <Camera className="w-8 h-8" />
          </div>
        )}
        <button
          onClick={onEdit}
          className={cx(isDark, 'bg-slate-950/80 hover:bg-slate-900 text-slate-200 border-slate-700', 'bg-white/90 hover:bg-white text-slate-700 border-slate-300') + ' absolute top-2.5 right-2.5 p-1.5 rounded-lg border cursor-pointer'}
          title="Editar cancha"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            isActive
              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
              : 'bg-red-500/20 text-red-500 border-red-500/30'
          }`}>
            {isActive ? '✓ Disponible para Reservas' : '⛔ Quitada / Fuera de Servicio'}
          </span>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base pt-1'}>{c.name}</h3>
          <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>{c.surface || 'Superficie de Césped Sintético WPT'}</p>
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 4).map((a) => (
              <span key={a} className={cx(isDark, 'text-slate-400 bg-slate-800 border-slate-700', 'text-slate-600 bg-slate-100 border-slate-200') + ' text-[10px] font-bold border px-2 py-1 rounded-lg'}>{a}</span>
            ))}
            {amenities.length > 4 && (
              <span className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[10px] font-bold px-1 py-1'}>+{amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex justify-between items-center text-xs pt-2 border-t'}>
          <span className={cx(isDark, 'text-slate-400', 'text-slate-500')}>Tarifa por hora:</span>
          <strong className="text-emerald-500 text-sm">${Number(c.price_per_hour || 4500).toLocaleString()}/hs</strong>
        </div>

        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={() => setCourtActive.mutate({ courtId: c.id, isActive: !c.is_active })}
            disabled={setCourtActive.isPending}
            className={`flex-1 font-bold text-xs py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
              isActive
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border-emerald-500/30'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isActive ? 'Quitar de Disponibles' : 'Activar Cancha'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal compartido para "Agregar cancha" (court=null) y "Editar cancha"
// (court=objeto existente) — fotos reales a Supabase Storage y
// diferenciales guardados en courts.amenities.
function CourtFormModal({ isDark, club, court, onClose }) {
  const isEdit = Boolean(court);
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const uploadPhoto = useUploadCourtPhoto();

  const [name, setName] = useState(court?.name || '');
  const [surface, setSurface] = useState(court?.surface || SURFACE_OPTIONS[0]);
  const [price, setPrice] = useState(court?.price_per_hour || 4800);
  const [amenities, setAmenities] = useState(new Set(court?.amenities || []));
  const [photos, setPhotos] = useState(
    (court?.gallery_images?.length ? court.gallery_images : court?.image_url ? [court.image_url] : []).map((url) => ({ url, uploading: false }))
  );
  const [error, setError] = useState('');

  const busy = createCourt.isPending || updateCourt.isPending;
  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold';

  const toggleAmenity = (a) => {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  };

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).slice(0, 6 - photos.length);
    files.forEach((file) => {
      const localUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { url: localUrl, uploading: true }]);
      uploadPhoto.mutate(
        { clubId: club.id, file },
        {
          onSuccess: (publicUrl) => {
            setPhotos((prev) => prev.map((p) => (p.url === localUrl ? { url: publicUrl, uploading: false } : p)));
          },
          onError: (err) => {
            setPhotos((prev) => prev.filter((p) => p.url !== localUrl));
            setError(err.message);
          }
        }
      );
    });
  };

  const removePhoto = (url) => setPhotos((prev) => prev.filter((p) => p.url !== url));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    const galleryImages = photos.filter((p) => !p.uploading).map((p) => p.url);
    const payload = {
      name,
      surface,
      price_per_hour: Number(price) || 4500,
      amenities: [...amenities],
      image_url: galleryImages[0] || null,
      gallery_images: galleryImages
    };

    if (isEdit) {
      updateCourt.mutate({ courtId: court.id, patch: payload }, { onSuccess: onClose, onError: (err) => setError(err.message) });
    } else {
      createCourt.mutate(
        { clubId: club.id, name, surface, pricePerHour: price, amenities: [...amenities], imageUrl: galleryImages[0], galleryImages },
        { onSuccess: onClose, onError: (err) => setError(err.message) }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base flex items-center gap-2'}>
            <Plus className="w-5 h-5 text-emerald-500 stroke-[3]" /> {isEdit ? 'Editar Cancha' : 'Agregar Nueva Cancha'}
          </h3>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Fotos */}
          <div className="space-y-1.5">
            <label className={labelCls + ' block'}>Fotos de la cancha</label>
            <label className={cx(isDark, 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/60', 'border-slate-300 hover:border-emerald-500/60 bg-slate-50') + ' flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors'}>
              <ImagePlus className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' w-5 h-5'} />
              <span className={labelCls}>Hacé click para elegir fotos</span>
              <span className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' text-[10.5px]'}>La primera foto es la portada — hasta 6 fotos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={photos.length >= 6} />
            </label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {photos.map((p) => (
                  <div key={p.url} className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' relative w-16 h-16 rounded-lg overflow-hidden border shrink-0'}>
                    <img src={p.url} alt="" className={`w-full h-full object-cover ${p.uploading ? 'opacity-40' : ''}`} />
                    {p.uploading && <Loader2 className="w-4 h-4 text-white animate-spin absolute inset-0 m-auto" />}
                    {!p.uploading && (
                      <button type="button" onClick={() => removePhoto(p.url)} className="absolute top-0.5 right-0.5 bg-slate-950/80 rounded-full p-0.5 cursor-pointer">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Nombre</label>
              <input
                type="text"
                placeholder="ej. Cancha 4 — Panorámica"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Precio por Hora ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls + ' block'}>Tipo de Superficie / Estructura</label>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className={inputCls}
            >
              {SURFACE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls + ' block'}>Diferenciales de la cancha</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const on = amenities.has(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                      on
                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
                        : cx(isDark, 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600', 'bg-slate-50 text-slate-500 border-slate-300 hover:border-slate-400')
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Confirmar y Agregar Cancha'}
          </button>
        </form>
      </div>
    </div>
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
function CancellationsTab({ isDark }) {
  const { data: rows = [], isLoading } = useCancelledBookingsForOwner();

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
  const courtIds = new Set(courtsList.map((c) => c.id));
  const clubPosts = allPosts.filter((p) => courtIds.has(p.court_id));

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

function ClubPostComposerModal({ isDark, club, courtsList, onClose }) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  const uploadPhoto = useUploadCourtPhoto();

  const [content, setContent] = useState('');
  const [courtId, setCourtId] = useState(courtsList[0]?.id || '');
  const [photo, setPhoto] = useState(null); // { url, uploading }
  const [error, setError] = useState('');

  const inputCls = cx(isDark, 'bg-slate-900 border-slate-700 text-white placeholder-slate-500', 'bg-white border-slate-300 text-slate-900 placeholder-slate-400') + ' w-full border rounded-xl p-2.5 focus:outline-none focus:border-emerald-500';
  const labelCls = cx(isDark, 'text-slate-300', 'text-slate-600') + ' font-bold';

  const handleFile = (file) => {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPhoto({ url: localUrl, uploading: true });
    uploadPhoto.mutate(
      { clubId: club.id, file },
      {
        onSuccess: (publicUrl) => setPhoto({ url: publicUrl, uploading: false }),
        onError: (err) => { setPhoto(null); setError(err.message); }
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || !courtId) return;
    setError('');
    const court = courtsList.find((c) => c.id === courtId);
    createPost.mutate(
      {
        author_type: 'court',
        author_name: club?.name || user?.full_name,
        author_avatar: user?.avatar_url,
        court_id: courtId,
        court_name: court?.name || null,
        type: 'standard',
        content,
        media_url: photo?.url || null
      },
      { onSuccess: onClose, onError: (err) => setError(err.message) }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={cx(isDark, 'bg-[#0e1738] border-emerald-500/40', 'bg-white border-emerald-300') + ' border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200'}>
        <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between border-b pb-3'}>
          <h3 className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-base flex items-center gap-2'}>
            <Megaphone className="w-5 h-5 text-emerald-500" /> Publicar Novedad
          </h3>
          <button onClick={onClose} className={cx(isDark, 'text-slate-400 hover:text-white bg-slate-800', 'text-slate-500 hover:text-slate-900 bg-slate-100') + ' p-1.5 rounded-full cursor-pointer'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {courtsList.length > 1 && (
            <div className="space-y-1">
              <label className={labelCls + ' block'}>Cancha asociada</label>
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className={inputCls}
              >
                {courtsList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className={labelCls + ' block'}>Novedad</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ej: ¡Reinauguramos la Cancha 2 con nuevas luces LED! Vengan a probarla."
              rows={4}
              className={inputCls + ' resize-none'}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls + ' block'}>Foto (opcional)</label>
            {photo ? (
              <div className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' relative w-24 h-24 rounded-lg overflow-hidden border'}>
                <img src={photo.url} alt="" className={`w-full h-full object-cover ${photo.uploading ? 'opacity-40' : ''}`} />
                {photo.uploading && <Loader2 className="w-5 h-5 text-white animate-spin absolute inset-0 m-auto" />}
                {!photo.uploading && (
                  <button type="button" onClick={() => setPhoto(null)} className="absolute top-0.5 right-0.5 bg-slate-950/80 rounded-full p-0.5 cursor-pointer">
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ) : (
              <label className={cx(isDark, 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/60', 'border-slate-300 hover:border-emerald-500/60 bg-slate-50') + ' flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors'}>
                <ImagePlus className={cx(isDark, 'text-slate-500', 'text-slate-400') + ' w-5 h-5'} />
                <span className={labelCls}>Agregar una foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
            )}
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={createPost.isPending || photo?.uploading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {createPost.isPending ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      </div>
    </div>
  );
}
