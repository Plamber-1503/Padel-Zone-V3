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

-- Gestión de accesos 2026-08-10: en vez de un único rol "moderator" fijo,
-- un admin puede habilitarle a cualquier usuario acceso granular a secciones
-- puntuales del panel privado, sin darle todo el panel. Valores válidos hoy:
-- 'pending_clubs' (aprobar/rechazar solicitudes de club), 'active_clubs'
-- (ver clubes activos), 'users' (ver el listado de usuarios registrados).
-- Las métricas del negocio quedan exclusivas de role='admin', no son
-- otorgables por acá — así se definió desde el principio.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_permissions TEXT[] NOT NULL DEFAULT '{}';
-- Marca de tiempo de "solicité acceso al panel" — permite que la pestaña de
-- Gestión de Accesos muestre solo a quienes pidieron o ya tienen acceso, en
-- vez de a los miles de jugadores registrados.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_access_requested_at TIMESTAMPTZ;

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

-- Alta de clubes 2026-08-09: un jugador solicita sumar su club, queda
-- "pending" hasta que un moderador/admin lo revisa desde el panel privado.
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'; -- 'pending' | 'approved' | 'rejected'
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS cuit TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

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
-- 4b. TABLA DE DISPONIBILIDAD DE JUGADORES PARA JUGAR (player_availability)
--     * Distinta de court_availability (esa es el horario del club/cancha)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT,
  user_avatar TEXT,
  user_level TEXT,
  availability_type TEXT DEFAULT 'any', -- 'partner' | 'any'
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  court_name TEXT,
  date TEXT,
  time TEXT,
  is_flexible BOOLEAN DEFAULT FALSE,
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

-- Reservas recurrentes 2026-08-10: agrupa las filas creadas por una misma
-- solicitud "repetir todos los [día] por 30 días" — cada fecha sigue siendo
-- una fila normal de bookings (mismo UNIQUE court+date+start_time de
-- siempre), esto solo permite identificar cuáles pertenecen a la misma serie.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS recurrence_id UUID;

-- Gestión de reservas 2026-08-10: la pareja asociada al jugador que reservó
-- (copiada de profiles.team_partner_id al momento de reservar) — así "Mis
-- Reservas" y las notificaciones le llegan también a ella/él.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- Quién canceló/modificó por última vez, para el panel del club.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
-- Si esta fila nació de "Modificar reserva", apunta a la reserva que reemplazó.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS replaces_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Invitar hasta 2 jugadores más además de la pareja (2026-08-10): jugadores
-- de la app se guardan como IDs; jugadores externos (sin cuenta) como
-- nombre+teléfono en una tabla aparte, para invitarlos por WhatsApp.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_user_ids UUID[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.booking_external_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.booking_external_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking Owner Manage External Guests" ON public.booking_external_guests;
CREATE POLICY "Booking Owner Manage External Guests" ON public.booking_external_guests
  FOR ALL USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

-- La restricción única original bloqueaba re-reservar un turno cancelado
-- (el registro cancelado seguía "ocupando" el lugar). La cambiamos por un
-- índice único PARCIAL: solo exige unicidad entre reservas NO canceladas,
-- así el turno queda libre de verdad al cancelar, pero conservamos la fila
-- vieja para el panel de cancelaciones del club.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS unique_court_booking;
DROP INDEX IF EXISTS unique_court_booking;
CREATE UNIQUE INDEX IF NOT EXISTS unique_court_booking
  ON public.bookings (court_id, date, start_time)
  WHERE status <> 'cancelled';

-- --------------------------------------------------------------------
-- 5b. NOTIFICACIONES (bookings creadas/modificadas/canceladas, por ahora)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'booking_created' | 'booking_modified' | 'booking_cancelled'
  title TEXT NOT NULL,
  body TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users Read Own Notifications" ON public.notifications;
CREATE POLICY "Users Read Own Notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Update Own Notifications" ON public.notifications;
CREATE POLICY "Users Update Own Notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sin policy de INSERT pública a propósito: las notificaciones se crean solo
-- vía la función de abajo (SECURITY DEFINER), que valida que solo puedas
-- notificar a tu propia pareja (o a vos mismo) — así nadie puede mandarle
-- notificaciones falsas a un tercero.
-- 2026-08-10: además de la pareja, ahora se puede notificar a los hasta 2
-- jugadores de la app invitados a una reserva puntual — se valida contra
-- esa reserva específica (sos su dueño Y el destinatario es su pareja o
-- está en su guest_user_ids), no solo contra tu pareja general.
CREATE OR REPLACE FUNCTION public.create_booking_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_booking_id UUID
)
RETURNS public.notifications
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_partner UUID;
  v_booking public.bookings;
  v_allowed BOOLEAN := false;
  v_row public.notifications;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión.';
  END IF;

  IF p_user_id = v_actor THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed AND p_booking_id IS NOT NULL THEN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF v_booking.user_id = v_actor
       AND (p_user_id = v_booking.partner_id OR p_user_id = ANY(COALESCE(v_booking.guest_user_ids, '{}'))) THEN
      v_allowed := true;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    SELECT team_partner_id INTO v_partner FROM public.profiles WHERE id = v_actor;
    IF p_user_id = v_partner THEN
      v_allowed := true;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'No podés notificar a este usuario.';
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, booking_id)
  VALUES (p_user_id, v_actor, p_type, p_title, p_body, p_booking_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_notification(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

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

-- Auto-confirmar email de usuarios para habilitar login inmediato en desarrollo/pruebas
UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, NOW());

CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();

-- Automatic profile creation on signup
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
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES ON ALL 12 TABLES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Función helper (SECURITY DEFINER para no re-disparar RLS de forma recursiva)
-- que devuelve el role del usuario autenticado. La usan las políticas de
-- clubes/perfiles para distinguir moderador/admin del resto.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;

-- Gestión de accesos 2026-08-10: true si el usuario autenticado es admin, o
-- si tiene el permiso puntual `perm` en su staff_permissions. Reemplaza el
-- viejo esquema "moderator ve todo o nada" por permisos por sección.
CREATE OR REPLACE FUNCTION public.has_staff_permission(perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'admin' OR perm = ANY(COALESCE(staff_permissions, '{}'))
  FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.has_staff_permission(TEXT) TO authenticated, anon;

-- Lectura pública y permisos para catálogos, feeds, partidos y perfiles
-- ── Auditoría 2026-08-09: "Public Read Profiles" exponía el email de TODOS
--    los usuarios a cualquier visitante sin sesión. Ahora solo tu propia fila
--    (o alguien con permiso 'users', o admin) puede leer la tabla profiles
--    completa; el resto de la app usa la vista public.profiles_public
--    (sin email) para listados.
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_staff_permission('users'));

DROP POLICY IF EXISTS "Public Create Profiles" ON public.profiles;
CREATE POLICY "Public Create Profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Solo un admin puede editar el perfil de OTRO usuario (lo usa la pantalla
-- de "Gestión de accesos" para otorgar/quitar staff_permissions). Es una
-- policy independiente de "Users Update Own Profile" — no debilita esa.
DROP POLICY IF EXISTS "Admin Manage Profiles" ON public.profiles;
CREATE POLICY "Admin Manage Profiles" ON public.profiles
  FOR UPDATE USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, full_name, role, level, elo_rating, bio, avatar_url, matches_played,
       matches_won, team_partner_id, following_ids, followers_count, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Clubes: público solo ve los aprobados; el dueño ve su propia solicitud en
-- cualquier estado; quien tenga el permiso 'pending_clubs' (o admin) ve
-- también las pendientes/rechazadas, para poder revisarlas.
DROP POLICY IF EXISTS "Public Read Clubs" ON public.clubs;
CREATE POLICY "Public Read Clubs" ON public.clubs
  FOR SELECT USING (
    status = 'approved'
    OR owner_id = auth.uid()
    OR public.has_staff_permission('pending_clubs')
  );

DROP POLICY IF EXISTS "Users Request Club" ON public.clubs;
CREATE POLICY "Users Request Club" ON public.clubs
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND status = 'pending');

DROP POLICY IF EXISTS "Staff Review Clubs" ON public.clubs;
CREATE POLICY "Staff Review Clubs" ON public.clubs
  FOR UPDATE USING (public.has_staff_permission('pending_clubs'));

-- Al aprobar un club, el dueño pasa automáticamente a role='court_owner'
-- (así el panel de socio que ya existe le funciona sin pasos manuales extra).
CREATE OR REPLACE FUNCTION public.sync_club_owner_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.profiles SET role = 'court_owner' WHERE id = NEW.owner_id AND role = 'player';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_club_approved ON public.clubs;
CREATE TRIGGER on_club_approved
  AFTER UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.sync_club_owner_role();

DROP POLICY IF EXISTS "Public Read Courts" ON public.courts;
CREATE POLICY "Public Read Courts" ON public.courts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Court Availability" ON public.court_availability;
CREATE POLICY "Public Read Court Availability" ON public.court_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Player Availability" ON public.player_availability;
DROP POLICY IF EXISTS "Users Insert Own Availability" ON public.player_availability;
DROP POLICY IF EXISTS "Users Update Own Availability" ON public.player_availability;
DROP POLICY IF EXISTS "Users Delete Own Availability" ON public.player_availability;
CREATE POLICY "Public Read Player Availability" ON public.player_availability FOR SELECT USING (true);
CREATE POLICY "Users Insert Own Availability" ON public.player_availability FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users Update Own Availability" ON public.player_availability FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users Delete Own Availability" ON public.player_availability FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public Read Open Matches" ON public.open_matches;
CREATE POLICY "Public Read Open Matches" ON public.open_matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Match Players" ON public.match_players;
CREATE POLICY "Public Read Match Players" ON public.match_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Tournaments" ON public.tournaments;
CREATE POLICY "Public Read Tournaments" ON public.tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Posts" ON public.posts;
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);

-- Permisos de escritura / actualización por propietario
-- ── Auditoría 2026-08-09: políticas reescritas para exigir auth.uid() real
--    contra el dueño de cada fila. Antes varias usaban USING (true) o permitían
--    auth.uid() IS NULL, dejando lectura/escritura pública sin autenticación
--    sobre mensajes, chats, reservas, posts y partidos abiertos.
-- Auditoría 2026-08-09 (incidente): la app tuvo, por un tiempo, un botón que
-- dejaba a cualquier usuario cambiarse su propio 'role' vía esta misma
-- policy (ya que USING sin WITH CHECK no restringe qué valores se pueden
-- escribir). El WITH CHECK de abajo bloquea a nivel de base de datos que un
-- usuario común cambie su propio rol, incluso si el código de la app vuelve
-- a tener un bug así. sync_club_owner_role (SECURITY DEFINER, más abajo) y
-- el SQL Editor (rol postgres) no pasan por RLS y no se ven afectados.
-- Gestión de accesos 2026-08-10: agregado staff_permissions a la misma
-- protección que ya tenía 'role' — un usuario común no puede otorgarse a sí
-- mismo acceso al panel privado tocando su propia fila.
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
CREATE POLICY "Users Update Own Profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) OR public.current_user_role() = 'admin')
    AND (staff_permissions = (SELECT p.staff_permissions FROM public.profiles p WHERE p.id = auth.uid()) OR public.current_user_role() = 'admin')
  );

DROP POLICY IF EXISTS "Users Create Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users Read Own Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users Update Own Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public Read Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public Create Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public Delete Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users Delete Own Bookings" ON public.bookings;

-- La lectura de turnos sigue siendo pública: se necesita para mostrar qué
-- horarios están ocupados en el calendario de cada cancha a cualquier visitante.
CREATE POLICY "Public Read Bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Users Create Bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users Update Own Bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users Delete Own Bookings" ON public.bookings FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Create Open Matches" ON public.open_matches;
DROP POLICY IF EXISTS "Hosts Update Open Matches" ON public.open_matches;
CREATE POLICY "Users Create Open Matches" ON public.open_matches FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts Update Open Matches" ON public.open_matches FOR UPDATE USING (auth.uid() = host_id);

-- match_players: cada jugador solo puede anotarse/editar su propia fila.
-- La sincronización de open_matches.joined_players/status ante altas y bajas
-- corre server-side vía el trigger public.sync_open_match_players (más abajo),
-- así se evita la condición de carrera de dos jugadores sumándose a la vez.
DROP POLICY IF EXISTS "Users Join Match Players" ON public.match_players;
DROP POLICY IF EXISTS "Users Update Match Players" ON public.match_players;
DROP POLICY IF EXISTS "Users Delete Own Match Player Row" ON public.match_players;
CREATE POLICY "Users Join Match Players" ON public.match_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users Update Match Players" ON public.match_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users Delete Own Match Player Row" ON public.match_players FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Create Posts" ON public.posts;
DROP POLICY IF EXISTS "Users Update Own Posts" ON public.posts;
DROP POLICY IF EXISTS "Users Delete Own Posts" ON public.posts;
CREATE POLICY "Users Create Posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users Update Own Posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users Delete Own Posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);
-- Nota: "dar me gusta" ya NO pasa por un UPDATE directo del cliente sobre esta
-- tabla (eso hubiera requerido reabrir el UPDATE a cualquier usuario). En su
-- lugar usa la función public.toggle_post_like (SECURITY DEFINER, más abajo),
-- que también resuelve la condición de carrera de likes concurrentes.

DROP POLICY IF EXISTS "Users Register Tournaments" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Users Read Tournament Registrations" ON public.tournament_registrations;
CREATE POLICY "Users Register Tournaments" ON public.tournament_registrations FOR INSERT WITH CHECK (auth.uid() = player1_id);
CREATE POLICY "Users Read Tournament Registrations" ON public.tournament_registrations FOR SELECT USING (true);

-- Mensajes y Chats solo visibles para participantes (emisor / receptor)
DROP POLICY IF EXISTS "Users Read Own Chats" ON public.chats;
DROP POLICY IF EXISTS "Users Create Chats" ON public.chats;
CREATE POLICY "Users Read Own Chats" ON public.chats FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users Create Chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users Read Own Messages" ON public.messages;
DROP POLICY IF EXISTS "Users Send Messages" ON public.messages;
DROP POLICY IF EXISTS "Users Mark Messages Read" ON public.messages;
CREATE POLICY "Users Read Own Messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users Send Messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users Mark Messages Read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- ====================================================================
-- FUNCIONES SERVER-SIDE (SECURITY DEFINER) — Fase 0, 2026-08-09
-- Reemplazan los UPDATE directos del cliente que antes exigían políticas
-- RLS permisivas ("USING (true)") sobre open_matches y posts.
-- ====================================================================

-- Mantiene open_matches.joined_players y status sincronizados de forma
-- atómica a partir de match_players (fuente de verdad), eliminando la
-- condición de carrera de dos jugadores sumándose casi al mismo tiempo.
CREATE OR REPLACE FUNCTION public.sync_open_match_players()
RETURNS TRIGGER AS $$
DECLARE
  v_match_id UUID := COALESCE(NEW.match_id, OLD.match_id);
  v_max_players INT;
  v_joined JSONB;
  v_count INT;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', p.id,
           'name', p.full_name,
           'avatar', p.avatar_url
         ) ORDER BY mp.slot_index), '[]'::jsonb),
         count(*)
    INTO v_joined, v_count
    FROM public.match_players mp
    JOIN public.profiles p ON p.id = mp.user_id
   WHERE mp.match_id = v_match_id AND mp.status <> 'declined';

  SELECT max_players INTO v_max_players FROM public.open_matches WHERE id = v_match_id;

  UPDATE public.open_matches
     SET joined_players = v_joined,
         status = CASE
           WHEN status = 'open' AND v_count >= COALESCE(v_max_players, 4) THEN 'completed'
           WHEN status = 'completed' AND v_count < COALESCE(v_max_players, 4) THEN 'open'
           ELSE status
         END
   WHERE id = v_match_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_players_change ON public.match_players;
CREATE TRIGGER on_match_players_change
  AFTER INSERT OR UPDATE OR DELETE ON public.match_players
  FOR EACH ROW EXECUTE FUNCTION public.sync_open_match_players();

-- Alterna el "me gusta" del usuario autenticado sobre un post en una única
-- sentencia UPDATE atómica (evita la carrera de leer-modificar-escribir que
-- hacía el cliente antes, y no requiere abrir UPDATE de posts a terceros).
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS public.posts AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.posts;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión para dar me gusta';
  END IF;

  UPDATE public.posts
     SET likes = CASE
           WHEN v_uid = ANY(likes) THEN array_remove(likes, v_uid)
           ELSE array_append(likes, v_uid)
         END
   WHERE id = p_post_id
   RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Publicación no encontrada';
  END IF;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_post_like(UUID) TO authenticated;

-- ====================================================================
-- SEED DATA INICIAL (CLUBES Y CANCHAS)
-- ====================================================================
INSERT INTO public.clubs (id, name, address, city, phone, description, rating, reviews_count)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Padel Zone Central',
  'Av. Libertador 4500, Palermo',
  'Buenos Aires',
  '+54 11 4567-8900',
  'Club premium con 6 canchas de cristal panorámicas de última generación.',
  4.9,
  128
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courts (id, club_id, name, surface, is_indoor, price_per_hour, rating, reviews_count, description, image_url, cover_image_url)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Cancha 1 - Cristal Panorámica WPT',
  'Césped Azul WPT',
  true,
  4500.00,
  4.9,
  64,
  'Cancha central con iluminación LED profesional 500 lux y cristal de 12mm.',
  './images/norte_1.png',
  './images/norte_2.png'
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Cancha 2 - Moqueta Sintética',
  'Moqueta Sintética',
  false,
  3800.00,
  4.6,
  18,
  'Cancha exterior rodeada de arboleda, ambiente familiar y competitivo.',
  './images/option_1.png',
  './images/option_2.png'
),
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Cancha 3 - Cristal Panorámica WPT Palermo',
  'Cristal Panorámico WPT',
  true,
  5500.00,
  4.9,
  67,
  'Cancha climatizada de cristal panorámico, ideal para torneos WPT.',
  './images/option_3.png',
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&fit=crop'
) ON CONFLICT (id) DO NOTHING;

