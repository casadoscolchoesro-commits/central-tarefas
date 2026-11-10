"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconTrash } from "@/lib/protocol-icons";

export function DeletePurchasingRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("delete_purchasing_request", { p_request_id: requestId });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível excluir a solicitação agora.");
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 rounded-md border border-(--color-gray-200) bg-white px-3 py-2 text-sm text-(--color-graphite-500) hover:border-(--color-red-600) hover:text-(--color-red-600)"
      >
        <IconTrash className="h-3.5 w-3.5" />
        Excluir
      </button>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex items-center gap-2">
        <span className="text-xs text-(--color-red-700)">Excluir de vez, sem volta?</span>
        <button
          onClick={handleDelete}
          disabled={submitting}
          className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
        >
          {submitting ? "Excluindo..." : "Sim, excluir"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={submitting}
          className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)"
        >
          Cancelar
        </button>
      </span>
      {error && <span className="text-xs text-(--color-red-600)">{error}</span>}
    </span>
  );
}
