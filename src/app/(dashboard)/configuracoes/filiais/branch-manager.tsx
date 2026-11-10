"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconPencil, IconTrash } from "@/lib/protocol-icons";

type Branch = {
  id: string;
  company_id: string;
  parent_branch_id: string | null;
  name: string;
  code: string;
  is_matriz: boolean;
  address: string | null;
  phone: string | null;
  active: boolean;
};
type Company = { id: string; label: string };

type BranchFormState = {
  name: string;
  code: string;
  companyId: string;
  address: string;
  phone: string;
  isMatriz: boolean;
};

const EMPTY_FORM: BranchFormState = { name: "", code: "", companyId: "", address: "", phone: "", isMatriz: false };

export function BranchManager({ initialBranches, companies }: { initialBranches: Branch[]; companies: Company[] }) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<BranchFormState>({ ...EMPTY_FORM, companyId: companies[0]?.id ?? "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BranchFormState>(EMPTY_FORM);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function companyLabel(companyId: string) {
    return companies.find((c) => c.id === companyId)?.label ?? "—";
  }

  function startEditing(b: Branch) {
    setEditingId(b.id);
    setEditForm({
      name: b.name,
      code: b.code,
      companyId: b.company_id,
      address: b.address ?? "",
      phone: b.phone ?? "",
      isMatriz: b.is_matriz,
    });
    setError(null);
  }

  async function handleSaveEdit(b: Branch) {
    if (!editForm.name.trim() || !editForm.code.trim() || !editForm.companyId) {
      setError("Preencha nome, código e empresa.");
      return;
    }
    setError(null);
    setBusyId(b.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("branches")
      .update({
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        company_id: editForm.companyId,
        address: editForm.address.trim() || null,
        phone: editForm.phone.trim() || null,
        is_matriz: editForm.isMatriz,
      })
      .eq("id", b.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message.includes("duplicate") ? "Já existe uma filial com esse código." : "Não foi possível salvar agora.");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleToggleActive(b: Branch) {
    setError(null);
    setBusyId(b.id);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("branches").update({ active: !b.active }).eq("id", b.id);
    setBusyId(null);
    if (updateError) {
      setError("Não foi possível atualizar agora.");
      return;
    }
    router.refresh();
  }

  async function handleDelete(b: Branch) {
    setError(null);
    setBusyId(b.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("branches").delete().eq("id", b.id);
    setBusyId(null);
    if (deleteError) {
      setError(
        deleteError.code === "23503"
          ? "Não é possível excluir: já existem vendas ou protocolos vinculados a esta filial. Você pode desativá-la em vez de excluir."
          : deleteError.message || "Não foi possível excluir agora."
      );
      return;
    }
    setBranches((prev) => prev.filter((x) => x.id !== b.id));
    setConfirmingDeleteId(null);
  }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.code.trim() || !addForm.companyId) {
      setError("Preencha nome, código e empresa.");
      return;
    }
    setError(null);
    setBusyId("new");
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("branches")
      .insert({
        name: addForm.name.trim(),
        code: addForm.code.trim(),
        company_id: addForm.companyId,
        address: addForm.address.trim() || null,
        phone: addForm.phone.trim() || null,
        is_matriz: addForm.isMatriz,
        active: true,
      })
      .select("id, company_id, parent_branch_id, name, code, is_matriz, address, phone, active")
      .single();
    setBusyId(null);
    if (insertError || !data) {
      setError(insertError?.message.includes("duplicate") ? "Já existe uma filial com esse código." : "Não foi possível criar a filial agora.");
      return;
    }
    setBranches((prev) => [...prev, data].sort((a, c) => a.name.localeCompare(c.name)));
    setAddForm({ ...EMPTY_FORM, companyId: companies[0]?.id ?? "" });
    setShowAdd(false);
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      {error && (
        <p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>
      )}

      {branches.length === 0 ? (
        <p className="text-sm text-(--color-graphite-500)">Nenhuma filial cadastrada ainda.</p>
      ) : (
        <ul className="divide-y divide-(--color-gray-100)">
          {branches.map((b) => {
            if (editingId === b.id) {
              return (
                <li key={b.id} className="py-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome" className={inputClass} />
                    <input value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} placeholder="Código" className={inputClass} />
                    <select value={editForm.companyId} onChange={(e) => setEditForm((f) => ({ ...f, companyId: e.target.value }))} className={inputClass}>
                      {companies.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
                    </select>
                    <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Telefone" className={inputClass} />
                    <input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} placeholder="Endereço" className={`${inputClass} sm:col-span-2`} />
                    <label className="flex items-center gap-2 text-xs text-(--color-graphite-700)">
                      <input type="checkbox" checked={editForm.isMatriz} onChange={(e) => setEditForm((f) => ({ ...f, isMatriz: e.target.checked }))} />
                      É matriz
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleSaveEdit(b)} disabled={busyId === b.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{busyId === b.id ? "Salvando..." : "Salvar"}</button>
                    <button onClick={() => setEditingId(null)} disabled={busyId === b.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            if (confirmingDeleteId === b.id) {
              return (
                <li key={b.id} className="py-3">
                  <p className="mb-2 text-xs text-(--color-red-700)">
                    Excluir &quot;{b.name}&quot;? Se houver vendas ou protocolos vinculados a ela, a exclusão será bloqueada — use desativar nesse caso.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(b)} disabled={busyId === b.id} className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">{busyId === b.id ? "Excluindo..." : "Sim, excluir"}</button>
                    <button onClick={() => setConfirmingDeleteId(null)} disabled={busyId === b.id} className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)">Cancelar</button>
                  </div>
                </li>
              );
            }

            return (
              <li key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className={b.active ? "text-(--color-graphite-700)" : "text-(--color-graphite-500) line-through"}>{b.name}</span>
                  <span className="ml-2 protocol-stamp text-xs text-(--color-graphite-500)">{b.code}</span>
                  {b.is_matriz && (<span className="ml-2 rounded-full bg-(--color-gray-100) px-1.5 py-0.5 text-[10px] font-medium text-(--color-graphite-700)">Matriz</span>)}
                  <p className="text-xs text-(--color-graphite-500)">
                    {companyLabel(b.company_id)}
                    {b.address ? ` — ${b.address}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => startEditing(b)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                    <IconPencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button onClick={() => handleToggleActive(b)} disabled={busyId === b.id} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60">{b.active ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => setConfirmingDeleteId(b.id)} className="flex items-center gap-1 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
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
          <button onClick={() => setShowAdd(true)} className="text-xs text-(--color-red-600) hover:underline">+ Nova filial</button>
        ) : (
          <div className="rounded-md bg-(--color-gray-50) p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Nome</label>
                <input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Loja Macaé" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Código</label>
                <input value={addForm.code} onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value }))} placeholder="Ex.: MACAE" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Empresa</label>
                <select value={addForm.companyId} onChange={(e) => setAddForm((f) => ({ ...f, companyId: e.target.value }))} className={inputClass}>
                  <option value="">Selecione...</option>
                  {companies.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Telefone (opcional)</label>
                <input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Endereço (opcional)</label>
                <input value={addForm.address} onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-xs text-(--color-graphite-700)">
                <input type="checkbox" checked={addForm.isMatriz} onChange={(e) => setAddForm((f) => ({ ...f, isMatriz: e.target.checked }))} />
                É matriz
              </label>
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
