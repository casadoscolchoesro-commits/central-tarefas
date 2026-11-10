// Banco do WG Hub (o módulo Cancelamentos usa o mesmo login e o esquema `cancelamentos`).
// URL e chave publishable não são segredos: a proteção está nas regras de acesso do banco.
export const SUPABASE_URL = "https://fkivczcezxlodtplcueb.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_8EbfHee8MfdvATbSjh0GvA_oXORJ2X5";
// mesma chave de sessão do WG Hub (mesmo endereço): quem entrou no WG Hub já está logado aqui
export const STORAGE_KEY = "sb-fkivczcezxlodtplcueb-auth-token";
// endereço do módulo dentro do WG Hub
export const BASE = "/cancelamentos";
