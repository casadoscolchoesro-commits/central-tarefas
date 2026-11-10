"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { IconPencil, IconTrash } from "@/lib/protocol-icons";

type Reason = { id: string; category: string; name: string; active: boolean };

export function ReasonManager({ initialReasons }: { initialReasons: Reason[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("geral");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  async function handleToggleActive(reason: Reason) {
    setError(null);
    setSubmitting(reason.id);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("reasons").update({ active: !reason.active }).eq("id", reason.id);
    setSubmitting(null);
    if (updateError) { setError("Não foi possível atualizar agora."); return; }
    router.refresh();
  }

  function startEditing(reason: Reason) {
    setEditingId(reason.id);
    setEditName(reason.name);
    setEditCategory(reason.category);
    setError(null);
  }

  async function handleSaveEdit(reason: Reason) {
    if (!editName.trim()) { setError("Informe o nome do motivo."); return; }
    setError(null);
    setSubmitting(reason.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("reasons")
      .update({ name: editName.trim(), category: editCategory.trim() || "geral" })
      .eq("id", reason.id);
    setSubmitting(null);
    if (updateError) { setError("Não foi possível salvar agora."); return; }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(reason: Reason) {
    setError(null);
    setSubmitting(reason.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("reasons").delete().eq("id", reason.id);
    setSubmitting(null);
    if (deleteError) { setError("Não foi possível excluir agora."); return; }
    setConfirmingDeleteId(null);
    router.refresh();
  }

  async function handleAdd() {
    if (!newName.trim()) { setError("Informe o nome do motivo."); return; }
    setError(null);
    setSubmitting("new");
    const supabase = createClient();
    const { error: insertError } = await supabase.from("reasons").insert({ name: newName.trim(), category: newCategory.trim() || "geral", active: true });
    setSubmitting(null);
    if (insertError) { setError("Não foi possível criar o motivo agora."); return; }
    setNewName("");
    setShowAdd(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      {error && (<p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>)}

      <ul className="divide-y divide-(--color-gray-100)">
        {initialReasons.map((r) => {
          if (editingId === r.id) {
            return (
              <li key={r.id} className="py-2.5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" className="rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)" />
                  <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Categoria" className="rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleSaveEdit(r)} disabled={submitting === r.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{submitting === r.id ? "Salvando..." : "Salvar"}</button>
                  <button onClick={() => setEditingId(null)} disabled={submitting === r.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                </div>
              </li>
            );
          }

          if (confirmingDeleteId === r.id) {
            return (
              <li key={r.id} className="py-2.5">
                <p className="mb-2 text-xs text-(--color-red-700)">
                  Excluir &quot;{r.name}&quot; também remove seus submotivos e tarefas configuradas para ele. Não pode ser desfeito. Confirma?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(r)} disabled={submitting === r.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{submitting === r.id ? "Excluindo..." : "Sim, excluir"}</button>
                  <button onClick={() => setConfirmingDeleteId(null)} disabled={submitting === r.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                </div>
              </li>
            );
          }

          return (
            <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <span className={r.active ? "text-(--color-graphite-700)" : "text-(--color-graphite-500) line-through"}>{r.name}</span>
                <span className="ml-2 text-xs text-(--color-graphite-500)">{r.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => startEditing(r)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                  <IconPencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button onClick={() => handleToggleActive(r)} disabled={submitting === r.id} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">{r.active ? "Desativar" : "Ativar"}</button>
                <button onClick={() => setConfirmingDeleteId(r.id)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                  <IconTrash className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-(--color-gray-100) pt-4">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="text-xs text-(--color-red-600) hover:underline">+ Novo motivo</button>
        ) : (
          <div className="rounded-md bg-(--color-gray-50) p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Nome</label><input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)" /></div>
              <div><label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Categoria (livre)</label><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)" /></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleAdd} disabled={submitting === "new"} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{submitting === "new" ? "Criando..." : "Criar"}</button>
              <button onClick={() => setShowAdd(false)} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
