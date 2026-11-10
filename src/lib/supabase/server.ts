import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para uso em Server Components, Route Handlers e Server Actions.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component sem permissão de
            // escrita de cookies — seguro ignorar quando há middleware
            // renovando a sessão.
          }
        },
      },
    }
  );
}
