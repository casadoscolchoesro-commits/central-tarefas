import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { departmentsForRoles, DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { departmentBadgeClass } from "@/lib/department-colors";
import { getEffectiveVisibilityScopes } from "@/lib/visibility";
import { getOwnProtocolOrFilter, isOwnProtocol, isTaskMine } from "@/lib/own-scope";
import {
  IconInbox,
  IconCheckShield,
  IconHourglass,
  IconAlertTriangle,
  IconFlame,
  IconRotate,
  DepartmentIcon,
} from "@/lib/protocol-icons";
import { RealtimeListRefresher } from "@/components/RealtimeListRefresher";

const ALL_DEPARTMENTS: TaskDepartment[] = [
  "fiscal",
  "financeiro",
  "logistica",
  "estoque",
  "sac",
  "vendas",
  "gerencia",
  "compras",
];

function asOne<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export default async function PainelPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const myDepartments = user ? departmentsForRoles(user.roles) : [];
  const isBroadVisibility = myDepartments === "all";
  const isAdminOrGerencia = Boolean(
    user && (user.roles.includes("administrador") || user.roles.includes("gerencia_geral"))
  );
  const { protocolScope } = await getEffectiveVisibilityScopes(user?.id ?? "", isAdminOrGerencia);
  // "Própria" — os contadores do painel precisam respeitar o mesmo
  // alcance que a Central de Protocolos e a tela de Tarefas já
  // respeitam, senão o número mostrado aqui não bate com o que a
  // pessoa realmente vê ao clicar (era o que estava acontecendo com
  // vendedor: card mostrava 1, lista mostrava 0).
  const effectiveProtocolScope = isAdminOrGerencia ? "all" : protocolScope;
  const onlyMyProtocols = effectiveProtocolScope === "own";

  const nowIso = new Date().toISOString();
  const twoHoursFromNowIso = new Date(
    Date.now() + 2 * 60 * 60 * 1000
  ).toISOString();
  const twentyFourHoursAgoIso = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();
  const activeStatuses = ["aberto", "em_analise", "em_execucao"];

  let dueSoonQuery = supabase
    .from("protocols")
    .select("id", { count: "exact", head: true })
    .in("status", activeStatuses)
    .gte("due_at", nowIso)
    .lte("due_at", twoHoursFromNowIso);
  let overdueQuery = supabase
    .from("protocols")
    .select("id, due_at")
    .in("status", activeStatuses)
    .lt("due_at", nowIso);
  let replacementQuery = supabase
    .from("protocols")
    .select("id, protocol_replacement_sales(id), protocol_types!inner(requires_replacement_sale)")
    .eq("status", "em_execucao")
    .eq("protocol_types.requires_replacement_sale", true);
  if (onlyMyProtocols && user) {
    // Mesma regra da Central de Protocolos: os que abri, os de vendas em
    // que sou o vendedor e os em que tenho tarefa direcionada/assumida.
    const ownFilter = await getOwnProtocolOrFilter(supabase, user.id);
    dueSoonQuery = dueSoonQuery.or(ownFilter);
    overdueQuery = overdueQuery.or(ownFilter);
    replacementQuery = replacementQuery.or(ownFilter);
  }

  const [
    { data: pendingApprovals },
    { data: pendingTasksRaw },
    { count: dueSoonCount },
    { data: overdueProtocols },
    { data: replacementCandidates },
  ] = await Promise.all([
    supabase.from("approvals").select("required_role").eq("status", "pendente"),
    supabase
      .from("tasks")
      .select("department, protocol_id, assigned_to_user_id, claimed_by, protocols(opened_by, salesperson_id)")
      .eq("status", "pendente"),
    dueSoonQuery,
    overdueQuery,
    replacementQuery,
  ]);

  // Mesma regra da tela de Tarefas: tarefa de protocolo que a pessoa não
  // pode ver (fora do alcance "própria", ou bloqueada por filial) não
  // conta como "aguardando minha ação".
  const pendingTasks = (pendingTasksRaw ?? []).filter((t) => {
    if (!t.protocol_id) return true;
    if (isTaskMine(t, user?.id)) return true;
    const p = asOne(t.protocols);
    if (!p) return false;
    if (onlyMyProtocols) return isOwnProtocol(p, user?.id);
    return true;
  });

  const myPendingApprovalsCount = (pendingApprovals ?? []).filter(
    (a) =>
      user &&
      (user.roles.includes(a.required_role as never) ||
        user.roles.includes("gerencia_geral") ||
        user.roles.includes("administrador"))
  ).length;

  const myPendingTasksCount = pendingTasks.filter(
    (t) =>
      myDepartments === "all" || myDepartments.includes(t.department as never)
  ).length;

  const overdueCount = overdueProtocols?.length ?? 0;
  const criticalCount = (overdueProtocols ?? []).filter(
    (p) => p.due_at && p.due_at < twentyFourHoursAgoIso
  ).length;
  const pendingReplacementSaleCount = (replacementCandidates ?? []).filter(
    (p) => !p.protocol_replacement_sales || p.protocol_replacement_sales.length === 0
  ).length;

  const queues = [
    {
      label: "Aguardando minha ação",
      value: myPendingApprovalsCount + myPendingTasksCount,
      tone: "graphite",
      href: "/tarefas",
      Icon: IconInbox,
    },
    {
      label: "Aguardando aprovação",
      value: pendingApprovals?.length ?? 0,
      tone: "graphite",
      href: "/aprovacoes",
      Icon: IconCheckShield,
    },
    {
      label: "Próximos do vencimento",
      value: dueSoonCount ?? 0,
      tone: "warning",
      href: "/protocolos",
      Icon: IconHourglass,
    },
    {
      label: "Atrasados",
      value: overdueCount,
      tone: "danger",
      href: "/protocolos",
      Icon: IconAlertTriangle,
    },
    {
      label: "Críticos",
      value: criticalCount,
      tone: "danger",
      href: "/protocolos",
      Icon: IconFlame,
    },
    {
      label: "Pendências de nova venda",
      value: pendingReplacementSaleCount,
      tone: "graphite",
      href: "/protocolos",
      Icon: IconRotate,
    },
  ] as const;

  const toneClasses: Record<string, string> = {
    graphite: "text-(--color-graphite-900)",
    warning: "text-(--color-warning)",
    danger: "text-(--color-red-600)",
  };

  const toneIconClasses: Record<string, string> = {
    graphite: "bg-(--color-gray-100) text-(--color-graphite-700)",
    warning: "bg-(--color-red-50) text-(--color-warning)",
    danger: "bg-(--color-red-50) text-(--color-red-600)",
  };

  // Quadros por setor: só faz sentido para quem enxerga tudo (gerência
  // geral / administrador) — evita expor contagem de setores alheios.
  const tasksByDepartment: Record<string, number> = {};
  if (isBroadVisibility) {
    for (const dept of ALL_DEPARTMENTS) tasksByDepartment[dept] = 0;
    for (const t of pendingTasks ?? []) {
      tasksByDepartment[t.department] = (tasksByDepartment[t.department] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-8">
      <RealtimeListRefresher table="approvals" channelName="painel-approvals" />
      <RealtimeListRefresher table="tasks" channelName="painel-tasks" />
      <RealtimeListRefresher table="protocols" channelName="painel-protocols" />
      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">
          Olá, {user?.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Um som toca automaticamente quando uma tarefa nova aparece
          para o seu setor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {queues.map((queue) => (
          <Link
            key={queue.label}
            href={queue.href}
            className="flex items-start gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4 hover:border-(--color-red-600)"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneIconClasses[queue.tone]}`}>
              <queue.Icon className="h-4.5 w-4.5" />
            </span>
            <span>
              <p className="text-sm text-(--color-graphite-500)">{queue.label}</p>
              <p className={`mt-1 text-2xl font-medium ${toneClasses[queue.tone]}`}>
                {queue.value}
              </p>
            </span>
          </Link>
        ))}
      </div>

      {isBroadVisibility && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">
            Tarefas pendentes por setor
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ALL_DEPARTMENTS.map((dept) => (
              <Link
                key={dept}
                href={`/tarefas?department=${dept}`}
                className="flex items-center gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4 hover:border-(--color-red-600)"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${departmentBadgeClass(dept)}`}>
                  <DepartmentIcon department={dept} className="h-4.5 w-4.5" />
                </span>
                <span>
                  <p className="text-xs text-(--color-graphite-500)">{DEPARTMENT_LABELS[dept]}</p>
                  <p className="mt-0.5 text-xl font-medium text-(--color-graphite-900)">
                    {tasksByDepartment[dept] ?? 0}
                  </p>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
