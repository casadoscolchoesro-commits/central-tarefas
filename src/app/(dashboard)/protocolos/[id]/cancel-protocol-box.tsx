"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { IconLock } from "@/lib/protocol-icons";

type TaskSummary = {
  id: string;
  department: string;
  description: string;
  status: string;
  completedByName: string | null;
  claimedByName: string | null;
};

export function CancelProtocolBox({
  protocolId,
  tasks,
  canCancelWithClaimedTasks,
}: {
  protocolId: string;
  tasks: TaskSummary[];
  canCancelWithClaimedTasks: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedTasks = tasks.filter((t) => t.status === "concluida");
  const pendingTasks = tasks.filter((t) => t.status === "pendente");
  const claimedTasks = pendingTasks.filter((t) => t.claimedByName);

  const blocked = claimedTasks.length > 0 && !canCancelWithClaimedTasks;

  async function handleConfirm() {
    if (!reason.trim()) { setError("Informe o motivo do cancelamento."); return; }
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("cancel_protocol", { p_protocol_id: protocolId, p_reason: reason.trim() });
    setSubmitting(false);
    if (rpcError) { setError(rpcError.message || "Não foi possível cancelar o protocolo agora."); return; }
    router.refresh();
  }

  if (blocked) {
    return (
      <section className="rounded-lg border border-(--color-red-100) bg-(--color-red-50) p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-(--color-graphite-900)">
          <IconLock className="h-4 w-4 text-(--color-red-600)" />
          Não é possível cancelar este protocolo
        </h2>
        <p className="mb-3 text-xs text-(--color-graphite-500)">
          As tarefas abaixo já foram assumidas por alguém. Só um usuário com permissão especial de cancelamento
          (configurada em Configurações → Permissões de cancelamento) pode cancelar neste caso.
        </p>
        <ul className="space-y-1 rounded-md bg-white p-3">
          {claimedTasks.map((t) => (
            <li key={t.id} className="text-xs text-(--color-graphite-700)">
              <span className="mr-1 rounded-full bg-(--color-gray-100) px-1.5 py-0.5 text-[10px] font-medium">
                {DEPARTMENT_LABELS[t.department as TaskDepartment] ?? t.department}
              </span>
              {t.description}
              <span className="text-(--color-graphite-500)"> — assumida por {t.claimedByName}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="shrink-0 rounded-md border border-(--color-gray-200) bg-white px-3 py-2 text-sm text-(--color-graphite-700) hover:border-(--color-red-600) hover:text-(--color-red-600)">
        Cancelar protocolo
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-(--color-red-100) bg-(--color-red-50) p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Cancelar este protocolo?</h2>
      <p className="mb-3 text-xs text-(--color-graphite-500)">Essa ação encerra o protocolo como cancelado e dispensa automaticamente todas as tarefas pendentes. Ela não pode ser desfeita — se precisar reabrir, será necessário abrir um novo protocolo.</p>

      {claimedTasks.length > 0 && (
        <div className="mb-3 rounded-md bg-white p-3">
          <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">Tarefas assumidas (você tem permissão especial):</p>
          <ul className="space-y-1">
            {claimedTasks.map((t) => (
              <li key={t.id} className="text-xs text-(--color-graphite-700)">
                <span className="mr-1 rounded-full bg-(--color-gray-100) px-1.5 py-0.5 text-[10px] font-medium">{DEPARTMENT_LABELS[t.department as TaskDepartment] ?? t.department}</span>
                {t.description}
                <span className="text-(--color-graphite-500)"> — assumida por {t.claimedByName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3 rounded-md bg-white p-3">
        <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">
          {completedTasks.length === 0 ? "Nenhuma tarefa foi concluída ainda." : `${completedTasks.length} tarefa(s) já foram concluídas:`}
        </p>
        {completedTasks.length > 0 && (
          <ul className="space-y-1">
            {completedTasks.map((t) => (
              <li key={t.id} className="text-xs text-(--color-graphite-700)">
                <span className="mr-1 rounded-full bg-(--color-gray-100) px-1.5 py-0.5 text-[10px] font-medium">{DEPARTMENT_LABELS[t.department as TaskDepartment] ?? t.department}</span>
                {t.description}
                {t.completedByName && (<span className="text-(--color-graphite-500)"> — concluída por {t.completedByName}</span>)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mb-3 rounded-md bg-white p-3 text-xs text-(--color-red-700)">
        {pendingTasks.length > 0
          ? `Este protocolo tem ${pendingTasks.length} tarefa(s) ainda pendente(s). Elas serão dispensadas automaticamente junto com o cancelamento — os setores envolvidos podem não ficar sabendo na hora.`
          : "Cancelar pode gerar falha de comunicação com os setores que já foram envolvidos neste protocolo."}
      </p>

      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motivo do cancelamento" className="mb-3 w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)" />

      {error && (<p className="mb-3 rounded-md bg-white px-3 py-2 text-sm text-(--color-red-700)">{error}</p>)}

      <div className="flex flex-wrap gap-2">
        <button onClick={handleConfirm} disabled={submitting} className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{submitting ? "Cancelando..." : "Confirmar cancelamento"}</button>
        <button onClick={() => { setOpen(false); setReason(""); setError(null); }} disabled={submitting} className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60">Voltar</button>
      </div>
    </section>
  );
}
