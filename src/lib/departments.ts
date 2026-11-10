import type { RoleName } from "@/lib/current-user";

export type TaskDepartment =
  | "fiscal"
  | "financeiro"
  | "logistica"
  | "estoque"
  | "sac"
  | "vendas"
  | "gerencia"
  | "compras";

export const DEPARTMENT_LABELS: Record<TaskDepartment, string> = {
  fiscal: "Fiscal",
  financeiro: "Financeiro",
  logistica: "Logística",
  estoque: "Estoque",
  sac: "SAC",
  vendas: "Vendas",
  gerencia: "Gerência",
  compras: "Compras",
};

// Espelha can_act_on_department() do banco — qual(is) setor(es) cada
// papel cobre (operacional + gerência daquele setor), para filtrar a
// fila de "minhas tarefas" e mostrar/esconder os botões de ação.
const ROLE_DEPARTMENTS: Partial<Record<RoleName, TaskDepartment[]>> = {
  vendedor: ["vendas"],
  sac: ["sac"],
  gerente_sac: ["sac"],
  logistica: ["logistica", "estoque"],
  administrativo: ["fiscal", "financeiro"],
  gerente_loja: ["gerencia"],
  compras: ["compras"],
};

const BROAD_ROLES: RoleName[] = ["gerencia_geral", "administrador"];

export function departmentsForRoles(roles: RoleName[]): TaskDepartment[] | "all" {
  if (roles.some((r) => BROAD_ROLES.includes(r))) return "all";
  const set = new Set<TaskDepartment>();
  for (const role of roles) {
    for (const dept of ROLE_DEPARTMENTS[role] ?? []) set.add(dept);
  }
  return Array.from(set);
}
