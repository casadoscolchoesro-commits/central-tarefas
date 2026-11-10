"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { IconTrash, IconPlusCircle } from "@/lib/protocol-icons";

type CatalogTask = { id: string; department: string; description: string; active: boolean };
type Trigger = {
  id: string;
  field_key: string;
  field_value: boolean;
  catalog_task_id: string;
  depends_on_catalog_task_id: string | null;
};

const FIELDS: { key: string; label: string }[] = [
  { key: "cash_register_finalized", label: "Finalizado no caixa?" },
  { key: "needs_refund", label: "Cliente precisa de estorno?" },
];

export function FieldTriggerManager({ catalog, initialTriggers }: { catalog: CatalogTask[]; initialTriggers: Trigger[] }) {
  const router = useRouter();
  const [triggers, setTriggers] = useState<Trigger[]>(initialTriggers);
  const [pendingSelect, setPendingSelect] = useState<Record<string, string>>({});
  const [pendingDependsOn, setPendingDependsOn] = useState<Record<string, string>>({});
  const [editingDependsOnId, setEditingDependsOnId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function catalogTaskById(id: string) {
    return catalog.find((c) => c.id === id) ?? null;
  }

  function keyFor(fieldKey: string, fieldValue: boolean) {
    return `${fieldKey}:${fieldValue}`;
  }

  async function handleAdd(fieldKey: string, fieldValue: boolean) {
    const k = keyFor(fieldKey, fieldValue);
    const selectId = pendingSelect[k];
    if (!selectId) return;
    setError(null);
    setSubmitting(k);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("field_trigger_tasks")
      .insert({
        field_key: fieldKey,
        field_value: fieldValue,
        catalog_task_id: selectId,
        depends_on_catalog_task_id: pendingDependsOn[k] || null,
      })
      .select("id, field_key, field_value, catalog_task_id, depends_on_catalog_task_id")
      .single();
    setSubmitting(null);
    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "Essa tarefa já está vinculada a essa resposta." : "Não foi possível vincular agora.");
      return;
    }
    setTriggers((prev) => [...prev, data]);
    setPendingSelect((prev) => ({ ...prev, [k]: "" }));
    setPendingDependsOn((prev) => ({ ...prev, [k]: "" }));
    router.refresh();
  }

  async function handleRemove(trigger: Trigger) {
    setError(null);
    setSubmitting(trigger.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("field_trigger_tasks").delete().eq("id", trigger.id);
    setSubmitting(null);
    if (deleteError) { setError("Não foi possível remover agora."); return; }
    setTriggers((prev) => prev.filter((t) => t.id !== trigger.id));
    router.refresh();
  }

  async function handleChangeDependsOn(trigger: Trigger, dependsOnId: string) {
    setError(null);
    setSubmitting(trigger.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("field_trigger_tasks")
      .update({ depends_on_catalog_task_id: dependsOnId || null })
      .eq("id", trigger.id);
    setSubmitting(null);
    if (updateError) { setError("Não foi possível atualizar a dependência agora."); return; }
    setTriggers((prev) =>
      prev.map((t) => (t.id === trigger.id ? { ...t, depends_on_catalog_task_id: dependsOnId || null } : t))
    );
    setEditingDependsOnId(null);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Tarefas automáticas por resposta</h2>
      <p className="mb-4 text-xs text-(--color-graphite-500)">
        Escolha quais tarefas do catálogo devem ser criadas automaticamente quando o vendedor responder Sim ou Não
        a cada uma destas perguntas na Nova Solicitação. Se quiser, uma tarefa pode só ser criada depois que outra
        for concluída (ou dispensada) — útil pra encadear etapas, tipo &quot;só notificar o cliente depois do
        estorno feito&quot;.
      </p>

      {error && (<p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>)}

      <div className="space-y-6">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <p className="mb-2 text-xs font-medium text-(--color-graphite-700)">{field.label}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[true, false].map((value) => {
                const k = keyFor(field.key, value);
                const attached = triggers.filter((t) => t.field_key === field.key && t.field_value === value);
                const attachedIds = new Set(attached.map((t) => t.catalog_task_id));
                const availableOptions = catalog.filter((c) => !attachedIds.has(c.id));
                return (
                  <div key={k} className="rounded-md border border-(--color-gray-200) p-3">
                    <p className="mb-2 text-xs font-medium text-(--color-graphite-500)">{value ? "Quando responder Sim" : "Quando responder Não"}</p>
                    {attached.length === 0 ? (
                      <p className="mb-2 text-xs text-(--color-graphite-500)">Nenhuma tarefa vinculada.</p>
                    ) : (
                      <ul className="mb-2 space-y-1">
                        {attached.map((t) => {
                          const task = catalogTaskById(t.catalog_task_id);
                          const dependsOnTask = t.depends_on_catalog_task_id ? catalogTaskById(t.depends_on_catalog_task_id) : null;
                          // Não pode depender de si mesma, nem criar um ciclo direto (A depende de B que depende de A).
                          const dependencyOptions = attached.filter(
                            (other) => other.catalog_task_id !== t.catalog_task_id && other.depends_on_catalog_task_id !== t.catalog_task_id
                          );
                          return (
                            <li key={t.id} className="rounded-md bg-(--color-gray-50) px-2 py-1.5 text-xs text-(--color-graphite-700)">
                              <div className="flex items-center justify-between">
                                <span>
                                  {task ? (
                                    <>
                                      <span className="mr-1 rounded-full bg-(--color-gray-100) px-1.5 py-0.5 text-[10px] font-medium">
                                        {DEPARTMENT_LABELS[task.department as TaskDepartment] ?? task.department}
                                      </span>
                                      {task.description}
                                    </>
                                  ) : (
                                    "Tarefa removida do catálogo"
                                  )}
                                </span>
                                <button onClick={() => handleRemove(t)} disabled={submitting === t.id} className="text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">
                                  <IconTrash className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {editingDependsOnId === t.id ? (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <select
                                    defaultValue={t.depends_on_catalog_task_id ?? ""}
                                    onChange={(e) => handleChangeDependsOn(t, e.target.value)}
                                    disabled={submitting === t.id}
                                    className="h-7 flex-1 min-w-0 rounded-md border border-(--color-gray-200) bg-white px-1.5 text-[11px] leading-none outline-none focus:border-(--color-red-600)"
                                  >
                                    <option value="">Sem dependência — cria junto com o protocolo</option>
                                    {dependencyOptions.map((opt) => {
                                      const optTask = catalogTaskById(opt.catalog_task_id);
                                      return optTask ? (
                                        <option key={opt.catalog_task_id} value={opt.catalog_task_id}>
                                          Depois de: {optTask.description}
                                        </option>
                                      ) : null;
                                    })}
                                  </select>
                                  <button
                                    onClick={() => setEditingDependsOnId(null)}
                                    className="text-[11px] text-(--color-graphite-500) hover:text-(--color-red-600)"
                                  >
                                    Fechar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingDependsOnId(t.id)}
                                  className="mt-1 text-[11px] text-(--color-graphite-500) hover:text-(--color-red-600)"
                                >
                                  {dependsOnTask
                                    ? `Só depois de: ${dependsOnTask.description}`
                                    : "+ Depender da conclusão de outra tarefa"}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {availableOptions.length > 0 && (
                      <div className="space-y-1.5">
                        <select
                          value={pendingSelect[k] ?? ""}
                          onChange={(e) => setPendingSelect((prev) => ({ ...prev, [k]: e.target.value }))}
                          className="h-8 w-full rounded-md border border-(--color-gray-200) px-2 text-xs leading-none outline-none focus:border-(--color-red-600)"
                        >
                          <option value="">Adicionar tarefa...</option>
                          {availableOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              [{DEPARTMENT_LABELS[c.department as TaskDepartment] ?? c.department}] {c.description}
                            </option>
                          ))}
                        </select>
                        {pendingSelect[k] && attached.length > 0 && (
                          <select
                            value={pendingDependsOn[k] ?? ""}
                            onChange={(e) => setPendingDependsOn((prev) => ({ ...prev, [k]: e.target.value }))}
                            className="h-8 w-full rounded-md border border-(--color-gray-200) bg-white px-2 text-[11px] leading-none outline-none focus:border-(--color-red-600)"
                          >
                            <option value="">Sem dependência — cria junto com o protocolo</option>
                            {attached.map((opt) => {
                              const optTask = catalogTaskById(opt.catalog_task_id);
                              return optTask ? (
                                <option key={opt.catalog_task_id} value={opt.catalog_task_id}>
                                  Depois de: {optTask.description}
                                </option>
                              ) : null;
                            })}
                          </select>
                        )}
                        <button
                          onClick={() => handleAdd(field.key, value)}
                          disabled={!pendingSelect[k] || submitting === k}
                          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-(--color-red-600) text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
                        >
                          <IconPlusCircle className="h-4 w-4" />
                          Vincular
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
