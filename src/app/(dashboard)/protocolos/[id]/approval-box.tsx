"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";

const DECISION_LABELS: Record<string, string> = {
  aprovado: "Aprovar",
  recusado: "Recusar",
  aguardando_informacao: "Pedir mais informações",
};

export function ApprovalBox({
  approvalId,
  requiredRoleLabel,
}: {
  approvalId: string;
  requiredRoleLabel: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDecide(decision: string) {
    setError(null);
    setSubmitting(decision);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc("decide_approval", {
      p_approval_id: approvalId,
      p_decision: decision,
      p_notes: notes.trim() || null,
    });

    setSubmitting(null);

    if (rpcError) {
      setError(
        rpcError.message.includes("permissão")
          ? "Você não tem permissão para decidir esta aprovação."
          : "Não foi possível registrar a decisão agora."
      );
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-red-100) bg-(--color-red-50) p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
        Aguardando sua aprovação
      </h2>
      <p className="mb-3 text-xs text-(--color-graphite-500)">
        Exige aprovação de: {requiredRoleLabel}
      </p>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Observações (opcional)"
        className="mb-3 w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
      />

      {error && (
        <p className="mb-3 rounded-md bg-white px-3 py-2 text-sm text-(--color-red-700)">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleDecide("aprovado")}
          disabled={submitting !== null}
          className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
        >
          {submitting === "aprovado" ? "Aprovando..." : "Aprovar"}
        </button>
        <button
          onClick={() => handleDecide("recusado")}
          disabled={submitting !== null}
          className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60"
        >
          {submitting === "recusado" ? "Recusando..." : "Recusar"}
        </button>
        <button
          onClick={() => handleDecide("aguardando_informacao")}
          disabled={submitting !== null}
          className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60"
        >
          {submitting === "aguardando_informacao"
            ? "Enviando..."
            : DECISION_LABELS.aguardando_informacao}
        </button>
      </div>
    </section>
  );
}
