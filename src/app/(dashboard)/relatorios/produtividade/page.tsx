import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import {
  DateFilterForm,
  BackToReportsLink,
  DownloadPdfButton,
  parseDateRange,
  KpiCard,
  HighlightBanner,
} from "../_shared";

type Productivity = {
  user_name: string;
  protocols_opened: number;
  tasks_completed: number;
  standalone_created: number;
  purchasing_responded: number;
};

export default async function ProdutividadeReportPage({
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

  const { data } = await supabase.rpc("report_productivity_by_user", { p_from: fromIso, p_to: toIso });
  const rows = (data ?? []) as Productivity[];

  const withTotal = rows.map((r) => ({
    ...r,
    total: r.protocols_opened + r.tasks_completed + r.standalone_created + r.purchasing_responded,
  }));
  const topOverall = [...withTotal].sort((a, b) => b.total - a.total)[0];
  const totalActivity = withTotal.reduce((s, v) => s + v.total, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Produtividade por pessoa
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Protocolos abertos, tarefas concluídas, tarefas avulsas criadas e solicitações ao
            Compras respondidas, tudo numa visão só.
          </p>
        </div>
        <DownloadPdfButton type="produtividade" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/produtividade" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Pessoas ativas" value={String(withTotal.length)} hint="Com pelo menos uma ação no período" />
        <KpiCard label="Ações totais" value={String(totalActivity)} hint="Somando as 4 categorias" />
        <KpiCard
          label="Mais produtivo(a)"
          value={topOverall?.user_name ?? "—"}
          hint={topOverall ? `${topOverall.total} ações no total` : undefined}
          variant="good"
        />
      </div>

      {topOverall && (
        <HighlightBanner>
          <strong>{topOverall.user_name}</strong> foi quem mais contribuiu no período, com{" "}
          {topOverall.total} ações somando protocolos, tarefas e solicitações.
        </HighlightBanner>
      )}

      <section className="overflow-hidden rounded-lg border border-(--color-gray-200) bg-white">
        {withTotal.length === 0 ? (
          <p className="p-8 text-center text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) bg-(--color-gray-50) text-left text-xs text-(--color-graphite-500)">
                <th className="px-4 py-2 font-medium">Pessoa</th>
                <th className="px-4 py-2 font-medium">Protocolos abertos</th>
                <th className="px-4 py-2 font-medium">Tarefas concluídas</th>
                <th className="px-4 py-2 font-medium">Tarefas avulsas criadas</th>
                <th className="px-4 py-2 font-medium">Compras respondidas</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {withTotal.map((v) => (
                <tr key={v.user_name} className="hover:bg-(--color-gray-50)">
                  <td className="px-4 py-2.5 text-(--color-graphite-700)">{v.user_name}</td>
                  <td className="px-4 py-2.5 text-(--color-graphite-700)">{v.protocols_opened}</td>
                  <td className="px-4 py-2.5 text-(--color-graphite-700)">{v.tasks_completed}</td>
                  <td className="px-4 py-2.5 text-(--color-graphite-700)">{v.standalone_created}</td>
                  <td className="px-4 py-2.5 text-(--color-graphite-700)">{v.purchasing_responded}</td>
                  <td className="protocol-stamp px-4 py-2.5 font-medium text-(--color-graphite-900)">{v.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
