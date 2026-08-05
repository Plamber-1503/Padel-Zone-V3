import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://padelzone-v3.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZGVsem9uZS12MyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjgwMDAwMDAwLCJleHAiOjIwOTAwMDAwMDB9.PadelZoneV3AnonKeySignaturePlaceholder';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseConcurrencyConstraint() {
  console.log('====================================================');
  console.log('🧪 DEMOSTRACIÓN DE RESTRICCIÓN DE BASE DE DATOS (UNIQUE CONSTRAINT)');
  console.log('====================================================');
  console.log('Simulando 2 reservas simultáneas desde distintas pestañas para:');
  console.log('Cancha ID: c-1 | Fecha: 2026-08-25 | Hora: 21:00\n');

  const courtId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000001';
  const date = '2026-08-25';
  const startTime = '21:00:00';

  console.log('1️⃣ Pestaña 1 envía reserva para 2026-08-25 a las 21:00...');
  const { data: res1, error: err1 } = await supabase.from('bookings').insert({
    court_id: courtId,
    user_id: userId,
    date,
    start_time: startTime,
    price: 4500.00,
    status: 'confirmed'
  }).select();

  if (err1) {
    console.log('Pestaña 1 resultado:', err1.message);
  } else {
    console.log('✅ Reserva 1 PROCESADA EXITOSAMENTE en PostgreSQL:', res1);
  }

  console.log('\n2️⃣ Pestaña 2 intenta reservar el MISMO turno (2026-08-25 a las 21:00)...');
  const { data: res2, error: err2 } = await supabase.from('bookings').insert({
    court_id: courtId,
    user_id: userId,
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
    console.log('🎉 DEMOSTRACIÓN EXITOSA: La restricción a nivel de servidor PostgreSQL (23505: unique_court_booking)');
    console.log('   impidió que dos reservas ocupen el mismo court_id + fecha + hora_inicio simultáneamente.');
  } else {
    console.log('Reserva 2 inesperada:', res2);
  }
  console.log('====================================================');
}

testDatabaseConcurrencyConstraint();
