"use client";
import { irParaLogin } from "@/lib/wghub";
import { redirect } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { DateFilterForm, BackToReportsLink, DownloadPdfButton, parseDateRange, KpiCard, HighlightBanner, AlertBanner } from "../_shared";

type ResolutionByType = { type_name: string; avg_days: number; cnt: number };
type ResolutionByUser = { user_name: string; avg_days: number; cnt: number };

async function TempoResolucaoReportPage({
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

  const [{ data: resolutionByType }, { data: resolutionByUser }] = await Promise.all([
    supabase.rpc("report_resolution_time_by_type", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_resolution_time_by_user", { p_from: fromIso, p_to: toIso }),
  ]);

  const rType = (resolutionByType ?? []) as ResolutionByType[];
  const rByUser = (resolutionByUser ?? []) as ResolutionByUser[];

  const totalConcluded = rType.reduce((sum, v) => sum + v.cnt, 0);
  const overallAvg =
    totalConcluded > 0
      ? rType.reduce((sum, v) => sum + v.avg_days * v.cnt, 0) / totalConcluded
      : null;
  const slowest = [...rType].sort((a, b) => b.avg_days - a.avg_days)[0];
  const fastestUser = [...rByUser].filter((v) => v.cnt > 0).sort((a, b) => a.avg_days - b.avg_days)[0];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Tempo de resolução
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Só considera protocolos concluídos no período (abertura → conclusão).
          </p>
        </div>
        <DownloadPdfButton type="tempo-resolucao" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/tempo-resolucao" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Média geral"
          value={overallAvg != null ? `${overallAvg.toFixed(1)} dias` : "—"}
          hint={`${totalConcluded} protocolos concluídos`}
        />
        <KpiCard
          label="Tipo mais demorado"
          value={slowest?.type_name ?? "—"}
          hint={slowest ? `${slowest.avg_days} dias em média` : undefined}
          variant={slowest ? "bad" : "neutral"}
        />
        <KpiCard
          label="Usuário mais rápido"
          value={fastestUser?.user_name ?? "—"}
          hint={fastestUser ? `${fastestUser.avg_days} dias em média` : undefined}
          variant={fastestUser ? "good" : "neutral"}
        />
      </div>

      {slowest && rType.length > 1 && (
        <AlertBanner>
          <strong>{slowest.type_name}</strong> é o tipo que mais demora pra resolver, com{" "}
          {slowest.avg_days} dias em média — vale olhar o que trava nesse fluxo.
        </AlertBanner>
      )}

      {fastestUser && (
        <HighlightBanner>
          <strong>{fastestUser.user_name}</strong> tem o menor tempo médio de resolução no
          período: {fastestUser.avg_days} dias.
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">
          Tempo médio de resolução por tipo
        </h2>
        {rType.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem protocolos concluídos no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Tipo</th>
                <th className="py-2 font-medium">Média (dias)</th>
                <th className="py-2 font-medium">Concluídos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {rType.map((v) => (
                <tr key={v.type_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.type_name}</td>
                  <td className="py-2 protocol-stamp text-(--color-graphite-700)">{v.avg_days}</td>
                  <td className="py-2 text-(--color-graphite-500)">{v.cnt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">
          Tempo médio de resolução por usuário
        </h2>
        {rByUser.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem protocolos concluídos no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Usuário</th>
                <th className="py-2 font-medium">Média (dias)</th>
                <th className="py-2 font-medium">Concluídos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {rByUser.map((v) => (
                <tr key={v.user_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.user_name}</td>
                  <td className="py-2 protocol-stamp text-(--color-graphite-700)">{v.avg_days}</td>
                  <td className="py-2 text-(--color-graphite-500)">{v.cnt}</td>
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
  return <__TelaCliente render={TempoResolucaoReportPage} rota="/relatorios/tempo-resolucao">{props.children}</__TelaCliente>;
}
