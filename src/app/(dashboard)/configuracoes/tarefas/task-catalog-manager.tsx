"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { IconPencil, IconTrash, DepartmentIcon } from "@/lib/protocol-icons";

type CatalogTask = { id: string; department: string; description: string; active: boolean; attach_value: string | null };

const DEPARTMENTS: TaskDepartment[] = ["fiscal", "financeiro", "logistica", "estoque", "sac", "vendas", "gerencia", "compras"];

const ATTACH_VALUE_LABELS: Record<string, string> = {
  refund: "Valor do estorno",
  client_credit: "Valor de crédito cliente",
  total: "Valor total da nota",
};

export function TaskCatalogManager({ initialCatalog }: { initialCatalog: CatalogTask[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newDepartment, setNewDepartment] = useState<TaskDepartment>("fiscal");
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDepartment, setEditDepartment] = useState<TaskDepartment>("fiscal");
  const [editDescription, setEditDescription] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  async function handleAttachValueChange(task: CatalogTask, value: string) {
    setError(null);
    setSubmitting(task.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("task_catalog")
      .update({ attach_value: value || null })
      .eq("id", task.id);
    setSubmitting(null);
    if (updateError) { setError("Não foi possível atualizar agora."); return; }
    router.refresh();
  }

  function startEditing(task: CatalogTask) {
    setEditingId(task.id);
    setEditDepartment(task.department as TaskDepartment);
    setEditDescription(task.description);
    setError(null);
  }

  async function handleSaveEdit(task: CatalogTask) {
    if (!editDescription.trim()) { setError("Descreva a tarefa."); return; }
    setError(null);
    setSubmitting(task.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("task_catalog")
      .update({ department: editDepartment, description: editDescription.trim() })
      .eq("id", task.id);
    setSubmitting(null);
    if (updateError) { setError("Não foi possível salvar agora."); return; }
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(task: CatalogTask) {
    setError(null);
    setSubmitting(task.id);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("task_catalog").update({ active: !task.active }).eq("id", task.id);
    setSubmitting(null);
    if (updateError) { setError("Não foi possível atualizar agora."); return; }
    router.refresh();
  }

  async function handleDelete(task: CatalogTask) {
    setError(null);
    setSubmitting(task.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("task_catalog").delete().eq("id", task.id);
    setSubmitting(null);
    if (deleteError) { setError("Não foi possível excluir agora."); return; }
    setConfirmingDeleteId(null);
    router.refresh();
  }

  async function handleAdd() {
    if (!newDescription.trim()) { setError("Descreva a tarefa."); return; }
    setError(null);
    setSubmitting("new");
    const supabase = createClient();
    const { error: insertError } = await supabase.from("task_catalog").insert({ department: newDepartment, description: newDescription.trim(), active: true });
    setSubmitting(null);
    if (insertError) { setError("Não foi possível criar a tarefa agora."); return; }
    setNewDescription("");
    setShowAdd(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Catálogo de tarefas</h2>
      <p className="mb-3 text-xs text-(--color-graphite-500)">
        Tarefas usadas nos tipos de protocolo e nas respostas automáticas abaixo. Em cada uma, dá
        pra escolher se ela deve anexar o valor do estorno ou o valor de crédito cliente na
        própria descrição, quando for criada.
      </p>

      {error && (<p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>)}

      {initialCatalog.length === 0 ? (
        <p className="text-sm text-(--color-graphite-500)">Nenhuma tarefa cadastrada ainda.</p>
      ) : (
        <ul className="divide-y divide-(--color-gray-100)">
          {initialCatalog.map((t) => {
            if (editingId === t.id) {
              return (
                <li key={t.id} className="py-2.5">
                  <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                    <select value={editDepartment} onChange={(e) => setEditDepartment(e.target.value as TaskDepartment)} className="rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)">
                      {DEPARTMENTS.map((d) => (<option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>))}
                    </select>
                    <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descrição da tarefa" className="rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleSaveEdit(t)} disabled={submitting === t.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{submitting === t.id ? "Salvando..." : "Salvar"}</button>
                    <button onClick={() => setEditingId(null)} disabled={submitting === t.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            if (confirmingDeleteId === t.id) {
              return (
                <li key={t.id} className="py-2.5">
                  <p className="mb-2 text-xs text-(--color-red-700)">
                    Excluir &quot;{t.description}&quot; também remove essa tarefa de qualquer tipo de protocolo ou resposta automática que a use. Confirma?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(t)} disabled={submitting === t.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{submitting === t.id ? "Excluindo..." : "Sim, excluir"}</button>
                    <button onClick={() => setConfirmingDeleteId(null)} disabled={submitting === t.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-y-2 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--color-gray-100) text-(--color-graphite-700)">
                    <DepartmentIcon department={t.department} className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <span className={t.active ? "text-(--color-graphite-700)" : "text-(--color-graphite-500) line-through"}>{t.description}</span>
                    <span className="ml-2 text-xs text-(--color-graphite-500)">{DEPARTMENT_LABELS[t.department as TaskDepartment] ?? t.department}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={t.attach_value ?? ""}
                    onChange={(e) => handleAttachValueChange(t, e.target.value)}
                    disabled={submitting === t.id}
                    title="Anexar valor à descrição quando essa tarefa for criada"
                    className="rounded-md border border-(--color-gray-200) bg-white px-2 py-1 text-xs text-(--color-graphite-700) outline-none focus:border-(--color-red-600) disabled:opacity-60"
                  >
                    <option value="">Sem valor anexado</option>
                    <option value="refund">+ {ATTACH_VALUE_LABELS.refund}</option>
                    <option value="client_credit">+ {ATTACH_VALUE_LABELS.client_credit}</option>
                    <option value="total">+ {ATTACH_VALUE_LABELS.total}</option>
                  </select>
                  <button onClick={() => startEditing(t)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                    <IconPencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button onClick={() => handleToggleActive(t)} disabled={submitting === t.id} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">{t.active ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => setConfirmingDeleteId(t.id)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
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
          <button onClick={() => setShowAdd(true)} className="text-xs text-(--color-red-600) hover:underline">+ Nova tarefa no catálogo</button>
        ) : (
          <div className="rounded-md bg-(--color-gray-50) p-3">
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Setor</label>
                <select value={newDepartment} onChange={(e) => setNewDepartment(e.target.value as TaskDepartment)} className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)">
                  {DEPARTMENTS.map((d) => (<option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Descrição</label>
                <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Ex.: Cancelar nota fiscal" className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)" />
              </div>
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
