import type { TaskDepartment } from "@/lib/departments";

export const DEPARTMENT_COLORS: Record<TaskDepartment, { bg: string; text: string }> = {
  fiscal: { bg: "bg-amber-100", text: "text-amber-700" },
  financeiro: { bg: "bg-emerald-100", text: "text-emerald-700" },
  logistica: { bg: "bg-blue-100", text: "text-blue-700" },
  estoque: { bg: "bg-violet-100", text: "text-violet-700" },
  sac: { bg: "bg-cyan-100", text: "text-cyan-700" },
  vendas: { bg: "bg-pink-100", text: "text-pink-700" },
  gerencia: { bg: "bg-indigo-100", text: "text-indigo-700" },
  compras: { bg: "bg-teal-100", text: "text-teal-700" },
};

/** Classes tailwind (fundo + texto) para o setor. Cai num cinza neutro
 * se o valor não for um dos setores conhecidos. */
export function departmentBadgeClass(department: string): string {
  const c = DEPARTMENT_COLORS[department as TaskDepartment];
  if (!c) return "bg-(--color-gray-100) text-(--color-graphite-700)";
  return `${c.bg} ${c.text}`;
}
