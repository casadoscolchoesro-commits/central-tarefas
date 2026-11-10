import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";
import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para uso em componentes client-side ("use client").
// Usa a chave publishable (anon) — nunca a service role aqui.
export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}
