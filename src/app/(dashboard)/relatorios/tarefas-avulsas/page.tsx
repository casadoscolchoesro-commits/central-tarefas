import { redirect } from "next/navigation";
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

type ByUser = { user_name: string; cnt: number };
type DismissalSummary = { total: number; completed: number; dismissed: number; dismissal_rate: number | null };

export default async function TarefasAvulsasReportPage({
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

  const [{ data: byCreatorData }, { data: byClaimerData }, { data: dismissalData }] = await Promise.all([
    supabase.rpc("report_standalone_tasks_by_creator", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_standalone_tasks_by_claimer", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_standalone_dismissal_rate", { p_from: fromIso, p_to: toIso }),
  ]);

  const byCreator = (byCreatorData ?? []) as ByUser[];
  const byClaimer = (byClaimerData ?? []) as ByUser[];
  const d: DismissalSummary | null = (dismissalData?.[0] as DismissalSummary) ?? null;
  const maxCreatorCnt = Math.max(...byCreator.map((v) => v.cnt), 0);
  const maxClaimerCnt = Math.max(...byClaimer.map((v) => v.cnt), 0);

  const topCreator = byCreator[0];
  const topClaimer = byClaimer[0];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">Tarefas avulsas</h1>
          <p className="text-sm text-(--color-graphite-500)">
            Quem mais cria, quem mais assume, e a taxa de dispensa.
          </p>
        </div>
        <DownloadPdfButton type="tarefas-avulsas" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/tarefas-avulsas" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Criadas no período" value={String(byCreator.reduce((s, v) => s + v.cnt, 0))} />
        <KpiCard
          label="Taxa de dispensa"
          value={d?.dismissal_rate != null ? `${d.dismissal_rate}%` : "—"}
          hint={d ? `${d.dismissed} de ${d.total} resolvidas` : undefined}
          variant={d?.dismissal_rate != null && d.dismissal_rate >= 30 ? "bad" : "neutral"}
        />
        <KpiCard label="Quem mais cria" value={topCreator?.user_name ?? "—"} hint={topCreator ? `${topCreator.cnt} tarefas` : undefined} />
        <KpiCard label="Quem mais assume" value={topClaimer?.user_name ?? "—"} hint={topClaimer ? `${topClaimer.cnt} tarefas` : undefined} variant="good" />
      </div>

      {d?.dismissal_rate != null && d.dismissal_rate >= 30 && (
        <AlertBanner>
          {d.dismissal_rate}% das tarefas avulsas resolvidas no período foram dispensadas em vez
          de concluídas — vale olhar os motivos de dispensa mais comuns.
        </AlertBanner>
      )}

      {topClaimer && (
        <HighlightBanner>
          <strong>{topClaimer.user_name}</strong> foi quem mais assumiu tarefas avulsas no
          período, com {topClaimer.cnt}.
        </HighlightBanner>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">Quem mais cria</h2>
          {byCreator.length === 0 ? (
            <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
          ) : (
            <ul className="space-y-3">
              {byCreator.map((v) => (
                <li key={v.user_name}>
                  <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                    <span>{v.user_name}</span>
                    <span className="protocol-stamp text-xs text-(--color-graphite-500)">{v.cnt}</span>
                  </div>
                  <Bar value={v.cnt} max={maxCreatorCnt} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">Quem mais assume</h2>
          {byClaimer.length === 0 ? (
            <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
          ) : (
            <ul className="space-y-3">
              {byClaimer.map((v) => (
                <li key={v.user_name}>
                  <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                    <span>{v.user_name}</span>
                    <span className="protocol-stamp text-xs text-(--color-success)">{v.cnt}</span>
                  </div>
                  <Bar value={v.cnt} max={maxClaimerCnt} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
