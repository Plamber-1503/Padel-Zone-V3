import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

// Auditoría 2026-08-09: antes las credenciales reales estaban hardcodeadas
// acá. Node no carga .env automáticamente, así que lo leemos a mano (sin
// sumar la dependencia dotenv) y si falta, avisamos en vez de seguir.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim();
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Completá tu archivo .env (ver .env.example).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function testDatabaseConcurrencyConstraint() {
  console.log('====================================================');
  console.log('🧪 DEMOSTRACIÓN DE RESTRICCIÓN DE BASE DE DATOS (UNIQUE CONSTRAINT)');
  console.log('====================================================');
  console.log(`Conectando a Supabase real: ${supabaseUrl}\n`);

  const email = 'test_concurrency@padelzone.com';
  const password = 'Password123!';

  console.log('🔑 Autenticando usuario de prueba en Supabase Auth...');
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

  if (authError) {
    console.log(`ℹ️ Intentando registro de usuario (${authError.message})...`);
    const signupRes = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: 'Tester Concurrencia' } }
    });

    if (signupRes.error) {
      console.log('⚠️ Error registrando usuario:', signupRes.error.message);
    }

    // Re-intentar signin
    const retry = await supabase.auth.signInWithPassword({ email, password });
    authData = retry.data;
    authError = retry.error;
  }

  const user = authData?.user || (await supabase.auth.getUser())?.data?.user;

  if (!user) {
    console.log('❌ ERROR: No se pudo obtener sesión autenticada.');
    console.log('   Por favor asegúrate de ejecutar el archivo supabase/schema.sql en el Supabase SQL Editor para habilitar la auto-confirmación de usuarios.');
    console.log('====================================================');
    return;
  }

  console.log(`✅ Usuario AUTENTICADO en Supabase Auth. User ID: ${user.id}\n`);

  // Asegurar perfil en public.profiles
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email || email,
    full_name: 'Tester Concurrencia'
  });

  const courtId = '00000000-0000-0000-0000-000000000001';
  const date = '2026-08-25';
  const randomMin = String(Math.floor(Math.random() * 50) + 10).padStart(2, '0');
  const startTime = `21:${randomMin}:00`;

  // Asegurar que exista la cancha de prueba en public.courts
  await supabase.from('clubs').upsert({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Padel Zone Central',
    address: 'Av. Libertador 4500, Palermo',
    city: 'Buenos Aires'
  });

  await supabase.from('courts').upsert({
    id: courtId,
    club_id: '00000000-0000-0000-0000-000000000001',
    name: 'Cancha 1 - Cristal Panorámica WPT',
    price_per_hour: 4500.00
  });

  // Limpiar reserva previa del mismo turno si existiera
  await supabase.from('bookings').delete().eq('court_id', courtId).eq('date', date).eq('start_time', startTime);

  console.log('Simulando 2 reservas simultáneas desde distintas pestañas para:');
  console.log(`Cancha ID: ${courtId} | Fecha: ${date} | Hora: ${startTime}\n`);

  console.log('1️⃣ Pestaña 1 envía reserva para 2026-08-25 a las 21:00 (Usuario Autenticado)...');
  const { data: res1, error: err1 } = await supabase.from('bookings').insert({
    court_id: courtId,
    user_id: user.id,
    date,
    start_time: startTime,
    price: 4500.00,
    status: 'confirmed'
  }).select();

  if (err1) {
    console.log('🔴 Pestaña 1 error:', err1.code, err1.message);
  } else {
    console.log('✅ Reserva 1 PROCESADA EXITOSAMENTE en PostgreSQL. Booking ID:', res1[0]?.id || res1);
  }

  console.log('\n2️⃣ Pestaña 2 intenta reservar el MISMO turno (2026-08-25 a las 21:00)...');
  const { data: res2, error: err2 } = await supabase.from('bookings').insert({
    court_id: courtId,
    user_id: user.id,
    date,
    start_time: startTime,
    price: 4500.00,
    status: 'confirmed'
  }).select();

  if (err2) {
    console.log('----------------------------------------------------');
    console.log('🔴 CAPTURA DE ERROR DE BASE DE DATOS EN PESTAÑA 2:');
    console.log(`   - Código Error Postgres: ${err2.code}`);
    console.log(`   - Mensaje del Servidor:  ${err2.message}`);
    console.log('----------------------------------------------------');
    if (err2.code === '23505' || err2.message?.includes('unique') || err2.message?.includes('duplicate key')) {
      console.log('🎉 DEMOSTRACIÓN EXITOSA: La restricción a nivel de servidor PostgreSQL (23505: unique_court_booking)');
      console.log('   impidió que dos reservas ocupen el mismo court_id + fecha + hora_inicio simultáneamente.');
    } else {
      console.log('⚠️ Error distinto recibido:', err2);
    }
  } else {
    console.log('Reserva 2 inesperada (no debería permitir duplicado):', res2);
  }
  console.log('====================================================');
}

testDatabaseConcurrencyConstraint();
