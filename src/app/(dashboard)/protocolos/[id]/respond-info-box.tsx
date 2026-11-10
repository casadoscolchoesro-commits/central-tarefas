"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RespondInfoBox({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!response.trim()) {
      setError("Escreva a informação solicitada antes de enviar.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc(
      "respond_to_approval_info_request",
      { p_approval_id: approvalId, p_response: response.trim() }
    );

    setSubmitting(false);

    if (rpcError) {
      setError("Não foi possível enviar sua resposta agora.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-red-100) bg-(--color-red-50) p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
        Informações solicitadas
      </h2>
      <p className="mb-3 text-xs text-(--color-graphite-500)">
        Responda abaixo — isso devolve o protocolo para aprovação.
      </p>

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={3}
        placeholder="Escreva a informação pedida..."
        className="mb-3 w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
      />

      {error && (
        <p className="mb-3 rounded-md bg-white px-3 py-2 text-sm text-(--color-red-700)">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar resposta"}
      </button>
    </section>
  );
}
