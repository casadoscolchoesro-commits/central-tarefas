"use client";
import { irParaLogin } from "@/lib/wghub";
import { redirect } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { Bar, DateFilterForm, BackToReportsLink, DownloadPdfButton, parseDateRange, formatMoney, KpiCard, AlertBanner, HighlightBanner } from "../_shared";

type FinancialByMonth = { month_label: string; month_start: string; total_impact: number };
type FinancialBySalesperson = { salesperson_name: string; cnt: number; total_impact: number };
type Summary = {
  total_protocols: number;
  total_financial_impact: number;
  avg_resolution_days: number | null;
  overdue_tasks: number;
};

async function FinanceiroReportPage({
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

  const [{ data: financialByMonth }, { data: summary }, { data: financialBySalesperson }] = await Promise.all([
    supabase.rpc("report_financial_by_month", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_summary", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_financial_by_salesperson", { p_from: fromIso, p_to: toIso }),
  ]);

  const fMonth = (financialByMonth ?? []) as FinancialByMonth[];
  const fSalesperson = (financialBySalesperson ?? []) as FinancialBySalesperson[];
  const s: Summary | null = (summary?.[0] as Summary) ?? null;
  const maxMonthImpact = Math.max(...fMonth.map((v) => v.total_impact), 0);
  const maxSalespersonImpact = Math.max(...fSalesperson.map((v) => v.total_impact), 0);

  const topMonth = [...fMonth].sort((a, b) => b.total_impact - a.total_impact)[0];
  const topSalesperson = [...fSalesperson].sort((a, b) => b.total_impact - a.total_impact)[0];
  const avgTicket =
    fSalesperson.reduce((sum, v) => sum + v.cnt, 0) > 0
      ? (s?.total_financial_impact ?? 0) / fSalesperson.reduce((sum, v) => sum + v.cnt, 0)
      : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">Financeiro</h1>
          <p className="text-sm text-(--color-graphite-500)">
            Valor efetivamente estornado ao cliente no período (não inclui crédito cliente).
          </p>
        </div>
        <DownloadPdfButton type="financeiro" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/financeiro" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Impacto financeiro total"
          value={`R$ ${formatMoney(s?.total_financial_impact ?? 0)}`}
          hint="Valor estornado ao cliente no período"
          variant="bad"
        />
        <KpiCard
          label="Estorno médio"
          value={`R$ ${formatMoney(avgTicket)}`}
          hint="Por protocolo com estorno"
        />
        <KpiCard
          label="Mês com maior impacto"
          value={topMonth?.month_label ?? "—"}
          hint={topMonth ? `R$ ${formatMoney(topMonth.total_impact)}` : undefined}
        />
        <KpiCard
          label="Vendedor com maior impacto"
          value={topSalesperson?.salesperson_name ?? "—"}
          hint={topSalesperson ? `R$ ${formatMoney(topSalesperson.total_impact)}` : undefined}
        />
      </div>

      {topSalesperson && fSalesperson.length > 1 && (
        <AlertBanner>
          <strong>{topSalesperson.salesperson_name}</strong> concentra o maior valor estornado do
          período (R$ {formatMoney(topSalesperson.total_impact)}). Vale entender se é volume de
          vendas maior ou um padrão de motivo específico.
        </AlertBanner>
      )}

      {topMonth && (
        <HighlightBanner>
          <strong>{topMonth.month_label}</strong> foi o mês com maior impacto financeiro no
          período selecionado.
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">
          Impacto financeiro por mês
        </h2>
        {fMonth.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <ul className="space-y-3">
            {fMonth.map((v) => (
              <li key={v.month_start}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{v.month_label}</span>
                  <span className="protocol-stamp text-xs text-(--color-graphite-500)">
                    R$ {formatMoney(v.total_impact)}
                  </span>
                </div>
                <Bar value={v.total_impact} max={maxMonthImpact} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
          Impacto financeiro por vendedor
        </h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Só considera o valor efetivamente estornado ao cliente (não o valor total nem o crédito
          cliente).
        </p>
        {fSalesperson.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Vendedor</th>
                <th className="py-2 font-medium">Protocolos</th>
                <th className="py-2 font-medium">Impacto financeiro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {fSalesperson.map((v) => (
                <tr key={v.salesperson_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.salesperson_name}</td>
                  <td className="w-1/3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 shrink-0 protocol-stamp text-xs text-(--color-graphite-700)">
                        {v.cnt}
                      </span>
                      <Bar value={v.total_impact} max={maxSalespersonImpact} />
                    </div>
                  </td>
                  <td className="py-2 text-(--color-graphite-700)">R$ {formatMoney(v.total_impact)}</td>
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
  return <__TelaCliente render={FinanceiroReportPage} rota="/relatorios/financeiro">{props.children}</__TelaCliente>;
}
