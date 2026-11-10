"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconAlertTriangle } from "@/lib/protocol-icons";

export function NudgeTaskButton({
  department,
  description,
  claimedBy,
  claimedByName,
  assignedToUserId,
  assignedToJobTitleId,
  senderId,
}: {
  department: string | null;
  description: string;
  claimedBy: string | null;
  claimedByName: string | null;
  /** Tarefa avulsa direcionada direto a uma pessoa (ainda não assumida). */
  assignedToUserId?: string | null;
  /** Tarefa avulsa direcionada a uma função (ainda não assumida). */
  assignedToJobTitleId?: string | null;
  senderId: string;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTarget = Boolean(claimedBy || department || assignedToUserId || assignedToJobTitleId);
  if (!hasTarget) return null;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (sending) return;
    setError(null);
    setSending(true);
    const supabase = createClient();

    const payload = claimedBy
      ? { target_type: "user", target_user_id: claimedBy, target_department: null, target_job_title_id: null }
      : assignedToUserId
        ? { target_type: "user", target_user_id: assignedToUserId, target_department: null, target_job_title_id: null }
        : assignedToJobTitleId
          ? { target_type: "job_title", target_user_id: null, target_department: null, target_job_title_id: assignedToJobTitleId }
          : { target_type: "department", target_user_id: null, target_department: department, target_job_title_id: null };

    const { error: insertError } = await supabase.from("nudges").insert({
      sender_id: senderId,
      message: `Cutucada sobre a tarefa: ${description}`,
      ...payload,
    });
    setSending(false);
    if (insertError) {
      setError("Não foi possível enviar agora.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  }

  const title = claimedBy
    ? `Chamar a atenção de ${claimedByName ?? "quem assumiu"}`
    : assignedToUserId
      ? "Chamar a atenção dessa pessoa"
      : assignedToJobTitleId
        ? "Chamar a atenção de quem tem essa função"
        : "Chamar a atenção do setor";

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={handleClick}
        disabled={sending}
        title={title}
        className="flex shrink-0 items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-60"
      >
        <IconAlertTriangle className="h-3.5 w-3.5" />
        {sent ? "Enviado!" : sending ? "..." : "Alertar"}
      </button>
      {error && <span className="text-xs text-(--color-red-600)">{error}</span>}
    </span>
  );
}
