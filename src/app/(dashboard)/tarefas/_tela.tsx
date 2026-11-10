"use client";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { departmentsForRoles, DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { TaskAdminTools } from "./task-admin-tools";
import { RealtimeListRefresher } from "@/components/RealtimeListRefresher";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { BulkTaskList } from "@/components/BulkTaskList";
import { getEffectiveVisibilityScopes } from "@/lib/visibility";
import { isOwnProtocol, isTaskMine } from "@/lib/own-scope";

type SearchParams = {
  status?: string | string[];
  department?: string | string[];
  branch?: string | string[];
  createdBy?: string | string[];
  claimedBy?: string | string[];
  sale?: string;
  /** Marca que o formulário de filtros já foi enviado ao menos uma vez —
   * assim dá pra diferenciar "primeira visita" (status = pendente por
   * padrão) de "a pessoa desmarcou tudo de propósito" (mostra todos). */
  f?: string;
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const TASK_SELECT = `id, department, description, status, created_at, due_at, claimed_by, claimed_at,
       claimer:profiles!claimed_by(full_name, avatar_url),
       completed_by, completer:profiles!completed_by(full_name, avatar_url), completed_at,
       notes, assigned_to_user_id, assigned_user:profiles!assigned_to_user_id(full_name),
       assigned_to_job_title_id, assigned_job_title:job_titles!assigned_to_job_title_id(name),
       requested_by, requester:profiles!requested_by(full_name),
       protocol_id, protocols(protocol_number, branch_id, opened_by, salesperson_id, branches(name), sales(sale_number)),
       purchasing_requests(id, request_number)`;

async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const hasSubmitted = params.f === "1";
  const statusFilter = hasSubmitted ? toArray(params.status) : ["pendente"];
  const departmentFilter = toArray(params.department);
  const branchFilter = toArray(params.branch);
  const createdByFilter = toArray(params.createdBy);
  const claimedByFilter = toArray(params.claimedBy);
  const saleFilter = (params.sale ?? "").trim();

  const supabase = await createClient();
  const user = await getCurrentUser();
  const myDepartments = user ? departmentsForRoles(user.roles) : [];
  const isAdmin = Boolean(user?.roles.includes("administrador"));

  const isAdminOrGerencia = Boolean(
    user && (user.roles.includes("administrador") || user.roles.includes("gerencia_geral"))
  );
  const { taskScope, protocolScope } = await getEffectiveVisibilityScopes(user?.id ?? "", isAdminOrGerencia);
  const effectiveScope = isAdminOrGerencia ? "all" : taskScope;
  const effectiveProtocolScope = isAdminOrGerencia ? "all" : protocolScope;

  const { data: myProfile } = user
    ? await supabase.from("profiles").select("job_title_id").eq("id", user.id).maybeSingle()
    : { data: null };

  const [{ data: canManageTasks }, { data: canAssignTasks }, { data: branches }, { data: peopleForFilters }] = await Promise.all([
    user ? supabase.rpc("has_task_admin_permission", { p_user_id: user.id }) : Promise.resolve({ data: false }),
    user ? supabase.rpc("can_assign_tasks", { p_user_id: user.id }) : Promise.resolve({ data: false }),
    supabase.from("branches").select("id, name").eq("active", true).order("name"),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  // Monta a base de visibilidade: administrador/gerência geral veem
  // tudo; os demais veem o que o alcance da função permite (setor) mais
  // qualquer tarefa endereçada a eles ou que eles criaram/assumiram/
  // concluíram, independente do setor.
  let rawTasks: Record<string, unknown>[] = [];

  if (isAdminOrGerencia) {
    const { data } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("created_at", { ascending: false })
      .limit(300);
    rawTasks = data ?? [];
  } else if (user) {
    const scopeDepartments = effectiveScope === "all" ? "all" : myDepartments;

    let deptQuery = supabase.from("tasks").select(TASK_SELECT).order("created_at", { ascending: false }).limit(200);
    if (scopeDepartments !== "all") {
      deptQuery =
        scopeDepartments.length === 0
          ? deptQuery.eq("department", "___none___")
          : deptQuery.in("department", scopeDepartments);
    }
    if (effectiveScope === "own") {
      deptQuery = deptQuery.or(`claimed_by.is.null,claimed_by.eq.${user.id}`);
    }

    const mineOr = [
      `assigned_to_user_id.eq.${user.id}`,
      `requested_by.eq.${user.id}`,
      `claimed_by.eq.${user.id}`,
      `completed_by.eq.${user.id}`,
      myProfile?.job_title_id ? `assigned_to_job_title_id.eq.${myProfile.job_title_id}` : null,
    ]
      .filter(Boolean)
      .join(",");
    const mineQuery = supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("created_at", { ascending: false })
      .limit(200)
      .or(mineOr);

    const [{ data: deptTasks }, { data: mineTasks }] = await Promise.all([deptQuery, mineQuery]);
    const seen = new Set<string>();
    rawTasks = [...(deptTasks ?? []), ...(mineTasks ?? [])].filter((t) => {
      if (seen.has(t.id as string)) return false;
      seen.add(t.id as string);
      return true;
    });
  }

  // Filtros escolhidos pela pessoa, aplicados em cima do que ela já pode
  // ver (não amplia acesso, só recorta).
  type TaskRow = {
    id: string;
    department: TaskDepartment | null;
    description: string;
    status: string;
    created_at: string;
    due_at: string | null;
    claimed_by: string | null;
    claimed_at: string | null;
    claimer: { full_name: string; avatar_url: string | null } | { full_name: string; avatar_url: string | null }[] | null;
    completed_by: string | null;
    completed_at: string | null;
    completer: { full_name: string; avatar_url: string | null } | { full_name: string; avatar_url: string | null }[] | null;
    notes: string | null;
    assigned_to_user_id: string | null;
    assigned_user: { full_name: string } | { full_name: string }[] | null;
    assigned_to_job_title_id: string | null;
    assigned_job_title: { name: string } | { name: string }[] | null;
    requested_by: string | null;
    requester: { full_name: string } | { full_name: string }[] | null;
    protocol_id: string | null;
    protocols:
      | { protocol_number: string; branch_id: string | null; opened_by: string | null; salesperson_id: string | null; branches: { name: string } | { name: string }[] | null; sales: { sale_number: string } | { sale_number: string }[] | null }
      | { protocol_number: string; branch_id: string | null; opened_by: string | null; salesperson_id: string | null; branches: { name: string } | { name: string }[] | null; sales: { sale_number: string } | { sale_number: string }[] | null }[]
      | null;
    purchasing_requests: { id: string; request_number: string } | { id: string; request_number: string }[] | null;
  };

  const asOne = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

  let tasks = rawTasks as unknown as TaskRow[];

  // Tarefa vinculada a um protocolo que não é meu, com alcance de
  // protocolo "própria" — não aparece aqui (a pessoa não pode ver
  // aquele protocolo, então também não deve poder agir na tarefa dele).
  // É o que impede um vendedor de ver/assumir tarefa da venda de outro.
  //
  // Repara também um caso mais sutil: quando protocol_id existe mas o
  // protocolo embutido vem nulo (a permissão de banco bloqueou aquela
  // linha — normalmente por filial), a tarefa não deve aparecer "solta"
  // sem o selo do protocolo. Antes isso deixava passar (tratava como se
  // fosse tarefa avulsa); agora esconde, e vale como sinal de que a
  // pessoa provavelmente está sem acesso à filial daquele protocolo.
  tasks = tasks.filter((t) => {
    if (!t.protocol_id) return true;
    // Tarefa direcionada/assumida por mim nunca some: foi uma instrução
    // explícita pra mim, mesmo que o protocolo não seja meu.
    if (isTaskMine(t, user?.id)) return true;
    const p = asOne(t.protocols);
    if (!p) return false;
    // "Própria": protocolo que abri OU de venda em que sou o vendedor.
    if (effectiveProtocolScope === "own") return isOwnProtocol(p, user?.id);
    return true;
  });

  if (statusFilter.length > 0) tasks = tasks.filter((t) => statusFilter.includes(t.status));
  if (departmentFilter.length > 0) tasks = tasks.filter((t) => t.department && departmentFilter.includes(t.department));
  if (createdByFilter.length > 0) tasks = tasks.filter((t) => t.requested_by && createdByFilter.includes(t.requested_by));
  if (claimedByFilter.length > 0) tasks = tasks.filter((t) => t.claimed_by && claimedByFilter.includes(t.claimed_by));
  if (branchFilter.length > 0) {
    tasks = tasks.filter((t) => {
      const p = asOne(t.protocols);
      return p?.branch_id && branchFilter.includes(p.branch_id);
    });
  }
  if (saleFilter) {
    tasks = tasks.filter((t) => {
      const p = asOne(t.protocols);
      const sale = p ? asOne(p.sales) : null;
      return sale?.sale_number?.toLowerCase().includes(saleFilter.toLowerCase());
    });
  }

  const canOverride = Boolean(
    user && (user.roles.includes("gerencia_geral") || user.roles.includes("administrador"))
  );

  // Um vendedor (só isso, sem papel de gerência/administrativo) só pode
  // vincular tarefa avulsa aos próprios protocolos — usado pelo
  // formulário de criação pra restringir a busca de protocolo.
  const restrictProtocolLinkToOwnSales = Boolean(
    user &&
      user.roles.includes("vendedor") &&
      !user.roles.some((r) =>
        ["gerente_loja", "gerente_sac", "gerencia_geral", "administrador", "administrativo"].includes(r)
      )
  );

  return (
    <div className="space-y-6">
      <RealtimeListRefresher table="tasks" channelName="tasks-list" />

      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">Tarefas</h1>
        <p className="text-sm text-(--color-graphite-500)">
          Todas as tarefas que você tem permissão para ver.
        </p>
      </div>

      {canManageTasks && user ? (
        <TaskAdminTools
          currentUserId={user.id}
          restrictProtocolLinkToOwnSales={restrictProtocolLinkToOwnSales}
          showComprasButton
        />
      ) : (
        <Link
          href="/compras/nova"
          className="inline-block shrink-0 rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
        >
          + Solicitar ao Compras
        </Link>
      )}

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4"
      >
        <input type="hidden" name="f" value="1" />

        <MultiSelectFilter
          name="status"
          label="Status"
          defaultValues={statusFilter}
          options={[
            { value: "pendente", label: "Pendente" },
            { value: "concluida", label: "Concluída" },
            { value: "dispensada", label: "Dispensada" },
          ]}
        />

        <MultiSelectFilter
          name="department"
          label="Setor"
          defaultValues={departmentFilter}
          options={Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <MultiSelectFilter
          name="branch"
          label="Filial"
          defaultValues={branchFilter}
          options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
        />

        <MultiSelectFilter
          name="createdBy"
          label="Usuário (criou)"
          defaultValues={createdByFilter}
          options={(peopleForFilters ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
        />

        <MultiSelectFilter
          name="claimedBy"
          label="Usuário (assumiu)"
          defaultValues={claimedByFilter}
          options={(peopleForFilters ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Nº da venda</label>
          <input
            type="text"
            name="sale"
            defaultValue={saleFilter}
            placeholder="Ex.: 3355"
            className="w-32 rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700)"
        >
          Filtrar
        </button>
        {hasSubmitted && (
          <Link href="/tarefas" className="text-xs text-(--color-graphite-500) underline hover:text-(--color-red-600)">
            Limpar filtros
          </Link>
        )}
      </form>

      <BulkTaskList
        tasks={tasks}
        currentUserId={user?.id ?? null}
        canOverride={canOverride}
        canNudge={Boolean(canManageTasks)}
        canAssign={Boolean(canAssignTasks)}
        myDepartments={myDepartments}
        myJobTitleId={myProfile?.job_title_id ?? null}
        isAdmin={isAdmin}
      />
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={TarefasPage} rota="/tarefas">{props.children}</__TelaCliente>;
}
