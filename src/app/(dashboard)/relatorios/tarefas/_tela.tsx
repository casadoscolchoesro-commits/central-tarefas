"use client";
import { irParaLogin } from "@/lib/wghub";
import { redirect } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { Bar, DateFilterForm, BackToReportsLink, DownloadPdfButton, parseDateRange, KpiCard, AlertBanner, HighlightBanner } from "../_shared";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";

type OverdueByDept = { department: string; overdue_cnt: number };
type TasksByDept = { department: string; cnt: number };
type DismissalRateByDept = {
  department: string;
  completed_cnt: number;
  dismissed_cnt: number;
  dismissal_rate: number | null;
};

async function TarefasReportPage({
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

  const [{ data: overdueByDept }, { data: tasksByDept }, { data: dismissalRateByDept }] =
    await Promise.all([
      supabase.rpc("report_overdue_tasks_by_department"),
      supabase.rpc("report_tasks_completed_by_department", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_dismissal_rate_by_department", { p_from: fromIso, p_to: toIso }),
    ]);

  const oDept = (overdueByDept ?? []) as OverdueByDept[];
  const tByDept = (tasksByDept ?? []) as TasksByDept[];
  const dRateByDept = (dismissalRateByDept ?? []) as DismissalRateByDept[];
  const maxOverdue = Math.max(...oDept.map((v) => v.overdue_cnt), 0);
  const maxTasksByDept = Math.max(...tByDept.map((v) => v.cnt), 0);

  const totalOverdue = oDept.reduce((sum, v) => sum + v.overdue_cnt, 0);
  const totalCompleted = tByDept.reduce((sum, v) => sum + v.cnt, 0);
  const worstOverdue = [...oDept].sort((a, b) => b.overdue_cnt - a.overdue_cnt)[0];
  const worstDismissal = [...dRateByDept]
    .filter((v) => v.dismissal_rate != null)
    .sort((a, b) => (b.dismissal_rate ?? 0) - (a.dismissal_rate ?? 0))[0];
  const topCompleted = [...tByDept].sort((a, b) => b.cnt - a.cnt)[0];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">Tarefas</h1>
          <p className="text-sm text-(--color-graphite-500)">
            Atraso, conclusão e taxa de dispensa por setor.
          </p>
        </div>
        <DownloadPdfButton type="tarefas" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/tarefas" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Em atraso agora"
          value={String(totalOverdue)}
          hint="Tarefas pendentes vencidas"
          variant={totalOverdue > 0 ? "bad" : "good"}
        />
        <KpiCard label="Concluídas no período" value={String(totalCompleted)} />
        <KpiCard
          label="Setor mais atrasado"
          value={worstOverdue ? (DEPARTMENT_LABELS[worstOverdue.department as TaskDepartment] ?? worstOverdue.department) : "—"}
          hint={worstOverdue ? `${worstOverdue.overdue_cnt} em atraso` : undefined}
          variant={worstOverdue ? "bad" : "neutral"}
        />
        <KpiCard
          label="Setor que mais conclui"
          value={topCompleted ? (DEPARTMENT_LABELS[topCompleted.department as TaskDepartment] ?? topCompleted.department) : "—"}
          hint={topCompleted ? `${topCompleted.cnt} concluídas` : undefined}
          variant={topCompleted ? "good" : "neutral"}
        />
      </div>

      {worstDismissal && worstDismissal.dismissal_rate != null && worstDismissal.dismissal_rate >= 30 && (
        <AlertBanner>
          <strong>{DEPARTMENT_LABELS[worstDismissal.department as TaskDepartment] ?? worstDismissal.department}</strong>{" "}
          dispensa {worstDismissal.dismissal_rate}% das tarefas em vez de concluir — vale entender
          o motivo mais comum.
        </AlertBanner>
      )}

      {topCompleted && (
        <HighlightBanner>
          <strong>{DEPARTMENT_LABELS[topCompleted.department as TaskDepartment] ?? topCompleted.department}</strong>{" "}
          foi o setor que mais concluiu tarefas no período, com {topCompleted.cnt}.
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
          Tarefas em atraso por setor
        </h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Situação atual — tarefas pendentes de protocolos cujo prazo já passou.
        </p>
        {oDept.length === 0 ? (
          <p className="text-sm text-(--color-success)">Nenhuma tarefa em atraso no momento.</p>
        ) : (
          <ul className="space-y-3">
            {oDept.map((v) => (
              <li key={v.department}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{DEPARTMENT_LABELS[v.department as TaskDepartment] ?? v.department}</span>
                  <span className="protocol-stamp text-xs text-(--color-red-600)">{v.overdue_cnt}</span>
                </div>
                <Bar value={v.overdue_cnt} max={maxOverdue} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
          Tarefas concluídas por setor
        </h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Volume de tarefas resolvidas por cada setor no período.
        </p>
        {tByDept.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <ul className="space-y-3">
            {tByDept.map((v) => (
              <li key={v.department}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{DEPARTMENT_LABELS[v.department as TaskDepartment] ?? v.department}</span>
                  <span className="protocol-stamp text-xs text-(--color-success)">{v.cnt}</span>
                </div>
                <Bar value={v.cnt} max={maxTasksByDept} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
          Taxa de dispensa por setor
        </h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Entre as tarefas criadas no período já resolvidas, quantas foram dispensadas em vez de
          concluídas.
        </p>
        {dRateByDept.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <ul className="space-y-3">
            {dRateByDept.map((v) => (
              <li key={v.department}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{DEPARTMENT_LABELS[v.department as TaskDepartment] ?? v.department}</span>
                  <span className="protocol-stamp text-xs text-(--color-graphite-700)">
                    {v.dismissal_rate != null ? `${v.dismissal_rate}%` : "—"}
                    <span className="ml-1 text-(--color-graphite-500)">
                      ({v.dismissed_cnt}/{v.completed_cnt + v.dismissed_cnt})
                    </span>
                  </span>
                </div>
                <Bar value={v.dismissal_rate ?? 0} max={100} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={TarefasReportPage} rota="/relatorios/tarefas">{props.children}</__TelaCliente>;
}
