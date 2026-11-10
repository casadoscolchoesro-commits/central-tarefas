"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EditTypeForm({ id, code, name }: { id: string; code: string; name: string }) {
  const router = useRouter();
  const [editCode, setEditCode] = useState(code);
  const [editName, setEditName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!editCode.trim() || !editName.trim()) {
      setError("Preencha código e nome.");
      return;
    }
    setError(null);
    setSuccess(false);
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("protocol_types")
      .update({
        code: editCode.trim().toUpperCase().replace(/\s+/g, "_"),
        name: editName.trim(),
      })
      .eq("id", id);
    setSaving(false);
    if (updateError) {
      setError(
        updateError.message.includes("duplicate")
          ? "Já existe um tipo com esse código."
          : "Não foi possível salvar agora."
      );
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">Nome e código</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Nome (o que aparece na tela)
          </label>
          <input
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setSuccess(false); }}
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Código (interno)
          </label>
          <input
            value={editCode}
            onChange={(e) => { setEditCode(e.target.value); setSuccess(false); }}
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>
      )}
      {success && !error && (
        <p className="mt-2 text-xs text-(--color-success)">Salvo.</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </section>
  );
}
