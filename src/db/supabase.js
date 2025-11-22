import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL no está definido. Configura SUPABASE_URL o PUBLIC_SUPABASE_URL en tu entorno.');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY no está definido. Configura SUPABASE_ANON_KEY o PUBLIC_SUPABASE_ANON_KEY en tu entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Exportar la clave para uso en edge functions si es necesario
export { supabaseAnonKey };