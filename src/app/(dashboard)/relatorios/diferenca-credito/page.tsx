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
  HighlightBanner,
} from "../_shared";

type Summary = {
  cnt_with_difference: number;
  total_difference: number;
  avg_difference: number | null;
  cnt_with_credit: number;
  total_credit: number;
};
type ByBranch = { branch_name: string; cnt: number; total_difference: number; total_credit: number };

export default async function DiferencaCreditoReportPage({
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

  const [{ data: summaryData }, { data: byBranchData }] = await Promise.all([
    supabase.rpc("report_difference_and_credit", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_difference_by_branch", { p_from: fromIso, p_to: toIso }),
  ]);

  const s: Summary | null = (summaryData?.[0] as Summary) ?? null;
  const byBranch = (byBranchData ?? []) as ByBranch[];
  const maxTotal = Math.max(...byBranch.map((v) => v.total_difference + v.total_credit), 0);
  const topBranch = [...byBranch].sort((a, b) => b.total_difference + b.total_credit - (a.total_difference + a.total_credit))[0];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Diferença paga em trocas + Crédito cliente
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Quanto o cliente pagou a mais em trocas, e quanto virou crédito na loja.
          </p>
        </div>
        <DownloadPdfButton type="diferenca-credito" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/diferenca-credito" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total em diferença paga"
          value={`R$ ${formatMoney(s?.total_difference ?? 0)}`}
          hint={s ? `${s.cnt_with_difference} protocolos` : undefined}
          variant="good"
        />
        <KpiCard
          label="Diferença média"
          value={s?.avg_difference != null ? `R$ ${formatMoney(s.avg_difference)}` : "—"}
        />
        <KpiCard
          label="Total em crédito cliente"
          value={`R$ ${formatMoney(s?.total_credit ?? 0)}`}
          hint={s ? `${s.cnt_with_credit} protocolos` : undefined}
        />
        <KpiCard
          label="Filial líder"
          value={topBranch?.branch_name ?? "—"}
          hint={topBranch ? `R$ ${formatMoney(topBranch.total_difference + topBranch.total_credit)}` : undefined}
        />
      </div>

      {s && s.total_difference > 0 && (
        <HighlightBanner>
          As trocas com diferença paga geraram <strong>R$ {formatMoney(s.total_difference)}</strong>{" "}
          em receita extra no período — dinheiro que não apareceria só olhando o estorno.
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Por filial</h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Soma de diferença paga + crédito cliente gerado, por filial.
        </p>
        {byBranch.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Filial</th>
                <th className="py-2 font-medium">Diferença paga</th>
                <th className="py-2 font-medium">Crédito cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {byBranch.map((v) => (
                <tr key={v.branch_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.branch_name}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-24 shrink-0 protocol-stamp text-xs text-(--color-graphite-700)">
                        R$ {formatMoney(v.total_difference)}
                      </span>
                      <Bar value={v.total_difference} max={maxTotal} />
                    </div>
                  </td>
                  <td className="py-2 text-(--color-graphite-700)">R$ {formatMoney(v.total_credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
