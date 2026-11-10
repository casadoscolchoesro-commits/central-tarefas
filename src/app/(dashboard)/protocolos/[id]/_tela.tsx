"use client";
import Link from "next/link";
import { notFound } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, ROLE_LABELS, type RoleName } from "@/lib/current-user";
import { ProtocolBadge } from "@/components/ProtocolBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ApprovalBox } from "./approval-box";
import { RespondInfoBox } from "./respond-info-box";
import { TaskItem } from "./task-item";
import { NewProtocolTaskButton } from "./new-task-button";
import { ReplacementSaleBox } from "./replacement-sale-box";
import { ArchiveButton } from "../archive-button";
import { CancelProtocolBox } from "./cancel-protocol-box";
import { DeleteProtocolButton } from "./delete-protocol-button";
import { ProtocolTypeIcon } from "@/lib/protocol-icons";
import { departmentsForRoles } from "@/lib/departments";
import { getEffectiveVisibilityScopes } from "@/lib/visibility";
import { isOwnProtocol } from "@/lib/own-scope";
import { RealtimeListRefresher } from "@/components/RealtimeListRefresher";

const EVENT_TYPE_LABELS: Record<string, string> = {
  protocol_created: "Protocolo criado",
  status_changed: "Status alterado",
  approval_required: "Aprovação solicitada",
  approval_decided: "Aprovação decidida",
  approval_info_provided: "Informações enviadas",
  tasks_created: "Tarefas geradas",
  dependent_task_created: "Nova tarefa liberada",
  standalone_task_created: "Tarefa avulsa criada",
  manual_task_added: "Tarefa adicionada manualmente",
  task_completed: "Tarefa concluída",
  task_dismissed: "Tarefa dispensada",
  protocol_completed: "Protocolo concluído",
  replacement_sale_registered: "Venda substituta registrada",
  protocol_archived: "Protocolo arquivado",
  protocol_unarchived: "Protocolo desarquivado",
  protocol_cancelled: "Protocolo cancelado",
};

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  duplicidade_suspeita: "Duplicidade suspeita",
  venda_original: "Venda original",
  venda_substituta: "Venda substituta",
};

async function ProtocoloDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  const { data: protocol, error: protocolError } = await supabase
    .from("protocols")
    .select(
      `id, protocol_number, status, description, cancellation_scope,
       financial_impact, refund_value, client_credit_value, customer_pays_difference, difference_value, total_value, opened_at, closed_at, due_at, opened_by, salesperson_id, archived_at, cancellation_reason, cash_register_finalized, needs_refund,
       protocol_types(name, code, requires_replacement_sale),
       branches(name, code),
       customers(full_name, document, phone, email),
       sales(id, sale_number, sale_date, total_amount, sale_type, notes, salesperson_name, salesperson:profiles!salesperson_id(full_name)),
       reasons(name),
       subreasons(name),
       protocol_scopes(name, code),
       opened_by_profile:profiles!opened_by(full_name)`
    )
    .eq("id", id)
    .single();

  if (!protocol) {
    if (protocolError) {
      console.error("Erro ao carregar protocolo:", protocolError);
    }
    notFound();
  }

  // Alcance de visibilidade da função da pessoa — a lista de protocolos já
  // aplicava isso, mas a tela do protocolo (acessível por link direto, ou
  // pela lista de tarefas) não aplicava, permitindo ver e agir em
  // protocolos de outras pessoas mesmo com alcance "própria".
  {
    const isAdminOrGerencia = Boolean(
      currentUser &&
        (currentUser.roles.includes("gerencia_geral") || currentUser.roles.includes("administrador"))
    );
    const { protocolScope } = await getEffectiveVisibilityScopes(currentUser?.id ?? "", isAdminOrGerencia);
    const effectiveScope = isAdminOrGerencia ? "all" : protocolScope;

    if (effectiveScope === "own" && !isOwnProtocol(protocol, currentUser?.id)) {
      // Também vale quando a pessoa tem tarefa direcionada ou assumida
      // neste protocolo — senão a tarefa chega e o protocolo não abre.
      const uid = currentUser?.id;
      const { count: involved } = uid
        ? await supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("protocol_id", protocol.id)
            .or(`assigned_to_user_id.eq.${uid},claimed_by.eq.${uid}`)
        : { count: 0 };
      if (!involved) notFound();
    } else if (effectiveScope === "department" && currentUser) {
      const myDepartments = departmentsForRoles(currentUser.roles);
      if (myDepartments !== "all" && !isOwnProtocol(protocol, currentUser.id)) {
        if (myDepartments.length === 0) {
          notFound();
        } else {
          const { count } = await supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("protocol_id", protocol.id)
            .in("department", myDepartments);
          if (!count) notFound();
        }
      }
    }
  }

  const sale = asOne(protocol.sales);
  const customer = asOne(protocol.customers);
  const branch = asOne(protocol.branches);
  const protocolType = asOne(protocol.protocol_types);
  const reason = asOne(protocol.reasons);
  const subreason = asOne(protocol.subreasons);
  const scope = asOne(protocol.protocol_scopes);
  const openedBy = asOne(protocol.opened_by_profile);

  const [
    { data: saleItems },
    { data: payments },
    { data: protocolItems },
    { data: relationships },
    { data: auditEvents },
    { data: approval },
    { data: tasks },
    { data: replacementSales },
    { data: cancelPermission },
    { data: canManageTasks },
    { data: canAssignTasks },
  ] = await Promise.all([
    sale
      ? supabase
          .from("sale_items")
          .select("id, product_name, sku, quantity, unit_price, total_price")
          .eq("sale_id", sale.id)
      : Promise.resolve({ data: [] }),
    sale
      ? supabase
          .from("payments")
          .select("id, amount, installments, payment_methods(label)")
          .eq("sale_id", sale.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from("protocol_items")
      .select("sale_item_id")
      .eq("protocol_id", id),
    supabase
      .from("protocol_relationships")
      .select(
        `id, relationship_type, notes,
         related:protocols!related_protocol_id(protocol_number)`
      )
      .eq("protocol_id", id),
    supabase
      .from("audit_events")
      .select(`id, event_type, payload, created_at, actor:profiles(full_name)`)
      .eq("protocol_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("approvals")
      .select(
        `id, required_role, status, decided_at, notes,
         decided_by_profile:profiles(full_name)`
      )
      .eq("protocol_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select(
        `id, department, description, status, dismissal_reason,
         claimed_by, claimed_at,
         assigned_to_user_id, assigned_to_job_title_id,
         assigned_user:profiles!assigned_to_user_id(full_name),
         claimer:profiles!claimed_by(full_name, avatar_url),
         completed_by, completer:profiles!completed_by(full_name, avatar_url), completed_at, notes`
      )
      .eq("protocol_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("protocol_replacement_sales")
      .select(
        `id, created_at,
         original:sales!original_sale_id(sale_number, total_amount),
         replacement:sales!replacement_sale_id(sale_number, sale_date, total_amount)`
      )
      .eq("protocol_id", id)
      .order("created_at", { ascending: false }),
    currentUser
      ? supabase
          .from("protocol_cancel_permissions")
          .select("user_id")
          .eq("user_id", currentUser.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    currentUser
      ? supabase.rpc("has_task_admin_permission", { p_user_id: currentUser.id })
      : Promise.resolve({ data: false }),
    currentUser
      ? supabase.rpc("can_assign_tasks", { p_user_id: currentUser.id })
      : Promise.resolve({ data: false }),
  ]);

  // Pendentes primeiro (mais recente por último dentro do grupo, pra
  // não embaralhar a ordem de quem já está acostumado), concluídas e
  // dispensadas sempre no final da lista.
  const finishedStatuses = new Set(["concluida", "dispensada"]);
  const sortedTasks = tasks
    ? [...tasks].sort((a, b) => {
        const aFinished = finishedStatuses.has(a.status) ? 1 : 0;
        const bFinished = finishedStatuses.has(b.status) ? 1 : 0;
        return aFinished - bFinished;
      })
    : tasks;

  const affectedItemIds = new Set(
    (protocolItems ?? []).map((pi) => pi.sale_item_id)
  );

  // "Perda vs. venda original" deve comparar só o(s) item(ns) que
  // realmente fizeram parte da troca — não a nota toda. Uma nota com
  // vários produtos, onde só um foi trocado, não pode comparar o valor
  // da nota inteira com o valor da venda substituta (isso gerava uma
  // "perda" falsa do tamanho dos outros produtos, que nunca saíram).
  const affectedItemsTotal = (saleItems ?? [])
    .filter((si) => affectedItemIds.has(si.id))
    .reduce((sum, si) => sum + Number(si.total_price), 0);

  const canDecideApproval =
    approval &&
    currentUser &&
    (currentUser.roles.includes(approval.required_role as RoleName) ||
      currentUser.roles.includes("gerencia_geral") ||
      currentUser.roles.includes("administrador"));

  const canRespondToInfoRequest =
    approval &&
    approval.status === "aguardando_informacao" &&
    currentUser &&
    (currentUser.id === protocol.opened_by ||
      currentUser.roles.includes("administrador"));

  const myDepartments = currentUser
    ? departmentsForRoles(currentUser.roles)
    : [];
  const canActOnDepartment = (department: string) =>
    myDepartments === "all" || myDepartments.includes(department as never);

  const requiresReplacementSale = Boolean(protocolType?.requires_replacement_sale);
  const canRegisterReplacementSale = Boolean(
    currentUser &&
      (currentUser.roles.includes("vendedor") ||
        currentUser.roles.includes("gerencia_geral") ||
        currentUser.roles.includes("administrador"))
  );

  const canCancelProtocol = Boolean(
    currentUser &&
      protocol.status !== "concluido" &&
      protocol.status !== "cancelado" &&
      (currentUser.id === protocol.opened_by ||
        currentUser.roles.includes("gerencia_geral") ||
        currentUser.roles.includes("administrador") ||
        currentUser.roles.includes("gerente_loja") ||
        currentUser.roles.includes("gerente_sac") ||
        currentUser.roles.includes("administrativo"))
  );

  const canCancelWithClaimedTasks = Boolean(
    currentUser &&
      (currentUser.roles.includes("gerencia_geral") ||
        currentUser.roles.includes("administrador") ||
        cancelPermission)
  );

  const isAdmin = Boolean(currentUser?.roles.includes("administrador"));

  return (
    <div className="max-w-[1600px] space-y-6">
      <RealtimeListRefresher table="tasks" channelName={`protocol-${protocol.id}-tasks`} filter={`protocol_id=eq.${protocol.id}`} />
      <RealtimeListRefresher table="protocols" channelName={`protocol-${protocol.id}`} filter={`id=eq.${protocol.id}`} />
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/protocolos"
            className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
          >
            ← Central de protocolos
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <ProtocolBadge code={protocol.protocol_number} />
            <StatusBadge status={protocol.status} />
          </div>
        </div>
        {(canCancelProtocol || protocol.status === "concluido" || isAdmin) && (
          <div className="flex shrink-0 items-center gap-2">
            {protocol.status === "concluido" && (
              <ArchiveButton
                protocolId={protocol.id}
                mode={protocol.archived_at ? "unarchive" : "archive"}
              />
            )}
            {isAdmin && <DeleteProtocolButton protocolId={protocol.id} />}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">

      {canCancelProtocol && (
        <CancelProtocolBox
          protocolId={protocol.id}
          canCancelWithClaimedTasks={canCancelWithClaimedTasks}
          tasks={(tasks ?? []).map((t) => ({
            id: t.id,
            department: t.department,
            description: t.description,
            status: t.status,
            completedByName: asOne(t.completer)?.full_name ?? null,
            claimedByName: asOne(t.claimer)?.full_name ?? null,
          }))}
        />
      )}

      {approval &&
        (approval.status === "pendente" ||
          approval.status === "aguardando_informacao") &&
        canDecideApproval && (
        <ApprovalBox
          approvalId={approval.id}
          requiredRoleLabel={
            ROLE_LABELS[approval.required_role as RoleName] ??
            approval.required_role
          }
        />
      )}

      {approval &&
        approval.status === "aguardando_informacao" &&
        canRespondToInfoRequest && <RespondInfoBox approvalId={approval.id} />}

      {approval &&
        approval.status !== "pendente" &&
        !(
          approval.status === "aguardando_informacao" &&
          (canRespondToInfoRequest || canDecideApproval)
        ) && (
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-2 text-sm font-medium text-(--color-graphite-900)">
            Aprovação
          </h2>
          <p className="text-sm text-(--color-graphite-700)">
            {approval.status === "aprovado" && "Aprovado"}
            {approval.status === "recusado" && "Recusado"}
            {approval.status === "aguardando_informacao" &&
              "Informações solicitadas"}
            {approval.decided_at &&
              ` em ${new Date(approval.decided_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
            {asOne(approval.decided_by_profile)?.full_name &&
              ` por ${asOne(approval.decided_by_profile)?.full_name}`}
          </p>
          {approval.notes && (
            <p className="mt-1 text-sm text-(--color-graphite-500)">
              {approval.notes}
            </p>
          )}
        </section>
      )}

      {approval && approval.status === "pendente" && !canDecideApproval && (
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <p className="text-sm text-(--color-graphite-500)">
            Aguardando aprovação de{" "}
            {ROLE_LABELS[approval.required_role as RoleName] ??
              approval.required_role}
            .
          </p>
        </section>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-(--color-graphite-900)">
          <ProtocolTypeIcon code={protocolType?.code} className="h-4 w-4 text-(--color-red-600)" />
          {protocolType?.name}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Info label="Filial" value={branch?.name} />
          <Info
            label="Escopo"
            value={
              scope?.name ??
              (protocol.cancellation_scope === "total"
                ? "Total"
                : protocol.cancellation_scope === "parcial"
                  ? "Parcial"
                  : "—")
            }
          />
          <Info label="Motivo" value={reason?.name} />
          <Info label="Submotivo" value={subreason?.name} />
          <Info
            label="Impacto financeiro"
            value={
              protocol.financial_impact != null
                ? `R$ ${Number(protocol.financial_impact).toFixed(2)}`
                : "—"
            }
          />
          {protocol.needs_refund && (
            <>
              <Info
                label="Valor do estorno"
                value={
                  protocol.refund_value != null
                    ? `R$ ${Number(protocol.refund_value).toFixed(2)}`
                    : "—"
                }
              />
              <Info
                label="Valor de crédito cliente"
                value={
                  protocol.client_credit_value != null
                    ? `R$ ${Number(protocol.client_credit_value).toFixed(2)}`
                    : "—"
                }
              />
            </>
          )}
          {protocol.customer_pays_difference && (
            <>
              <Info
                label="Cliente paga diferença"
                value={
                  protocol.difference_value != null
                    ? `R$ ${Number(protocol.difference_value).toFixed(2)}`
                    : "Sim"
                }
              />
              {protocol.difference_value != null && (
                <Info
                  label="Valor total da troca (produto + diferença)"
                  value={`R$ ${(
                    Number(protocol.total_value ?? 0) + Number(protocol.difference_value)
                  ).toFixed(2)}`}
                />
              )}
            </>
          )}
          <Info label="Aberto por" value={openedBy?.full_name} />
          <Info
            label="Aberto em"
            value={new Date(protocol.opened_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          />
          <Info
            label="Necessário estorno de caixa"
            value={
              protocol.cash_register_finalized === true
                ? "Sim"
                : protocol.cash_register_finalized === false
                  ? "Não"
                  : "—"
            }
          />
          <Info
            label="Cliente precisa de estorno"
            value={
              protocol.needs_refund === true
                ? "Sim"
                : protocol.needs_refund === false
                  ? "Não"
                  : "—"
            }
          />
          <Info
            label="Prazo"
            value={
              protocol.due_at
                ? new Date(protocol.due_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                : "A definir (Fase 3)"
            }
          />
        </dl>
        {protocol.description && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-(--color-graphite-700)">
              Descrição
            </p>
            <p className="text-sm text-(--color-graphite-700)">
              {protocol.description}
            </p>
          </div>
        )}
        {protocol.status === "cancelado" && protocol.cancellation_reason && (
          <div className="mt-4 rounded-md bg-(--color-red-50) p-3">
            <p className="mb-1 text-xs font-medium text-(--color-red-700)">
              Motivo do cancelamento
            </p>
            <p className="text-sm text-(--color-red-700)">
              {protocol.cancellation_reason}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">
          Cliente e venda
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Info label="Cliente" value={customer?.full_name} />
          <Info label="Documento" value={customer?.document} />
          <Info label="Telefone" value={customer?.phone} />
          <Info label="Venda" value={sale?.sale_number} />
          <Info
            label="Data da venda"
            value={
              sale?.sale_date
                ? new Date(sale.sale_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
                : undefined
            }
          />
          <Info
            label="Valor total da venda"
            value={
              sale?.total_amount != null
                ? `R$ ${Number(sale.total_amount).toFixed(2)}`
                : undefined
            }
          />
          <Info label="Tipo de venda" value={sale?.sale_type} />
          <Info label="Vendedor" value={sale?.salesperson_name ?? asOne(sale?.salesperson)?.full_name} />
        </dl>
        {sale?.notes && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-(--color-graphite-700)">
              Observações da venda
            </p>
            <p className="text-sm text-(--color-graphite-700)">{sale.notes}</p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">
          Itens da venda
        </h2>
        {protocol.cancellation_scope === "parcial" && (
          <p className="mb-2 text-xs text-(--color-graphite-500)">
            Itens marcados são os afetados por este protocolo.
          </p>
        )}
        <ul className="divide-y divide-(--color-gray-100)">
          {(saleItems ?? []).map((it) => {
            const affected =
              protocol.cancellation_scope !== "parcial" ||
              affectedItemIds.has(it.id);
            return (
              <li
                key={it.id}
                className={`flex items-center justify-between py-2 text-sm ${
                  affected ? "" : "opacity-50"
                }`}
              >
                <span className="text-(--color-graphite-700)">
                  {affected && protocol.cancellation_scope === "parcial" && (
                    <span className="mr-2 text-(--color-red-600)">●</span>
                  )}
                  {it.product_name}
                  {it.sku && (
                    <span className="text-(--color-graphite-500)">
                      {" "}
                      ({it.sku})
                    </span>
                  )}
                </span>
                <span className="text-(--color-graphite-500)">
                  {it.quantity} × R$ {Number(it.unit_price).toFixed(2)} = R${" "}
                  {Number(it.total_price).toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {payments && payments.length > 0 && (
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">
            Formas de pagamento
          </h2>
          <ul className="divide-y divide-(--color-gray-100)">
            {payments.map((p) => {
              const method = asOne(p.payment_methods);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2 text-sm text-(--color-graphite-700)"
                >
                  <span>
                    {method?.label ?? "—"}
                    {p.installments ? ` — ${p.installments}x` : ""}
                  </span>
                  <span>R$ {Number(p.amount).toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {relationships && relationships.length > 0 && (
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">
            Vínculos
          </h2>
          <ul className="space-y-2">
            {relationships.map((r) => {
              const related = asOne(r.related);
              return (
                <li key={r.id} className="text-sm text-(--color-graphite-700)">
                  {RELATIONSHIP_TYPE_LABELS[r.relationship_type] ??
                    r.relationship_type}
                  {related && (
                    <>
                      {" — "}
                      <ProtocolBadge code={related.protocol_number} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {requiresReplacementSale && (
        <ReplacementSaleBox
          protocolId={protocol.id}
          affectedItemsTotal={affectedItemsTotal > 0 ? affectedItemsTotal : null}
          records={(replacementSales ?? []).map((r) => ({
            id: r.id,
            created_at: r.created_at,
            original: asOne(r.original),
            replacement: asOne(r.replacement),
          }))}
          canRegister={canRegisterReplacementSale}
        />
      )}

      </div>

      <div className="space-y-6 lg:col-span-3">

      {sortedTasks && sortedTasks.length > 0 && (
          <section className="rounded-lg border border-(--color-gray-200) bg-white p-5 lg:sticky lg:top-6">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-(--color-graphite-900)">
                Tarefas por setor
              </h2>
              {canManageTasks && (
                <NewProtocolTaskButton
                  protocolId={protocol.id}
                  protocolNumber={protocol.protocol_number}
                />
              )}
            </div>
            <p className="mb-2 text-xs text-(--color-graphite-500)">
              Geradas automaticamente quando o protocolo foi aprovado.
            </p>
            <div className="space-y-3">
              {sortedTasks.map((t) => {
                const claimer = asOne(t.claimer);
                const completer = asOne(t.completer);
                const assignedUser = asOne(t.assigned_user);
                return (
                  <TaskItem
                    key={t.id}
                    taskId={t.id}
                    protocolId={protocol.id}
                    department={t.department}
                    description={t.description}
                    status={t.status}
                    dismissalReason={t.dismissal_reason}
                    canAct={canActOnDepartment(t.department)}
                    claimedBy={t.claimed_by}
                    claimedByName={claimer?.full_name ?? null}
                    claimedAt={t.claimed_at}
                    claimedByAvatarUrl={claimer?.avatar_url ?? null}
                    completedByName={completer?.full_name ?? null}
                    completedAt={t.completed_at}
                    completedByAvatarUrl={completer?.avatar_url ?? null}
                    notes={t.notes}
                    assignedToUserId={t.assigned_to_user_id}
                    assignedToJobTitleId={t.assigned_to_job_title_id}
                    assignedToUserName={assignedUser?.full_name ?? null}
                    currentUserId={currentUser?.id ?? null}
                    canOverride={Boolean(
                      currentUser &&
                        (currentUser.roles.includes("gerencia_geral") ||
                          currentUser.roles.includes("administrador"))
                    )}
                    canNudge={Boolean(canManageTasks)}
                    canAssign={Boolean(canAssignTasks)}
                  />
                );
              })}
            </div>
          </section>
      )}

      {(!tasks || tasks.length === 0) && (
          <section className="rounded-lg border border-(--color-gray-200) bg-white p-5 text-sm text-(--color-graphite-500) lg:sticky lg:top-6">
            <p>Nenhuma tarefa gerada para este protocolo ainda.</p>
            {canManageTasks && (
              <div className="mt-2">
                <NewProtocolTaskButton
                  protocolId={protocol.id}
                  protocolNumber={protocol.protocol_number}
                />
              </div>
            )}
          </section>
      )}

      </div>
      </div>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">
          Histórico
        </h2>
        <ol className="space-y-3 border-l border-(--color-gray-200) pl-4">
          {(auditEvents ?? []).map((ev) => {
            const actor = asOne(ev.actor);
            return (
              <li key={ev.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-(--color-red-600)" />
                <p className="text-(--color-graphite-900)">
                  {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                </p>
                <p className="protocol-stamp text-xs text-(--color-graphite-500)">
                  {new Date(ev.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  {actor?.full_name ? ` — ${actor.full_name}` : " — sistema"}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-(--color-graphite-500)">
        {label}
      </dt>
      <dd className="text-sm text-(--color-graphite-900)">{value || "—"}</dd>
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={ProtocoloDetalhePage} rota="/protocolos/[id]">{props.children}</__TelaCliente>;
}
