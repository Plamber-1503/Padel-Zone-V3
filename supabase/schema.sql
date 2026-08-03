-- ====================================================================
-- PADEL ZONE V3 — SUPABASE POSTGRESQL SCHEMA MIGRATION & RLS POLICIES
-- ====================================================================

-- 1. Habilitar extensión PostGIS para búsquedas geolocalizadas por radio
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. TABLA DE PERFILES DE JUGADORES Y DUEÑOS DE CLUB (linked to auth.users)
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

-- 3. TABLA DE CLUBES Y CANCHAS
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Buenos Aires',
  price_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 4500.00,
  surface TEXT DEFAULT 'Cristal Panorámico WPT',
  is_indoor BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
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

-- 4. TABLA DE PARTIDOS ABIERTOS (Matchmaking - Falta 4to)
CREATE TABLE IF NOT EXISTS public.open_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  court_name TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT 'Hoy',
  time TEXT NOT NULL DEFAULT '20:00 - 21:30',
  is_flexible_date BOOLEAN DEFAULT FALSE,
  search_type TEXT NOT NULL DEFAULT 'player', -- 'player' (4to) | 'rivals' (2 rivales) | 'partner' (pareja)
  level_required TEXT DEFAULT '4ta Categoría',
  price_per_player NUMERIC(10, 2) DEFAULT 1200.00,
  max_players INT DEFAULT 4,
  joined_players JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open', -- 'open' | 'completed' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE RESERVAS DE TURNOS (Bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'confirmed', -- 'confirmed' | 'cancelled' | 'pending_payment'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_court_slot UNIQUE (court_id, date, time)
);

-- 6. TABLA DE PUBLICACIONES DEL FEED SOCIAL
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_type TEXT DEFAULT 'user', -- 'user' | 'court'
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  court_name TEXT,
  type TEXT NOT NULL DEFAULT 'standard', -- 'standard' | 'open_match' | 'match_result'
  content TEXT NOT NULL,
  media_url TEXT,
  score JSONB,
  open_match_details JSONB,
  match_id UUID REFERENCES public.open_matches(id) ON DELETE SET NULL,
  likes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA DE COMENTARIOS
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA DE CHAT REALTIME
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA DE DISPONIBILIDADES PARA JUGAR
CREATE TABLE IF NOT EXISTS public.availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  availability_type TEXT DEFAULT 'any', -- 'partner' | 'any'
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  court_name TEXT DEFAULT 'Cancha a convenir',
  date TEXT DEFAULT 'Hoy',
  time TEXT DEFAULT 'Dejar abierto para coordinar',
  is_flexible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_availability UNIQUE (user_id)
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

-- Lectura pública para feeds y directorio de canchas
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Courts" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Public Read Open Matches" ON public.open_matches FOR SELECT USING (true);
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Public Read Comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Public Read Availabilities" ON public.availabilities FOR SELECT USING (true);

-- Permisos de escritura para usuarios autenticados
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users Create Open Matches" ON public.open_matches FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Users Create Bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users Read Own Bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users Create Posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users Create Comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Mensajes de chat solo visibles para emisor y receptor
CREATE POLICY "Users Read Own Messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users Send Messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
