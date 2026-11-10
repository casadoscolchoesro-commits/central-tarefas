"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { IconPencil, IconTrash } from "@/lib/protocol-icons";

type Department = { id: string; name: string; description: string | null; active: boolean };

export function DepartmentManager({ initialDepartments }: { initialDepartments: Department[] }) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEditing(d: Department) {
    setEditingId(d.id);
    setEditName(d.name);
    setEditDescription(d.description ?? "");
    setError(null);
  }

  async function handleSaveEdit(d: Department) {
    if (!editName.trim()) { setError("Informe o nome do setor."); return; }
    setError(null);
    setBusyId(d.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("departments")
      .update({ name: editName.trim(), description: editDescription.trim() || null })
      .eq("id", d.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message.includes("duplicate") ? "Já existe um setor com esse nome." : "Não foi possível salvar agora.");
      return;
    }
    setDepartments((prev) => prev.map((x) => (x.id === d.id ? { ...x, name: editName.trim(), description: editDescription.trim() || null } : x)));
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(d: Department) {
    setError(null);
    setBusyId(d.id);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("departments").update({ active: !d.active }).eq("id", d.id);
    setBusyId(null);
    if (updateError) { setError("Não foi possível atualizar agora."); return; }
    setDepartments((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: !x.active } : x)));
  }

  async function handleDelete(d: Department) {
    setError(null);
    setBusyId(d.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("departments").delete().eq("id", d.id);
    setBusyId(null);
    if (deleteError) { setError("Não foi possível excluir agora."); return; }
    setDepartments((prev) => prev.filter((x) => x.id !== d.id));
    setConfirmingDeleteId(null);
  }

  async function handleAdd() {
    if (!newName.trim()) { setError("Informe o nome do setor."); return; }
    setError(null);
    setBusyId("new");
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("departments")
      .insert({ name: newName.trim(), description: newDescription.trim() || null, active: true })
      .select("id, name, description, active")
      .single();
    setBusyId(null);
    if (insertError || !data) {
      setError(insertError?.message.includes("duplicate") ? "Já existe um setor com esse nome." : "Não foi possível criar o setor agora.");
      return;
    }
    setDepartments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setNewDescription("");
    setShowAdd(false);
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      {error && (<p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>)}

      {departments.length === 0 ? (
        <p className="text-sm text-(--color-graphite-500)">Nenhum setor cadastrado ainda.</p>
      ) : (
        <ul className="divide-y divide-(--color-gray-100)">
          {departments.map((d) => {
            if (editingId === d.id) {
              return (
                <li key={d.id} className="py-2.5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" className={inputClass} />
                    <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descrição (opcional)" className={inputClass} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleSaveEdit(d)} disabled={busyId === d.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{busyId === d.id ? "Salvando..." : "Salvar"}</button>
                    <button onClick={() => setEditingId(null)} disabled={busyId === d.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            if (confirmingDeleteId === d.id) {
              return (
                <li key={d.id} className="py-2.5">
                  <p className="mb-2 text-xs text-(--color-red-700)">Excluir &quot;{d.name}&quot;? Não pode ser desfeito.</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(d)} disabled={busyId === d.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{busyId === d.id ? "Excluindo..." : "Sim, excluir"}</button>
                    <button onClick={() => setConfirmingDeleteId(null)} disabled={busyId === d.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            return (
              <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className={d.active ? "text-(--color-graphite-700)" : "text-(--color-graphite-500) line-through"}>{d.name}</span>
                  {d.description && (<p className="text-xs text-(--color-graphite-500)">{d.description}</p>)}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => startEditing(d)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                    <IconPencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button onClick={() => handleToggleActive(d)} disabled={busyId === d.id} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">{d.active ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => setConfirmingDeleteId(d.id)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                    <IconTrash className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 border-t border-(--color-gray-100) pt-4">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="text-xs text-(--color-red-600) hover:underline">+ Novo setor</button>
        ) : (
          <div className="rounded-md bg-(--color-gray-50) p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Nome</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Descrição (opcional)</label>
                <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleAdd} disabled={busyId === "new"} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{busyId === "new" ? "Criando..." : "Criar"}</button>
              <button onClick={() => setShowAdd(false)} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const inputClass = "w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)";
