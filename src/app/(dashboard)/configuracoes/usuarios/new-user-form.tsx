"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { ROLE_LABELS } from "@/lib/role-labels";

type JobTitle = { id: string; name: string };
type Role = { id: string; name: string };
type Branch = { id: string; name: string };

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_LABELS) as TaskDepartment[];

export function NewUserForm({
  jobTitles,
  roles,
  branches,
}: {
  jobTitles: JobTitle[];
  roles: Role[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toggleRole(id: string) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function toggleBranch(id: string) {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  async function handleCreate() {
    setError(null);
    setSuccess(null);
    if (!jobTitleId) {
      setError("Selecione a função da pessoa — é obrigatória (define o que ela vê no sistema).");
      return;
    }
    if (branchIds.length === 0) {
      setError("Selecione ao menos uma filial — sem isso a pessoa não consegue ver protocolo nenhum.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          department: department || null,
          jobTitleId,
          roleIds,
          branchIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar o usuário agora.");
        return;
      }
      setSuccess(
        data.warning ??
          `Usuário ${data.fullName} criado. Já pode entrar com o e-mail e senha informados.`,
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setDepartment("");
      setJobTitleId("");
      setRoleIds([]);
      setBranchIds([]);
      router.refresh();
    } catch {
      setError("Não foi possível falar com o servidor agora.");
    } finally {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700)"
      >
        + Criar usuário
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <p className="mb-3 text-sm font-medium text-(--color-graphite-900)">Criar usuário</p>
      <p className="mb-3 text-xs text-(--color-graphite-500)">
        Cria o login (e-mail e senha) e o perfil. Depois, use &quot;Gerenciar
        acesso&quot; na lista abaixo para dar os papéis certos.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Nome completo
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Senha provisória
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mín. 8 caracteres"
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Setor
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          >
            <option value="">Nenhum</option>
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Função <span className="text-(--color-red-600)">*</span>
          </label>
          <select
            value={jobTitleId}
            onChange={(e) => setJobTitleId(e.target.value)}
            required
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          >
            <option value="">Selecione...</option>
            {jobTitles.map((jt) => (
              <option key={jt.id} value={jt.id}>
                {jt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-(--color-graphite-700)">
          Filiais <span className="text-(--color-red-600)">*</span>
        </label>
        <p className="mb-1.5 text-xs text-(--color-graphite-500)">
          Sem isso, a pessoa não consegue ver protocolo nenhum. Marque quantas fizer sentido.
        </p>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <label
              key={b.id}
              className="flex items-center gap-1 rounded-full border border-(--color-gray-200) bg-white px-2 py-1 text-xs text-(--color-graphite-700)"
            >
              <input type="checkbox" checked={branchIds.includes(b.id)} onChange={() => toggleBranch(b.id)} />
              {b.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-(--color-graphite-700)">
          Papéis de aprovação (opcional — dá pra ajustar depois em &quot;Gerenciar acesso&quot;)
        </label>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-1 rounded-full border border-(--color-gray-200) bg-white px-2 py-1 text-xs text-(--color-graphite-700)"
            >
              <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
              {ROLE_LABELS[r.name] ?? r.name}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-md bg-(--color-gray-100) px-2 py-1 text-xs text-(--color-graphite-700)">
          {success}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
        >
          {creating ? "Criando..." : "Criar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={creating}
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
