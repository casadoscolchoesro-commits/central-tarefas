import { createClient as criar, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEY } from "@/lib/supabase-config";

// Um único cliente no navegador, na sessão do WG Hub, lendo o esquema `cancelamentos`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cliente: SupabaseClient<any, "cancelamentos", any> | null = null;
export function createClient() {
  if (!cliente) {
    cliente = criar(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: "cancelamentos" },
      auth: { storageKey: STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return cliente;
}
