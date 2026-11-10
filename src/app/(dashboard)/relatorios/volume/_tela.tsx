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
  HighlightBanner,
} from "../_shared";

type VolumeByType = { type_name: string; type_code: string; cnt: number };
type VolumeByReason = { reason_name: string; cnt: number };

async function VolumeReportPage({
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

  const [{ data: volumeByType }, { data: volumeByReason }] = await Promise.all([
    supabase.rpc("report_volume_by_type", { p_from: fromIso, p_to: toIso }),
    supabase.rpc("report_volume_by_reason", { p_from: fromIso, p_to: toIso }),
  ]);

  const vType = (volumeByType ?? []) as VolumeByType[];
  const vReason = (volumeByReason ?? []) as VolumeByReason[];
  const maxTypeCnt = Math.max(...vType.map((v) => v.cnt), 0);
  const maxReasonCnt = Math.max(...vReason.map((v) => v.cnt), 0);

  const totalCnt = vType.reduce((sum, v) => sum + v.cnt, 0);
  const topType = [...vType].sort((a, b) => b.cnt - a.cnt)[0];
  const topReason = [...vReason].sort((a, b) => b.cnt - a.cnt)[0];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToReportsLink />
          <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
            Volume de protocolos
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Quantidade de protocolos por tipo e motivo no período.
          </p>
        </div>
        <DownloadPdfButton type="volume" fromStr={fromStr} toStr={toStr} />
      </div>

      <DateFilterForm basePath="/relatorios/volume" fromStr={fromStr} toStr={toStr} today={today} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total no período" value={String(totalCnt)} hint="Protocolos abertos" />
        <KpiCard
          label="Tipo mais comum"
          value={topType?.type_name ?? "—"}
          hint={topType ? `${topType.cnt} protocolos` : undefined}
        />
        <KpiCard
          label="Motivo mais comum"
          value={topReason?.reason_name ?? "—"}
          hint={topReason ? `${topReason.cnt} protocolos` : undefined}
        />
      </div>

      {topType && (
        <HighlightBanner>
          <strong>{topType.type_name}</strong> foi o tipo mais aberto no período
          {topReason && (
            <>
              {" "}
              — e o motivo mais frequente foi <strong>{topReason.reason_name}</strong>
            </>
          )}
          .
        </HighlightBanner>
      )}

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">
          Volume de protocolos por tipo
        </h2>
        {vType.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Nenhum protocolo no período selecionado.</p>
        ) : (
          <ul className="space-y-3">
            {vType.map((v) => (
              <li key={v.type_code}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{v.type_name}</span>
                  <span className="protocol-stamp text-xs text-(--color-graphite-500)">{v.cnt}</span>
                </div>
                <Bar value={v.cnt} max={maxTypeCnt} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">Top motivos</h2>
        {vReason.length === 0 ? (
          <p className="text-sm text-(--color-graphite-500)">Sem dados no período.</p>
        ) : (
          <ul className="space-y-3">
            {vReason.map((v) => (
              <li key={v.reason_name}>
                <div className="mb-1 flex items-center justify-between text-sm text-(--color-graphite-700)">
                  <span>{v.reason_name}</span>
                  <span className="protocol-stamp text-xs text-(--color-graphite-500)">{v.cnt}</span>
                </div>
                <Bar value={v.cnt} max={maxReasonCnt} />
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
  return <__TelaCliente render={VolumeReportPage} rota="/relatorios/volume">{props.children}</__TelaCliente>;
}
