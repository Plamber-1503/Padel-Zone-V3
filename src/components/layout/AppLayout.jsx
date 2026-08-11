import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { padelService, useCourts, useOpenMatches, usePosts, useTournaments, useUsers, useUpcomingBooking } from '@/api/padelService';
import Logo from '@/components/ui/Logo';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ClubApplicationModal from '@/components/social/ClubApplicationModal';
import {
  Home,
  CalendarDays,
  Users,
  MessageCircle,
  User,
  Search,
  Bell,
  PlusCircle,
  Trophy,
  Zap,
  MapPin,
  Clock,
  ChevronRight,
  LogOut,
  Sparkles,
  Building2,
  ShieldCheck,
  Circle,
  Sun,
  Moon
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout, toggleFollow } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isClubAuthModalOpen, setIsClubAuthModalOpen] = useState(false);

  const { data: courts = [] } = useCourts();
  const { data: upcomingBooking = null } = useUpcomingBooking();
  const { data: openMatchesData = [] } = useOpenMatches();
  const { data: postsData = [] } = usePosts();
  const { data: tournamentsData = [] } = useTournaments();
  const { data: usersData = [] } = useUsers();

  const openMatches = openMatchesData.slice(0, 2);

  // Notificaciones generadas a partir de datos reales: partidos abiertos con
  // cupo disponible + comentarios recientes en publicaciones del usuario.
  const notifications = [
    ...openMatchesData
      .filter(m => (m.joined_players?.length || 0) < m.max_players)
      .slice(0, 1)
      .map(m => ({
        id: `notif-match-${m.id}`,
        icon: Zap,
        color: 'emerald',
        title: `¡Buscan jugadores en ${m.court_name}!`,
        subtitle: `${m.date} ${m.time} • ${m.level_required}`
      })),
    ...postsData
      .filter(p => p.author_id === user?.id && (p.comments?.length || 0) > 0)
      .slice(0, 1)
      .map(p => ({
        id: `notif-comment-${p.id}`,
        icon: Trophy,
        color: 'amber',
        title: `${p.comments[p.comments.length - 1].author_name} comentó tu publicación`,
        subtitle: `"${p.comments[p.comments.length - 1].text}"`
      }))
  ];
  const tournaments = tournamentsData.slice(0, 2);
  const suggestedPlayers = usersData.filter(u => u.id !== user?.id).slice(0, 3);
  
  // Jugadores conectados (En línea)
  const onlineUsers = usersData.filter(u => u.id !== user?.id).map((u, i) => ({
    ...u,
    status_text: i === 0 ? "En PadelClub Norte" : i === 1 ? "Disponible para jugar" : "Buscando partido 4ta"
  }));

  const navLinks = [
    { path: '/', label: 'Feed Social', icon: Home },
    { path: '/courts', label: 'Canchas & Reservas', icon: CalendarDays },
    { path: '/open-matches', label: 'Partidos Abiertos (⚡ 4to)', icon: Zap },
    { path: '/tournaments', label: 'Torneos & Ligas', icon: Trophy },
    { path: '/chat', label: 'Mensajes & Chat', icon: MessageCircle },
    { path: '/profile', label: 'Mi Perfil', icon: User },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courts?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a1128] text-slate-100' : 'bg-[#f0f2f5] text-slate-900'} flex flex-col font-sans transition-colors duration-300`}>
      {/* ── TOP HEADER (FIXED STICKY) ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0d1322]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 h-16 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-6 max-w-7xl w-full mx-auto justify-between">
          
          {/* Logo Brand */}
          <Link to="/">
            <Logo />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar jugadores, canchas en Palermo, torneos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </form>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            
            {/* Create Quick Action */}
            <Link
              to="/open-matches"
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all duration-200 hover:scale-105"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Armar Partido</span>
            </Link>

            {/* Theme Switcher Toggle (Modo Claro Facebook Style vs Modo Oscuro) */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Cambiar a Modo Claro (Estilo Facebook)" : "Cambiar a Modo Oscuro"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all text-xs font-bold cursor-pointer"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                  <span className="hidden md:inline text-amber-300">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-sky-500" />
                  <span className="hidden md:inline text-slate-700">Modo Oscuro</span>
                </>
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all relative"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2.5 right-2.5 animate-pulse" />
              </button>

              {/* Notifications Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 text-xs space-y-3 z-50">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-sm text-white">Notificaciones</span>
                    <span className="text-[10px] text-emerald-400 font-semibold cursor-pointer">Marcar leídas</span>
                  </div>
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl flex gap-2.5 items-start ${
                          n.color === 'emerald'
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-slate-800/40'
                        }`}
                      >
                        <n.icon className={`w-4 h-4 shrink-0 mt-0.5 ${n.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <div>
                          <p className="font-semibold text-slate-200">{n.title}</p>
                          <p className="text-slate-400 text-[11px]">{n.subtitle}</p>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-slate-400 text-[11px] text-center py-2">No tenés notificaciones nuevas.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Shortcut */}
            <Link
              to="/chat"
              className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all relative"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2.5 right-2.5" />
            </Link>

            {/* User Profile avatar dropdown */}
            <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <img
                src={user?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
                alt={user?.full_name}
                className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA WITH 3 COLUMNS ───────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 py-4 md:py-6 flex gap-6">

        {/* ── LEFT SIDEBAR (COLUMNA IZQUIERDA FIJA SEGÚN MOCKUP Y CAPTURA) ─────────────── */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 space-y-4 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto pr-1 select-none">
          
          {/* Mini Profile Card */}
          <div className="bg-[#0b1322] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <img
                src={user?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
                alt={user?.full_name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-base text-white truncate">{user?.full_name || "Martín Gómez"}</h4>
                <p className="text-xs text-emerald-400 font-semibold truncate mt-0.5">
                  {user?.level || "4ta Categoría (Intermedio)"}
                </p>
                <div className="flex items-center gap-3.5 mt-2 text-xs font-medium text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏓</span>
                    <span className="font-bold text-white">{user?.matches_played || 34}</span>
                    <span className="text-slate-400 text-[11px]">partidos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏆</span>
                    <span className="font-bold text-white">{user?.matches_won || 22}</span>
                    <span className="text-slate-400 text-[11px]">victorias</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Menú Principal Card */}
          <nav className="bg-[#0b1322] border border-slate-800/90 rounded-2xl p-4 space-y-2 shadow-xl">
            <div className="px-1 pb-1 text-xs font-bold tracking-wider text-slate-400 uppercase">
              MENÚ PRINCIPAL
            </div>
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0a2721] text-[#00e699] border border-emerald-500/60 shadow-lg shadow-emerald-950/50'
                      : 'text-slate-200 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00e699]' : 'text-slate-400'}`} />
                  <span className="truncate flex items-center gap-1">
                    {item.label === 'Partidos Abiertos (⚡ 4to)' ? (
                      <>
                        <span>Partidos Abiertos</span>
                        <span className="text-amber-400 font-bold flex items-center gap-0.5 ml-0.5 text-xs">
                          ( <Zap className="w-3.5 h-3.5 fill-amber-400 inline text-amber-400" /> 4to)
                        </span>
                      </>
                    ) : (
                      item.label
                    )}
                  </span>
                </Link>
              );
            })}

            {/* BOTÓN SOCIO CLUB B2B */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (user?.role === 'court_owner') {
                    navigate('/club-dashboard');
                  } else {
                    setIsClubAuthModalOpen(true);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  location.pathname === '/club-dashboard'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-amber-400 shrink-0 stroke-[2.5]" />
                  <span>Socio Club</span>
                </div>
                <span className="text-[9px] uppercase font-mono font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                  B2B PRO
                </span>
              </button>
            </div>
          </nav>

          {/* En Línea Card */}
          <div className="bg-[#0b1322] border border-slate-800/90 rounded-2xl p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                EN LÍNEA ({onlineUsers.length})
              </span>
              <span className="text-xs text-emerald-400 font-semibold hover:underline cursor-pointer">Activos</span>
            </div>

            <div className="space-y-3">
              {onlineUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-2.5 group">
                  <Link to={`/profile/${u.id}`} className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img src={u.avatar_url} alt={u.full_name} className="w-9 h-9 rounded-xl object-cover border border-slate-700/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b1322] absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
                        {u.full_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{u.status_text}</p>
                    </div>
                  </Link>
                  <Link
                    to={`/chat?userId=${u.id}`}
                    className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 flex items-center justify-center transition-all shrink-0 border border-slate-700/60"
                    title="Enviar mensaje"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Mis Clubes Card */}
          <div className="bg-[#0b1322] border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Mis Clubes (Feeds)
              </span>
              <Link to="/courts" className="text-xs text-emerald-400 hover:underline font-semibold">
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {courts.map(court => (
                <Link
                  key={court.id}
                  to={`/court/${court.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition-colors group cursor-pointer"
                >
                  <img src={court.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">{court.name}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-emerald-400" /> {court.city}
                    </p>
                  </div>
                  <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">Feed</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </aside>

        {/* ── CENTER AREA (COLUMNA CENTRAL CON SCROLL PROPIO Y CAROUSEL FIJO) ────────── */}
        <main className="flex-1 min-w-0 max-w-2xl mx-auto pb-20 lg:pb-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* ── RIGHT SIDEBAR (COLUMNA DERECHA FIJA CON TRANSPARENCIA MOKAP) ──────────────── */}
        <aside className="hidden xl:flex flex-col w-72 shrink-0 space-y-6 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          
          {/* Próxima Reserva Real del Usuario */}
          <div className="bg-[#0d1322]/85 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4 animate-pulse" /> Próxima Reserva
            </div>
            {upcomingBooking ? (
              <>
                <h4 className="font-bold text-sm text-white">{upcomingBooking.court_name || 'Cancha reservada'}</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {upcomingBooking.date} • {upcomingBooking.start_time?.slice(0, 5)}
                  {upcomingBooking.end_time ? ` - ${upcomingBooking.end_time.slice(0, 5)}` : ''}
                </p>
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium">${upcomingBooking.price?.toLocaleString()}</span>
                  <Link to={`/court/${upcomingBooking.court_id}`} className="text-emerald-400 font-semibold flex items-center gap-1 hover:underline">
                    Ver cancha <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-300">Todavía no tenés turnos reservados.</p>
                <Link to="/courts" className="mt-3 inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs hover:underline">
                  Reservar una cancha <ChevronRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>

          {/* Partidos Abiertos Cerca (Buscando 4to) */}
          <div className="bg-[#0d1322]/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Partidos Buscando 4to
              </span>
              <Link to="/open-matches" className="text-[10px] text-emerald-400 hover:underline font-semibold">
                Ver todos
              </Link>
            </div>

            <div className="space-y-2.5">
              {openMatches.map(m => (
                <div key={m.id} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-white">{m.court_name}</span>
                    <span className="text-[10px] font-bold bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-400/20">
                      Falta 1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{m.date} • {m.time}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">{m.level_required}</span>
                    <Link to="/open-matches" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors">
                      Sumarme
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Torneos Destacados */}
          <div className="bg-[#0d1322]/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Torneos Destacados
              </span>
              <Link to="/tournaments" className="text-[10px] text-emerald-400 hover:underline font-semibold">
                Ver más
              </Link>
            </div>

            <div className="space-y-2.5">
              {tournaments.map(t => (
                <Link key={t.id} to="/tournaments" className="block group">
                  <div className="relative rounded-xl overflow-hidden h-24 border border-slate-800">
                    <img src={t.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-2.5 flex flex-col justify-end">
                      <p className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors leading-tight">{t.title}</p>
                      <p className="text-[10px] text-slate-300">{t.date_range} • {t.court_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Jugadores Sugeridos */}
          <div className="bg-[#0d1322]/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Jugadores Sugeridos
            </span>
            <div className="space-y-2.5">
              {suggestedPlayers.map(p => {
                const isFollowing = user?.following_ids?.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{p.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.level}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFollow(p.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                        isFollowing
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                      }`}
                    >
                      {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR (< md) ────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1322]/95 backdrop-blur-xl border-t border-slate-800 px-2 h-16 flex items-center justify-around shadow-2xl">
        {navLinks.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
              <span className="text-[10px]">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Modal de Solicitud de Socio Club B2B */}
      <ClubApplicationModal
        isOpen={isClubAuthModalOpen}
        onClose={() => setIsClubAuthModalOpen(false)}
      />
    </div>
  );
}
