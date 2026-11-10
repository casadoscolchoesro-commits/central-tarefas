"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CurrencyInput } from "@/components/CurrencyInput";

type ReplacementSaleRecord = {
  id: string;
  created_at: string;
  original: { sale_number: string; total_amount: number } | null;
  replacement: {
    sale_number: string;
    sale_date: string;
    total_amount: number;
  } | null;
};

export function ReplacementSaleBox({
  protocolId,
  records,
  canRegister,
  affectedItemsTotal,
}: {
  protocolId: string;
  records: ReplacementSaleRecord[];
  canRegister: boolean;
  /** Soma só dos itens da venda original marcados como parte deste
   * protocolo — usado na comparação em vez do valor da nota inteira,
   * já que uma nota pode ter vários produtos e só um ser trocado. Nulo
   * quando não há itens marcados (protocolo de escopo total, por
   * exemplo) — nesse caso compara com o valor cheio da nota mesmo. */
  affectedItemsTotal?: number | null;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saleNumber, setSaleNumber] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!saleNumber.trim() || !saleDate || !totalAmount) {
      setError("Preencha número, data e valor da venda substituta.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc(
      "register_replacement_sale",
      {
        p_protocol_id: protocolId,
        p_sale_number: saleNumber.trim(),
        p_sale_date: saleDate,
        p_total_amount: totalAmount,
      }
    );

    setSubmitting(false);

    if (rpcError) {
      setError("Não foi possível registrar a venda substituta agora.");
      return;
    }

    setShowForm(false);
    setSaleNumber("");
    setSaleDate("");
    setTotalAmount(0);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-(--color-graphite-900)">
          Venda substituta
        </h2>
        {canRegister && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-(--color-red-600) hover:underline"
          >
            + Registrar venda substituta
          </button>
        )}
      </div>

      {records.length === 0 && !showForm && (
        <p className="text-sm text-(--color-graphite-500)">
          Nenhuma venda substituta registrada ainda.
        </p>
      )}

      {records.length > 0 && (
        <ul className="mb-3 divide-y divide-(--color-gray-100)">
          {records.map((r) => {
            const original = r.original;
            const replacement = r.replacement;
            const comparisonBase = affectedItemsTotal ?? (original ? Number(original.total_amount) : null);
            const diff =
              comparisonBase !== null && replacement
                ? comparisonBase - Number(replacement.total_amount)
                : null;
            return (
              <li key={r.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-(--color-graphite-700)">
                    {replacement?.sale_number ?? "—"} — R${" "}
                    {replacement ? Number(replacement.total_amount).toFixed(2) : "—"}
                  </span>
                  {diff !== null && (
                    <span
                      className={
                        diff > 0
                          ? "text-xs font-medium text-(--color-red-600)"
                          : "text-xs font-medium text-(--color-success)"
                      }
                    >
                      {diff > 0
                        ? `Perda de R$ ${diff.toFixed(2)} vs. item trocado`
                        : diff < 0
                          ? `Ganho de R$ ${Math.abs(diff).toFixed(2)} vs. item trocado`
                          : "Mesmo valor do item trocado"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-(--color-graphite-500)">
                  Venda original: {original?.sale_number ?? "—"} — R${" "}
                  {original ? Number(original.total_amount).toFixed(2) : "—"}
                  {affectedItemsTotal != null && (
                    <> (item trocado: R$ {affectedItemsTotal.toFixed(2)})</>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <div className="rounded-md bg-(--color-gray-50) p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                Número da venda
              </label>
              <input
                value={saleNumber}
                onChange={(e) => setSaleNumber(e.target.value)}
                className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                Data
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                Valor (R$)
              </label>
              <CurrencyInput
                value={totalAmount}
                onChange={setTotalAmount}
                className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
              />
            </div>
          </div>

          {error && (
            <p className="mt-2 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
              {error}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
            >
              {submitting ? "Registrando..." : "Registrar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
