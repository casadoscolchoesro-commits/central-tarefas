"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS } from "@/lib/nav";

type Scope = "own" | "department" | "all";
type JobTitle = {
  id: string;
  name: string;
  active: boolean;
  protocol_visibility_scope: Scope;
  task_visibility_scope: Scope;
  feature_access: Record<string, boolean> | null;
};

const SCOPE_LABELS: Record<Scope, string> = {
  own: "Própria",
  department: "Por setor",
  all: "Geral",
};

export function JobTitleManager({ initialJobTitles }: { initialJobTitles: JobTitle[] }) {
  const router = useRouter();
  const [jobTitles, setJobTitles] = useState(initialJobTitles);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleFeatureToggle(jt: JobTitle, href: string) {
    // Sem feature_access ainda = tudo liberado (comportamento de sempre,
    // só o papel decidia). Ao mexer pela primeira vez, parte de "tudo
    // marcado" e só desmarca o que foi clicado.
    const current: Record<string, boolean> = { ...(jt.feature_access ?? Object.fromEntries(NAV_ITEMS.map((i) => [i.href, true]))) };
    current[href] = !(current[href] ?? true);
    setError(null);
    setSubmitting(jt.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("job_titles")
      .update({ feature_access: current })
      .eq("id", jt.id);
    setSubmitting(null);
    if (updateError) {
      setError("Não foi possível atualizar agora.");
      return;
    }
    setJobTitles((prev) => prev.map((j) => (j.id === jt.id ? { ...j, feature_access: current } : j)));
    router.refresh();
  }

  async function handleToggleActive(jt: JobTitle) {
    setError(null);
    setSubmitting(jt.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("job_titles")
      .update({ active: !jt.active })
      .eq("id", jt.id);
    setSubmitting(null);
    if (updateError) {
      setError("Não foi possível atualizar agora.");
      return;
    }
    setJobTitles((prev) => prev.map((j) => (j.id === jt.id ? { ...j, active: !j.active } : j)));
    router.refresh();
  }

  async function handleScopeChange(
    jt: JobTitle,
    field: "protocol_visibility_scope" | "task_visibility_scope",
    value: Scope,
  ) {
    setError(null);
    setSubmitting(jt.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("job_titles")
      .update({ [field]: value })
      .eq("id", jt.id);
    setSubmitting(null);
    if (updateError) {
      setError("Não foi possível atualizar agora.");
      return;
    }
    setJobTitles((prev) => prev.map((j) => (j.id === jt.id ? { ...j, [field]: value } : j)));
    router.refresh();
  }

  async function handleAdd() {
    if (!newName.trim()) {
      setError("Informe o nome da função.");
      return;
    }
    setError(null);
    setSubmitting("new");
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("job_titles")
      .insert({ name: newName.trim(), active: true })
      .select("id, name, active, protocol_visibility_scope, task_visibility_scope, feature_access")
      .single();
    setSubmitting(null);
    if (insertError || !data) {
      setError(
        insertError?.message.includes("duplicate") || insertError?.message.includes("unique")
          ? "Já existe uma função com esse nome."
          : "Não foi possível criar a função agora.",
      );
      return;
    }
    setJobTitles((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setShowAdd(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      {error && (
        <p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
          {error}
        </p>
      )}

      <div className="mb-2 hidden gap-3 border-b border-(--color-gray-100) pb-2 text-xs font-medium text-(--color-graphite-500) sm:grid sm:grid-cols-[1fr_140px_140px_auto]">
        <span>Função</span>
        <span>Vê protocolos</span>
        <span>Vê tarefas</span>
        <span></span>
      </div>

      <ul className="divide-y divide-(--color-gray-100)">
        {jobTitles.map((jt) => {
          const isExpanded = expandedId === jt.id;
          return (
          <li key={jt.id} className="py-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-[1fr_140px_140px_auto] sm:items-center">
            <span
              className={
                jt.active
                  ? "text-(--color-graphite-700)"
                  : "text-(--color-graphite-500) line-through"
              }
            >
              {jt.name}
            </span>
            <select
              value={jt.protocol_visibility_scope}
              disabled={submitting === jt.id}
              onChange={(e) => handleScopeChange(jt, "protocol_visibility_scope", e.target.value as Scope)}
              className="rounded-md border border-(--color-gray-200) bg-white px-2 py-1 text-xs outline-none focus:border-(--color-red-600)"
            >
              {(["own", "department", "all"] as Scope[]).map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={jt.task_visibility_scope}
              disabled={submitting === jt.id}
              onChange={(e) => handleScopeChange(jt, "task_visibility_scope", e.target.value as Scope)}
              className="rounded-md border border-(--color-gray-200) bg-white px-2 py-1 text-xs outline-none focus:border-(--color-red-600)"
            >
              {(["own", "department", "all"] as Scope[]).map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleToggleActive(jt)}
              disabled={submitting === jt.id}
              className="justify-self-start text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60 sm:justify-self-end"
            >
              {submitting === jt.id ? "..." : jt.active ? "Desativar" : "Ativar"}
            </button>
          </div>

          <button
            onClick={() => setExpandedId(isExpanded ? null : jt.id)}
            className="mt-1.5 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
          >
            {isExpanded ? "Ocultar funcionalidades" : "Funcionalidades do sistema"}
          </button>

          {isExpanded && (
            <div className="mt-2 rounded-md bg-(--color-gray-50) p-3">
              <p className="mb-2 text-xs text-(--color-graphite-500)">
                O que essa função pode ver/acessar no menu. Sem marcação = liberado (como sempre
                foi, só o papel decidia).
              </p>
              <div className="flex flex-wrap gap-2">
                {NAV_ITEMS.map((item) => {
                  const checked = jt.feature_access?.[item.href] ?? true;
                  return (
                    <label
                      key={item.href}
                      className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={submitting === jt.id}
                        onChange={() => handleFeatureToggle(jt, item.href)}
                      />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-(--color-graphite-500)">
        Gerência geral e administrador sempre veem tudo, independente da função.
      </p>

      <div className="mt-4 border-t border-(--color-gray-100) pt-4">
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs text-(--color-red-600) hover:underline"
          >
            + Nova função
          </button>
        ) : (
          <div className="rounded-md bg-(--color-gray-50) p-3">
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
              Nome da função
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
            />
            <p className="mt-1 text-xs text-(--color-graphite-500)">
              O alcance de visibilidade começa em &quot;Geral&quot; (protocolos) e &quot;Por
              setor&quot; (tarefas) — ajuste depois de criar, se precisar.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAdd}
                disabled={submitting === "new"}
                className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
              >
                {submitting === "new" ? "Criando..." : "Criar"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
