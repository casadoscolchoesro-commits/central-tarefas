// Ligação do módulo com o WG Hub (login, permissões, manutenção).
import { createClient } from "@/lib/supabase/client";

// sem sessão: volta para a entrada do WG Hub (que traz de volta depois do login)
export function irParaLogin(): never {
  if (typeof window !== "undefined") {
    try { localStorage.setItem("moduloAtual", "cancelamentos"); } catch {}
    window.location.href = "/";
  }
  // interrompe a tela, como o redirect do Next
  throw Object.assign(new Error("sem sessão"), { digest: "WG_LOGIN" });
}

export async function souAdminWgHub(): Promise<boolean> {
  const { data } = await createClient().schema("public").rpc("eh_admin");
  return !!data;
}
