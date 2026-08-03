/**
 * padelService.js — Capa de Servicios y Estado Local Persistente (PadelZone v3)
 */

import {
  INITIAL_USERS,
  INITIAL_COURTS,
  INITIAL_POSTS,
  INITIAL_OPEN_MATCHES,
  INITIAL_TOURNAMENTS,
  INITIAL_AVAILABILITIES
} from './mockData';

const KEYS = {
  USERS: 'pz3_users',
  COURTS: 'pz3_courts',
  POSTS: 'pz3_posts',
  MATCHES: 'pz3_open_matches',
  TOURNAMENTS: 'pz3_tournaments',
  BOOKINGS: 'pz3_bookings',
  CHATS: 'pz3_chats',
  CURRENT_USER: 'pz3_current_user',
  AVAILABILITIES: 'pz3_availabilities'
};

function getItem(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) return parsed;
    }
  } catch (e) { console.error('Error reading localStorage', e); }
  return fallback;
}

function setItem(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) { console.error('Error writing localStorage', e); }
}

const VERSION_KEY = 'pz3_db_version_v4';

export function initPadelStorage() {
  if (!localStorage.getItem(VERSION_KEY)) {
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.removeItem(KEYS.POSTS);
    localStorage.removeItem(KEYS.COURTS);
    localStorage.removeItem(KEYS.TOURNAMENTS);
    localStorage.removeItem(KEYS.AVAILABILITIES);
    localStorage.removeItem(KEYS.MATCHES);
    localStorage.setItem(VERSION_KEY, 'true');
  }

  if (!localStorage.getItem(KEYS.USERS)) setItem(KEYS.USERS, INITIAL_USERS);
  if (!localStorage.getItem(KEYS.COURTS)) setItem(KEYS.COURTS, INITIAL_COURTS);
  if (!localStorage.getItem(KEYS.POSTS)) setItem(KEYS.POSTS, INITIAL_POSTS);
  if (!localStorage.getItem(KEYS.MATCHES)) setItem(KEYS.MATCHES, INITIAL_OPEN_MATCHES);
  if (!localStorage.getItem(KEYS.TOURNAMENTS)) setItem(KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
  if (!localStorage.getItem(KEYS.AVAILABILITIES)) setItem(KEYS.AVAILABILITIES, INITIAL_AVAILABILITIES);
  if (!localStorage.getItem(KEYS.BOOKINGS)) setItem(KEYS.BOOKINGS, []);
  if (!localStorage.getItem(KEYS.CHATS)) setItem(KEYS.CHATS, {});
  if (!localStorage.getItem(KEYS.CURRENT_USER)) setItem(KEYS.CURRENT_USER, INITIAL_USERS[0]);
}

// Ensure init
initPadelStorage();

export const padelService = {
  // Auth
  getCurrentUser() {
    return getItem(KEYS.CURRENT_USER, INITIAL_USERS[0]);
  },

  setCurrentUser(user) {
    setItem(KEYS.CURRENT_USER, user);
    return user;
  },

  login(email, password) {
    const users = getItem(KEYS.USERS, INITIAL_USERS);
    const found = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
    if (!found) throw new Error('Usuario no encontrado');
    if (found.password && found.password !== password) throw new Error('Contraseña incorrecta (Usa: demo123)');
    return this.setCurrentUser(found);
  },

  // Users
  getUsers() {
    return getItem(KEYS.USERS, INITIAL_USERS);
  },

  getUserById(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id);
  },

  toggleFollow(targetId) {
    const current = this.getCurrentUser();
    let following = current.following_ids || [];
    if (following.includes(targetId)) {
      following = following.filter(id => id !== targetId);
    } else {
      following = [...following, targetId];
    }
    const updatedUser = { ...current, following_ids: following };
    this.setCurrentUser(updatedUser);

    // Update in users list
    const users = this.getUsers().map(u => u.id === current.id ? updatedUser : u);
    setItem(KEYS.USERS, users);
    return updatedUser;
  },

  setTeamPartner(partnerId) {
    const current = this.getCurrentUser();
    const partnerUser = this.getUserById(partnerId);
    if (!partnerUser) throw new Error('Jugador no encontrado');

    const updatedUser = {
      ...current,
      team_partner_id: partnerUser.id,
      team_partner_name: partnerUser.full_name,
      team_partner_avatar: partnerUser.avatar_url,
      team_partner_level: partnerUser.level
    };

    this.setCurrentUser(updatedUser);
    const users = this.getUsers().map(u => u.id === current.id ? updatedUser : u);
    setItem(KEYS.USERS, users);
    return updatedUser;
  },

  removeTeamPartner() {
    const current = this.getCurrentUser();
    const updatedUser = {
      ...current,
      team_partner_id: null,
      team_partner_name: null,
      team_partner_avatar: null,
      team_partner_level: null
    };

    this.setCurrentUser(updatedUser);
    const users = this.getUsers().map(u => u.id === current.id ? updatedUser : u);
    setItem(KEYS.USERS, users);
    return updatedUser;
  },

  // Courts
  getCourts() {
    return getItem(KEYS.COURTS, INITIAL_COURTS);
  },

  getCourtById(id) {
    return this.getCourts().find(c => c.id === id);
  },

  // Feed Posts
  getPosts(filterTag = 'all') {
    const posts = getItem(KEYS.POSTS, INITIAL_POSTS);
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

  // Court Feed (Posts specific to a single court)
  getCourtFeed(courtId) {
    const posts = getItem(KEYS.POSTS, INITIAL_POSTS);
    return posts.filter(p => p.court_id === courtId);
  },

  createPost(postData) {
    const posts = getItem(KEYS.POSTS, INITIAL_POSTS);
    const currentUser = this.getCurrentUser();

    // Si es un post de tipo "Buscar 4to", primero creamos la entidad real
    // de Partido Abierto para que quede disponible en /open-matches y sea unible.
    let linkedMatchId = null;
    if (postData.type === 'open_match' && postData.open_match_details) {
      const newMatch = this.createOpenMatch({
        court_id: postData.court_id,
        court_name: postData.court_name,
        host_name: currentUser.full_name,
        host_avatar: currentUser.avatar_url,
        date: postData.open_match_details.date,
        time: postData.open_match_details.time,
        level_required: postData.open_match_details.category,
        price_per_player: postData.open_match_details.price_per_player,
        max_players: 4,
        // El creador del partido ya cuenta como jugador anotado
        joined_players: [{ name: currentUser.full_name, avatar: currentUser.avatar_url }]
      });
      linkedMatchId = newMatch.id;
    }

    const newPost = {
      id: `p-${Date.now()}`,
      author_type: postData.author_type || "user",
      author_id: postData.author_id || currentUser.id,
      author_name: postData.author_name || currentUser.full_name,
      author_avatar: postData.author_avatar || currentUser.avatar_url,
      court_id: postData.court_id || null,
      court_name: postData.court_name || null,
      type: postData.type || "standard", // "standard" | "open_match" | "match_result"
      content: postData.content,
      media_url: postData.media_url || null,
      score: postData.score || null,
      players_tagged: postData.players_tagged || [],
      open_match_details: postData.open_match_details
        ? { ...postData.open_match_details, match_id: linkedMatchId }
        : null,
      match_id: linkedMatchId,
      likes: [],
      comments: [],
      created_at: new Date().toISOString()
    };

    const updated = [newPost, ...posts];
    setItem(KEYS.POSTS, updated);
    return newPost;
  },

  toggleLikePost(postId) {
    const currentUser = this.getCurrentUser();
    const posts = getItem(KEYS.POSTS, INITIAL_POSTS).map(post => {
      if (post.id === postId) {
        const likes = post.likes || [];
        const alreadyLiked = likes.includes(currentUser.id);
        const newLikes = alreadyLiked ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id];
        return { ...post, likes: newLikes };
      }
      return post;
    });
    setItem(KEYS.POSTS, posts);
    return posts;
  },

  addComment(postId, commentText) {
    const currentUser = this.getCurrentUser();
    const posts = getItem(KEYS.POSTS, INITIAL_POSTS).map(post => {
      if (post.id === postId) {
        const comments = post.comments || [];
        const newComment = {
          id: `cm-${Date.now()}`,
          author_name: currentUser.full_name,
          author_avatar: currentUser.avatar_url,
          text: commentText,
          created_at: new Date().toISOString()
        };
        return { ...post, comments: [...comments, newComment] };
      }
      return post;
    });
    setItem(KEYS.POSTS, posts);
    return posts;
  },

  // Open Matches
  getOpenMatches() {
    return getItem(KEYS.MATCHES, INITIAL_OPEN_MATCHES);
  },

  getOpenMatchById(id) {
    return this.getOpenMatches().find(m => m.id === id);
  },

  createOpenMatch(matchData) {
    const currentUser = this.getCurrentUser();
    const matches = getItem(KEYS.MATCHES, INITIAL_OPEN_MATCHES);
    
    // Si tiene pareja de equipo asociada y se incluye en la búsqueda
    const partnerUser = currentUser.team_partner_id ? this.getUserById(currentUser.team_partner_id) : null;
    const includePartner = matchData.include_team_partner !== false && !!partnerUser;

    const initialJoined = [
      { id: currentUser.id, name: currentUser.full_name, avatar: currentUser.avatar_url, role: 'organizer' }
    ];

    if (includePartner) {
      initialJoined.push({
        id: partnerUser.id,
        name: partnerUser.full_name,
        avatar: partnerUser.avatar_url,
        role: 'partner',
        status: 'pending_confirmation' // Requiere confirmación por notificación
      });
    }

    const newMatch = {
      id: `m-${Date.now()}`,
      host_id: currentUser.id,
      host_name: currentUser.full_name,
      host_avatar: currentUser.avatar_url,
      host_level: currentUser.level || '4ta Categoría (Intermedio)',
      partner_id: includePartner ? partnerUser.id : null,
      partner_name: includePartner ? partnerUser.full_name : null,
      partner_avatar: includePartner ? partnerUser.avatar_url : null,
      court_id: matchData.court_id || null,
      court_name: matchData.court_name || 'Cancha a confirmar',
      date: matchData.date || 'Partido Abierto',
      time: matchData.time || 'A convenir',
      is_flexible_date: matchData.is_flexible_date || false,
      search_type: includePartner ? 'rivals' : (matchData.search_type || 'player'), // 'rivals' (Buscar 2 Rivales) | 'player' (Buscar 4to) | 'partner' (Buscar Pareja)
      level_required: matchData.level_required || currentUser.level || '4ta Categoría',
      price_per_player: matchData.price_per_player || 1200,
      max_players: 4,
      joined_players: initialJoined,
      created_at: new Date().toISOString()
    };

    const updatedMatches = [newMatch, ...matches];
    setItem(KEYS.MATCHES, updatedMatches);

    // Crear publicación vinculada en el Feed Social y de Cancha
    const searchTypeText = newMatch.search_type === 'partner' ? 'pareja para jugar' : '4to jugador';
    const dateText = newMatch.is_flexible_date ? 'Partido Abierto (Fecha y hora a convenir)' : `${newMatch.date} • ${newMatch.time}`;

    const postContent = `⚡ Organiza ${currentUser.full_name}: ¡Buscamos ${searchTypeText} en ${newMatch.court_name}! (${dateText})`;

    const posts = getItem(KEYS.POSTS, INITIAL_POSTS);
    const newPost = {
      id: `p-${Date.now()}`,
      author_type: 'user',
      author_id: currentUser.id,
      author_name: currentUser.full_name,
      author_avatar: currentUser.avatar_url,
      court_id: newMatch.court_id,
      court_name: newMatch.court_name,
      type: 'open_match',
      content: postContent,
      open_match_details: {
        match_id: newMatch.id,
        date: newMatch.date,
        time: newMatch.time,
        is_flexible_date: newMatch.is_flexible_date,
        search_type: newMatch.search_type,
        category: newMatch.level_required,
        spot_needed: newMatch.max_players - 1,
        price_per_player: `$${newMatch.price_per_player}`
      },
      match_id: newMatch.id,
      likes: [],
      comments: [],
      created_at: new Date().toISOString()
    };

    setItem(KEYS.POSTS, [newPost, ...posts]);
    return newMatch;
  },

  joinOpenMatch(matchId) {
    const currentUser = this.getCurrentUser();
    const matches = getItem(KEYS.MATCHES, INITIAL_OPEN_MATCHES).map(match => {
      if (match.id === matchId) {
        const joined = match.joined_players || [];
        if (joined.some(p => p.name === currentUser.full_name || p.id === currentUser.id)) return match;
        if (joined.length >= match.max_players) throw new Error('El partido ya está completo');
        
        const newPlayer = { id: currentUser.id, name: currentUser.full_name, avatar: currentUser.avatar_url };
        return { ...match, joined_players: [...joined, newPlayer] };
      }
      return match;
    });
    setItem(KEYS.MATCHES, matches);

    // Mantener sincronizado el post vinculado a este partido (si existe)
    const posts = getItem(KEYS.POSTS, INITIAL_POSTS).map(post => {
      if (post.match_id === matchId && post.open_match_details) {
        const match = matches.find(m => m.id === matchId);
        const spotsLeft = match ? match.max_players - (match.joined_players?.length || 0) : post.open_match_details.spot_needed;
        return { ...post, open_match_details: { ...post.open_match_details, spot_needed: Math.max(spotsLeft, 0) } };
      }
      return post;
    });
    setItem(KEYS.POSTS, posts);

    return matches;
  },

  // Tournaments
  getTournaments() {
    return getItem(KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
  },

  registerForTournament(tournamentId) {
    const currentUser = this.getCurrentUser();
    const tournaments = getItem(KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS).map(t => {
      if (t.id !== tournamentId) return t;
      const registeredPairs = t.registered_pairs || [];
      if (registeredPairs.some(r => r.player === currentUser.full_name)) {
        throw new Error('Ya estás inscripto en este torneo');
      }
      if (t.teams_registered >= t.teams_max) {
        throw new Error('El torneo ya no tiene cupos disponibles');
      }
      return {
        ...t,
        teams_registered: t.teams_registered + 1,
        registered_pairs: [...registeredPairs, { player: currentUser.full_name, registered_at: new Date().toISOString() }]
      };
    });
    setItem(KEYS.TOURNAMENTS, tournaments);
    return tournaments;
  },

  // Bookings (Reservas de Canchas)
  getBookings() {
    return getItem(KEYS.BOOKINGS, []);
  },

  getBookingsForCourt(courtId, date) {
    return this.getBookings().filter(b => b.court_id === courtId && b.date === date);
  },

  getUpcomingBookingForCurrentUser() {
    const currentUser = this.getCurrentUser();
    const bookings = this.getBookings().filter(b => b.user_id === currentUser.id);
    // La más próxima creada (orden simple para la demo)
    return bookings.length ? bookings[bookings.length - 1] : null;
  },

  createBooking({ courtId, date, time }) {
    const currentUser = this.getCurrentUser();
    const court = this.getCourtById(courtId);
    const bookings = this.getBookings();

    const alreadyTaken = bookings.some(b => b.court_id === courtId && b.date === date && b.time === time);
    if (alreadyTaken) throw new Error('Ese turno ya fue reservado por otro jugador');

    const newBooking = {
      id: `b-${Date.now()}`,
      court_id: courtId,
      court_name: court?.name || 'Cancha',
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      date,
      time,
      price: court?.price_per_hour || 0,
      created_at: new Date().toISOString()
    };

    setItem(KEYS.BOOKINGS, [...bookings, newBooking]);
    return newBooking;
  },

  // Chat (persistente por par de usuarios)
  _chatKey(userIdA, userIdB) {
    return [userIdA, userIdB].sort().join('__');
  },

  getChatMessages(otherUserId) {
    const currentUser = this.getCurrentUser();
    const chats = getItem(KEYS.CHATS, {});
    const key = this._chatKey(currentUser.id, otherUserId);
    return chats[key] || [];
  },

  sendChatMessage(otherUserId, text) {
    const currentUser = this.getCurrentUser();
    const chats = getItem(KEYS.CHATS, {});
    const key = this._chatKey(currentUser.id, otherUserId);
    const existing = chats[key] || [];
    const newMessage = {
      id: `cm-${Date.now()}`,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      text,
      created_at: new Date().toISOString()
    };
    chats[key] = [...existing, newMessage];
    setItem(KEYS.CHATS, chats);
    return chats[key];
  },

  getOpenMatchesForUser(userId) {
    if (!userId) return [];
    return this.getOpenMatches().filter(m => (userId && m.host_id === userId) || m.joined_players?.some(p => userId && p.id === userId));
  },

  // Availabilities (Jugadores Disponibles para Jugar)
  getAvailabilities() {
    return getItem(KEYS.AVAILABILITIES, INITIAL_AVAILABILITIES);
  },

  getUserAvailability(userId) {
    if (!userId) return null;
    const list = this.getAvailabilities();
    return list.find(a => a.user_id === userId) || null;
  },

  setUserAvailability({ availability_type, court_id, court_name, date, time, is_flexible }) {
    const currentUser = this.getCurrentUser();
    const list = this.getAvailabilities();
    const existingIndex = list.findIndex(a => a.user_id === currentUser.id);

    const newRecord = {
      id: existingIndex >= 0 ? list[existingIndex].id : `av-${Date.now()}`,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_avatar: currentUser.avatar_url,
      user_level: currentUser.level || '4ta Categoría (Intermedio)',
      availability_type: availability_type || 'any', // 'partner' | 'any'
      court_id: court_id || null,
      court_name: court_name || 'Cancha a convenir',
      date: date || 'Hoy',
      time: time || 'Dejar abierto para coordinar',
      is_flexible: !!is_flexible,
      created_at: new Date().toISOString()
    };

    let updatedList;
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = newRecord;
    } else {
      updatedList = [newRecord, ...list];
    }

    setItem(KEYS.AVAILABILITIES, updatedList);
    return newRecord;
  },

  removeUserAvailability() {
    const currentUser = this.getCurrentUser();
    const list = this.getAvailabilities().filter(a => a.user_id !== currentUser.id);
    setItem(KEYS.AVAILABILITIES, list);
    return list;
  }
};

