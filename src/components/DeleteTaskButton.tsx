"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { IconTrash } from "@/lib/protocol-icons";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("delete_task", { p_task_id: taskId });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível excluir a tarefa agora.");
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
      >
        <IconTrash className="h-3.5 w-3.5" />
        Excluir
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs text-(--color-red-700)">Excluir de vez?</span>
      <button
        onClick={handleDelete}
        disabled={submitting}
        className="rounded-md bg-(--color-red-600) px-2 py-1 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
      >
        {submitting ? "Excluindo..." : "Sim"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={submitting}
        className="text-xs text-(--color-graphite-500) hover:text-(--color-graphite-700)"
      >
        Cancelar
      </button>
      {error && <span className="text-xs text-(--color-red-600)">{error}</span>}
    </span>
  );
}
