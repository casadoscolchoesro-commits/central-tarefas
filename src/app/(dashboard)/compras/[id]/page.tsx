import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { RespondPurchasingRequestForm } from "@/components/RespondPurchasingRequestForm";
import { MarkPurchasingViewedOnMount } from "@/components/MarkPurchasingViewedOnMount";
import { ViewedIcon } from "@/components/ViewedIcon";
import { RealtimeListRefresher } from "@/components/RealtimeListRefresher";
import { TaskNotesThread } from "@/components/TaskNotesThread";

const KIND_LABELS: Record<string, string> = {
  preco_custo: "Preço de Produto",
  cadastro: "Cadastro de produto",
  prazo_encomenda: "Prazo de encomenda",
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function PurchasingRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("purchasing_requests")
    .select(
      `id, request_number, kind, product_description, measure, brand, color_number, color_description, notes, status,
       response_cash_value, response_12x_value, response_18x_value, response_notes, created_at, completed_at,
       reference_number, supplier, expected_date, has_purchase_order, purchase_order_number, has_sale, sale_salesperson_name,
       viewed_at, task_id,
       requested_by, requester:profiles!requested_by(full_name),
       branch_id, branch:branches(name),
       completed_by, completer:profiles!completed_by(full_name)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!request) notFound();

  const { data: canRespond } = await supabase.rpc("can_act_on_department", {
    p_user_id: user.id,
    p_department: "compras",
  });
  const isAdminOrGerencia = user.roles.includes("gerencia_geral") || user.roles.includes("administrador");
  const requester = asOne(request.requester);
  const branch = asOne(request.branch);
  const completer = asOne(request.completer);

  return (
    <div className="max-w-3xl space-y-6">
      <RealtimeListRefresher table="purchasing_requests" channelName={`purchasing-request-${request.id}`} filter={`id=eq.${request.id}`} />
      {user.id === request.requested_by && request.status === "concluido" && (
        <MarkPurchasingViewedOnMount requestId={request.id} />
      )}
      <div>
        <Link href="/compras" className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
          ← Solicitações ao Compras
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <span className="protocol-stamp inline-flex items-center gap-1 rounded border border-teal-600/20 bg-teal-500/15 px-2 py-0.5 text-xs uppercase text-teal-700">
            {request.request_number}
          </span>
          <span
            className={`text-xs font-medium ${
              request.status === "concluido" ? "text-(--color-success)" : "text-(--color-warning)"
            }`}
          >
            {request.status === "concluido" ? "Concluída" : "Pendente"}
          </span>
        </div>
      </div>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">
          {KIND_LABELS[request.kind] ?? request.kind}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-(--color-graphite-500)">Descrição do produto</dt>
            <dd className="text-sm text-(--color-graphite-900)">{request.product_description}</dd>
          </div>
          {request.kind === "prazo_encomenda" ? (
            <>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Tamanho</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.measure ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Nº da cor</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.color_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Descrição da cor</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.color_description ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Venda no Sólidus</dt>
                <dd className="text-sm text-(--color-graphite-900)">
                  {request.has_sale ? `Sim — nº ${request.reference_number ?? "—"}` : "Não"}
                </dd>
              </div>
              {request.has_sale && (
                <div>
                  <dt className="text-xs font-medium text-(--color-graphite-500)">Vendedor</dt>
                  <dd className="text-sm text-(--color-graphite-900)">
                    {request.sale_salesperson_name ?? "Venda não encontrada no Sólidus"}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Marca</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.brand ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Pedido de compra</dt>
                <dd className="text-sm text-(--color-graphite-900)">
                  {request.has_purchase_order
                    ? `Sim — nº ${request.purchase_order_number ?? "—"}`
                    : "Ainda não"}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Medida</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.measure}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Marca</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.brand}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Nº da cor</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.color_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">Descrição da cor</dt>
                <dd className="text-sm text-(--color-graphite-900)">{request.color_description ?? "—"}</dd>
              </div>
            </>
          )}
          <div>
            <dt className="text-xs font-medium text-(--color-graphite-500)">Solicitado por</dt>
            <dd className="text-sm text-(--color-graphite-900)">{requester?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-(--color-graphite-500)">Filial</dt>
            <dd className="text-sm text-(--color-graphite-900)">{branch?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-(--color-graphite-500)">Pedido em</dt>
            <dd className="text-sm text-(--color-graphite-900)">
              {new Date(request.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </dd>
          </div>
        </dl>
        {request.notes && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-(--color-graphite-700)">Observação</p>
            <p className="text-sm text-(--color-graphite-700)">{request.notes}</p>
          </div>
        )}
      </section>

      {request.task_id && (
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <TaskNotesThread
            taskId={request.task_id}
            currentUserId={user.id}
            canOverride={isAdminOrGerencia}
            canComment={Boolean(canRespond || isAdminOrGerencia || user.id === request.requested_by)}
          />
        </section>
      )}

      {request.status === "concluido" && (
        <section className="rounded-lg border border-(--color-gray-200) bg-emerald-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-(--color-graphite-900)">Resposta</h2>
            {(canRespond || isAdminOrGerencia) && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  request.viewed_at ? "text-sky-600" : "text-(--color-graphite-500)"
                }`}
                title={
                  request.viewed_at
                    ? `${requester?.full_name ?? "Quem pediu"} visualizou em ${new Date(request.viewed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                    : `${requester?.full_name ?? "Quem pediu"} ainda não visualizou`
                }
              >
                <ViewedIcon viewed={Boolean(request.viewed_at)} className="h-4 w-4" />
                {request.viewed_at ? "Visualizado" : "Não visualizado"}
              </span>
            )}
          </div>
          {request.kind === "preco_custo" && (
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">À vista</dt>
                <dd className="protocol-stamp text-sm font-medium text-emerald-700">
                  {request.response_cash_value != null
                    ? `R$ ${Number(request.response_cash_value).toFixed(2)}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">12x</dt>
                <dd className="protocol-stamp text-sm font-medium text-emerald-700">
                  {request.response_12x_value != null
                    ? `R$ ${Number(request.response_12x_value).toFixed(2)}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-graphite-500)">18x</dt>
                <dd className="protocol-stamp text-sm font-medium text-emerald-700">
                  {request.response_18x_value != null
                    ? `R$ ${Number(request.response_18x_value).toFixed(2)}`
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
          {request.kind === "prazo_encomenda" && (
            <div>
              <dt className="text-xs font-medium text-(--color-graphite-500)">Data prevista</dt>
              <dd className="protocol-stamp text-sm font-medium text-emerald-700">
                {request.expected_date
                  ? new Date(request.expected_date + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
                  : "—"}
              </dd>
            </div>
          )}
          {request.response_notes && (
            <p className="mt-3 text-sm text-(--color-graphite-700)">{request.response_notes}</p>
          )}
          <p className="mt-3 text-xs text-(--color-graphite-500)">
            Respondido por {completer?.full_name ?? "—"}
            {request.completed_at && ` em ${new Date(request.completed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
          </p>
        </section>
      )}

      {request.status === "pendente" && (canRespond || isAdminOrGerencia) && (
        <RespondPurchasingRequestForm requestId={request.id} kind={request.kind} />
      )}

      {request.status === "pendente" && !canRespond && !isAdminOrGerencia && (
        <p className="text-sm text-(--color-graphite-500)">Aguardando resposta do Compras.</p>
      )}
    </div>
  );
}
