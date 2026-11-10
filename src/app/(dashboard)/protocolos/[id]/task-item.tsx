"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { departmentBadgeClass } from "@/lib/department-colors";
import { NudgeTaskButton } from "@/components/NudgeTaskButton";
import { Avatar } from "@/components/Avatar";
import { CurrencyInput } from "@/components/CurrencyInput";
import { TaskNotesThread } from "@/components/TaskNotesThread";
import { AssignTaskControl } from "@/components/AssignTaskControl";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
  dispensada: "Dispensada",
};

// Tarefas do catálogo com essa expressão na descrição pedem, ao serem
// concluídas, os dados da venda substituta em vez de só marcar como feita.
function isReplacementSaleTask(description: string) {
  return description.toLowerCase().includes("venda substituta");
}

export function TaskItem({
  taskId,
  protocolId,
  department,
  description,
  status,
  dismissalReason,
  canAct: canActProp,
  claimedBy,
  claimedByName,
  claimedByAvatarUrl,
  claimedAt,
  completedByName,
  completedByAvatarUrl,
  completedAt,
  currentUserId,
  canOverride,
  canNudge,
  canAssign,
  assignedToUserId,
  assignedToJobTitleId,
  assignedToUserName,
  notes,
}: {
  taskId: string;
  protocolId?: string | null;
  department: string | null;
  description: string;
  status: string;
  dismissalReason: string | null;
  canAct: boolean;
  claimedBy: string | null;
  claimedByName: string | null;
  claimedByAvatarUrl?: string | null;
  claimedAt?: string | null;
  completedByName?: string | null;
  completedByAvatarUrl?: string | null;
  completedAt?: string | null;
  currentUserId: string | null;
  canOverride: boolean;
  /** Quem tem permissão de administração de tarefas pode alertar o
   * usuário que assumiu, ou o setor, direto pela tarefa. */
  canNudge?: boolean;
  /** Pode direcionar tarefas a uma pessoa (permissão "Direcionar tarefas",
   * administrador ou gerência geral). */
  canAssign?: boolean;
  /** Tarefa avulsa direcionada a uma pessoa ou função específica (usado
   * pelo botão de alerta quando ainda não foi assumida). */
  assignedToUserId?: string | null;
  assignedToJobTitleId?: string | null;
  /** Nome de quem recebeu o direcionamento (para a etiqueta "Direcionada a"). */
  assignedToUserName?: string | null;
  notes?: string | null;
}) {
  const router = useRouter();
  const [showDismissForm, setShowDismissForm] = useState(false);
  const [showReplacementForm, setShowReplacementForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeNotes, setCompleteNotes] = useState("");
  const [replacementSaleNumber, setReplacementSaleNumber] = useState("");
  const [replacementSaleDate, setReplacementSaleDate] = useState("");
  const [replacementAmount, setReplacementAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);



  const needsReplacementSaleData = isReplacementSaleTask(description);

  // Tarefa de setor direcionada a uma pessoa: só ela (ou quem direciona
  // tarefas / a administração) age — o setor continua vendo. É o mesmo que
  // o banco exige; aqui só evita mostrar botão que daria erro.
  const iAmAssignee = assignedToUserId != null && assignedToUserId === currentUserId;
  const directedToOther = Boolean(department && assignedToUserId && assignedToUserId !== currentUserId);
  const canAct = (canActProp || iAmAssignee) && (!directedToOther || canOverride || Boolean(canAssign));

  const isClaimedByMe = claimedBy !== null && claimedBy === currentUserId;
  const isClaimedByOther = claimedBy !== null && claimedBy !== currentUserId;
  // Só quem assumiu (ou a gerência) pode concluir/dispensar quando a
  // tarefa está com dono; sem dono, qualquer um do setor pode agir.
  const canResolve = canAct && (claimedBy === null || isClaimedByMe || canOverride);
  const canClaim = canAct && claimedBy === null;
  const canRelease = claimedBy !== null && (isClaimedByMe || canOverride);

  async function handleClaim() {
    setError(null);
    setSubmitting("claim");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("claim_task", { p_task_id: taskId });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível assumir a tarefa agora.");
      return;
    }
    router.refresh();
  }

  async function handleRelease() {
    setError(null);
    setSubmitting("release");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("release_task", { p_task_id: taskId });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível liberar a tarefa agora.");
      return;
    }
    router.refresh();
  }

  async function handleComplete() {
    if (needsReplacementSaleData) {
      setError(null);
      setShowReplacementForm(true);
      return;
    }
    if (!showCompleteForm) {
      setError(null);
      setShowCompleteForm(true);
      return;
    }
    setError(null);
    setSubmitting("complete");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("complete_task", {
      p_task_id: taskId,
      p_notes: completeNotes.trim() || null,
    });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível concluir a tarefa agora.");
      return;
    }
    setShowCompleteForm(false);
    setCompleteNotes("");
    router.refresh();
  }

  async function handleRegisterReplacementSale() {
    if (!replacementSaleNumber.trim() || !replacementSaleDate || !replacementAmount) {
      setError("Preencha número, data e valor da venda substituta.");
      return;
    }
    if (!protocolId) {
      setError("Esta tarefa não está vinculada a um protocolo.");
      return;
    }
    setError(null);
    setSubmitting("replacement");
    const supabase = createClient();
    // register_replacement_sale já conclui automaticamente a tarefa de
    // vendas pendente deste protocolo depois de gravar a venda.
    const { error: rpcError } = await supabase.rpc("register_replacement_sale", {
      p_protocol_id: protocolId,
      p_sale_number: replacementSaleNumber.trim(),
      p_sale_date: replacementSaleDate,
      p_total_amount: replacementAmount,
    });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível registrar a venda substituta agora.");
      return;
    }
    setShowReplacementForm(false);
    router.refresh();
  }

  async function handleDismiss() {
    if (!reason.trim()) {
      setError("Informe o motivo da dispensa.");
      return;
    }
    setError(null);
    setSubmitting("dismiss");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("dismiss_task", {
      p_task_id: taskId,
      p_reason: reason.trim(),
    });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível dispensar a tarefa agora.");
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        status === "pendente"
          ? "border-emerald-200 bg-emerald-50"
          : status === "concluida" || status === "dispensada"
            ? "border-sky-200 bg-sky-50"
            : "border-(--color-gray-200) bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {department && (
            <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${departmentBadgeClass(department)}`}>
              {DEPARTMENT_LABELS[department as TaskDepartment] ?? department}
            </span>
          )}
          <span className="text-sm font-semibold text-(--color-graphite-700)">
            {description}
          </span>
        </div>
        <span
          className={`text-xs font-medium ${
            status === "concluida"
              ? "text-(--color-success)"
              : status === "dispensada"
                ? "text-(--color-graphite-500)"
                : "text-(--color-warning)"
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {status === "dispensada" && dismissalReason && (
        <p className="mt-1 text-xs text-(--color-graphite-500)">
          Motivo: {dismissalReason}
        </p>
      )}

      {claimedByName && status !== "concluida" && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-(--color-graphite-500)">
          {status === "pendente" ? "Em andamento por " : "Assumida por "}
          {!isClaimedByMe && <Avatar url={claimedByAvatarUrl} name={claimedByName} size={16} />}
          <span className="font-medium text-(--color-graphite-700)">
            {isClaimedByMe ? "você" : claimedByName}
          </span>
          {claimedAt && (
            <span>em {new Date(claimedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
          )}
        </p>
      )}

      {status === "concluida" && (completedByName || claimedByName) && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-(--color-success)">
          Concluída por{" "}
          <Avatar
            url={completedByAvatarUrl ?? claimedByAvatarUrl}
            name={completedByName ?? claimedByName ?? "?"}
            size={16}
          />
          <span className="font-medium">
            {completedByName ?? claimedByName}
          </span>
          {completedAt && (
            <span className="text-(--color-graphite-500)">
              em {new Date(completedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </span>
          )}
        </p>
      )}

      {(assignedToUserName || (status === "pendente" && canAssign)) && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--color-graphite-500)">
          {assignedToUserName && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700">
              Direcionada a {iAmAssignee ? "você" : assignedToUserName}
            </span>
          )}
          {status === "pendente" && canAssign && (
            <AssignTaskControl
              taskId={taskId}
              assignedToUserId={assignedToUserId ?? null}
              canRemove={Boolean(department || assignedToJobTitleId)}
            />
          )}
        </div>
      )}

      {status === "pendente" && (canAct || canOverride || canNudge) && (
        <div className="mt-2">
          {error && (
            <p className="mb-2 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
              {error}
            </p>
          )}

          {showReplacementForm ? (
            <div className="rounded-md bg-(--color-gray-50) p-3">
              <p className="mb-2 text-xs font-medium text-(--color-graphite-700)">Venda substituta</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Número da venda</label>
                  <input
                    value={replacementSaleNumber}
                    onChange={(e) => setReplacementSaleNumber(e.target.value)}
                    className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Data</label>
                  <input
                    type="date"
                    value={replacementSaleDate}
                    onChange={(e) => setReplacementSaleDate(e.target.value)}
                    className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Valor (R$)</label>
                  <CurrencyInput
                    value={replacementAmount}
                    onChange={setReplacementAmount}
                    className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleRegisterReplacementSale}
                  disabled={submitting !== null}
                  className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
                >
                  {submitting === "replacement" ? "Registrando..." : "Registrar"}
                </button>
                <button
                  onClick={() => setShowReplacementForm(false)}
                  disabled={submitting !== null}
                  className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : showCompleteForm ? (
            <div className="rounded-md bg-(--color-gray-50) p-3">
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                Observação (opcional)
              </label>
              <textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                rows={2}
                placeholder="Algo que valha registrar sobre essa conclusão..."
                className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleComplete}
                  disabled={submitting !== null}
                  className="rounded-md bg-(--color-graphite-900) px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {submitting === "complete" ? "Concluindo..." : "Confirmar conclusão"}
                </button>
                <button
                  onClick={() => {
                    setShowCompleteForm(false);
                    setCompleteNotes("");
                  }}
                  disabled={submitting !== null}
                  className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : !showDismissForm ? (
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
              {canClaim && (
                <button
                  onClick={handleClaim}
                  disabled={submitting !== null}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting === "claim" ? "Assumindo..." : "Assumir tarefa"}
                </button>
              )}

              {canResolve && (
                <button
                  onClick={handleComplete}
                  disabled={submitting !== null}
                  className="rounded-md bg-(--color-graphite-900) px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {submitting === "complete" ? "Concluindo..." : "Concluir"}
                </button>
              )}

              {canResolve && (
                <button
                  onClick={() => setShowDismissForm(true)}
                  disabled={submitting !== null}
                  className="rounded-md border border-(--color-gray-200) px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)"
                >
                  Dispensar
                </button>
              )}

              {canRelease && (
                <button
                  onClick={handleRelease}
                  disabled={submitting !== null}
                  className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60"
                >
                  {submitting === "release" ? "Liberando..." : "Liberar"}
                </button>
              )}

              {isClaimedByOther && !canOverride && (
                <p className="text-xs text-(--color-graphite-500)">
                  Assumida por {claimedByName ?? "outra pessoa"} — só ela pode
                  concluir ou dispensar.
                </p>
              )}

              {canNudge && currentUserId && (
                <NudgeTaskButton
                  department={department}
                  description={description}
                  claimedBy={claimedBy}
                  claimedByName={claimedByName}
                  assignedToUserId={assignedToUserId}
                  assignedToJobTitleId={assignedToJobTitleId}
                  senderId={currentUserId}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo da dispensa"
                className="min-w-[220px] flex-1 rounded-md border border-(--color-gray-200) px-2 py-1 text-xs outline-none focus:border-(--color-red-600)"
              />
              <button
                onClick={handleDismiss}
                disabled={submitting !== null}
                className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
              >
                {submitting === "dismiss" ? "Enviando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setShowDismissForm(false)}
                disabled={submitting !== null}
                className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <TaskNotesThread
        taskId={taskId}
        currentUserId={currentUserId}
        canOverride={canOverride}
        canComment={Boolean(canAct || canOverride || isClaimedByMe)}
      />
    </div>
  );
}
