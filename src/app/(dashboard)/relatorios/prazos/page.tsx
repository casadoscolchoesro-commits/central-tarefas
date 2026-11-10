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

type Summary = { category: string; total: number; on_time: number; late: number; pct_on_time: number | null };
type ByDept = { department: string; total: number; late: number; pct_on_time: number };
type Overdue = { kind: string; label: string; hours_late: number };

const DEPARTMENT_LABELS: Record<string, string> = {
  fiscal: "Fiscal",
  financeiro: "Financeiro",
  logistica: "Logística",
  estoque: "Estoque",
  sac: "SAC",
  vendas: "Vendas",
  gerencia: "Gerência",
  compras: "Compras",
};

export default async function DeadlineReportPage({
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

  const [{ data: summaryData }, { data: byDeptData }, { data: overdueData }] = await Promise.all([
    supabase.rpc("report_deadline_summary", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_deadline_by_department", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_currently_overdue", { p_limit: 15 }),
  ]);

  const summary = (summaryData ?? []) as Summary[];
  const byDept = (byDeptData ?? []) as ByDept[];
  const overdue = (overdueData ?? []) as Overdue[];

  const protocolos = summary.find((s) => s.category === "Protocolos");
  const tarefas = summary.find((s) => s.category === "Tarefas");
  const compras = summary.find((s) => s.category === "Solicitações ao Compras");

  const totalLateNow = overdue.length;
  const worst = [...summary]
    .filter((s) => s.pct_on_time != null && s.total > 0)
    .sort((a, b) => (a.pct_on_time ?? 100) - (b.pct_on_time ?? 100))[0];
  const best = [...summary]
    .filter((s) => s.pct_on_time != null && s.total > 0)
    .sort((a, b) => (b.pct_on_time ?? 0) - (a.pct_on_time ?? 0))[0];

  const maxByDept = Math.max(...byDept.map((d) => d.total), 0);

  function pctVariant(pct: number | null | undefined): "good" | "bad" | "neutral" {
    if (pct == null) return "neutral";
    if (pct >= 85) return "good";
    if (pct < 60) return "bad";
    return "neutral";
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Cumprimento de prazo
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Protocolos, tarefas e solicitações ao Compras dentro ou fora do prazo configurado.
          </p>
        </div>
        <DownloadPdfButton type="prazos" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/prazos" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Protocolos no prazo"
          value={protocolos?.pct_on_time != null ? `${protocolos.pct_on_time}%` : "—"}
          hint={protocolos ? `${protocolos.on_time} de ${protocolos.total} no período` : undefined}
          variant={pctVariant(protocolos?.pct_on_time)}
        />
        <KpiCard
          label="Tarefas no prazo"
          value={tarefas?.pct_on_time != null ? `${tarefas.pct_on_time}%` : "—"}
          hint={tarefas ? `${tarefas.on_time} de ${tarefas.total} no período` : undefined}
          variant={pctVariant(tarefas?.pct_on_time)}
        />
        <KpiCard
          label="Compras no prazo"
          value={compras?.pct_on_time != null ? `${compras.pct_on_time}%` : "—"}
          hint={compras ? `${compras.on_time} de ${compras.total} no período` : undefined}
          variant={pctVariant(compras?.pct_on_time)}
        />
        <KpiCard
          label="Atrasados agora"
          value={String(totalLateNow)}
          hint="Em aberto e já vencidos, neste momento"
          variant={totalLateNow > 0 ? "bad" : "good"}
        />
      </div>

      {worst && worst.pct_on_time != null && worst.pct_on_time < 70 && (
        <AlertBanner>
          Atenção: <strong>{worst.category}</strong> está com só {worst.pct_on_time}% dentro do
          prazo no período ({worst.late} de {worst.total} atrasados). Vale revisar o prazo
          configurado ou a carga de trabalho desse grupo.
        </AlertBanner>
      )}

      {best && best.pct_on_time != null && (
        <HighlightBanner>
          <strong>{best.category}</strong> é o destaque do período, com {best.pct_on_time}% dentro
          do prazo.
        </HighlightBanner>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Tarefas por setor</h2>
          <p className="mb-4 text-xs text-(--color-graphite-500)">
            Volume e % dentro do prazo, por setor, no período.
          </p>
          {byDept.length === 0 ? (
            <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
          ) : (
            <ul className="space-y-3">
              {byDept.map((d) => (
                <li key={d.department}>
                  <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                    <span>{DEPARTMENT_LABELS[d.department] ?? d.department}</span>
                    <span className="flex items-center gap-2 text-xs text-(--color-graphite-500)">
                      <span className="protocol-stamp">{d.total}</span>
                      <span
                        className={
                          d.pct_on_time >= 85
                            ? "font-medium text-emerald-700"
                            : d.pct_on_time < 60
                              ? "font-medium text-(--color-red-600)"
                              : ""
                        }
                      >
                        {d.pct_on_time}% no prazo
                      </span>
                    </span>
                  </div>
                  <Bar value={d.total} max={maxByDept} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
            Mais atrasados agora
          </h2>
          <p className="mb-4 text-xs text-(--color-graphite-500)">
            Itens em aberto que já passaram do prazo, dos três tipos, ordenados pelo mais atrasado.
          </p>
          {overdue.length === 0 ? (
            <p className="text-sm text-(--color-graphite-500)">Nada atrasado agora. 🎉</p>
          ) : (
            <ul className="divide-y divide-(--color-gray-100)">
              {overdue.map((o, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 rounded-full bg-(--color-gray-100) px-2 py-0.5 text-xs text-(--color-graphite-700)">
                      {o.kind}
                    </span>
                    <span className="text-(--color-graphite-700)">{o.label}</span>
                  </div>
                  <span className="shrink-0 protocol-stamp text-xs font-medium text-(--color-red-600)">
                    {o.hours_late}h atrasado
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
