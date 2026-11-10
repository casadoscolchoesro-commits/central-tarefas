import Link from "next/link";
import {
  IconDocument,
  IconTag,
  IconCheckShield,
  IconLock,
  IconBuilding,
  IconGrid,
  IconUsers,
  IconCheckCircle,
  IconScope,
  IconChart,
  IconHourglass,
  IconImage,
} from "@/lib/protocol-icons";

type Card = {
  href: string;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const GROUPS: { title: string; cards: Card[] }[] = [
  {
    title: "Protocolos",
    cards: [
      {
        href: "/configuracoes/tipos",
        label: "Tipos de protocolo",
        description: "Tipos disponíveis na Nova Solicitação e as tarefas que cada um gera.",
        Icon: IconDocument,
      },
      {
        href: "/configuracoes/motivos",
        label: "Gerenciar motivos",
        description: "Motivos e submotivos usados na Nova Solicitação.",
        Icon: IconTag,
      },
      {
        href: "/configuracoes/escopos",
        label: "Gerenciar escopos",
        description: "Opções de escopo (Total, Parcial etc.) e a quais tipos elas se aplicam.",
        Icon: IconScope,
      },
    ],
  },
  {
    title: "Tarefas",
    cards: [
      {
        href: "/configuracoes/tarefas",
        label: "Gerenciar tarefas",
        description: "Catálogo de tarefas e quais respostas do formulário as disparam.",
        Icon: IconCheckShield,
      },
      {
        href: "/configuracoes/permissoes-tarefas",
        label: "Permissões de tarefas",
        description: "Quem pode criar tarefas avulsas e enviar cutucadas (nudges).",
        Icon: IconCheckShield,
      },
      {
        href: "/configuracoes/permissoes-cancelamento",
        label: "Permissões de cancelamento",
        description: "Quem pode cancelar um protocolo com tarefas já assumidas.",
        Icon: IconLock,
      },
      {
        href: "/configuracoes/prazos",
        label: "Prazos",
        description: "Prazo padrão de cada tipo de tarefa/solicitação, incluindo Compras.",
        Icon: IconHourglass,
      },
    ],
  },
  {
    title: "Relatórios",
    cards: [
      {
        href: "/configuracoes/permissoes-relatorios",
        label: "Permissões de relatórios",
        description: "Quem pode ver a tela de Relatórios/dashboards.",
        Icon: IconChart,
      },
    ],
  },
  {
    title: "Organização",
    cards: [
      {
        href: "/configuracoes/filiais",
        label: "Filiais",
        description: "Lojas cadastradas — identificadas automaticamente ao importar PDFs.",
        Icon: IconBuilding,
      },
      {
        href: "/configuracoes/setores",
        label: "Gerenciar setor",
        description: "Setores da empresa para referência organizacional.",
        Icon: IconGrid,
      },
      {
        href: "/configuracoes/funcoes",
        label: "Funções",
        description: "Cargos das pessoas e o que cada uma vê em Protocolos e Tarefas.",
        Icon: IconCheckCircle,
      },
    ],
  },
  {
    title: "Usuários e acesso",
    cards: [
      {
        href: "/configuracoes/usuarios",
        label: "Usuários",
        description: "Papéis, filial e função de cada usuário cadastrado.",
        Icon: IconUsers,
      },
    ],
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-[1600px] space-y-8">
      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">
          Configurações
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Escolha o que você quer gerenciar.
        </p>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-graphite-500)">
            {group.title}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.cards.map((card) => (
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
      ))}
    </div>
  );
}
