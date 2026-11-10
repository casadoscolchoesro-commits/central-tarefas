import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import {
  Bar,
  DateFilterForm,
  BackToReportsLink,
  DownloadPdfButton,
  parseDateRange,
  formatMoney,
  KpiCard,
  AlertBanner,
  HighlightBanner,
} from "../_shared";

type BranchPerf = { branch_name: string; cnt: number; total_impact: number };
type ReasonByBranch = { branch_name: string; reason_name: string; cnt: number };
type BranchComparison = { branch_name: string; cnt: number; avg_resolution_days: number | null; pct_on_time: number | null };

export default async function FiliaisReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: canView } = await supabase.rpc("has_report_access", { p_user_id: user.id });
  if (!canView) redirect("/");

  const { today, fromIso, toIso, fromStr, toStr } = parseDateRange(params);

  const [{ data: branchPerf }, { data: reasonsByBranch }, { data: comparisonData }] = await Promise.all([
    supabase.rpc("report_branch_performance", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_reasons_by_branch", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_branch_comparison", { p_from: fromIso, p_to: toIso }),
  ]);

  const bPerf = (branchPerf ?? []) as BranchPerf[];
  const rByBranch = (reasonsByBranch ?? []) as ReasonByBranch[];
  const comparison = (comparisonData ?? []) as BranchComparison[];
  const maxBranchCnt = Math.max(...bPerf.map((v) => v.cnt), 0);

  const totalCnt = bPerf.reduce((sum, v) => sum + v.cnt, 0);
  const totalImpact = bPerf.reduce((sum, v) => sum + v.total_impact, 0);
  const topByCount = [...bPerf].sort((a, b) => b.cnt - a.cnt)[0];
  const topByImpact = [...bPerf].sort((a, b) => b.total_impact - a.total_impact)[0];
  const topByCountShare = totalCnt > 0 && topByCount ? Math.round((topByCount.cnt / totalCnt) * 100) : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Desempenho por filial
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Quem mais cancela ou troca, e os motivos mais comuns por loja.
          </p>
        </div>
        <DownloadPdfButton type="filiais" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/filiais" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de protocolos" value={String(totalCnt)} hint="No período, todas as filiais" />
        <KpiCard
          label="Impacto financeiro total"
          value={`R$ ${formatMoney(totalImpact)}`}
          hint="Soma dos estornos no período"
        />
        <KpiCard
          label="Filial líder em volume"
          value={topByCount?.branch_name ?? "—"}
          hint={topByCount ? `${topByCount.cnt} protocolos (${topByCountShare}% do total)` : undefined}
        />
        <KpiCard
          label="Filial com maior impacto"
          value={topByImpact?.branch_name ?? "—"}
          hint={topByImpact ? `R$ ${formatMoney(topByImpact.total_impact)}` : undefined}
          variant={topByImpact ? "bad" : "neutral"}
        />
      </div>

      {topByCount && topByCountShare >= 40 && bPerf.length > 1 && (
        <AlertBanner>
          <strong>{topByCount.branch_name}</strong> concentra {topByCountShare}% de todos os
          protocolos do período — vale entender se é volume de vendas maior ou algo pontual.
        </AlertBanner>
      )}

      {topByCount && (
        <HighlightBanner>
          {bPerf.length} filial(is) com protocolo no período. Líder: <strong>{topByCount.branch_name}</strong>{" "}
          com {topByCount.cnt} protocolos.
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">
          Desempenho por filial
        </h2>
        {bPerf.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Filial</th>
                <th className="py-2 font-medium">Protocolos</th>
                <th className="py-2 font-medium">Impacto financeiro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {bPerf.map((v) => (
                <tr key={v.branch_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.branch_name}</td>
                  <td className="w-1/3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 shrink-0 protocol-stamp text-xs text-(--color-graphite-700)">
                        {v.cnt}
                      </span>
                      <Bar value={v.cnt} max={maxBranchCnt} />
                    </div>
                  </td>
                  <td className="py-2 text-(--color-graphite-700)">R$ {formatMoney(v.total_impact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Filiais comparadas</h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Volume, tempo médio de resolução e % dentro do prazo, lado a lado.
        </p>
        {comparison.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Filial</th>
                <th className="py-2 font-medium">Protocolos</th>
                <th className="py-2 font-medium">Tempo médio</th>
                <th className="py-2 font-medium">% no prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {comparison.map((v) => (
                <tr key={v.branch_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.branch_name}</td>
                  <td className="py-2 text-(--color-graphite-700)">{v.cnt}</td>
                  <td className="py-2 text-(--color-graphite-700)">
                    {v.avg_resolution_days != null ? `${v.avg_resolution_days} dias` : "—"}
                  </td>
                  <td className="py-2">
                    {v.pct_on_time != null ? (
                      <span
                        className={
                          v.pct_on_time >= 85
                            ? "font-medium text-emerald-700"
                            : v.pct_on_time < 60
                              ? "font-medium text-(--color-red-600)"
                              : "text-(--color-graphite-700)"
                        }
                      >
                        {v.pct_on_time}%
                      </span>
                    ) : (
                      <span className="text-(--color-graphite-500)">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Motivos por filial</h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Combinações mais frequentes no período (até 50).
        </p>
        {rByBranch.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-(--color-gray-100) overflow-y-auto">
            {rByBranch.map((v, i) => (
              <li
                key={`${v.branch_name}-${v.reason_name}-${i}`}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-(--color-graphite-700)">
                  {v.branch_name}
                  <span className="text-(--color-graphite-500)"> — {v.reason_name}</span>
                </span>
                <span className="protocol-stamp shrink-0 text-xs text-(--color-graphite-700)">{v.cnt}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
