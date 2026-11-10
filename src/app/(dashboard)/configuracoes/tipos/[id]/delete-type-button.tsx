"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconTrash } from "@/lib/protocol-icons";

export function DeleteTypeButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("protocol_types").delete().eq("id", id);
    setSubmitting(false);
    if (deleteError) {
      setError(
        deleteError.code === "23503"
          ? "Não é possível excluir: já existem protocolos usando este tipo."
          : deleteError.message || "Não foi possível excluir agora."
      );
      return;
    }
    router.push("/configuracoes");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
      >
        <IconTrash className="h-3.5 w-3.5" />
        Excluir tipo
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-(--color-red-100) bg-(--color-red-50) p-4">
      <p className="mb-2 text-xs text-(--color-red-700)">
        Excluir este tipo remove também as tarefas configuradas para ele. Não pode ser desfeito. Confirma?
      </p>
      {error && <p className="mb-2 text-xs text-(--color-red-700)">{error}</p>}
      <div className="flex gap-2">
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
      </div>
    </div>
  );
}
