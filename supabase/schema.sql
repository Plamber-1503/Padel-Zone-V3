-- ====================================================================
-- PADEL ZONE V3 — SUPABASE POSTGRESQL SCHEMA MIGRATION & RLS POLICIES
-- ====================================================================

-- 1. Habilitar extensión PostGIS para búsquedas geolocalizadas por radio
CREATE EXTENSION IF NOT EXISTS postgis;

-- --------------------------------------------------------------------
-- 1. TABLA DE PERFILES DE JUGADORES Y DUEÑOS DE CLUB (profiles)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player', -- 'player' | 'court_owner' | 'admin'
  level TEXT DEFAULT '4ta Categoría (Intermedio)',
  elo_rating INT DEFAULT 1200,
  bio TEXT DEFAULT '¡Apasionado del pádel!',
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  matches_played INT DEFAULT 0,
  matches_won INT DEFAULT 0,
  team_partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  following_ids UUID[] DEFAULT '{}',
  followers_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. TABLA SEPARADA DE CLUBES (clubs)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Buenos Aires',
  phone TEXT,
  description TEXT,
  image_url TEXT,
  cover_image_url TEXT,
  rating NUMERIC(3, 2) DEFAULT 4.8,
  reviews_count INT DEFAULT 0,
  followers_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. TABLA DE CANCHAS VINCULADAS A CLUBES (courts)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surface TEXT DEFAULT 'Cristal Panorámico WPT',
  is_indoor BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  price_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 4500.00,
  amenities TEXT[] DEFAULT '{"Vestuarios", "Estacionamiento", "Bar & Resto", "Iluminación LED"}',
  image_url TEXT,
  cover_image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  rating NUMERIC(3, 2) DEFAULT 4.8,
  reviews_count INT DEFAULT 0,
  followers_count INT DEFAULT 0,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. TABLA DE DISPONIBILIDAD DE CANCHAS (court_availability)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.court_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. TABLA DE RESERVAS DE TURNOS (bookings)
--    * Restricción unívoca a nivel de BD: unique_court_booking (court_id, date, start_time)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  price NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'confirmed', -- 'confirmed' | 'cancelled' | 'pending_payment'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_court_booking UNIQUE (court_id, date, start_time)
);

-- --------------------------------------------------------------------
-- 6. TABLA DE PUBLICACIONES SOCIALES (posts)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_type TEXT DEFAULT 'user', -- 'user' | 'court'
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  court_name TEXT,
  type TEXT NOT NULL DEFAULT 'standard', -- 'standard' | 'open_match' | 'match_result' | 'court_announcement'
  content TEXT NOT NULL,
  media_url TEXT,
  score JSONB,
  open_match_details JSONB,
  match_id UUID,
  likes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. TABLA DE PARTIDOS ABIERTOS (open_matches)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.open_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  court_name TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT 'Hoy',
  time TEXT NOT NULL DEFAULT '20:00 - 21:30',
  is_flexible_date BOOLEAN DEFAULT FALSE,
  search_type TEXT NOT NULL DEFAULT 'player', -- 'player' (4to) | 'rivals' | 'partner'
  level_required TEXT DEFAULT '4ta Categoría',
  price_per_player NUMERIC(10, 2) DEFAULT 1200.00,
  max_players INT DEFAULT 4,
  joined_players JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open', -- 'open' | 'completed' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 8. TABLA DE JUGADORES EN PARTIDOS (match_players)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.open_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_index INT DEFAULT 1,
  status TEXT DEFAULT 'confirmed', -- 'confirmed' | 'pending' | 'declined'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_match_player UNIQUE (match_id, user_id)
);

-- --------------------------------------------------------------------
-- 9. TABLA DE TORNEOS (tournaments)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  court_name TEXT NOT NULL,
  date_range TEXT NOT NULL,
  category TEXT NOT NULL,
  prize TEXT NOT NULL,
  image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  teams_registered INT DEFAULT 0,
  teams_max INT DEFAULT 16,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. TABLA DE INSCRIPCIONES A TORNEOS (tournament_registrations)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_name TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tournament_registration UNIQUE (tournament_id, player1_id)
);

-- --------------------------------------------------------------------
-- 11. TABLA DE CHATS (chats)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_chat_pair UNIQUE (user1_id, user2_id)
);

-- --------------------------------------------------------------------
-- 12. TABLA DE MENSAJES EN CHAT (messages)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON USER SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Jugador PadelZone'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES ON ALL 12 TABLES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Lectura pública para catálogos, feeds, partidos y perfiles
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Public Read Courts" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Public Read Court Availability" ON public.court_availability FOR SELECT USING (true);
CREATE POLICY "Public Read Open Matches" ON public.open_matches FOR SELECT USING (true);
CREATE POLICY "Public Read Match Players" ON public.match_players FOR SELECT USING (true);
CREATE POLICY "Public Read Tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);

-- Permisos de escritura / actualización por propietario
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users Create Bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users Read Own Bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users Update Own Bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users Create Open Matches" ON public.open_matches FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts Update Open Matches" ON public.open_matches FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Users Join Match Players" ON public.match_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users Update Match Players" ON public.match_players FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users Create Posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users Update Own Posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users Register Tournaments" ON public.tournament_registrations FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users Read Tournament Registrations" ON public.tournament_registrations FOR SELECT USING (true);

-- Mensajes y Chats solo visibles para participantes (emisor / receptor)
CREATE POLICY "Users Read Own Chats" ON public.chats FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users Create Chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users Read Own Messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users Send Messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
