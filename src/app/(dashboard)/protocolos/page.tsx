import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PROTOCOL_STATUS_LABELS } from "@/components/StatusBadge";
import { RealtimeListRefresher } from "@/components/RealtimeListRefresher";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { BulkProtocolsTable, type Row } from "./bulk-protocols-table";
import { getEffectiveVisibilityScopes } from "@/lib/visibility";
import { getOwnProtocolOrFilter } from "@/lib/own-scope";
import { departmentsForRoles, DEPARTMENT_LABELS } from "@/lib/departments";

type SearchParams = {
  status?: string | string[];
  branch?: string | string[];
  type?: string | string[];
  department?: string | string[];
  user?: string | string[];
  salesperson?: string | string[];
  sale?: string;
  /** Marca que o formulário de filtros já foi enviado ao menos uma vez —
   * assim dá pra diferenciar "primeira visita" (status = aberto + em
   * análise por padrão) de "a pessoa desmarcou tudo de propósito". */
  f?: string;
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function CentralProtocolosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const hasSubmitted = params.f === "1";
  const statusFilter = hasSubmitted ? toArray(params.status) : ["aberto", "em_analise", "em_execucao"];
  const branchFilter = toArray(params.branch);
  const typeFilter = toArray(params.type);
  const departmentFilter = toArray(params.department);
  const userFilter = toArray(params.user);
  const salespersonFilter = toArray(params.salesperson);
  const saleFilter = (params.sale ?? "").trim();
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  const isAdmin = Boolean(currentUser?.roles.includes("administrador"));

  const [{ data: branches }, { data: protocolTypes }, { data: peopleForFilters }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("active", true).order("name"),
    supabase
      .from("protocol_types")
      .select("id, name")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  let query = supabase
    .from("protocols")
    .select(
      `id, protocol_number, status, opened_at, due_at, financial_impact, cancellation_scope,
       protocol_types(name, code),
       branches(name),
       customers(full_name),
       sales(sale_number, salesperson_name, salesperson:profiles!salesperson_id(full_name))`
    )
    .order("opened_at", { ascending: false })
    .limit(50);

  if (statusFilter.length > 0) query = query.in("status", statusFilter);
  if (branchFilter.length > 0) query = query.in("branch_id", branchFilter);
  if (typeFilter.length > 0) query = query.in("protocol_type_id", typeFilter);
  if (userFilter.length > 0) query = query.in("opened_by", userFilter);

  // Vendedor e nº da venda moram na tabela sales, não em protocols — acha
  // primeiro os protocolos com venda compatível, depois filtra por eles.
  if (salespersonFilter.length > 0 || saleFilter) {
    let salesQuery = supabase.from("sales").select("id");
    if (salespersonFilter.length > 0) salesQuery = salesQuery.in("salesperson_id", salespersonFilter);
    if (saleFilter) salesQuery = salesQuery.ilike("sale_number", `%${saleFilter}%`);
    const { data: matchingSales } = await salesQuery;
    const saleIds = (matchingSales ?? []).map((s) => s.id);
    query = saleIds.length > 0 ? query.in("sale_id", saleIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  // Setor também mora em outra tabela (as tarefas do protocolo) — acha
  // primeiro os protocolos que têm alguma tarefa nesse(s) setor(es).
  if (departmentFilter.length > 0) {
    const { data: matchingTasks } = await supabase
      .from("tasks")
      .select("protocol_id")
      .in("department", departmentFilter)
      .not("protocol_id", "is", null);
    const taskProtocolIds = Array.from(new Set((matchingTasks ?? []).map((t) => t.protocol_id)));
    query = taskProtocolIds.length > 0 ? query.in("id", taskProtocolIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  // Alcance de visibilidade configurado em Configurações → Visibilidade.
  // Gerência geral e administrador sempre veem tudo.
  const isAdminOrGerencia = Boolean(
    currentUser &&
      (currentUser.roles.includes("administrador") || currentUser.roles.includes("gerencia_geral"))
  );
  const { protocolScope } = await getEffectiveVisibilityScopes(currentUser?.id ?? "", isAdminOrGerencia);
  const effectiveScope = isAdminOrGerencia ? "all" : protocolScope;
  const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

  if (effectiveScope === "own" && currentUser) {
    // Os que abri + os de vendas em que sou o vendedor + os em que tenho
    // tarefa direcionada/assumida (ver lib/own-scope.ts).
    query = query.or(await getOwnProtocolOrFilter(supabase, currentUser.id));
  } else if (effectiveScope === "department" && currentUser) {
    const myDepartments = departmentsForRoles(currentUser.roles);
    if (myDepartments !== "all") {
      if (myDepartments.length === 0) {
        query = query.eq("id", NO_MATCH_ID);
      } else {
        const { data: relatedTasks } = await supabase
          .from("tasks")
          .select("protocol_id")
          .in("department", myDepartments)
          .not("protocol_id", "is", null);
        const protocolIds = Array.from(
          new Set((relatedTasks ?? []).map((t) => t.protocol_id).filter((id): id is string => Boolean(id)))
        );
        query = protocolIds.length > 0 ? query.in("id", protocolIds) : query.eq("id", NO_MATCH_ID);
      }
    }
  }

  const { data: protocols, error } = await query;

  // Solicitações ao Compras entram na mesma lista (mesmo esquema de
  // números "CAN-"/"COM-"). Não têm filial/tipo de protocolo, então só
  // aparecem quando esses dois filtros específicos não estão em uso, e
  // não têm arquivamento próprio.
  let purchasingRequests: {
    id: string;
    request_number: string;
    kind: string;
    product_description: string;
    status: string;
    created_at: string;
    due_at: string | null;
    response_deadline: string | null;
    reference_number: string | null;
    viewed_at: string | null;
    requester: { full_name: string } | { full_name: string }[] | null;
    branch: { name: string } | { name: string }[] | null;
  }[] = [];

  if (
    typeFilter.length === 0 &&
    salespersonFilter.length === 0 &&
    !saleFilter &&
    (departmentFilter.length === 0 || departmentFilter.includes("compras"))
  ) {
    let pq = supabase
      .from("purchasing_requests")
      .select(
        "id, request_number, kind, product_description, status, created_at, due_at, response_deadline, requested_by, reference_number, viewed_at, requester:profiles!requested_by(full_name), branch:branches(name)"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (userFilter.length > 0) pq = pq.in("requested_by", userFilter);
    if (branchFilter.length > 0) pq = pq.in("branch_id", branchFilter);

    if (statusFilter.length > 0) {
      const openStatuses = new Set(["aberto", "em_analise", "em_execucao"]);
      const purchasingStatuses = new Set<string>();
      if (statusFilter.some((s) => openStatuses.has(s))) purchasingStatuses.add("pendente");
      if (statusFilter.includes("concluido")) purchasingStatuses.add("concluido");
      // "cancelado" não tem equivalente em solicitações — não adiciona nada.
      if (purchasingStatuses.size > 0) {
        pq = pq.in("status", Array.from(purchasingStatuses));
      } else {
        pq = pq.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const { data } = await pq;
    purchasingRequests = data ?? [];
  }

  const rows: Row[] = [
    ...(protocols ?? []).map((p) => ({ kind: "protocol" as const, date: p.opened_at, data: p })),
    ...purchasingRequests.map((r) => ({ kind: "purchasing" as const, date: r.created_at, data: r })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <RealtimeListRefresher table="protocols" channelName="protocols-list" />
      <RealtimeListRefresher table="purchasing_requests" channelName="purchasing-requests-in-protocols-list" />
      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">Central de protocolos</h1>
        <p className="text-sm text-(--color-graphite-500)">
          Todos os protocolos que você tem permissão para ver, das filiais que você acessa.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4"
      >
        <input type="hidden" name="f" value="1" />

        <MultiSelectFilter
          name="status"
          label="Status"
          defaultValues={statusFilter}
          options={Object.entries(PROTOCOL_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <MultiSelectFilter
          name="branch"
          label="Filial"
          defaultValues={branchFilter}
          options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
        />

        <MultiSelectFilter
          name="type"
          label="Tipo"
          defaultValues={typeFilter}
          options={(protocolTypes ?? []).map((t) => ({ value: t.id, label: t.name }))}
        />

        <MultiSelectFilter
          name="department"
          label="Setor"
          defaultValues={departmentFilter}
          options={Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <MultiSelectFilter
          name="user"
          label="Usuário (abriu)"
          defaultValues={userFilter}
          options={(peopleForFilters ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
        />

        <MultiSelectFilter
          name="salesperson"
          label="Vendedor"
          defaultValues={salespersonFilter}
          options={(peopleForFilters ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
        />

        <FilterField label="Nº da venda">
          <input
            type="text"
            name="sale"
            defaultValue={saleFilter}
            placeholder="Ex.: 3355"
            className="w-32 rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </FilterField>

        <button
          type="submit"
          className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700)"
        >
          Filtrar
        </button>
        {hasSubmitted && (
          <Link
            href="/protocolos"
            className="text-xs text-(--color-graphite-500) underline hover:text-(--color-red-600)"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {error && (
        <p className="rounded-md bg-(--color-red-50) px-4 py-3 text-sm text-(--color-red-700)">
          Não foi possível carregar os protocolos agora.
        </p>
      )}

      <BulkProtocolsTable rows={rows} isAdmin={isAdmin} />
    </div>
  );
}

// O Supabase JS tipa relações 1:1 via FK como array; na prática vem um
// único objeto (ou null). Este helper normaliza isso para o componente.
function asOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
        {label}
      </label>
      {children}
    </div>
  );
}
