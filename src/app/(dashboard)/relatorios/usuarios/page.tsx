import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { Bar, DateFilterForm, BackToReportsLink, DownloadPdfButton, parseDateRange, KpiCard, HighlightBanner } from "../_shared";

type ProtocolsByUser = { user_name: string; cnt: number };
type ByUserBreakdown = { user_name: string; type_name?: string; reason_name?: string; cnt: number };
type TasksByUser = { user_name: string; cnt: number };

export default async function UsuariosReportPage({
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

  const [
    { data: protocolsByUser },
    { data: protocolsByUserType },
    { data: protocolsByUserReason },
    { data: tasksByUser },
  ] = await Promise.all([
    supabase.rpc("report_protocols_by_user", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_protocols_by_user_type", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_protocols_by_user_reason", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_tasks_completed_by_user", { p_from: fromIso, p_to: toIso }),
  ]);

  const pByUser = (protocolsByUser ?? []) as ProtocolsByUser[];
  const pByUserType = (protocolsByUserType ?? []) as ByUserBreakdown[];
  const pByUserReason = (protocolsByUserReason ?? []) as ByUserBreakdown[];
  const tByUser = (tasksByUser ?? []) as TasksByUser[];
  const maxUserCnt = Math.max(...pByUser.map((v) => v.cnt), 0);
  const maxTasksByUser = Math.max(...tByUser.map((v) => v.cnt), 0);

  const topOpener = [...pByUser].sort((a, b) => b.cnt - a.cnt)[0];
  const topResolver = [...tByUser].sort((a, b) => b.cnt - a.cnt)[0];
  const totalProtocols = pByUser.reduce((sum, v) => sum + v.cnt, 0);
  const totalTasksResolved = tByUser.reduce((sum, v) => sum + v.cnt, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Desempenho por usuário
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Quantos protocolos cada pessoa abre, com quais tipos e motivos, e quantas tarefas
            resolve.
          </p>
        </div>
        <DownloadPdfButton type="usuarios" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/usuarios" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de protocolos" value={String(totalProtocols)} hint="Abertos no período" />
        <KpiCard label="Tarefas resolvidas" value={String(totalTasksResolved)} hint="Concluídas no período" />
        <KpiCard
          label="Quem mais abre protocolo"
          value={topOpener?.user_name ?? "—"}
          hint={topOpener ? `${topOpener.cnt} protocolos` : undefined}
        />
        <KpiCard
          label="Quem mais resolve tarefa"
          value={topResolver?.user_name ?? "—"}
          hint={topResolver ? `${topResolver.cnt} tarefas` : undefined}
          variant={topResolver ? "good" : "neutral"}
        />
      </div>

      {topResolver && (
        <HighlightBanner>
          <strong>{topResolver.user_name}</strong> foi quem mais resolveu tarefas no período, com{" "}
          {topResolver.cnt}.
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
          Protocolos por usuário
        </h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Quantidade de protocolos abertos por cada pessoa no período.
        </p>
        {pByUser.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) text-left text-xs text-(--color-graphite-500)">
                <th className="py-2 font-medium">Usuário</th>
                <th className="py-2 font-medium">Protocolos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {pByUser.map((v) => (
                <tr key={v.user_name}>
                  <td className="py-2 text-(--color-graphite-700)">{v.user_name}</td>
                  <td className="w-1/2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 shrink-0 protocol-stamp text-xs text-(--color-graphite-700)">
                        {v.cnt}
                      </span>
                      <Bar value={v.cnt} max={maxUserCnt} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
            Tipo de protocolo por usuário
          </h2>
          <p className="mb-4 text-xs text-(--color-graphite-500)">
            Combinações mais frequentes no período (até 50).
          </p>
          {pByUserType.length === 0 ? (
            <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-(--color-gray-100) overflow-y-auto">
              {pByUserType.map((v, i) => (
                <li
                  key={`${v.user_name}-${v.type_name}-${i}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-(--color-graphite-700)">
                    {v.user_name}
                    <span className="text-(--color-graphite-500)"> — {v.type_name}</span>
                  </span>
                  <span className="protocol-stamp shrink-0 text-xs text-(--color-graphite-700)">
                    {v.cnt}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
          <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
            Motivos por usuário
          </h2>
          <p className="mb-4 text-xs text-(--color-graphite-500)">
            Combinações mais frequentes no período (até 50).
          </p>
          {pByUserReason.length === 0 ? (
            <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-(--color-gray-100) overflow-y-auto">
              {pByUserReason.map((v, i) => (
                <li
                  key={`${v.user_name}-${v.reason_name}-${i}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-(--color-graphite-700)">
                    {v.user_name}
                    <span className="text-(--color-graphite-500)"> — {v.reason_name}</span>
                  </span>
                  <span className="protocol-stamp shrink-0 text-xs text-(--color-graphite-700)">
                    {v.cnt}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
          Tarefas concluídas por usuário
        </h2>
        <p className="mb-4 text-xs text-(--color-graphite-500)">
          Quem mais resolveu tarefas no período.
        </p>
        {tByUser.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <ul className="space-y-3">
            {tByUser.map((v) => (
              <li key={v.user_name}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{v.user_name}</span>
                  <span className="protocol-stamp text-xs text-(--color-success)">{v.cnt}</span>
                </div>
                <Bar value={v.cnt} max={maxTasksByUser} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
