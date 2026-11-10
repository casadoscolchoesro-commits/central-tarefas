import { createClient } from "@/lib/supabase/server";

export type RoleName =
  | "vendedor"
  | "sac"
  | "logistica"
  | "administrativo"
  | "gerente_loja"
  | "gerente_sac"
  | "compras"
  | "gerencia_geral"
  | "administrador";

export const ROLE_LABELS: Record<RoleName, string> = {
  vendedor: "Vendedor",
  sac: "SAC",
  logistica: "Logística",
  administrativo: "Administrativo",
  gerente_loja: "Gerente de loja",
  gerente_sac: "Gerente do SAC",
  compras: "Compras",
  gerencia_geral: "Gerência geral",
  administrador: "Administrador",
};

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  roles: RoleName[];
  mustChangePassword: boolean;
}

// Busca o perfil e os papéis do usuário autenticado. RLS garante que ele
// só recebe a própria linha de profiles e os próprios papéis — nada aqui
// depende de confiança no cliente.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return null;

  // perfil do módulo criado na primeira entrada de quem tem acesso (Usuários do WG Hub)
  const { data: acesso } = await supabase.rpc("garantir_meu_perfil");
  if (!acesso) {
    throw new Error("Você não tem acesso ao módulo Cancelamentos. Peça ao administrador para liberar em Usuários do WG Hub (função Cancelamentos).");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roles = Array.from(
    new Set(
      (userRoles ?? [])
        .map((ur) => (ur.roles as unknown as { name: RoleName } | null)?.name)
        .filter((r): r is RoleName => Boolean(r))
    )
  );

  // o administrador do WG Hub é administrador no módulo
  if ((acesso as { admin?: boolean }).admin && !roles.includes("administrador")) roles.push("administrador");

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    roles,
    mustChangePassword: profile.must_change_password ?? false,
  };
}
