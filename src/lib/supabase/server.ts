// O módulo roda como site estático: as telas leem os dados no navegador, com a sessão
// do WG Hub e as mesmas regras de acesso do banco. Mantido com o mesmo nome para as telas.
import { createClient as clienteNavegador } from "@/lib/supabase/client";

export async function createClient() {
  return clienteNavegador();
}
