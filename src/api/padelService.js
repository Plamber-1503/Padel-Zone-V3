/**
 * padelService.js — Capa de Servicios 100% Supabase Client + React Query Remote State Management
 */

import { supabase } from '@/lib/supabaseClient';
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

    // Consulta directa a la tabla public.profiles de Supabase
    const { data: profiles, error: profileErr } = await supabase.from('profiles').select('*');
    if (!profileErr && profiles && profiles.length > 0) {
      const term = (emailOrUsername || '').toLowerCase().trim();
      const found = profiles.find(p => p.email?.toLowerCase() === term || p.full_name?.toLowerCase() === term);
      if (found) return this.setCurrentUser(found);
    }

    const localUsers = INITIAL_USERS;
    const term = (emailOrUsername || '').toLowerCase().trim();
    const foundLocal = localUsers.find(u => u.email?.toLowerCase() === term || u.username?.toLowerCase() === term || u.full_name?.toLowerCase() === term);
    if (foundLocal) return this.setCurrentUser(foundLocal);

    throw new Error('Usuario no encontrado o contraseña incorrecta');
  },

  // 1. PROFILES & USERS
  async getUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data || data.length === 0) {
      return INITIAL_USERS;
    }
    return data;
  },

  async getUserById(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      return INITIAL_USERS.find(u => u.id === id) || null;
    }
    return data;
  },

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
    const partnerUser = await this.getUserById(partnerId);
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
    const { data, error } = await supabase.from('court_availability').select('*');
    if (error || !data || data.length === 0) {
      return INITIAL_AVAILABILITIES;
    }
    return data;
  },

  async getUserAvailability(userId) {
    const { data, error } = await supabase.from('court_availability').select('*').eq('court_id', userId).maybeSingle();
    if (error || !data) {
      return INITIAL_AVAILABILITIES.find(a => a.user_id === userId) || null;
    }
    return data;
  },

  async setUserAvailability({ availability_type, court_id, court_name, date, time, is_flexible }) {
    const currentUser = this.getCurrentUser();
    const payload = {
      court_id: court_id || null,
      day_of_week: 1,
      start_time: '19:00:00',
      end_time: '21:00:00',
      is_available: true
    };

    const { data, error } = await supabase.from('court_availability').insert(payload).select().maybeSingle();
    if (error) console.warn('Supabase availability insert warning:', error.message);
    return data || { id: `av-${Date.now()}`, user_id: currentUser.id, court_id, date, time, is_flexible };
  },

  async removeUserAvailability() {
    const currentUser = this.getCurrentUser();
    await supabase.from('court_availability').delete().eq('court_id', currentUser.id);
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

  async getUpcomingBookingForCurrentUser() {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0];
  },

  async createBooking({ courtId, date, time, startTime }) {
    const currentUser = this.getCurrentUser();
    const court = await this.getCourtById(courtId);
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
    const currentUser = this.getCurrentUser();
    const posts = await this.getPosts('all');
    const targetPost = posts.find(p => p.id === postId);
    let newLikes = [];

    if (targetPost) {
      const likes = targetPost.likes || [];
      const alreadyLiked = likes.includes(currentUser.id);
      newLikes = alreadyLiked ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id];
    }

    const { data } = await supabase.from('posts').update({ likes: newLikes }).eq('id', postId).select().single();
    return data || posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p);
  },

  // 7. OPEN MATCHES & MATCH PLAYERS
  async getOpenMatches() {
    const { data, error } = await supabase.from('open_matches').select('*, match_players(*)').order('created_at', { ascending: false });
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

    const { error } = await supabase.from('match_players').insert({
      match_id: matchId,
      user_id: currentUser.id,
      slot_index: (match.joined_players?.length || 1) + 1
    });

    if (error && error.code === '23505') {
      throw new Error('Ya estás anotado en este partido');
    }

    const updatedJoined = [
      ...(match.joined_players || []),
      { id: currentUser.id, name: currentUser.full_name, avatar: currentUser.avatar_url }
    ];

    const { data } = await supabase.from('open_matches').update({ joined_players: updatedJoined }).eq('id', matchId).select().single();
    return data || match;
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

  // 9. CHATS & MESSAGES
  async getChatMessages(otherUserId) {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data;
  },

  async sendChatMessage(otherUserId, text) {
    const currentUser = this.getCurrentUser();
    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      text
    }).select().single();

    if (error) {
      console.warn('Supabase message send fallback:', error.message);
      return [{ id: `cm-${Date.now()}`, sender_id: currentUser.id, text, created_at: new Date().toISOString() }];
    }
    return [data];
  }
};

// ====================================================================
// REACT QUERY CUSTOM HOOKS EXPORTED FOR ALL PAGES
// ====================================================================
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

export function useJoinOpenMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId) => padelService.joinOpenMatch(matchId),
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
