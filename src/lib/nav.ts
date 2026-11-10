import type { RoleName } from "@/lib/current-user";

// ===== Papel x Função — o que cada um controla =====
// PAPEL (RoleName: vendedor, sac, administrador...) decide o que a
// pessoa pode FAZER: setor de atuação, ações (assumir/concluir tarefa),
// e as duas travas de segurança abaixo (Aprovações, Configurações) —
// coisas sensíveis demais pra deixar na mão de uma Função configurável.
//
// FUNÇÃO (job_titles, configurada em Configurações → Funções) decide o
// que a pessoa VÊ: alcance de protocolos/tarefas (própria/setor/geral)
// e, via feature_access, quais itens deste menu aparecem. Função nunca
// AMPLIA o que o Papel permite — só reduz o que já seria visível.

export type NavIconKey =
  | "grid"
  | "plusCircle"
  | "ticket"
  | "checkShield"
  | "checkCircle"
  | "chart"
  | "settings"
  | "cart";

export interface NavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
  // Trava de Papel — só pra itens onde faz sentido negar por segurança,
  // não por curadoria de menu (isso é papel da Função). Vazio = todo
  // papel autenticado passa por aqui (a Função ainda pode restringir).
  roles?: RoleName[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Painel", href: "/", iconKey: "grid" },
  { label: "Nova solicitação", href: "/protocolos/novo", iconKey: "plusCircle" },
  { label: "Solicitar ao Compras", href: "/compras/nova", iconKey: "cart" },
  { label: "Central de protocolos", href: "/protocolos", iconKey: "ticket" },
  { label: "Tarefas", href: "/tarefas", iconKey: "checkShield" },
  {
    label: "Aprovações",
    href: "/aprovacoes",
    iconKey: "checkCircle",
    roles: [
      "administrativo",
      "gerente_loja",
      "gerente_sac",
      "gerencia_geral",
    ],
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    iconKey: "chart",
    // Não filtrado por papel — controlado por permissão explícita
    // (report_access_permissions), aplicado em layout.tsx.
  },
  { label: "Configurações", href: "/configuracoes", iconKey: "settings", roles: ["administrador"] },
];

export function visibleNavItems(
  roles: RoleName[],
  /** Lista de funcionalidades liberadas/bloqueadas pela Função (job
   * title) da pessoa — configurada em Configurações → Funções. Chave =
   * href do item. null/undefined = sem restrição própria (só o papel
   * decide, como sempre foi). */
  featureAccess?: Record<string, boolean> | null,
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.some((r) => roles.includes(r))) return false;
    if (featureAccess && featureAccess[item.href] === false) return false;
    return true;
  });
}
