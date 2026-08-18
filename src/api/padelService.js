/**
 * padelService.js — Capa de Servicios 100% Supabase Client + React Query Remote State Management
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildWhatsAppInviteLink, buildWhatsAppCancelLink, buildWhatsAppModifyLink } from '@/lib/whatsappInvite';
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

  // Auditoría 2026-08-12 (incidente): si el SELECT de abajo no encontraba el
  // perfil por una carrera transitoria (ej. justo después de un refresh de
  // token, un instante donde auth.uid() todavía no resuelve igual que el id
  // de la sesión), esta función asumía "no existe" y hacía upsert() con los
  // valores por defecto (role: 'player', etc.) — como el upsert por defecto
  // hace UPDATE si la fila ya existía, esto podía pisar el role/staff_permissions
  // reales de un usuario (admin incluido, porque la policy de UPDATE le permite
  // escribir su propia fila sin restricción). Pasa esto mismo le borró el rol
  // admin a un usuario real en producción. Ahora el upsert usa
  // ignoreDuplicates: true (ON CONFLICT DO NOTHING) — si la fila ya existe,
  // nunca la toca, pase lo que pase con el SELECT previo.
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

    const { error } = await supabase.from('profiles').upsert(newProfile, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      console.warn('Error upserting profile in Supabase:', error.message);
    }

    // Releemos siempre: si la fila ya existía (el insert no hizo nada por
    // ignoreDuplicates), esto trae los datos reales en vez del default.
    const { data: finalProfile } = await supabase.from('profiles').select('*').eq('id', userObj.id).maybeSingle();
    return finalProfile || newProfile;
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

  // Clubes virtuales 2026-08-12: el panel privado carga clubes "clave" sin
  // dueño real, ya aprobados, para mostrar la app más poblada a clubes
  // prospecto — y los puede prender/apagar (is_visible) según a quién se le
  // muestre, sin perder el registro. Las canchas se cargan después con el
  // mismo modal que usa el dueño de un club real (CourtFormModal).
  async createVirtualClub({ name, address, city, phone, description }) {
    const { data, error } = await supabase
      .from('clubs')
      .insert({
        name,
        address,
        city: city || 'Buenos Aires',
        phone: phone || null,
        description: description || null,
        status: 'approved',
        is_visible: true,
        is_virtual: true,
        owner_id: null
      })
      .select()
      .single();
    if (error) throw new Error(`Error al crear el club virtual: ${error.message}`);
    return data;
  },

  async setClubVisibility(clubId, isVisible) {
    const { data, error } = await supabase.rpc('set_club_visibility', { p_club_id: clubId, p_is_visible: isVisible });
    if (error) throw new Error(`Error al actualizar el club: ${error.message}`);
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

  // Notificaciones reales (creadas por create_booking_notification en la
  // base) — hoy solo eventos de reservas, pensado para sumar más tipos después.
  async getMyNotifications() {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data || [];
  },

  async markNotificationRead(id) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.warn('Error al marcar notificación como leída:', error.message);
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
    // Auditoría 2026-08-10: sin el filtro de status, un turno cancelado
    // seguía mostrándose como "Ocupado" para siempre — cancelar no liberaba
    // nada en la pantalla (el índice único de la base sí lo permite, ver
    // schema.sql, pero acá también hay que dejar de contarlo como tomado).
    const { data, error } = await supabase.from('bookings').select('*').eq('court_id', courtId).eq('date', date).eq('status', 'confirmed');
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
      .eq('status', 'confirmed')
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

  // `guestUserIds`: hasta 2 IDs de jugadores de la app invitados (además de
  // la pareja). `externalGuests`: hasta 2 {name, phone} de jugadores sin
  // cuenta — quedan registrados y se devuelve un link de WhatsApp por cada
  // uno para invitarlos (ver src/lib/whatsappInvite.js).
  async createBooking({ courtId, date, time, startTime, endTime, guestUserIds = [], externalGuests = [] }) {
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
        partner_id: currentUser.team_partner_id || null,
        guest_user_ids: guestUserIds,
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

    await this._notifyBookingParticipants(data, 'booking_created', `${currentUser.full_name} reservó una cancha`,
      `${court?.name || 'Cancha'} el ${data.date} a las ${(data.start_time || '').slice(0, 5)}.`);

    const externalGuestLinks = await this._registerExternalGuests(data, court, externalGuests);

    return { ...data, external_guest_links: externalGuestLinks };
  },

  // Reserva recurrente: crea una fila por cada fecha ya validada como libre
  // (la disponibilidad se chequea antes, en el modal, con
  // src/lib/recurringAvailability.js) y las agrupa con un recurrence_id
  // compartido. Si alguna choca igual (alguien reservó en el ratito entre
  // que se mostró la disponibilidad y se confirmó), se informan cuáles
  // fallaron en vez de perder toda la serie. Los invitados (app y externos)
  // se asocian solo a la primera fecha, no a cada ocurrencia repetida.
  async createRecurringBooking({ courtId, dates, startTime, endTime, guestUserIds = [], externalGuests = [] }) {
    const currentUser = this.getCurrentUser();
    const court = await this.getCourtById(courtId);
    const recurrenceId = crypto.randomUUID();

    const rows = dates.map((date, i) => ({
      court_id: courtId,
      user_id: currentUser.id,
      partner_id: currentUser.team_partner_id || null,
      guest_user_ids: i === 0 ? guestUserIds : [],
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

    let externalGuestLinks = [];
    if (data?.[0]) {
      await this._notifyBookingParticipants(data[0], 'booking_created', `${currentUser.full_name} reservó una serie de turnos`,
        `${court?.name || 'Cancha'} — ${data.length} fechas, los ${data.map(d => d.date).join(', ')} a las ${(startTime || '').slice(0, 5)}.`);
      externalGuestLinks = await this._registerExternalGuests(data[0], court, externalGuests);
    }

    return { bookings: data, external_guest_links: externalGuestLinks };
  },

  // Notifica a la pareja y a los invitados de la app (guest_user_ids) sobre
  // un evento de reserva. No falla la operación principal si alguna
  // notificación no se pudo mandar — solo se registra el aviso.
  async _notifyBookingParticipants(booking, type, title, body) {
    const targets = [booking?.partner_id, ...(booking?.guest_user_ids || [])].filter(Boolean);
    for (const userId of targets) {
      const { error } = await supabase.rpc('create_booking_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_body: body,
        p_booking_id: booking.id
      });
      if (error) console.warn('No se pudo notificar a un participante de la reserva:', error.message);
    }
  },

  // Guarda hasta 2 jugadores externos (sin cuenta) asociados a la reserva y
  // devuelve, por cada uno, el link de WhatsApp listo para invitarlo.
  async _registerExternalGuests(booking, court, externalGuests) {
    const list = (externalGuests || []).filter((g) => g?.name?.trim() && g?.phone?.trim()).slice(0, 2);
    if (list.length === 0) return [];

    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('booking_external_guests')
      .insert(list.map((g) => ({ booking_id: booking.id, name: g.name.trim(), phone: g.phone.trim() })))
      .select();
    if (error) {
      console.warn('No se pudieron registrar los jugadores externos:', error.message);
      return [];
    }

    return (data || []).map((g) => ({
      name: g.name,
      phone: g.phone,
      whatsappLink: buildWhatsAppInviteLink({
        phone: g.phone,
        organizerName: currentUser.full_name,
        courtName: court?.name || 'la cancha',
        date: booking.date
      })
    }));
  },

  // Invitados externos (sin cuenta) de una o más reservas — se usa para
  // avisarles por WhatsApp cuando esa reserva se cancela o modifica, ya que
  // no tienen forma de recibir la notificación dentro de la app.
  async _getExternalGuestsForBookings(bookingIds) {
    if (!bookingIds || bookingIds.length === 0) return [];
    const { data, error } = await supabase.from('booking_external_guests').select('*').in('booking_id', bookingIds);
    if (error) {
      console.warn('No se pudieron leer los jugadores externos:', error.message);
      return [];
    }
    return data || [];
  },

  // "Mis Reservas" — turnos activos donde el usuario es quien reservó o su
  // pareja asociada (así le aparece a los dos, como pidió el dueño del producto).
  async getMyBookings() {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .or(`user_id.eq.${currentUser.id},partner_id.eq.${currentUser.id}`)
      .eq('status', 'confirmed')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) throw new Error(`Error al leer tus reservas: ${error.message}`);
    return (data || []).map((b) => ({ ...b, court_name: b.courts?.name, is_mine: b.user_id === currentUser.id }));
  },

  // scope: 'single' cancela solo esa fila; 'series' cancela todas las de la
  // misma recurrence_id (si la tiene).
  async cancelBooking(booking, scope = 'single') {
    const currentUser = this.getCurrentUser();
    const targetIds = scope === 'series' && booking.recurrence_id
      ? null // se resuelve por recurrence_id en el update de abajo
      : [booking.id];

    let query = supabase.from('bookings').update({
      status: 'cancelled',
      cancelled_by: currentUser.id,
      cancelled_at: new Date().toISOString()
    });
    query = targetIds ? query.in('id', targetIds) : query.eq('recurrence_id', booking.recurrence_id);
    query = query.eq('status', 'confirmed');

    const { data, error } = await query.select();
    if (error) throw new Error(`Error al cancelar: ${error.message}`);

    await this._notifyBookingParticipants(booking, 'booking_cancelled', `${currentUser.full_name} canceló ${scope === 'series' ? 'una serie de' : 'una'} reserva`,
      `${booking.court_name || 'Cancha'} — ${scope === 'series' ? `${data?.length || ''} turnos` : `${booking.date} a las ${(booking.start_time || '').slice(0, 5)}`}.`);

    const dateLabel = scope === 'series'
      ? `varias fechas (serie cancelada)`
      : `${booking.date} a las ${(booking.start_time || '').slice(0, 5)}`;
    const cancelledIds = (data || []).map((b) => b.id);
    const externalGuests = await this._getExternalGuestsForBookings(cancelledIds);
    const externalGuestLinks = externalGuests.map((g) => ({
      name: g.name,
      phone: g.phone,
      whatsappLink: buildWhatsAppCancelLink({ phone: g.phone, organizerName: currentUser.full_name, courtName: booking.court_name || 'la cancha', date: dateLabel })
    }));

    return { bookings: data, external_guest_links: externalGuestLinks };
  },

  // "Modificar reserva" = crear la nueva PRIMERO (si el turno nuevo no está
  // libre, el jugador conserva la reserva vieja en vez de quedarse sin
  // ninguna) y recién si eso funciona, cancelar la vieja.
  async modifyBooking(oldBooking, { date, startTime, endTime }) {
    const currentUser = this.getCurrentUser();
    const newBooking = await this.createBooking({ courtId: oldBooking.court_id, date, startTime, endTime });

    await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_by: currentUser.id, cancelled_at: new Date().toISOString(), replaces_booking_id: null })
      .eq('id', oldBooking.id);
    await supabase.from('bookings').update({ replaces_booking_id: oldBooking.id }).eq('id', newBooking.id);

    await this._notifyBookingParticipants(oldBooking, 'booking_modified', `${currentUser.full_name} modificó una reserva`,
      `${oldBooking.court_name || 'Cancha'}: del ${oldBooking.date} ${(oldBooking.start_time || '').slice(0, 5)} pasó al ${date} ${startTime}.`);

    // Los invitados externos de la reserva vieja no se pierden: se copian a
    // la reserva nueva (así una futura cancelación/modificación de ESTA
    // también los encuentra) y se les manda el aviso de WhatsApp del cambio.
    const externalGuests = await this._getExternalGuestsForBookings([oldBooking.id]);
    let externalGuestLinks = [];
    if (externalGuests.length > 0) {
      await supabase.from('booking_external_guests').insert(
        externalGuests.map((g) => ({ booking_id: newBooking.id, name: g.name, phone: g.phone }))
      );
      externalGuestLinks = externalGuests.map((g) => ({
        name: g.name,
        phone: g.phone,
        whatsappLink: buildWhatsAppModifyLink({
          phone: g.phone,
          organizerName: currentUser.full_name,
          courtName: oldBooking.court_name || 'la cancha',
          oldDate: `${oldBooking.date} ${(oldBooking.start_time || '').slice(0, 5)}`,
          newDate: `${date} ${startTime}`
        })
      }));
    }

    return { ...newBooking, external_guest_links: externalGuestLinks };
  },

  // Panel del club: reservas canceladas (incluye las "viejas" de una
  // modificación) de las canchas que administra el dueño logueado.
  async getCancelledBookingsForOwner() {
    const currentUser = this.getCurrentUser();
    const { data: myClubs } = await supabase.from('clubs').select('id').eq('owner_id', currentUser.id);
    const clubIds = (myClubs || []).map((c) => c.id);
    if (clubIds.length === 0) return [];

    const { data: myCourts } = await supabase.from('courts').select('id, name').in('club_id', clubIds);
    const courtIds = (myCourts || []).map((c) => c.id);
    if (courtIds.length === 0) return [];

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .in('court_id', courtIds)
      .eq('status', 'cancelled')
      .order('cancelled_at', { ascending: false });
    if (error) throw new Error(`Error al leer cancelaciones: ${error.message}`);

    const courtNameById = Object.fromEntries((myCourts || []).map((c) => [c.id, c.name]));
    const userIds = [...new Set((bookings || []).flatMap((b) => [b.user_id, b.cancelled_by].filter(Boolean)))];
    let nameById = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles_public').select('id, full_name').in('id', userIds);
      nameById = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]));
    }

    const cancelledIds = (bookings || []).map((b) => b.id);
    let modifiedIds = new Set();
    if (cancelledIds.length > 0) {
      const { data: replacements } = await supabase.from('bookings').select('replaces_booking_id').in('replaces_booking_id', cancelledIds);
      modifiedIds = new Set((replacements || []).map((r) => r.replaces_booking_id));
    }

    return (bookings || []).map((b) => ({
      ...b,
      court_name: courtNameById[b.court_id] || '—',
      booker_name: nameById[b.user_id] || 'Jugador',
      cancelled_by_name: b.cancelled_by ? nameById[b.cancelled_by] || 'Jugador' : null,
      was_modification: modifiedIds.has(b.id)
    }));
  },

  // Panel del club 2026-08-12: canchas reales del club del dueño logueado
  // (antes el panel mostraba TODAS las canchas de la app, mezcladas con
  // altas que solo vivían en memoria y se perdían al refrescar).
  async getMyClubCourts() {
    const club = await this.getMyClubApplication();
    if (!club) return { club: null, courts: [] };
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('club_id', club.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Error al leer las canchas del club: ${error.message}`);
    return { club, courts: data || [] };
  },

  async createCourt({ clubId, name, surface, pricePerHour, openingTime = '09:00', closingTime = '22:30', slotDurationMinutes = 90, amenities = [], imageUrl, galleryImages = [], isBookable = true }) {
    const { data, error } = await supabase
      .from('courts')
      .insert({
        club_id: clubId,
        name,
        surface,
        price_per_hour: Number(pricePerHour) || 4500,
        opening_time: openingTime,
        closing_time: closingTime,
        slot_duration_minutes: Number(slotDurationMinutes) || 90,
        amenities,
        image_url: imageUrl || galleryImages[0] || null,
        gallery_images: galleryImages,
        is_bookable: isBookable
      })
      .select()
      .single();
    if (error) throw new Error(`Error al crear la cancha: ${error.message}`);
    return data;
  },

  // Canchas de un club puntual — a diferencia de getMyClubCourts (acotado al
  // club del dueño logueado), esto lo usa el panel privado para gestionar
  // las canchas de CUALQUIER club virtual (RLS exige permiso de staff).
  async getCourtsForClub(clubId) {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Error al leer las canchas del club: ${error.message}`);
    return data || [];
  },

  async setCourtActive(courtId, isActive) {
    const { data, error } = await supabase
      .from('courts')
      .update({ is_active: isActive })
      .eq('id', courtId)
      .select()
      .single();
    if (error) throw new Error(`Error al actualizar la cancha: ${error.message}`);
    return data;
  },

  // Panel privado: marcar una cancha demo como reservable de verdad (para
  // poder mostrar el flujo completo de reservas) o volverla de exhibición.
  async setCourtBookable(courtId, isBookable) {
    const { data, error } = await supabase
      .from('courts')
      .update({ is_bookable: isBookable })
      .eq('id', courtId)
      .select()
      .single();
    if (error) throw new Error(`Error al actualizar la cancha: ${error.message}`);
    return data;
  },

  // Edición general (nombre, precio, superficie, fotos, diferenciales) de una
  // cancha ya creada — reutiliza el mismo modal de "Agregar cancha".
  async updateCourt(courtId, patch) {
    const { data, error } = await supabase.from('courts').update(patch).eq('id', courtId).select().single();
    if (error) throw new Error(`Error al actualizar la cancha: ${error.message}`);
    return data;
  },

  // Sube una foto al bucket 'court-photos' (público para lectura, escritura
  // restringida por RLS de storage al dueño del club) y devuelve su URL
  // pública para guardar en courts.image_url / courts.gallery_images.
  async uploadCourtPhoto(clubId, file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${clubId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('court-photos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`Error al subir la foto: ${error.message}`);
    const { data } = supabase.storage.from('court-photos').getPublicUrl(path);
    return data.publicUrl;
  },

  // Sube una foto al bucket 'post-photos' para una publicación del feed —
  // separado de 'court-photos' porque ese bucket solo admite subidas del
  // dueño del club; acá cualquier jugador autenticado puede subir a su
  // propia carpeta ({user_id}/...).
  async uploadPostPhoto(file) {
    const currentUser = await this.getCurrentAuthUser();
    if (!currentUser?.id) throw new Error('Debés iniciar sesión para subir una foto');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('post-photos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`Error al subir la foto: ${error.message}`);
    const { data } = supabase.storage.from('post-photos').getPublicUrl(path);
    return data.publicUrl;
  },

  // Métricas reales del club (reemplaza los literales fijos "$1.480.000",
  // "94%", etc. que mostraba el panel B2B) — calculadas a partir de las
  // reservas confirmadas del mes en curso sobre las canchas del club.
  async getMyClubMetrics() {
    const { club, courts } = await this.getMyClubCourts();
    if (!club) return null;
    const courtIds = courts.map((c) => c.id);
    if (courtIds.length === 0) {
      return { revenueThisMonth: 0, hoursBooked: 0, bookingsCount: 0, topCourt: null, topCourtSharePct: 0 };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('court_id, price, start_time, end_time, date')
      .in('court_id', courtIds)
      .eq('status', 'confirmed')
      .gte('date', monthStart);
    if (error) throw new Error(`Error al calcular métricas: ${error.message}`);

    let revenue = 0;
    let minutes = 0;
    const countByCourtId = {};
    (bookings || []).forEach((b) => {
      revenue += Number(b.price) || 0;
      if (b.start_time && b.end_time) {
        const [sh, sm] = b.start_time.split(':').map(Number);
        const [eh, em] = b.end_time.split(':').map(Number);
        minutes += (eh * 60 + em) - (sh * 60 + sm);
      }
      countByCourtId[b.court_id] = (countByCourtId[b.court_id] || 0) + 1;
    });

    let topCourtId = null;
    let topCount = 0;
    Object.entries(countByCourtId).forEach(([courtId, count]) => {
      if (count > topCount) { topCount = count; topCourtId = courtId; }
    });
    const totalBookings = bookings?.length || 0;

    return {
      revenueThisMonth: revenue,
      hoursBooked: Math.round((minutes / 60) * 10) / 10,
      bookingsCount: totalBookings,
      topCourt: courts.find((c) => c.id === topCourtId) || null,
      topCourtSharePct: totalBookings > 0 && topCourtId ? Math.round((topCount / totalBookings) * 100) : 0
    };
  },

  // 6. POSTS SOCIALES
  async getPosts(filterTag = 'all') {
    const { data, error } = await supabase
      .from('posts')
      .select('*, comments(*), courts(club_id, clubs(owner_id, is_virtual, allow_comments))')
      .order('created_at', { ascending: false })
      .order('created_at', { foreignTable: 'comments', ascending: true });

    // Auditoría 2026-08-15: un error acá (ej. un hiccup de red) caía en
    // silencio a INITIAL_POSTS (posts de mentira armados en el cliente) —
    // el feed "seguía andando" pero un like recién dado por otro usuario
    // podía desaparecer de la pantalla en el siguiente refetch, porque los
    // posts fake nunca lo tenían. Si Supabase está configurado, un error
    // real ahora se propaga (React Query reintenta solo) en vez de taparse
    // con datos falsos; la demo sin Supabase configurado sigue igual.
    if (error && isSupabaseConfigured) {
      throw new Error(`Error al cargar publicaciones: ${error.message}`);
    }

    let posts = data;
    if (!data || data.length === 0) {
      posts = INITIAL_POSTS;
    }

    const currentUser = this.getCurrentUser();
    if (filterTag === 'following') {
      const followingSet = new Set(currentUser.following_ids || []);
      // Un club publica con la cuenta del staff (author_id), no con el id
      // del club — así que "seguís al club" (su court_id está en
      // following_ids) no matcheaba nunca contra author_id. Ahora también
      // cuenta seguir la cancha/club de la publicación.
      return posts.filter(p =>
        followingSet.has(p.author_id) ||
        (p.court_id && followingSet.has(p.court_id)) ||
        p.author_id === currentUser.id
      );
    }
    if (filterTag === 'open_matches') {
      return posts.filter(p => p.type === 'open_match');
    }
    if (filterTag === 'results') {
      return posts.filter(p => p.type === 'match_result');
    }
    return posts;
  },

  // Editar/eliminar la propia publicación — sin ventana de tiempo.
  async updatePost(postId, { content, media_url }) {
    const { data, error } = await supabase
      .from('posts')
      .update({ content, media_url: media_url || null, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select()
      .single();
    if (error) throw new Error(`Error al editar la publicación: ${error.message}`);
    return data;
  },

  async deletePost(postId) {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw new Error(`Error al eliminar la publicación: ${error.message}`);
  },

  // Borra un comentario — el propio autor, o el dueño del club moderando su
  // propia publicación (RLS valida cuál de los dos casos aplica).
  async deleteComment(commentId) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw new Error(`Error al eliminar el comentario: ${error.message}`);
  },

  async setClubCommentsAllowed(clubId, allowed) {
    const { data, error } = await supabase.rpc('set_club_comments_allowed', { p_club_id: clubId, p_allowed: allowed });
    if (error) throw new Error(`Error al actualizar el club: ${error.message}`);
    return data;
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
    // getCurrentAuthUser(), no getCurrentUser(): mismo motivo que en
    // addComment — el post debe quedar firmado con la sesión real, no con
    // lo último que haya quedado cacheado en localStorage.
    const currentUser = await this.getCurrentAuthUser();
    if (!currentUser?.id) throw new Error('Debés iniciar sesión para publicar');

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

    const taggedUserIds = postData.tagged_user_ids || [];

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
      likes: [],
      tagged_user_ids: taggedUserIds
    };

    const { data, error } = await supabase.from('posts').insert(payload).select().single();
    // Auditoría 2026-08-13: antes, si esto fallaba, se devolvía igual un
    // post "de mentira" armado en el cliente en vez de tirar el error — el
    // que publica veía "éxito" aunque nada se hubiera guardado de verdad.
    if (error) throw new Error(`Error al publicar: ${error.message}`);

    // Notificar a cada etiquetado — mejor esfuerzo, no bloquea la publicación
    // si una notificación puntual falla.
    for (const userId of taggedUserIds) {
      const { error: notifyError } = await supabase.rpc('create_tag_notification', { p_user_id: userId, p_post_id: data.id });
      if (notifyError) console.warn('No se pudo notificar a un usuario etiquetado:', notifyError.message);
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

  async addComment(postId, text) {
    // getCurrentAuthUser() en vez de getCurrentUser(): este último lee el
    // perfil cacheado en localStorage, que puede haber quedado pisado por
    // la sesión de otra cuenta en el mismo navegador — el comentario
    // quedaría firmado con la identidad equivocada aunque la sesión real
    // sea la correcta (auditoría 2026-08-15).
    const currentUser = await this.getCurrentAuthUser();
    if (!currentUser?.id) throw new Error('Debés iniciar sesión para comentar');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: currentUser.id,
        author_name: currentUser.full_name,
        author_avatar: currentUser.avatar_url,
        content: text
      })
      .select()
      .single();
    if (error) throw new Error(`Error al comentar: ${error.message}`);

    const { error: notifyError } = await supabase.rpc('create_comment_notification', { p_post_id: postId, p_comment_id: data.id });
    if (notifyError) console.warn('No se pudo notificar el comentario:', notifyError.message);

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
  },

  async getUnreadMessagesCount() {
    const currentUser = await this.getCurrentAuthUser();
    if (!currentUser?.id) return 0;

    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', currentUser.id)
      .eq('is_read', false);

    if (error) {
      console.warn('Error al contar mensajes sin leer:', error.message);
      return 0;
    }
    return count || 0;
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

export function useMyBookings() {
  return useQuery({
    queryKey: ['my_bookings'],
    queryFn: () => padelService.getMyBookings()
  });
}

function invalidateBookingQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['bookings'] });
  queryClient.invalidateQueries({ queryKey: ['bookings_range'] });
  queryClient.invalidateQueries({ queryKey: ['upcoming_booking'] });
  queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
  queryClient.invalidateQueries({ queryKey: ['owner_cancelled_bookings'] });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ booking, scope }) => padelService.cancelBooking(booking, scope),
    onSuccess: () => invalidateBookingQueries(queryClient)
  });
}

export function useModifyBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldBooking, newSlot }) => padelService.modifyBooking(oldBooking, newSlot),
    onSuccess: () => invalidateBookingQueries(queryClient)
  });
}

export function useCancelledBookingsForOwner() {
  return useQuery({
    queryKey: ['owner_cancelled_bookings'],
    queryFn: () => padelService.getCancelledBookingsForOwner()
  });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: ['my_notifications'],
    queryFn: () => padelService.getMyNotifications(),
    refetchInterval: 60000 // cada 1 min — no hay Realtime para esto todavía
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => padelService.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my_notifications'] })
  });
}

export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ['unread_messages_count'],
    queryFn: () => padelService.getUnreadMessagesCount(),
    refetchInterval: 30000
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

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }) => padelService.addComment(postId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, content, media_url }) => padelService.updatePost(postId, { content, media_url }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId) => padelService.deletePost(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => padelService.deleteComment(commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });
}

export function useSetClubCommentsAllowed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clubId, allowed }) => padelService.setClubCommentsAllowed(clubId, allowed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
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

// ── Panel de dueño de club: inventario de canchas y métricas reales ───────
export function useMyClubCourts() {
  return useQuery({
    queryKey: ['my_club_courts'],
    queryFn: () => padelService.getMyClubCourts()
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => padelService.createCourt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    }
  });
}

export function useSetCourtActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, isActive }) => padelService.setCourtActive(courtId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    }
  });
}

export function useSetCourtBookable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, isBookable }) => padelService.setCourtBookable(courtId, isBookable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['my_club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    }
  });
}

export function useUpdateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, patch }) => padelService.updateCourt(courtId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['club_courts'] });
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    }
  });
}

export function useCourtsForClub(clubId) {
  return useQuery({
    queryKey: ['club_courts', clubId],
    queryFn: () => padelService.getCourtsForClub(clubId),
    enabled: Boolean(clubId)
  });
}

export function useUploadCourtPhoto() {
  return useMutation({
    mutationFn: ({ clubId, file }) => padelService.uploadCourtPhoto(clubId, file)
  });
}

export function useUploadPostPhoto() {
  return useMutation({
    mutationFn: (file) => padelService.uploadPostPhoto(file)
  });
}

export function useMyClubMetrics() {
  return useQuery({
    queryKey: ['my_club_metrics'],
    queryFn: () => padelService.getMyClubMetrics()
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

export function useCreateVirtualClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => padelService.createVirtualClub(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_active_clubs'] });
    }
  });
}

export function useSetClubVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clubId, isVisible }) => padelService.setClubVisibility(clubId, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_active_clubs'] });
      queryClient.invalidateQueries({ queryKey: ['courts'] });
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
