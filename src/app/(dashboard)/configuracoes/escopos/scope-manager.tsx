"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconPencil, IconTrash } from "@/lib/protocol-icons";

type Scope = { id: string; code: string; name: string; active: boolean; sort_order: number };

export function ScopeManager({ initialScopes }: { initialScopes: Scope[] }) {
  const router = useRouter();
  const [scopes, setScopes] = useState<Scope[]>(initialScopes);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEditing(s: Scope) {
    setEditingId(s.id);
    setEditName(s.name);
    setError(null);
  }

  async function handleSaveEdit(s: Scope) {
    if (!editName.trim()) { setError("Informe o nome do escopo."); return; }
    setError(null);
    setBusyId(s.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("protocol_scopes")
      .update({ name: editName.trim() })
      .eq("id", s.id);
    setBusyId(null);
    if (updateError) { setError("Não foi possível salvar agora."); return; }
    setScopes((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: editName.trim() } : x)));
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(s: Scope) {
    setError(null);
    setBusyId(s.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("protocol_scopes")
      .update({ active: !s.active })
      .eq("id", s.id);
    setBusyId(null);
    if (updateError) { setError("Não foi possível atualizar agora."); return; }
    setScopes((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
  }

  async function handleDelete(s: Scope) {
    setError(null);
    setBusyId(s.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("protocol_scopes").delete().eq("id", s.id);
    setBusyId(null);
    if (deleteError) {
      setError(
        deleteError.code === "23503"
          ? "Não é possível excluir: já existem protocolos usando este escopo. Você pode desativá-lo em vez de excluir."
          : deleteError.message || "Não foi possível excluir agora."
      );
      return;
    }
    setScopes((prev) => prev.filter((x) => x.id !== s.id));
    setConfirmingDeleteId(null);
  }

  async function handleAdd() {
    if (!newName.trim() || !newCode.trim()) { setError("Preencha nome e código."); return; }
    setError(null);
    setBusyId("new");
    const supabase = createClient();
    const code = newCode.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const { data, error: insertError } = await supabase
      .from("protocol_scopes")
      .insert({ name: newName.trim(), code, active: true, sort_order: (scopes.at(-1)?.sort_order ?? 0) + 1 })
      .select("id, code, name, active, sort_order")
      .single();
    setBusyId(null);
    if (insertError || !data) {
      setError(insertError?.message.includes("duplicate") ? "Já existe um escopo com esse código." : "Não foi possível criar o escopo agora.");
      return;
    }
    setScopes((prev) => [...prev, data]);
    setNewName("");
    setNewCode("");
    setShowAdd(false);
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      {error && (<p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>)}

      {scopes.length === 0 ? (
        <p className="text-sm text-(--color-graphite-500)">Nenhum escopo cadastrado ainda.</p>
      ) : (
        <ul className="divide-y divide-(--color-gray-100)">
          {scopes.map((s) => {
            if (editingId === s.id) {
              return (
                <li key={s.id} className="py-2.5">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" className={inputClass} />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleSaveEdit(s)} disabled={busyId === s.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{busyId === s.id ? "Salvando..." : "Salvar"}</button>
                    <button onClick={() => setEditingId(null)} disabled={busyId === s.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            if (confirmingDeleteId === s.id) {
              return (
                <li key={s.id} className="py-2.5">
                  <p className="mb-2 text-xs text-(--color-red-700)">
                    Excluir &quot;{s.name}&quot;? Se algum protocolo já usa este escopo, a exclusão será bloqueada — use desativar nesse caso.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(s)} disabled={busyId === s.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{busyId === s.id ? "Excluindo..." : "Sim, excluir"}</button>
                    <button onClick={() => setConfirmingDeleteId(null)} disabled={busyId === s.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            return (
              <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className={s.active ? "text-(--color-graphite-700)" : "text-(--color-graphite-500) line-through"}>{s.name}</span>
                  <span className="ml-2 protocol-stamp text-xs text-(--color-graphite-500)">{s.code}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => startEditing(s)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                    <IconPencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button onClick={() => handleToggleActive(s)} disabled={busyId === s.id} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">{s.active ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => setConfirmingDeleteId(s.id)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
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
          <button onClick={() => setShowAdd(true)} className="text-xs text-(--color-red-600) hover:underline">+ Novo escopo</button>
        ) : (
          <div className="rounded-md bg-(--color-gray-50) p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Nome</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Parcial" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Código (interno)</label>
                <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Ex.: parcial" className={inputClass} />
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
