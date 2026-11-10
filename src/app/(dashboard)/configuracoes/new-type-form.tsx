"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";

export function NewTypeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!code.trim() || !name.trim()) {
      setError("Preencha código e nome.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("protocol_types").insert({
      code: code.trim().toUpperCase().replace(/\s+/g, "_"),
      name: name.trim(),
      active: true,
      sort_order: 999,
    });

    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.message.includes("duplicate")
          ? "Já existe um tipo com esse código."
          : "Não foi possível criar o tipo agora."
      );
      return;
    }

    setCode("");
    setName("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-(--color-red-600) hover:underline"
      >
        + Novo tipo de protocolo
      </button>
    );
  }

  return (
    <div className="rounded-md bg-(--color-gray-50) p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Código (interno)
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="EX_NOVO_TIPO"
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Nome (o que aparece na tela)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Troca por embalagem violada"
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
          {submitting ? "Criando..." : "Criar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
