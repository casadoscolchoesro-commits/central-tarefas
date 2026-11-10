"use client";
import { irParaLogin } from "@/lib/wghub";
import { redirect } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import {
  Bar,
  DateFilterForm,
  BackToReportsLink,
  DownloadPdfButton,
  parseDateRange,
  KpiCard,
  AlertBanner,
  HighlightBanner,
} from "../_shared";

type Summary = { total: number; pendente: number; concluido: number; avg_response_hours: number | null };
type ByKind = { kind: string; cnt: number; avg_response_hours: number | null };
type ByResponder = { responder_name: string; cnt: number; avg_response_hours: number | null };

const KIND_LABELS: Record<string, string> = {
  preco_custo: "Preço de Produto",
  cadastro: "Cadastro de produto",
  prazo_encomenda: "Prazo de encomenda",
};

async function ComprasReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) irParaLogin();
  const supabase = await createClient();
  const { data: canView } = await supabase.rpc("has_report_access", { p_user_id: user.id });
  if (!canView) redirect("/");

  const { today, fromIso, toIso, fromStr, toStr } = parseDateRange(params);

  const [{ data: summaryData }, { data: byKindData }, { data: byResponderData }, { data: pendingWithoutOrderData }] = await Promise.all([
    supabase.rpc("report_purchasing_summary", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_purchasing_by_kind", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_purchasing_by_responder", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_purchasing_pending_without_order", { p_from: fromIso, p_to: toIso }),
  ]);

  const s: Summary | null = (summaryData?.[0] as Summary) ?? null;
  const byKind = (byKindData ?? []) as ByKind[];
  const byResponder = (byResponderData ?? []) as ByResponder[];
  const pendingWithoutOrder = (pendingWithoutOrderData?.[0] as { total_prazo_encomenda: number; pending_without_order: number }) ?? null;
  const maxKindCnt = Math.max(...byKind.map((v) => v.cnt), 0);
  const maxResponderCnt = Math.max(...byResponder.map((v) => v.cnt), 0);

  const fastestResponder = [...byResponder].filter((v) => v.avg_response_hours != null).sort((a, b) => (a.avg_response_hours ?? 0) - (b.avg_response_hours ?? 0))[0];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Solicitações ao Compras
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Volume, tempo de resposta e quem mais responde.
          </p>
        </div>
        <DownloadPdfButton type="compras" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/compras" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total no período" value={String(s?.total ?? 0)} />
        <KpiCard label="Pendentes" value={String(s?.pendente ?? 0)} variant={(s?.pendente ?? 0) > 0 ? "bad" : "good"} />
        <KpiCard label="Concluídas" value={String(s?.concluido ?? 0)} variant="good" />
        <KpiCard
          label="Tempo médio de resposta"
          value={s?.avg_response_hours != null ? `${s.avg_response_hours}h` : "—"}
        />
      </div>

      {s && s.pendente > s.concluido && s.total > 0 && (
        <AlertBanner>
          Tem mais solicitações pendentes ({s.pendente}) do que concluídas ({s.concluido}) no
          período — vale reforçar o time de Compras.
        </AlertBanner>
      )}

      {pendingWithoutOrder && pendingWithoutOrder.pending_without_order > 0 && (
        <AlertBanner>
          {pendingWithoutOrder.pending_without_order} de {pendingWithoutOrder.total_prazo_encomenda} consulta(s)
          de prazo de encomenda ainda estão pendentes <strong>sem pedido de compra feito</strong> —
          cliente esperando, mas a compra nem foi iniciada.
        </AlertBanner>
      )}

      {fastestResponder && (
        <HighlightBanner>
          <strong>{fastestResponder.responder_name}</strong> tem o menor tempo médio de resposta:{" "}
          {fastestResponder.avg_response_hours}h.
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">Por tipo de solicitação</h2>
        {byKind.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <ul className="space-y-3">
            {byKind.map((v) => (
              <li key={v.kind}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{KIND_LABELS[v.kind] ?? v.kind}</span>
                  <span className="protocol-stamp text-xs text-(--color-graphite-500)">
                    {v.cnt} · {v.avg_response_hours != null ? `${v.avg_response_hours}h resposta` : "sem resposta ainda"}
                  </span>
                </div>
                <Bar value={v.cnt} max={maxKindCnt} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Por quem responde</h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Quantas solicitações cada pessoa do Compras concluiu, e o tempo médio até responder.
        </p>
        {byResponder.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem respostas no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Pessoa</th>
                <th className="py-2 font-medium">Respondidas</th>
                <th className="py-2 font-medium">Tempo médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {byResponder.map((v) => (
                <tr key={v.responder_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.responder_name}</td>
                  <td className="w-1/3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 shrink-0 protocol-stamp text-xs text-(--color-graphite-700)">
                        {v.cnt}
                      </span>
                      <Bar value={v.cnt} max={maxResponderCnt} />
                    </div>
                  </td>
                  <td className="py-2 text-(--color-graphite-700)">
                    {v.avg_response_hours != null ? `${v.avg_response_hours}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={ComprasReportPage} rota="/relatorios/compras">{props.children}</__TelaCliente>;
}
