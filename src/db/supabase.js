import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
);

// Exportar la clave para uso en edge functions si es necesario
export const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;