"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";

type TaskTemplate = { id: string; department: string; description: string; active: boolean; sort_order: number; depends_on_departments: string[]; reason_id: string | null };
type Reason = { id: string; name: string };
type CatalogTask = { id: string; department: string; description: string; active: boolean };
const DEPARTMENTS: TaskDepartment[] = ["fiscal", "financeiro", "logistica", "estoque", "sac", "vendas", "gerencia", "compras"];

export function TaskTemplateManager({ protocolTypeId, templates, reasons, catalog }: { protocolTypeId: string; templates: TaskTemplate[]; reasons: Reason[]; catalog: CatalogTask[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reasonName = (id: string | null) => id ? reasons.find((r) => r.id === id)?.name ?? "Motivo removido" : "Geral (qualquer motivo)";

  async function handleToggleActive(t: TaskTemplate) {
    setError(null);
    setBusyId(t.id);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("task_templates").update({ active: !t.active }).eq("id", t.id);
    setBusyId(null);
    if (updateError) { setError("Não foi possível atualizar agora."); return; }
    router.refresh();
  }

  async function handleDelete(t: TaskTemplate) {
    setError(null);
    setBusyId(t.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("task_templates").delete().eq("id", t.id);
    setBusyId(null);
    if (deleteError) { setError("Não foi possível remover agora."); return; }
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Tarefas geradas ao aprovar</h2>
      <p className="mb-3 text-xs text-(--color-graphite-500)">Uma tarefa "Geral" vale para qualquer motivo deste tipo. Uma tarefa vinculada a um motivo específico substitui a geral do mesmo setor só quando aquele motivo é escolhido. As tarefas vêm do catálogo — cadastre novas em Configurações → Tarefas.</p>
      {error && (<p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>)}
      {templates.length === 0 ? (
        <p className="text-sm text-(--color-graphite-500)">Nenhuma tarefa configurada — este tipo, quando aprovado, não gera tarefas de setor.</p>
      ) : (
        <ul className="divide-y divide-(--color-gray-100)">
          {templates.map((t) => (
            <li key={t.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="mr-2 rounded-full bg-(--color-gray-100) px-2 py-0.5 text-xs font-medium text-(--color-graphite-700)">{DEPARTMENT_LABELS[t.department as TaskDepartment] ?? t.department}</span>
                  <span className={`text-sm ${t.active ? "text-(--color-graphite-700)" : "text-(--color-graphite-500) line-through"}`}>{t.description}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleActive(t)} disabled={busyId === t.id} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">{t.active ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => handleDelete(t)} disabled={busyId === t.id} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">Remover</button>
                </div>
              </div>
              <p className="mt-1 text-xs text-(--color-graphite-500)">
                Motivo: {reasonName(t.reason_id)}
                {t.depends_on_departments.length > 0 && (<> {" "}— só depois de: {t.depends_on_departments.map((d) => DEPARTMENT_LABELS[d as TaskDepartment] ?? d).join(", ")}</>)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t border-(--color-gray-100) pt-4">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="text-xs text-(--color-red-600) hover:underline">+ Nova tarefa</button>
        ) : (
          <NewTaskTemplateForm protocolTypeId={protocolTypeId} reasons={reasons} catalog={catalog} onDone={() => { setShowAdd(false); router.refresh(); }} onCancel={() => setShowAdd(false)} />
        )}
      </div>
    </section>
  );
}

function NewTaskTemplateForm({ protocolTypeId, reasons, catalog, onDone, onCancel }: { protocolTypeId: string; reasons: Reason[]; catalog: CatalogTask[]; onDone: () => void; onCancel: () => void }) {
  const [catalogTaskId, setCatalogTaskId] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [dependsOn, setDependsOn] = useState<Set<TaskDepartment>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTask = catalog.find((c) => c.id === catalogTaskId);
  const department = (selectedTask?.department as TaskDepartment) ?? "fiscal";

  function toggleDependency(d: TaskDepartment) {
    setDependsOn((prev) => { const next = new Set(prev); if (next.has(d)) next.delete(d); else next.add(d); return next; });
  }

  async function handleSubmit() {
    if (!selectedTask) { setError("Escolha uma tarefa do catálogo."); return; }
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("task_templates").insert({ protocol_type_id: protocolTypeId, department: selectedTask.department, description: selectedTask.description, reason_id: reasonId || null, depends_on_departments: Array.from(dependsOn), active: true, sort_order: 999 });
    setSubmitting(false);
    if (insertError) { setError(insertError.message.includes("duplicate") ? "Já existe uma tarefa desse setor para esse motivo (ou geral) neste tipo." : "Não foi possível criar a tarefa agora."); return; }
    onDone();
  }

  return (
    <div className="rounded-md bg-(--color-gray-50) p-3">
      {catalog.length === 0 ? (
        <p className="text-xs text-(--color-graphite-500)">
          Nenhuma tarefa cadastrada no catálogo ainda. Cadastre em Configurações → Tarefas antes de vincular aqui.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Tarefa (do catálogo)</label>
              <select value={catalogTaskId} onChange={(e) => setCatalogTaskId(e.target.value)} className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)">
                <option value="">Selecione...</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{DEPARTMENT_LABELS[c.department as TaskDepartment] ?? c.department}] {c.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Motivo</label>
              <select value={reasonId} onChange={(e) => setReasonId(e.target.value)} className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)">
                <option value="">Geral (qualquer motivo)</option>
                {reasons.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Só criar depois que estas tarefas terminarem (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.filter((d) => d !== department).map((d) => (
                <label key={d} className="flex items-center gap-1 rounded-full border border-(--color-gray-200) px-2 py-1 text-xs text-(--color-graphite-700)">
                  <input type="checkbox" checked={dependsOn.has(d)} onChange={() => toggleDependency(d)} />
                  {DEPARTMENT_LABELS[d]}
                </label>
              ))}
            </div>
          </div>
          {error && (<p className="mt-2 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>)}
          <div className="mt-3 flex gap-2">
            <button onClick={handleSubmit} disabled={submitting} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{submitting ? "Vinculando..." : "Vincular tarefa"}</button>
            <button onClick={onCancel} disabled={submitting} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">Cancelar</button>
          </div>
        </>
      )}
      {catalog.length === 0 && (
        <div className="mt-3">
          <button onClick={onCancel} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">Fechar</button>
        </div>
      )}
    </div>
  );
}
