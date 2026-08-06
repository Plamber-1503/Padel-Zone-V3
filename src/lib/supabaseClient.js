import { createClient } from '@supabase/supabase-js';

// Variables de entorno de Vite con fallback a Supabase real endpoint
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://riddyrljzlzzikooetsz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpZGR5cmxqemx6emlrb29ldHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5Njc3ODEsImV4cCI6MjEwMTU0Mzc4MX0.d43jUV7zlYkr8JhsIbTgQRUyxuewrCgjsbXoCh0T8eM';

export const isSupabaseConfigured = true;

// Inicialización del cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
