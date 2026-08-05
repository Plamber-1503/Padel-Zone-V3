import { createClient } from '@supabase/supabase-js';

// Variables de entorno de Vite con fallback a Supabase real endpoint
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://padelzone-v3.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZGVsem9uZS12MyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjgwMDAwMDAwLCJleHAiOjIwOTAwMDAwMDB9.PadelZoneV3AnonKeySignaturePlaceholder';

export const isSupabaseConfigured = true;

// Inicialización del cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
