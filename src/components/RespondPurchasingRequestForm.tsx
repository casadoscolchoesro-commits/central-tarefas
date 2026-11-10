"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { CurrencyInput } from "@/components/CurrencyInput";

export function RespondPurchasingRequestForm({
  requestId,
  kind,
}: {
  requestId: string;
  kind: string;
}) {
  const router = useRouter();
  const isDeadlineKind = kind === "prazo_encomenda";
  const [cashValue, setCashValue] = useState<number>(0);
  const [value12x, setValue12x] = useState<number>(0);
  const [value18x, setValue18x] = useState<number>(0);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (kind === "preco_custo" && !cashValue && !value12x && !value18x && !notes.trim()) {
      setError("Preencha ao menos um valor (à vista, 12x ou 18x) ou uma observação.");
      return;
    }
    if (isDeadlineKind && !expectedDate) {
      setError("Informe a data prevista.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: rpcError } = isDeadlineKind
      ? await supabase.rpc("respond_purchasing_deadline", {
          p_request_id: requestId,
          p_expected_date: expectedDate,
          p_response_notes: notes.trim() || null,
        })
      : await supabase.rpc("respond_purchasing_request", {
          p_request_id: requestId,
          p_response_cash_value: kind === "preco_custo" && cashValue ? cashValue : null,
          p_response_12x_value: kind === "preco_custo" && value12x ? value12x : null,
          p_response_18x_value: kind === "preco_custo" && value18x ? value18x : null,
          p_response_notes: notes.trim() || null,
        });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível enviar a resposta agora.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">Responder</h2>

      {kind === "preco_custo" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
              Valor à vista
            </label>
            <div className="flex items-center gap-1 rounded-md border border-(--color-gray-200) px-3 py-2">
              <span className="protocol-stamp text-sm text-(--color-graphite-500)">R$</span>
              <CurrencyInput value={cashValue} onChange={setCashValue} className="w-full border-0 bg-transparent text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
              Parcelado em 12x
            </label>
            <div className="flex items-center gap-1 rounded-md border border-(--color-gray-200) px-3 py-2">
              <span className="protocol-stamp text-sm text-(--color-graphite-500)">R$</span>
              <CurrencyInput value={value12x} onChange={setValue12x} className="w-full border-0 bg-transparent text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
              Parcelado em 18x
            </label>
            <div className="flex items-center gap-1 rounded-md border border-(--color-gray-200) px-3 py-2">
              <span className="protocol-stamp text-sm text-(--color-graphite-500)">R$</span>
              <CurrencyInput value={value18x} onChange={setValue18x} className="w-full border-0 bg-transparent text-sm outline-none" />
            </div>
          </div>
          <p className="sm:col-span-3 -mt-1 text-xs text-(--color-graphite-500)">
            Preencha o que fizer sentido — não precisa ser os três.
          </p>
        </div>
      ) : isDeadlineKind ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Data prevista <span className="text-(--color-red-600)">*</span>
          </label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
      ) : (
        <p className="mb-3 text-xs text-(--color-graphite-500)">
          Marque como concluído assim que o produto estiver cadastrado.
        </p>
      )}

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
          Observação {kind !== "preco_custo" && !isDeadlineKind && "(opcional)"}
          {isDeadlineKind && "(opcional)"}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Alguma informação a mais para quem pediu..."
          className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-(--color-red-50) px-3 py-2 text-sm text-(--color-red-700)">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-3 rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
      >
        {submitting ? "Enviando..." : kind === "preco_custo" || isDeadlineKind ? "Enviar resposta" : "Concluir"}
      </button>
    </section>
  );
}
