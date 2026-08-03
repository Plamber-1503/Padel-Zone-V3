/**
 * mockData.js — Datos Semilla Iniciales para PadelZone v2 (Social-First)
 */

export const INITIAL_USERS = [
  {
    id: "u-demo",
    email: "demo@padelzone.app",
    password: "demo123",
    full_name: "Martín Gómez",
    role: "player",
    level: "4ta Categoría (Intermedio)",
    bio: "Jugador de revés ⚡ Apasionado por la bajada de pared y los torneos de finde.",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    matches_played: 34,
    matches_won: 22,
    team_partner_id: "u-sofia",
    team_partner_name: "Sofía Rossi",
    team_partner_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    team_partner_level: "3ra Categoría (Avanzado)",
    following_ids: ["u-sofia", "u-lucas", "c-1", "c-3"],
    followers_count: 89,
    created_date: "2024-06-01T10:00:00Z"
  },
  {
    id: "u-carlos-owner",
    email: "carlos.owner@mail.com",
    password: "demo123",
    full_name: "Carlos Rodríguez",
    role: "court_owner",
    level: "5ta Categoría",
    bio: "Fundador de PadelClub Norte 🏟️ ¡Los esperamos para jugar y disfrutar del mejor tercer tiempo!",
    avatar_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    matches_played: 58,
    matches_won: 30,
    following_ids: ["c-1"],
    followers_count: 240,
    created_date: "2024-04-15T08:00:00Z"
  },
  {
    id: "u-sofia",
    email: "sofia.rossi@padelzone.app",
    password: "demo123",
    full_name: "Sofía Rossi",
    role: "player",
    level: "3ra Categoría (Avanzado)",
    bio: "Campeona del Torneo Verano 2025 🏆 Busco rivales para entrenar semanalmente.",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    matches_played: 62,
    matches_won: 48,
    following_ids: ["u-demo", "u-valen", "c-3"],
    followers_count: 156,
    created_date: "2024-05-10T10:00:00Z"
  },
  {
    id: "u-lucas",
    email: "lucas.benitez@padelzone.app",
    password: "demo123",
    full_name: "Lucas Benítez",
    role: "player",
    level: "4ta Categoría (Intermedio)",
    bio: "Drive táctico 🧠 Entrenando 3 veces por semana.",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    matches_played: 40,
    matches_won: 24,
    following_ids: ["u-demo", "c-1"],
    followers_count: 72,
    created_date: "2024-05-12T11:30:00Z"
  },
  {
    id: "u-valen",
    email: "valentina.m@padelzone.app",
    password: "demo123",
    full_name: "Valentina Morales",
    role: "player",
    level: "2da Categoría (Profesional)",
    bio: "Instructora certificada de pádel 🎓 Clases individuales e intensivos de técnica.",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    matches_played: 110,
    matches_won: 89,
    following_ids: ["u-sofia"],
    followers_count: 420,
    created_date: "2024-05-14T09:15:00Z"
  }
];

export const INITIAL_COURTS = [
  {
    id: "c-1",
    name: "PadelClub Norte",
    owner_id: "u-carlos-owner",
    address: "Av. Libertador 1250, Buenos Aires",
    city: "Buenos Aires",
    price_per_hour: 4800,
    surface: "Cristal Panorámico",
    is_indoor: true,
    is_active: true,
    amenities: ["Vestuarios Pro", "Estacionamiento", "Bar & Resto", "Iluminación LED"],
    image_url: "./images/norte_1.png",
    cover_image_url: "./images/norte_2.png",
    gallery_images: [
      "./images/norte_1.png",
      "./images/norte_2.png",
      "./images/norte_3.png"
    ],
    rating: 4.9,
    reviews_count: 42,
    followers_count: 310,
    description: "Club premium al aire libre con 6 canchas de cristal de última generación de día, vestuarios y bar para el tercer tiempo.",
    latitude: -34.5845,
    longitude: -58.4447,
    reviews: [
      { author: "Martín Gómez", rating: 5.0, text: "Increíble el pique de pelota en la cancha 1 cristal panorámico. Excelente atención en el buffet." },
      { author: "Lucas Benítez", rating: 4.8, text: "Muy buena iluminación para jugar de noche y fácil de estacionar." }
    ]
  },
  {
    id: "c-2",
    name: "Cancha Norte Córdoba",
    owner_id: "u-carlos-owner",
    address: "Calle Rivadavia 890, Córdoba",
    city: "Córdoba",
    price_per_hour: 3800,
    surface: "Moqueta Sintética",
    is_indoor: false,
    is_active: true,
    amenities: ["Vestuarios", "Wifi", "Barbaqoas"],
    image_url: "./images/option_1.png",
    cover_image_url: "./images/option_2.png",
    rating: 4.6,
    reviews_count: 18,
    followers_count: 145,
    description: "Canchas al aire libre e indoor rodeadas de arboleda. Ambiente familiar y competitivo.",
    latitude: -31.4167,
    longitude: -64.1850,
    reviews: [
      { author: "Valentina Morales", rating: 4.5, text: "Buen lugar para clases, ambiente tranquilo y arbolado." },
      { author: "Sofía Rossi", rating: 4.7, text: "Las canchas indoor tienen muy buen piso, ideal para invierno." }
    ]
  },
  {
    id: "c-3",
    name: "Club Palermo Paddle",
    owner_id: "u-carlos-owner",
    address: "Thames 1825, Palermo, Buenos Aires",
    city: "Buenos Aires",
    price_per_hour: 5500,
    surface: "Cristal Panorámico WPT",
    is_indoor: true,
    is_active: true,
    amenities: ["Vestuarios", "Pro Shop", "Bar & Grill", "Estacionamiento"],
    image_url: "./images/option_3.png",
    cover_image_url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&fit=crop",
    rating: 4.9,
    reviews_count: 67,
    followers_count: 520,
    description: "El epicentro del pádel en Palermo. 8 canchas climatizadas de moqueta azul y cristal panorámico.",
    latitude: -34.5824,
    longitude: -58.4320,
    reviews: [
      { author: "Sofía Rossi", rating: 5.0, text: "El mejor club de Palermo, canchas WPT en excelente estado." },
      { author: "Carlos Rodríguez", rating: 4.8, text: "Muy buena organización de torneos y trato del staff." }
    ]
  }
];

export const INITIAL_POSTS = [
  {
    id: "p-1",
    author_type: "user", // "user" | "court"
    author_id: "u-sofia",
    author_name: "Sofía Rossi",
    author_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    court_id: "c-3", // Tagged court
    court_name: "Club Palermo Paddle",
    type: "match_result", // "standard" | "open_match" | "match_result"
    content: "¡Gran semifinal jugada hoy en Palermo! Ganamos 6-3 4-6 7-6 en tiebreak. ¡Impresionante partido equipo! 🎾🔥",
    media_url: "./images/sofia_post.png",
    score: { set1: "6-3", set2: "4-6", set3: "7-6" },
    players_tagged: ["Sofía Rossi", "Valentina Morales", "Lucas Benítez", "Martín Gómez"],
    likes: ["u-demo", "u-lucas", "u-carlos-owner"],
    comments: [
      { id: "cm-1", author_name: "Lucas Benítez", author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", text: "¡Ese último punto en la red estuvo infernal! Felicitaciones 👏", created_at: "2024-07-23T18:30:00Z" }
    ],
    created_at: "2024-07-23T18:00:00Z"
  },
  {
    id: "p-2",
    author_type: "court", // Publicado por la cancha en su propio feed
    author_id: "c-1",
    author_name: "PadelClub Norte",
    author_avatar: "./images/norte_1.png",
    court_id: "c-1",
    court_name: "PadelClub Norte",
    type: "court_announcement",
    content: "📢 ¡TURNO LIBERADO PARA HOY! Se acaba de cancelar una cancha Cristal de 20:00 a 21:30hs. ¡20% de descuento reservando desde la app!",
    media_url: "./images/norte_1.png",
    likes: ["u-demo", "u-sofia", "u-lucas"],
    comments: [
      { id: "cm-2", author_name: "Martín Gómez", author_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop", text: "¡Me la quedo! Ya reservo por la app.", created_at: "2024-07-24T01:10:00Z" }
    ],
    created_at: "2024-07-24T01:00:00Z"
  },
  {
    id: "p-3",
    author_type: "user",
    author_id: "u-lucas",
    author_name: "Lucas Benítez",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    court_id: "c-1",
    court_name: "PadelClub Norte",
    type: "open_match",
    content: "⚡ ¡BUSCAMOS 4TO JUGADOR! Partido de 4ta categoría hoy a las 21:00hs en PadelClub Norte. Buen ritmo y tercer tiempo asegurado 🍺.",
    open_match_details: {
      match_id: "m-open-101",
      date: "Hoy",
      time: "21:00 - 22:30",
      category: "4ta (Intermedio)",
      spot_needed: 1,
      price_per_player: "$1.200"
    },
    likes: ["u-demo"],
    comments: [],
    created_at: "2024-07-24T02:15:00Z"
  }
];

export const INITIAL_OPEN_MATCHES = [
  {
    id: "m-open-101",
    court_id: "c-1",
    court_name: "PadelClub Norte",
    host_name: "Lucas Benítez",
    host_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    date: "Hoy",
    time: "21:00 - 22:30",
    level_required: "4ta Categoría (Intermedio)",
    joined_players: [
      { name: "Lucas Benítez", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" },
      { name: "Sofía Rossi", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" },
      { name: "Carlos R.", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop" }
    ],
    max_players: 4,
    price_per_player: 1200
  },
  {
    id: "m-open-102",
    court_id: "c-3",
    court_name: "Club Palermo Paddle",
    host_name: "Valentina Morales",
    host_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    date: "Mañana",
    time: "19:00 - 20:30",
    level_required: "3ra Categoría (Avanzado)",
    joined_players: [
      { name: "Valentina Morales", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop" },
      { name: "Martín Gómez", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop" }
    ],
    max_players: 4,
    price_per_player: 1400
  }
];

export const INITIAL_TOURNAMENTS = [
  {
    id: "t-1",
    title: "Gran Open Córdoba 2026 🏆",
    court_name: "Cancha Norte Córdoba",
    date_range: "15 al 18 de Agosto",
    category: "4ta y 5ta Masculino / Femenino",
    prize: "$500.000 en Premios + Indumentaria",
    image_url: "./images/option_1.png", // Opción 1 (Principal)
    gallery_images: [
      "./images/option_1.png", // Opción 1
      "./images/option_2.png", // Opción 2
      "https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=800&fit=crop" // Opción 5
    ],
    teams_registered: 14,
    teams_max: 16
  },
  {
    id: "t-2",
    title: "Liga Palermo Primavera 🌸",
    court_name: "Club Palermo Paddle",
    date_range: "Septiembre - Octubre",
    category: "Mixto Intermedio",
    prize: "Trofeos + Palas Profesionales",
    image_url: "./images/option_3.png", // Opción 3 (Principal)
    gallery_images: [
      "./images/option_3.png", // Opción 3
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&fit=crop", // Opción 4
      "https://images.unsplash.com/photo-1529926706528-db9e5c0b0b58?w=800&fit=crop"  // Opción 6
    ],
    teams_registered: 20,
    teams_max: 24
  }
];

export const INITIAL_AVAILABILITIES = [
  {
    id: "av-1",
    user_id: "u-sofia",
    user_name: "Sofía Rossi",
    user_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    user_level: "3ra Categoría (Avanzado)",
    availability_type: "partner",
    court_id: "c-3",
    court_name: "Club Palermo Paddle",
    date: "Hoy",
    time: "19:00 - 21:00",
    is_flexible: false,
    created_at: "2026-08-01T18:00:00Z"
  },
  {
    id: "av-2",
    user_id: "u-lucas",
    user_name: "Lucas Benítez",
    user_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    user_level: "4ta Categoría (Intermedio)",
    availability_type: "any",
    court_id: "c-1",
    court_name: "PadelClub Norte",
    date: "Partido Abierto",
    time: "Dejar abierto para coordinar",
    is_flexible: true,
    created_at: "2026-08-01T19:30:00Z"
  },
  {
    id: "av-3",
    user_id: "u-valen",
    user_name: "Valentina Morales",
    user_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    user_level: "2da Categoría (Profesional)",
    availability_type: "partner",
    court_id: "c-2",
    court_name: "Cancha Norte Córdoba",
    date: "Mañana",
    time: "18:00 - 20:00",
    is_flexible: false,
    created_at: "2026-08-01T20:00:00Z"
  }
];


