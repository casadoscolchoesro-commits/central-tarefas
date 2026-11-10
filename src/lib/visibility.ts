import { createClient } from "@/lib/supabase/server";

export type VisibilityScope = "own" | "department" | "all";

/** Alcance de visibilidade padrão para quem ainda não tem função
 * cadastrada (contas antigas, criadas antes desse recurso existir). */
const FALLBACK_SCOPES: { protocolScope: VisibilityScope; taskScope: VisibilityScope } = {
  protocolScope: "all",
  taskScope: "department",
};

/** Gerência geral e administrador sempre veem tudo. Para os demais, o
 * alcance vem da função (cargo) cadastrada no perfil da pessoa — cada
 * função tem seu próprio alcance, configurado em Configurações →
 * Funções. Sem função cadastrada, cai no padrão de sempre. */
export async function getEffectiveVisibilityScopes(
  userId: string,
  isAdminOrGerencia: boolean,
): Promise<{ protocolScope: VisibilityScope; taskScope: VisibilityScope }> {
  if (isAdminOrGerencia) return { protocolScope: "all", taskScope: "all" };

  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("job_title_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.job_title_id) return FALLBACK_SCOPES;

    const { data: jobTitle } = await supabase
      .from("job_titles")
      .select("protocol_visibility_scope, task_visibility_scope")
      .eq("id", profile.job_title_id)
      .maybeSingle();

    if (!jobTitle) return FALLBACK_SCOPES;

    return {
      protocolScope: (jobTitle.protocol_visibility_scope ?? FALLBACK_SCOPES.protocolScope) as VisibilityScope,
      taskScope: (jobTitle.task_visibility_scope ?? FALLBACK_SCOPES.taskScope) as VisibilityScope,
    };
  } catch {
    return FALLBACK_SCOPES;
  }
}
