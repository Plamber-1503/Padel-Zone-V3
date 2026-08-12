import React, { useState } from 'react';
import {
  useMyClubCourts,
  useCreateCourt,
  useUpdateCourt,
  useSetCourtActive,
  useUploadCourtPhoto,
  useMyClubMetrics,
  useCancelledBookingsForOwner
} from '@/api/padelService';
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
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  { id: 'metrics', label: 'Métricas & Facturación', icon: BarChart3 },
  { id: 'locks', label: 'Bloqueo de Turnos', icon: Lock },
  { id: 'cancellations', label: 'Cancelaciones', icon: CalendarX }
];

export default function ClubDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resumen');
  const { data: clubData, isLoading: isLoadingCourts } = useMyClubCourts();
  const club = clubData?.club || null;
  const courtsList = clubData?.courts || [];
  const { data: metrics } = useMyClubMetrics();

  // courtModal: null (cerrado) | 'add' | objeto de cancha (editando esa cancha)
  const [courtModal, setCourtModal] = useState(null);

  const handleLogoutSocio = () => navigate('/');

  return (
    <div className="space-y-6">
      {/* ── HEADER DEL SOCIO CLUB B2B ───────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#151d33] to-[#0e1738] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 shrink-0 font-black text-lg">
              {(club?.name || 'PZ').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                  Socio Club Verificado
                </span>
                <span className="text-xs text-slate-400">{club?.name || 'Tu club'}</span>
              </div>
              <h1 className="font-extrabold text-2xl text-white tracking-tight mt-0.5">Portal de Administración</h1>
              <p className="text-xs text-slate-400 mt-0.5">Tu plataforma de gestión — canchas, torneos, profesores y eventos.</p>
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
              className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Salir de Socio
            </button>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
            <Kpi label="Facturación Este Mes" value={metrics ? `$${metrics.revenueThisMonth.toLocaleString()}` : '—'} sub="Reservas confirmadas del mes" accent />
            <Kpi label="Horas Reservadas" value={metrics ? `${metrics.hoursBooked} hs` : '—'} sub="Este mes" />
            <Kpi label="Reservas Este Mes" value={metrics ? metrics.bookingsCount : '—'} sub="Turnos confirmados" />
            <Kpi label="Canchas Activas" value={courtsList.filter((c) => c.is_active).length} sub={`${courtsList.length} en total`} />
          </div>

          <div>
            <h2 className="font-bold text-base text-white mb-3">Accesos rápidos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <QuickCard icon={Building2} title="Agregar cancha" sub="Fotos, precio y diferenciales" onClick={() => setCourtModal('add')} />
              <QuickCard icon={BarChart3} title="Ver métricas" sub="Facturación y ocupación reales" onClick={() => setActiveTab('metrics')} />
              <QuickCard icon={CalendarX} title="Cancelaciones" sub="Compromiso de tus jugadores" onClick={() => setActiveTab('cancellations')} />
            </div>
          </div>
        </div>
      )}

      {/* ── CANCHAS ──────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="font-bold text-base text-white">Inventario de Canchas del Club</h2>
              <p className="text-xs text-slate-400">Administrá las canchas disponibles para los jugadores de la aplicación.</p>
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
            <p className="text-xs text-slate-400 flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando canchas...
            </p>
          )}
          {!isLoadingCourts && !club && (
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center text-slate-400 text-sm">
              No encontramos un club asociado a tu cuenta todavía.
            </div>
          )}
          {!isLoadingCourts && club && courtsList.length === 0 && (
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center text-slate-400 text-sm">
              Todavía no cargaste ninguna cancha. Usá "Agregar Cancha" para sumar la primera.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courtsList.map((c) => (
              <CourtCard key={c.id} court={c} onEdit={() => setCourtModal(c)} />
            ))}
          </div>
        </div>
      )}

      {/* ── METRICAS ─────────────────────────────────────────────────── */}
      {activeTab === 'metrics' && <MetricsTab />}

      {/* ── BLOQUEO DE TURNOS ────────────────────────────────────────── */}
      {activeTab === 'locks' && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3 text-center">
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="font-bold text-white text-base">Bloqueo de Turnos por Mantenimiento o Clases</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Próximamente vas a poder seleccionar una cancha y bloquear un rango horario para que no pueda ser
            reservado por jugadores. Todavía no está disponible.
          </p>
          <span className="inline-flex items-center gap-2 bg-slate-800 text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700">
            <Lock className="w-4 h-4" /> Próximamente
          </span>
        </div>
      )}

      {/* ── CANCELACIONES ────────────────────────────────────────────── */}
      {activeTab === 'cancellations' && <CancellationsTab />}

      {/* ── MODAL AGREGAR / EDITAR CANCHA ───────────────────────────── */}
      {courtModal && club && (
        <CourtFormModal club={club} court={courtModal === 'add' ? null : courtModal} onClose={() => setCourtModal(null)} />
      )}
    </div>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className={`bg-slate-900 p-4 rounded-2xl border space-y-1 ${accent ? 'border-emerald-500/30' : 'border-slate-800'}`}>
      <span className="text-slate-400 text-xs">{label}</span>
      <p className={`font-black text-2xl ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-slate-500 font-semibold">{sub}</p>
    </div>
  );
}

function QuickCard({ icon: Icon, title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 hover:border-emerald-500/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm text-white">{title}</p>
        <p className="text-[11px] text-slate-400">{sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
    </button>
  );
}

function CourtCard({ court: c, onEdit }) {
  const setCourtActive = useSetCourtActive();
  const isActive = c.is_active;
  const amenities = c.amenities || [];

  return (
    <div
      className={`bg-slate-900/90 border rounded-3xl overflow-hidden transition-all relative ${
        isActive ? 'border-slate-800 shadow-lg' : 'border-red-500/30 opacity-75 bg-slate-950/60'
      }`}
    >
      <div className="h-36 bg-slate-800 relative">
        {c.image_url ? (
          <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Camera className="w-8 h-8" />
          </div>
        )}
        <button
          onClick={onEdit}
          className="absolute top-2.5 right-2.5 bg-slate-950/80 hover:bg-slate-900 text-slate-200 p-1.5 rounded-lg border border-slate-700 cursor-pointer"
          title="Editar cancha"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            isActive
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            {isActive ? '✓ Disponible para Reservas' : '⛔ Quitada / Fuera de Servicio'}
          </span>
          <h3 className="font-bold text-base text-white pt-1">{c.name}</h3>
          <p className="text-xs text-slate-400">{c.surface || 'Superficie de Césped Sintético WPT'}</p>
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 4).map((a) => (
              <span key={a} className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg">{a}</span>
            ))}
            {amenities.length > 4 && (
              <span className="text-[10px] font-bold text-slate-500 px-1 py-1">+{amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
          <span className="text-slate-400">Tarifa por hora:</span>
          <strong className="text-emerald-400 text-sm">${Number(c.price_per_hour || 4500).toLocaleString()}/hs</strong>
        </div>

        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={() => setCourtActive.mutate({ courtId: c.id, isActive: !c.is_active })}
            disabled={setCourtActive.isPending}
            className={`flex-1 font-bold text-xs py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
              isActive
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30'
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
function CourtFormModal({ club, court, onClose }) {
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
      <div className="bg-[#0e1738] border border-emerald-500/40 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400 stroke-[3]" /> {isEdit ? 'Editar Cancha' : 'Agregar Nueva Cancha'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Fotos */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Fotos de la cancha</label>
            <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-5 cursor-pointer bg-slate-900/60 transition-colors">
              <ImagePlus className="w-5 h-5 text-slate-500" />
              <span className="font-bold text-slate-300">Hacé click para elegir fotos</span>
              <span className="text-[10.5px] text-slate-500">La primera foto es la portada — hasta 6 fotos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={photos.length >= 6} />
            </label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {photos.map((p) => (
                  <div key={p.url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0">
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
              <label className="font-bold text-slate-300">Nombre</label>
              <input
                type="text"
                placeholder="ej. Cancha 4 — Panorámica"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Precio por Hora ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300 block">Tipo de Superficie / Estructura</label>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              {SURFACE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Diferenciales de la cancha</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const on = amenities.has(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                      on ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-red-400">{error}</p>}

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
function MetricsTab() {
  const { data: metrics, isLoading } = useMyClubMetrics();

  if (isLoading) {
    return (
      <p className="text-xs text-slate-400 flex items-center gap-2 py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Calculando métricas...
      </p>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center text-slate-400 text-sm">
        No encontramos un club asociado a tu cuenta todavía.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <Kpi label="Facturación Este Mes" value={`$${metrics.revenueThisMonth.toLocaleString()}`} sub="Reservas confirmadas del mes" accent />
      <Kpi label="Horas Reservadas" value={`${metrics.hoursBooked} hs`} sub="Este mes" />
      <Kpi label="Reservas Este Mes" value={metrics.bookingsCount} sub="Turnos confirmados" />
      <Kpi label="Cancha Más Reservada" value={metrics.topCourt?.name || '—'} sub={metrics.topCourt ? `${metrics.topCourtSharePct}% del total` : 'Sin reservas todavía'} />
    </div>
  );
}

// Cancelaciones y modificaciones de reservas de las canchas del club — para
// ver qué tan seguido cancelan/modifican los jugadores y con quién.
function CancellationsTab() {
  const { data: rows = [], isLoading } = useCancelledBookingsForOwner();

  if (isLoading) return <p className="text-xs text-slate-400">Cargando...</p>;
  if (rows.length === 0) {
    return (
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center text-slate-400 text-sm">
        Todavía no hay cancelaciones ni modificaciones registradas en tus canchas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 max-w-2xl">
        Reservas canceladas o modificadas en tus canchas — usalo para ver qué jugadores cumplen sus turnos y cuáles
        cancelan seguido, y pensar cómo mejorar esos índices.
      </p>
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 uppercase text-[10px] border-b border-slate-800">
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
              <tr key={b.id} className="border-b border-slate-800/60">
                <td className="p-3 text-slate-200 font-semibold">{b.court_name}</td>
                <td className="p-3 text-slate-400">{b.date} · {(b.start_time || '').slice(0, 5)}</td>
                <td className="p-3 text-slate-400">{b.booker_name}</td>
                <td className="p-3">
                  {b.was_modification ? (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 w-fit">
                      <Repeat className="w-2.5 h-2.5" /> Modificada
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Cancelada</span>
                  )}
                </td>
                <td className="p-3 text-slate-400">{b.cancelled_by_name || '—'}</td>
                <td className="p-3 text-slate-500">{b.cancelled_at ? new Date(b.cancelled_at).toLocaleString('es-AR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
