import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente ADMIN de Supabase (service role). Salta el RLS.
 * SOLO se usa en el servidor para la página pública de portafolios,
 * donde no hay usuario autenticado. Jamás exponer en el navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
