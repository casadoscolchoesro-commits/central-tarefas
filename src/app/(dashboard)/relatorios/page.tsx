import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import {
  IconInbox,
  IconWallet,
  IconHourglass,
  IconAlertTriangle,
  IconTicket,
  IconBuilding,
  IconCheckShield,
  IconUsers,
  IconCart,
} from "@/lib/protocol-icons";
import { parseDateRange, formatMoney } from "./_shared";

type Summary = {
  total_protocols: number;
  total_financial_impact: number;
  avg_resolution_days: number | null;
  overdue_tasks: number;
};

const CARDS = [
  {
    href: "/relatorios/volume",
    label: "Volume de protocolos",
    description: "Quantidade de protocolos por tipo e por motivo.",
    Icon: IconTicket,
  },
  {
    href: "/relatorios/financeiro",
    label: "Financeiro",
    description: "Impacto financeiro de estornos e vouchers por mês.",
    Icon: IconWallet,
  },
  {
    href: "/relatorios/filiais",
    label: "Desempenho por filial",
    description: "Quem mais cancela ou troca, e motivos por loja.",
    Icon: IconBuilding,
  },
  {
    href: "/relatorios/tempo-resolucao",
    label: "Tempo de resolução",
    description: "Tempo médio entre abertura e conclusão, por tipo e por usuário.",
    Icon: IconHourglass,
  },
  {
    href: "/relatorios/tarefas",
    label: "Tarefas",
    description: "Atraso, conclusão e taxa de dispensa por setor.",
    Icon: IconCheckShield,
  },
  {
    href: "/relatorios/prazos",
    label: "Cumprimento de prazo",
    description: "Protocolos, tarefas e solicitações ao Compras dentro ou fora do prazo.",
    Icon: IconHourglass,
  },
  {
    href: "/relatorios/compras",
    label: "Solicitações ao Compras",
    description: "Volume, tempo de resposta e quem mais responde.",
    Icon: IconCart,
  },
  {
    href: "/relatorios/tarefas-avulsas",
    label: "Tarefas avulsas",
    description: "Quem mais cria, quem mais assume, e a taxa de dispensa.",
    Icon: IconCheckShield,
  },
  {
    href: "/relatorios/diferenca-credito",
    label: "Diferença paga e crédito cliente",
    description: "Quanto o cliente pagou a mais em trocas, e quanto virou crédito na loja.",
    Icon: IconWallet,
  },
  {
    href: "/relatorios/produtividade",
    label: "Produtividade por pessoa",
    description: "Protocolos, tarefas e solicitações, tudo numa visão só por pessoa.",
    Icon: IconUsers,
  },
  {
    href: "/relatorios/usuarios",
    label: "Desempenho por usuário",
    description: "Protocolos, tipos, motivos e tarefas concluídas por pessoa.",
    Icon: IconUsers,
  },
];

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { data: canView } = await supabase.rpc("has_report_access", {
    p_user_id: user.id,
  });
  if (!canView) redirect("/");

  const { fromIso, toIso } = parseDateRange(params);
  const { data: summary } = await supabase.rpc("report_summary", {
    p_from: fromIso,
    p_to: toIso,
  });
  const s: Summary = (summary?.[0] as Summary) ?? {
    total_protocols: 0,
    total_financial_impact: 0,
    avg_resolution_days: null,
    overdue_tasks: 0,
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">Relatórios</h1>
        <p className="text-sm text-(--color-graphite-500)">
          Escolha o relatório que você quer ver. Últimos 30 dias por padrão — cada tela tem seu
          próprio filtro de período.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex items-start gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-gray-100) text-(--color-red-600)">
            <IconInbox className="h-4.5 w-4.5" />
          </span>
          <span>
            <p className="text-sm text-(--color-graphite-500)">Protocolos (30d)</p>
            <p className="mt-1 text-2xl font-medium text-(--color-graphite-900)">
              {s.total_protocols}
            </p>
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-gray-100) text-(--color-red-600)">
            <IconWallet className="h-4.5 w-4.5" />
          </span>
          <span>
            <p className="text-sm text-(--color-graphite-500)">Impacto financeiro (30d)</p>
            <p className="mt-1 text-2xl font-medium text-(--color-graphite-900)">
              R$ {formatMoney(s.total_financial_impact ?? 0)}
            </p>
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-gray-100) text-(--color-red-600)">
            <IconHourglass className="h-4.5 w-4.5" />
          </span>
          <span>
            <p className="text-sm text-(--color-graphite-500)">Tempo médio (30d)</p>
            <p className="mt-1 text-2xl font-medium text-(--color-graphite-900)">
              {s.avg_resolution_days != null ? `${s.avg_resolution_days} dias` : "—"}
            </p>
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-red-50) text-(--color-warning)">
            <IconAlertTriangle className="h-4.5 w-4.5" />
          </span>
          <span>
            <p className="text-sm text-(--color-graphite-500)">Tarefas em atraso agora</p>
            <p className="mt-1 text-2xl font-medium text-(--color-graphite-900)">
              {s.overdue_tasks}
            </p>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-start gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4 hover:border-(--color-red-600)"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-gray-100) text-(--color-red-600)">
              <card.Icon className="h-4.5 w-4.5" />
            </span>
            <span>
              <p className="text-sm font-medium text-(--color-graphite-900)">{card.label}</p>
              <p className="mt-0.5 text-xs text-(--color-graphite-500)">{card.description}</p>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
