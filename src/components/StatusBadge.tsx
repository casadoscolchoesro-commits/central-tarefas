import { StatusIcon } from "@/lib/protocol-icons";

export const PROTOCOL_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  em_execucao: "Em execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const EXTRA_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
  dispensada: "Dispensada",
};

const STATUS_TONE_CLASSES: Record<string, string> = {
  aberto: "bg-(--color-gray-100) text-(--color-graphite-700)",
  em_analise: "bg-(--color-red-50) text-(--color-warning)",
  em_execucao: "bg-(--color-red-50) text-(--color-warning)",
  concluido: "bg-(--color-gray-100) text-(--color-success)",
  cancelado: "bg-(--color-gray-100) text-(--color-graphite-500)",
  pendente: "bg-(--color-red-50) text-(--color-warning)",
  concluida: "bg-(--color-gray-100) text-(--color-success)",
  dispensada: "bg-(--color-gray-100) text-(--color-graphite-500)",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_TONE_CLASSES[status] ?? "bg-(--color-gray-100) text-(--color-graphite-700)"
      }`}
    >
      <StatusIcon status={status} />
      {PROTOCOL_STATUS_LABELS[status] ?? EXTRA_STATUS_LABELS[status] ?? status}
    </span>
  );
}
