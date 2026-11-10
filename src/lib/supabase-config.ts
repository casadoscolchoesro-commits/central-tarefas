// URL e chave publishable (anon) do projeto Supabase. Não são segredos —
// são projetadas para uso no navegador; a proteção real dos dados está
// nas políticas de RLS aplicadas nas migrations. Pode ser sobrescrito via
// variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// se você preferir configurá-las no painel da Vercel no lugar.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://lalfyhvdnllsthyyvyqn.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_gW5OwcEDqSdXAXbI2lly-w_zyt050M4";
