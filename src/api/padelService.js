/**
 * padelService.js — Capa de Servicios 100% Supabase Client + React Query Remote State Management
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  INITIAL_USERS,
  INITIAL_COURTS,
  INITIAL_POSTS,
  INITIAL_OPEN_MATCHES,
  INITIAL_TOURNAMENTS,
  INITIAL_AVAILABILITIES
} from './mockData';

const KEYS = {
  CURRENT_USER: 'pz3_current_user'
};

function getItem(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading localStorage', e);
  }
  return fallback;
}

function setItem(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
}

// ====================================================================
// PADEL SERVICE — 100% SUPABASE DATABASE CLIENT METHODS
// ====================================================================
export const padelService = {
  // Auth & Session
  getCurrentUser() {
    return getItem(KEYS.CURRENT_USER, INITIAL_USERS[0]);
  },

  setCurrentUser(user) {
    setItem(KEYS.CURRENT_USER, user);
    return user;
  },

  async login(emailOrUsername, password) {
    // 1. Iniciar sesión en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password
    });

    if (authError && !authError.message.includes('Invalid login credentials')) {
      console.warn('Supabase Auth error:', authError.message);
    }

    const userId = authData?.user?.id;
    if (userId) {
      const profile = await this.getUserById(userId);
      if (profile) return this.setCurrentUser(profile);
    }

    // Nota (auditoría 2026-08-09): se eliminó el fallback que buscaba el
    // usuario en profiles/mock data por email o nombre y lo logueaba sin
    // verificar contraseña. Si signInWithPassword no autentica, es un
    // login inválido — no hay camino alternativo que omita la verificación.
    throw new Error('Usuario no encontrado o contraseña incorrecta');
  },

  // 1. PROFILES & USERS
  // Nota (auditoría 2026-08-09): esto lee la vista profiles_public (sin email)
  // porque se usa para listados públicos (sugeridos, en línea, buscador de chat).
  // Nadie necesita ver el email de otro usuario para usar la app.
  async getUsers() {
    const { data, error } = await supabase.from('profiles_public').select('*');
    if (error || !data || data.length === 0) {
      return INITIAL_USERS;
    }
    return data;
  },

  // Perfil PROPIO (login / sesión) — sí incluye email. RLS solo permite leer
  // tu propia fila acá, así que no debe usarse para consultar a otro usuario.
  async getUserById(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      return INITIAL_USERS.find(u => u.id === id) || null;
    }
    return data;
  },

  // Perfil PÚBLICO de cualquier usuario (sin email) — para ver el perfil de
  // otro jugador o elegir compañero de equipo.
  async getPublicUserById(id) {
    const { data, error } = await supabase.from('profiles_public').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      return INITIAL_USERS.find(u => u.id === id) || null;
    }
    return data;
  },

  async ensureProfile(userObj) {
    if (!userObj?.id) return null;
    if (!isSupabaseConfigured || !supabase) return userObj;

    const { data: existing } = await supabase.from('profiles').select('*').eq('id', userObj.id).maybeSingle();
    if (existing) return existing;

    const fullName = userObj.user_metadata?.full_name || userObj.user_metadata?.name || userObj.email?.split('@')[0] || 'Jugador PadelZone';
    const avatarUrl = userObj.user_metadata?.avatar_url || userObj.user_metadata?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop';

    const newProfile = {
      id: userObj.id,
      email: userObj.email || `${userObj.id}@padelzone.com`,
      full_name: fullName,
      avatar_url: avatarUrl,
      role: 'player',
      level: '4ta Categoría (Intermedio)',
      elo_rating: 1200,
      matches_played: 0,
      matches_won: 0
    };

    const { data, error } = await supabase.from('profiles').upsert(newProfile).select().maybeSingle();
    if (error) {
      console.warn('Error upserting profile in Supabase:', error.message);
    }
    return data || newProfile;
  },

  // Nota (auditoría 2026-08-09, incidente de seguridad): existió acá un
  // método updateUserRole(newRole) que dejaba que cualquier usuario logueado
  // se auto-asignara el rol que quisiera (incluido 'admin'), sin ninguna
  // aprobación. Se eliminó deliberadamente — el único camino válido para
  // pasar a 'court_owner' es la aprobación de una solicitud de club por un
  // moderador/admin (ver approveClub), y 'moderator'/'admin' solo se otorgan
  // manualmente por un admin real desde la base de datos.

  async toggleFollow(targetId) {
    const current = this.getCurrentUser();
    let following = current.following_ids || [];
    if (following.includes(targetId)) {
      following = following.filter(id => id !== targetId);
    } else {
      following = [...following, targetId];
    }
    const updatedUser = { ...current, following_ids: following };
    this.setCurrentUser(updatedUser);

    const { error } = await supabase.from('profiles').update({ following_ids: following }).eq('id', current.id);
    if (error) console.warn('Supabase profile update warning:', error.message);

    return updatedUser;
  },

  async setTeamPartner(partnerId) {
    const current = this.getCurrentUser();
    const partnerUser = await this.getPublicUserById(partnerId);
    if (!partnerUser) throw new Error('Jugador no encontrado');

    const updatedUser = {
      ...current,
      team_partner_id: partnerUser.id,
      team_partner_name: partnerUser.full_name,
      team_partner_avatar: partnerUser.avatar_url,
      team_partner_level: partnerUser.level
    };
    this.setCurrentUser(updatedUser);

    await supabase.from('profiles').update({ team_partner_id: partnerUser.id }).eq('id', current.id);
    return updatedUser;
  },

  async removeTeamPartner() {
    const current = this.getCurrentUser();
    const updatedUser = { ...current, team_partner_id: null };
    this.setCurrentUser(updatedUser);

    await supabase.from('profiles').update({ team_partner_id: null }).eq('id', current.id);
    return updatedUser;
  },

  // 2. CLUBS (Establecimientos)
  // RLS ya filtra: acá solo llegan clubes 'approved', más el propio si sos el dueño.
  async getClubs() {
    const { data, error } = await supabase.from('clubs').select('*');
    if (error || !data || data.length === 0) {
      return [
        { id: 'cl-1', name: 'PadelClub Norte', city: 'Buenos Aires', address: 'Av. Libertador 1250' },
        { id: 'cl-2', name: 'Palermo Paddle Club', city: 'Buenos Aires', address: 'Thames 1825' }
      ];
    }
    return data;
  },

  // 2b. ALTA DE CLUBES (solicitud de socio, revisión por moderador/admin)
  async getMyClubApplication() {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) return null;
    const { data, error } = await supabase.from('clubs').select('*').eq('owner_id', currentUser.id).maybeSingle();
    if (error) return null;
    return data;
  },

  async requestClubMembership({ name, address, city, phone, cuit, contact_email }) {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('clubs')
      .insert({
        owner_id: currentUser.id,
        name,
        address,
        city: city || 'Buenos Aires',
        phone: phone || null,
        cuit: cuit || null,
        contact_email: contact_email || currentUser.email || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error al enviar la solicitud de club:', error.message);
      throw new Error(`Error al enviar la solicitud: ${error.message}`);
    }
    return data;
  },

  // 2c. PANEL PRIVADO — solo accesible para role 'moderator' | 'admin' (RLS)
  async getPendingClubs() {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Error al leer solicitudes pendientes: ${error.message}`);
    return data || [];
  },

  async getActiveClubsAdmin() {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Error al leer clubes activos: ${error.message}`);
    return data || [];
  },

  async approveClub(clubId) {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('clubs')
      .update({ status: 'approved', reviewed_by: currentUser.id, reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', clubId)
      .select()
      .single();
    if (error) throw new Error(`Error al aprobar el club: ${error.message}`);
    return data;
  },

  async rejectClub(clubId, reason) {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('clubs')
      .update({ status: 'rejected', reviewed_by: currentUser.id, reviewed_at: new Date().toISOString(), rejection_reason: reason || null })
      .eq('id', clubId)
      .select()
      .single();
    if (error) throw new Error(`Error al rechazar el club: ${error.message}`);
    return data;
  },

  async getAllUsersAdmin() {
    // A diferencia de getUsers(), esto lee la tabla real (con email) — RLS
    // solo se lo permite si tenés permiso 'users' o sos admin.
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`Error al leer usuarios: ${error.message}`);
    return data || [];
  },

  // El propio usuario, logueado pero sin permisos, pide acceso al panel.
  async requestStaffAccess() {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) throw new Error('Usuario no autenticado');
    const { data, error } = await supabase
      .from('profiles')
      .update({ staff_access_requested_at: new Date().toISOString() })
      .eq('id', currentUser.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Error al solicitar acceso: ${error.message}`);
    this.setCurrentUser(data || { ...currentUser, staff_access_requested_at: new Date().toISOString() });
    return data;
  },

  // Solo trae usuarios relevantes para "Gestión de accesos" (pidieron acceso
  // o ya lo tienen) — no la base completa de jugadores registrados.
  async getStaffAccessCandidates() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .or('staff_access_requested_at.not.is.null,staff_permissions.neq.{}')
      .order('staff_access_requested_at', { ascending: true, nullsFirst: false });
    if (error) throw new Error(`Error al leer solicitudes de acceso: ${error.message}`);
    return data || [];
  },

  // Gestión de accesos (solo admin — reforzado por RLS "Admin Manage Profiles").
  // `permissions` es un array con cualquier combinación de:
  // 'pending_clubs' | 'active_clubs' | 'users'
  async updateStaffPermissions(userId, permissions) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ staff_permissions: permissions })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Error al actualizar permisos: ${error.message}`);
    return data;
  },

  async getBusinessMetrics() {
    // Solo role 'admin' debería ver esto (se filtra también en la UI).
    const [{ count: totalUsers }, { count: activeClubs }, { count: activeCourts }, { count: bookingsTotal }, { data: todayBookings }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('courts').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('id').eq('date', new Date().toISOString().slice(0, 10))
    ]);

    return {
      totalUsers: totalUsers || 0,
      activeClubs: activeClubs || 0,
      activeCourts: activeCourts || 0,
      bookingsTotal: bookingsTotal || 0,
      bookingsToday: todayBookings?.length || 0
    };
  },

  // 3. COURTS (Canchas de Pádel)
  async getCourts() {
    const { data, error } = await supabase.from('courts').select('*, clubs(*)');
    if (error || !data || data.length === 0) {
      return INITIAL_COURTS;
    }
    return data;
  },

  async getCourtById(id) {
    const { data, error } = await supabase.from('courts').select('*, clubs(*)').eq('id', id).maybeSingle();
    if (error || !data) {
      return INITIAL_COURTS.find(c => c.id === id) || INITIAL_COURTS[0];
    }
    return data;
  },

  // 4. COURT AVAILABILITY (Disponibilidad Horaria de Canchas)
  async getAvailabilities() {
    const { data, error } = await supabase.from('player_availability').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return INITIAL_AVAILABILITIES;
    }
    return data;
  },

  async getUserAvailability(userId) {
    const { data, error } = await supabase.from('player_availability').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) {
      return INITIAL_AVAILABILITIES.find(a => a.user_id === userId) || null;
    }
    return data;
  },

  async setUserAvailability({ availability_type, court_id, court_name, date, time, is_flexible }) {
    const currentUser = this.getCurrentUser();

    // Un jugador solo puede tener un estado de disponibilidad activo a la vez
    await supabase.from('player_availability').delete().eq('user_id', currentUser.id);

    const payload = {
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_avatar: currentUser.avatar_url,
      user_level: currentUser.level,
      availability_type: availability_type || 'any',
      court_id: court_id || null,
      court_name: court_name || null,
      date: date || 'Hoy',
      time: time || 'A convenir',
      is_flexible: !!is_flexible
    };

    const { data, error } = await supabase.from('player_availability').insert(payload).select().maybeSingle();
    if (error) {
      console.error('Error al guardar disponibilidad:', error.message);
      throw new Error(`Error al guardar disponibilidad: ${error.message}`);
    }
    return data;
  },

  async removeUserAvailability() {
    const currentUser = this.getCurrentUser();
    const { error } = await supabase.from('player_availability').delete().eq('user_id', currentUser.id);
    if (error) {
      console.error('Error al quitar disponibilidad:', error.message);
      throw new Error(`Error al quitar disponibilidad: ${error.message}`);
    }
    return true;
  },

  // 5. BOOKINGS (Reservas con Restricción Única de Base de Datos: court_id + date + start_time)
  async getBookings() {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error || !data) return [];
    return data;
  },

  async getBookingsForCourt(courtId, date) {
    const { data, error } = await supabase.from('bookings').select('*').eq('court_id', courtId).eq('date', date);
    if (error || !data) return [];
    return data;
  },

  // Para "reserva recurrente": todas las reservas del court en una ventana
  // de fechas, en una sola consulta (en vez de una por cada ocurrencia).
  async getCourtBookingsInRange(courtId, fromDate, toDate) {
    const { data, error } = await supabase
      .from('bookings')
      .select('date, start_time')
      .eq('court_id', courtId)
      .gte('date', fromDate)
      .lte('date', toDate);
    if (error || !data) return [];
    return data;
  },

  async getUpcomingBookingForCurrentUser() {
    const currentUser = this.getCurrentUser();
    // Se trae el nombre de la cancha vía join — la tabla bookings solo
    // guarda court_id, no lo tenía denormalizado.
    const { data, error } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const row = data[0];
    return { ...row, court_name: row.courts?.name };
  },

  async createBooking({ courtId, date, time, startTime, endTime }) {
    const currentUser = this.getCurrentUser();
    const court = await this.getCourtById(courtId);
    // Auditoría 2026-08-10: `time`/el fallback fijo quedan solo como red de
    // seguridad — el llamador (CourtProfilePage) ahora siempre manda
    // startTime/endTime en formato "HH:MM" real, no un texto tipo
    // "20:00 - 21:30" (eso rechazaba siempre el insert: start_time es TIME).
    const slotTime = startTime || time || '20:00';

    // ── REQUISITO #4: INSERCIÓN DIRECTA EN SUPABASE POSTGRESQL ──────────
    // Se envía directamente la consulta a la BD. Si la restricción unívoca
    // unique_court_booking (court_id, date, start_time) falla a nivel de servidor,
    // Supabase devuelve el código 23505 y el error es propagado.
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        court_id: courtId,
        user_id: currentUser.id,
        date: date,
        start_time: slotTime,
        end_time: endTime || null,
        price: court?.price_per_hour || 4500,
        status: 'confirmed'
      })
      .select()
      .single();

    if (error) {
      console.error('⚠️ Supabase Booking Error Code:', error.code, error.message);
      if (error.code === '23505' || error.message?.includes('unique_court_booking') || error.details?.includes('already exists')) {
        throw new Error('RESTRICCIÓN BD (23505): Esta cancha ya tiene un turno reservado para esa fecha y hora.');
      }
      throw new Error(`Error de base de datos (${error.code || 'DB_ERR'}): ${error.message}`);
    }

    return data;
  },

  // Reserva recurrente: crea una fila por cada fecha ya validada como libre
  // (la disponibilidad se chequea antes, en el modal, con
  // src/lib/recurringAvailability.js) y las agrupa con un recurrence_id
  // compartido. Si alguna choca igual (alguien reservó en el ratito entre
  // que se mostró la disponibilidad y se confirmó), se informan cuáles
  // fallaron en vez de perder toda la serie.
  async createRecurringBooking({ courtId, dates, startTime, endTime }) {
    const currentUser = this.getCurrentUser();
    const court = await this.getCourtById(courtId);
    const recurrenceId = crypto.randomUUID();

    const rows = dates.map((date) => ({
      court_id: courtId,
      user_id: currentUser.id,
      date,
      start_time: startTime,
      end_time: endTime || null,
      price: court?.price_per_hour || 4500,
      status: 'confirmed',
      recurrence_id: recurrenceId
    }));

    const { data, error } = await supabase.from('bookings').insert(rows).select();

    if (error) {
      // Si el error es por choque de horario, puede ser que solo algunas
      // filas del lote fallaran — Postgres/PostgREST no distingue cuál
      // dentro de un insert múltiple, así que se informa la serie completa.
      if (error.code === '23505') {
        throw new Error('Una o más fechas de esta serie ya se ocuparon justo ahora. Volvé a intentar.');
      }
      throw new Error(`Error al crear la reserva recurrente: ${error.message}`);
    }

    return data;
  },

  // 6. POSTS SOCIALES
  async getPosts(filterTag = 'all') {
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    let posts = data;
    if (error || !data || data.length === 0) {
      posts = INITIAL_POSTS;
    }

    const currentUser = this.getCurrentUser();
    if (filterTag === 'following') {
      const followingSet = new Set(currentUser.following_ids || []);
      return posts.filter(p => followingSet.has(p.author_id) || p.author_id === currentUser.id);
    }
    if (filterTag === 'open_matches') {
      return posts.filter(p => p.type === 'open_match');
    }
    if (filterTag === 'results') {
      return posts.filter(p => p.type === 'match_result');
    }
    return posts;
  },

  async getCourtFeed(courtId) {
    const { data, error } = await supabase.from('posts').select('*').eq('court_id', courtId);
    if (error || !data || data.length === 0) {
      const all = await this.getPosts('all');
      return all.filter(p => p.court_id === courtId);
    }
    return data;
  },

  async createPost(postData) {
    const currentUser = this.getCurrentUser();

    let linkedMatchId = null;
    if (postData.type === 'open_match' && postData.open_match_details) {
      const newMatch = await this.createOpenMatch({
        court_id: postData.court_id,
        court_name: postData.court_name,
        date: postData.open_match_details.date,
        time: postData.open_match_details.time,
        level_required: postData.open_match_details.category,
        price_per_player: postData.open_match_details.price_per_player
      });
      linkedMatchId = newMatch.id;
    }

    const payload = {
      author_id: currentUser.id,
      author_type: postData.author_type || 'user',
      court_id: postData.court_id || null,
      court_name: postData.court_name || null,
      type: postData.type || 'standard',
      content: postData.content,
      media_url: postData.media_url || null,
      score: postData.score || null,
      open_match_details: postData.open_match_details
        ? { ...postData.open_match_details, match_id: linkedMatchId }
        : null,
      match_id: linkedMatchId,
      likes: []
    };

    const { data, error } = await supabase.from('posts').insert(payload).select().single();
    if (error || !data) {
      console.warn('Supabase post insert fallback:', error?.message);
      return { id: `p-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    }
    return data;
  },

  async toggleLikePost(postId) {
    // Alterna el like vía función server-side (public.toggle_post_like) para
    // que sea atómico: evita que dos "me gusta" simultáneos se pisen entre sí,
    // y no requiere abrir el UPDATE de posts a usuarios que no son el autor.
    const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId });
    if (error) {
      console.error('Error al dar me gusta:', error.message);
      throw new Error(`Error al dar me gusta: ${error.message}`);
    }
    return data;
  },

  // 7. OPEN MATCHES & MATCH PLAYERS
  async getOpenMatches() {
    const { data, error } = await supabase.from('open_matches').select('*, match_players(*)').eq('status', 'open').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return INITIAL_OPEN_MATCHES;
    }
    return data;
  },

  async getOpenMatchById(id) {
    const { data, error } = await supabase.from('open_matches').select('*, match_players(*)').eq('id', id).maybeSingle();
    if (error || !data) {
      return INITIAL_OPEN_MATCHES.find(m => m.id === id) || INITIAL_OPEN_MATCHES[0];
    }
    return data;
  },

  async createOpenMatch(matchData) {
    const currentUser = this.getCurrentUser();
    const payload = {
      host_id: currentUser.id,
      court_id: matchData.court_id || null,
      court_name: matchData.court_name || 'Cancha a confirmar',
      date: matchData.date || 'Hoy',
      time: matchData.time || '20:00 - 21:30',
      is_flexible_date: !!matchData.is_flexible_date,
      search_type: matchData.search_type || 'player',
      level_required: matchData.level_required || currentUser.level || '4ta Categoría',
      price_per_player: matchData.price_per_player || 1200,
      max_players: 4,
      joined_players: [
        { id: currentUser.id, name: currentUser.full_name, avatar: currentUser.avatar_url, role: 'organizer' }
      ]
    };

    const { data, error } = await supabase.from('open_matches').insert(payload).select().single();
    if (!error && data) {
      // Registrar en la tabla match_players
      await supabase.from('match_players').insert({ match_id: data.id, user_id: currentUser.id, slot_index: 1 });
      return data;
    }

    return { id: `m-${Date.now()}`, ...payload };
  },

  async joinOpenMatch(matchId) {
    const currentUser = this.getCurrentUser();
    const match = await this.getOpenMatchById(matchId);
    if (!match) throw new Error('Partido no encontrado');

    // Solo se inserta en match_players — open_matches.joined_players y status
    // se recalculan server-side vía el trigger sync_open_match_players, de
    // forma atómica. Esto evita que dos jugadores sumándose casi a la vez se
    // pisen entre sí (antes el cliente leía y reescribía el array a mano).
    const { error } = await supabase.from('match_players').insert({
      match_id: matchId,
      user_id: currentUser.id,
      slot_index: (match.joined_players?.length || 1) + 1
    });

    if (error) {
      if (error.code === '23505') throw new Error('Ya estás anotado en este partido');
      throw new Error(`Error al sumarte al partido: ${error.message}`);
    }

    return this.getOpenMatchById(matchId);
  },

  async updateOpenMatch(matchId, updates) {
    const payload = {
      court_id: updates.court_id || null,
      court_name: updates.court_name,
      date: updates.date,
      time: updates.time,
      is_flexible_date: !!updates.is_flexible_date,
      search_type: updates.search_type,
      level_required: updates.level_required,
      price_per_player: updates.price_per_player
    };

    const { data, error } = await supabase.from('open_matches').update(payload).eq('id', matchId).select().single();
    if (error) {
      console.error('Error al editar la búsqueda:', error.message);
      throw new Error(`Error al editar la búsqueda: ${error.message}`);
    }
    return data;
  },

  async cancelOpenMatch(matchId) {
    const { data, error } = await supabase.from('open_matches').update({ status: 'cancelled' }).eq('id', matchId).select().single();
    if (error) {
      console.error('Error al cerrar la búsqueda:', error.message);
      throw new Error(`Error al cerrar la búsqueda: ${error.message}`);
    }
    return data;
  },

  // 8. TOURNAMENTS & TOURNAMENT REGISTRATIONS
  async getTournaments() {
    const { data, error } = await supabase.from('tournaments').select('*, tournament_registrations(*)');
    if (error || !data || data.length === 0) {
      return INITIAL_TOURNAMENTS;
    }
    return data;
  },

  async registerForTournament(tournamentId) {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase.from('tournament_registrations').insert({
      tournament_id: tournamentId,
      player1_id: currentUser.id,
      team_name: `Pareja de ${currentUser.full_name}`
    }).select().single();

    if (error) {
      if (error.code === '23505') throw new Error('Ya estás inscripto en este torneo');
      throw new Error(`Error en inscripción: ${error.message}`);
    }

    await supabase.rpc('increment_tournament_teams', { t_id: tournamentId }).catch(() => {});
    return data;
  },

  async getCurrentAuthUser() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await this.getUserById(session.user.id);
          return profile || session.user;
        }
      } catch (e) {
        console.warn('Error al obtener sesión de Supabase:', e);
      }
    }
    return this.getCurrentUser();
  },

  // 9. CHATS & MESSAGES
  async getChatMessages(otherUserId) {
    const currentUser = await this.getCurrentAuthUser();
    if (!currentUser?.id || !otherUserId) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error al obtener mensajes:', error.message);
      return [];
    }
    return data || [];
  },

  async sendChatMessage(otherUserId, text) {
    const currentUser = await this.getCurrentAuthUser();
    if (!currentUser?.id || !otherUserId) throw new Error('Usuario no autenticado');

    // Asegurar perfil del emisor en public.profiles para evitar error FK 23503
    await this.ensureProfile(currentUser);

    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      text: text.trim()
    }).select().single();

    if (error) {
      console.error('Error enviando mensaje a Supabase:', error.message);
      throw new Error(`Error enviando mensaje: ${error.message}`);
    }
    return data;
  },

  async markMessagesAsRead(otherUserId) {
    const currentUser = await this.getCurrentAuthUser();
    if (!currentUser?.id || !otherUserId) return;

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', currentUser.id)
      .eq('is_read', false);

    if (error) console.warn('Error al marcar mensajes como leídos:', error.message);
  }
};

// ====================================================================
// REACT QUERY CUSTOM HOOKS EXPORTED FOR ALL PAGES
// ====================================================================
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => padelService.getUsers()
  });
}

export function useUpcomingBooking() {
  return useQuery({
    queryKey: ['upcoming_booking'],
    queryFn: () => padelService.getUpcomingBookingForCurrentUser()
  });
}

export function useCourts() {
  return useQuery({
    queryKey: ['courts'],
    queryFn: () => padelService.getCourts()
  });
}

export function useCourt(courtId) {
  return useQuery({
    queryKey: ['court', courtId],
    queryFn: () => padelService.getCourtById(courtId),
    enabled: Boolean(courtId)
  });
}

export function useClubs() {
  return useQuery({
    queryKey: ['clubs'],
    queryFn: () => padelService.getClubs()
  });
}

export function usePosts(filterTag = 'all') {
  return useQuery({
    queryKey: ['posts', filterTag],
    queryFn: () => padelService.getPosts(filterTag)
  });
}

export function useOpenMatches() {
  return useQuery({
    queryKey: ['open_matches'],
    queryFn: () => padelService.getOpenMatches()
  });
}

export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: () => padelService.getTournaments()
  });
}

export function useBookings(courtId, date) {
  return useQuery({
    queryKey: ['bookings', courtId, date],
    queryFn: () => (courtId && date ? padelService.getBookingsForCourt(courtId, date) : padelService.getBookings())
  });
}

export function useCourtBookingsInRange(courtId, fromDate, toDate) {
  return useQuery({
    queryKey: ['bookings_range', courtId, fromDate, toDate],
    queryFn: () => padelService.getCourtBookingsInRange(courtId, fromDate, toDate),
    enabled: Boolean(courtId && fromDate && toDate)
  });
}

export function useChatMessages(otherUserId) {
  return useQuery({
    queryKey: ['chatMessages', otherUserId],
    queryFn: () => padelService.getChatMessages(otherUserId),
    enabled: Boolean(otherUserId)
  });
}

export function useAvailabilities() {
  return useQuery({
    queryKey: ['availabilities'],
    queryFn: () => padelService.getAvailabilities()
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => padelService.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings_range'] });
      // Antes no se invalidaba esto — la tarjeta "Próxima Reserva" del
      // sidebar quedaba desactualizada hasta el próximo refetch automático.
      queryClient.invalidateQueries({ queryKey: ['upcoming_booking'] });
    }
  });
}

export function useCreateRecurringBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => padelService.createRecurringBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings_range'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming_booking'] });
    }
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => padelService.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['open_matches'] });
    }
  });
}

export function useCreateOpenMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => padelService.createOpenMatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open_matches'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => padelService.setUserAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    }
  });
}

export function useRemoveAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => padelService.removeUserAvailability(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    }
  });
}

export function useJoinOpenMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId) => padelService.joinOpenMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open_matches'] });
    }
  });
}

export function useUpdateOpenMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, updates }) => padelService.updateOpenMatch(matchId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open_matches'] });
    }
  });
}

export function useCancelOpenMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId) => padelService.cancelOpenMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open_matches'] });
    }
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ otherUserId, text }) => padelService.sendChatMessage(otherUserId, text),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', variables.otherUserId] });
    }
  });
}

// ── Alta de clubes + panel privado (moderador/admin) ──────────────────────
export function useMyClubApplication() {
  return useQuery({
    queryKey: ['my_club_application'],
    queryFn: () => padelService.getMyClubApplication()
  });
}

export function useRequestClubMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => padelService.requestClubMembership(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_club_application'] });
    }
  });
}

export function usePendingClubs() {
  return useQuery({
    queryKey: ['admin_pending_clubs'],
    queryFn: () => padelService.getPendingClubs()
  });
}

export function useActiveClubsAdmin() {
  return useQuery({
    queryKey: ['admin_active_clubs'],
    queryFn: () => padelService.getActiveClubsAdmin()
  });
}

export function useApproveClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clubId) => padelService.approveClub(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_pending_clubs'] });
      queryClient.invalidateQueries({ queryKey: ['admin_active_clubs'] });
    }
  });
}

export function useRejectClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clubId, reason }) => padelService.rejectClub(clubId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_pending_clubs'] });
    }
  });
}

export function useAllUsersAdmin() {
  return useQuery({
    queryKey: ['admin_all_users'],
    queryFn: () => padelService.getAllUsersAdmin()
  });
}

export function useBusinessMetrics() {
  return useQuery({
    queryKey: ['admin_business_metrics'],
    queryFn: () => padelService.getBusinessMetrics()
  });
}

export function useUpdateStaffPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permissions }) => padelService.updateStaffPermissions(userId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_users'] });
      queryClient.invalidateQueries({ queryKey: ['staff_access_candidates'] });
    }
  });
}

export function useStaffAccessCandidates() {
  return useQuery({
    queryKey: ['staff_access_candidates'],
    queryFn: () => padelService.getStaffAccessCandidates()
  });
}

export function useRequestStaffAccess() {
  return useMutation({
    mutationFn: () => padelService.requestStaffAccess()
  });
}
