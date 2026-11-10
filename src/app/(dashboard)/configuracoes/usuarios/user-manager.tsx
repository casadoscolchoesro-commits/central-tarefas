"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/lib/navegacao";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { ROLE_LABELS } from "@/lib/role-labels";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  home_branch_id: string | null;
  active: boolean;
  department: TaskDepartment | null;
  job_title_id: string | null;
};
type UserRole = { id: string; user_id: string; role_id: string };
type Role = { id: string; name: string; description: string | null };
type Branch = { id: string; name: string };
type JobTitle = { id: string; name: string; active: boolean };

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_LABELS) as TaskDepartment[];

export function UserManager({
  initialProfiles,
  initialUserRoles,
  roles,
  branches,
  jobTitles,
  initialTaskAdminIds,
  initialCancelPermIds,
  initialReportPermIds,
  initialUserBranches,
}: {
  initialProfiles: Profile[];
  initialUserRoles: UserRole[];
  roles: Role[];
  branches: Branch[];
  jobTitles: JobTitle[];
  initialTaskAdminIds: string[];
  initialCancelPermIds: string[];
  initialReportPermIds: string[];
  initialUserBranches: { user_id: string; branch_id: string }[];
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [userRoles, setUserRoles] = useState<UserRole[]>(initialUserRoles);
  const [taskAdminIds, setTaskAdminIds] = useState<Set<string>>(new Set(initialTaskAdminIds));
  const [cancelPermIds, setCancelPermIds] = useState<Set<string>>(new Set(initialCancelPermIds));
  const [reportPermIds, setReportPermIds] = useState<Set<string>>(new Set(initialReportPermIds));
  const [userBranches, setUserBranches] = useState<{ user_id: string; branch_id: string }[]>(initialUserBranches);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordSetId, setPasswordSetId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<{ id: string; message: string } | null>(null);

  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const jobTitleName = (id: string | null) => jobTitles.find((jt) => jt.id === id)?.name ?? null;

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (departmentFilter && p.department !== departmentFilter) return false;
      if (jobTitleFilter && p.job_title_id !== jobTitleFilter) return false;
      if (!q) return true;
      const jt = jobTitleName(p.job_title_id)?.toLowerCase() ?? "";
      const dept = p.department ? (DEPARTMENT_LABELS[p.department] ?? "").toLowerCase() : "";
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        jt.includes(q) ||
        dept.includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, query, departmentFilter, jobTitleFilter, jobTitles]);

  function rolesForUser(userId: string) {
    const roleIds = new Set(userRoles.filter((ur) => ur.user_id === userId).map((ur) => ur.role_id));
    return roles.filter((r) => roleIds.has(r.id));
  }

  async function toggleRole(userId: string, role: Role) {
    setError(null);
    const key = `${userId}:${role.id}`;
    setBusyKey(key);
    const supabase = createClient();
    const existing = userRoles.find((ur) => ur.user_id === userId && ur.role_id === role.id);

    if (existing) {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("id", existing.id);
      setBusyKey(null);
      if (deleteError) {
        setError("Não foi possível remover o papel agora.");
        return;
      }
      setUserRoles((prev) => prev.filter((ur) => ur.id !== existing.id));
    } else {
      const { data, error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role_id: role.id })
        .select("id, user_id, role_id")
        .single();
      setBusyKey(null);
      if (insertError || !data) {
        setError("Não foi possível conceder o papel agora.");
        return;
      }
      setUserRoles((prev) => [...prev, data]);
    }
    router.refresh();
  }

  async function handleProfileEdit(profile: Profile, fullName: string, email: string) {
    if (!fullName.trim()) {
      setError("O nome não pode ficar em branco.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    setError(null);
    setBusyKey(profile.id);

    const emailChanged = email.trim().toLowerCase() !== profile.email.toLowerCase();
    if (emailChanged) {
      try {
        const res = await fetch("/api/admin/update-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: profile.id, email: email.trim() }),
        });
        const json = await res.json();
        if (!res.ok) {
          setBusyKey(null);
          setError(json.error || "Não foi possível trocar o e-mail agora.");
          return;
        }
      } catch {
        setBusyKey(null);
        setError("Não foi possível trocar o e-mail agora.");
        return;
      }
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), ...(emailChanged ? { email: email.trim() } : {}) })
      .eq("id", profile.id);
    setBusyKey(null);
    if (updateError) {
      setError("Não foi possível atualizar o cadastro agora.");
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === profile.id ? { ...p, full_name: fullName.trim(), email: email.trim() } : p))
    );
    setEditingNameId(null);
  }

  async function handleToggleBranch(profile: Profile, branchId: string) {
    setError(null);
    setBusyKey(profile.id);
    const supabase = createClient();
    const has = userBranches.some((ub) => ub.user_id === profile.id && ub.branch_id === branchId);
    const { error: updateError } = has
      ? await supabase.from("user_branches").delete().eq("user_id", profile.id).eq("branch_id", branchId)
      : await supabase.from("user_branches").insert({ user_id: profile.id, branch_id: branchId });
    setBusyKey(null);
    if (updateError) {
      setError("Não foi possível atualizar a filial agora.");
      return;
    }
    setUserBranches((prev) =>
      has
        ? prev.filter((ub) => !(ub.user_id === profile.id && ub.branch_id === branchId))
        : [...prev, { user_id: profile.id, branch_id: branchId }]
    );
    router.refresh();
  }

  async function handleDepartmentChange(profile: Profile, department: string) {
    setError(null);
    setBusyKey(profile.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ department: department || null })
      .eq("id", profile.id);
    setBusyKey(null);
    if (updateError) {
      setError("Não foi possível atualizar o setor agora.");
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === profile.id ? { ...p, department: (department || null) as TaskDepartment | null } : p)),
    );
  }

  async function handleJobTitleChange(profile: Profile, jobTitleId: string) {
    setError(null);
    setBusyKey(profile.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ job_title_id: jobTitleId || null })
      .eq("id", profile.id);
    setBusyKey(null);
    if (updateError) {
      setError("Não foi possível atualizar a função agora.");
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, job_title_id: jobTitleId || null } : p)));
  }

  async function handleSetPassword(profile: Profile, password: string) {
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setError(null);
    setBusyKey(profile.id);
    try {
      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não foi possível redefinir a senha agora.");
        return;
      }
      setPasswordSetId(profile.id);
      setNewPasswordInput("");
      setTimeout(() => setPasswordSetId(null), 3000);
      setEditingPasswordId(null);
    } catch {
      setError("Não foi possível redefinir a senha agora.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTogglePermission(
    userId: string,
    table: "task_admin_permissions" | "protocol_cancel_permissions" | "report_access_permissions",
    ids: Set<string>,
    setIds: (updater: (prev: Set<string>) => Set<string>) => void,
  ) {
    setError(null);
    setBusyKey(`perm:${table}:${userId}`);
    const supabase = createClient();
    const has = ids.has(userId);
    const { error: permError } = has
      ? await supabase.from(table).delete().eq("user_id", userId)
      : await supabase.from(table).insert({ user_id: userId });
    setBusyKey(null);
    if (permError) {
      setError("Não foi possível atualizar essa permissão agora.");
      return;
    }
    setIds((prev) => {
      const next = new Set(prev);
      if (has) next.delete(userId);
      else next.add(userId);
      return next;
    });
    router.refresh();
  }

  async function handleToggleActive(profile: Profile) {
    setError(null);
    setBusyKey(profile.id);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("profiles").update({ active: !profile.active }).eq("id", profile.id);
    setBusyKey(null);
    if (updateError) {
      setError("Não foi possível atualizar agora.");
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, active: !p.active } : p)));
  }

  async function handleDelete(profile: Profile) {
    setDeleteErrorId(null);
    setBusyKey(`delete:${profile.id}`);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("delete_user_if_unreferenced", {
      p_user_id: profile.id,
    });
    setBusyKey(null);
    if (rpcError) {
      setDeleteErrorId({ id: profile.id, message: rpcError.message || "Não foi possível excluir agora." });
      setConfirmDeleteId(null);
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    setConfirmDeleteId(null);
    router.refresh();
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const visibleIds = filteredProfiles.map((p) => p.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...visibleIds]);
    });
  }

  async function handleBulkDeactivate() {
    setBulkError(null);
    setBulkBusy(true);
    const supabase = createClient();
    const ids = Array.from(selectedIds);
    const { error: updateError } = await supabase.from("profiles").update({ active: false }).in("id", ids);
    setBulkBusy(false);
    if (updateError) {
      setBulkError("Não foi possível inativar os selecionados agora.");
      return;
    }
    setProfiles((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, active: false } : p)));
    setSelectedIds(new Set());
    router.refresh();
  }

  async function handleBulkDelete() {
    setBulkError(null);
    setBulkBusy(true);
    const supabase = createClient();
    const ids = Array.from(selectedIds);
    const failures: string[] = [];
    const deletedIds: string[] = [];
    for (const id of ids) {
      const { error: rpcError } = await supabase.rpc("delete_user_if_unreferenced", { p_user_id: id });
      if (rpcError) {
        const name = profiles.find((p) => p.id === id)?.full_name ?? id;
        failures.push(name);
      } else {
        deletedIds.push(id);
      }
    }
    setBulkBusy(false);
    setProfiles((prev) => prev.filter((p) => !deletedIds.includes(p.id)));
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    if (failures.length > 0) {
      setBulkError(
        `${deletedIds.length} excluído(s). Não deu para excluir: ${failures.join(", ")} — têm registros vinculados (protocolos, tarefas etc.).`,
      );
    }
    router.refresh();
  }

  const visibleIds = filteredProfiles.map((p) => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Buscar</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, e-mail, setor ou função"
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Setor</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          >
            <option value="">Todos</option>
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Função</label>
          <select
            value={jobTitleFilter}
            onChange={(e) => setJobTitleFilter(e.target.value)}
            className="rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          >
            <option value="">Todas</option>
            {jobTitles.map((jt) => (
              <option key={jt.id} value={jt.id}>
                {jt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>}

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md bg-(--color-gray-50) px-3 py-2">
          <span className="text-xs font-medium text-(--color-graphite-700)">
            {selectedIds.size} selecionado(s)
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {bulkError && (
        <p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1.5 text-xs text-(--color-red-700)">{bulkError}</p>
      )}

      {filteredProfiles.length === 0 ? (
        <p className="text-sm text-(--color-graphite-500)">Nenhum usuário encontrado.</p>
      ) : (
        <>
          <label className="mb-1 flex items-center gap-2 border-b border-(--color-gray-100) pb-2 text-xs text-(--color-graphite-500)">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
            Selecionar todos
          </label>

          <ul className="divide-y divide-(--color-gray-100)">
            {filteredProfiles.map((p) => {
              const userRolesList = rolesForUser(p.id);
              const isExpanded = expandedId === p.id;
              const jtName = jobTitleName(p.job_title_id);
              return (
                <li key={p.id} className="py-2.5">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelected(p.id)}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <div>
                        <span className={p.active ? "text-sm text-(--color-graphite-700)" : "text-sm text-(--color-graphite-500) line-through"}>
                          {p.full_name}
                        </span>
                        <span className="ml-2 text-xs text-(--color-graphite-500)">{p.email}</span>
                        {p.active && userBranches.filter((ub) => ub.user_id === p.id).length === 0 && (
                          <span className="ml-2 rounded-full bg-(--color-red-50) px-2 py-0.5 text-xs font-medium text-(--color-red-600)">
                            ⚠ Sem filial — não vê protocolo nenhum
                          </span>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-(--color-graphite-500)">
                          {p.department && <span>{DEPARTMENT_LABELS[p.department]}</span>}
                          {p.department && jtName && <span>·</span>}
                          {jtName && <span>{jtName}</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {userRolesList.length === 0 ? (
                            <span className="text-xs text-(--color-graphite-500)">Sem papel atribuído</span>
                          ) : (
                            userRolesList.map((r) => (
                              <span key={r.id} className="rounded-full bg-(--color-gray-100) px-2 py-0.5 text-[10px] font-medium text-(--color-graphite-700)">
                                {ROLE_LABELS[r.name] ?? r.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Link
                          href={`/configuracoes/usuarios/${p.id}`}
                          className="text-xs font-medium text-(--color-red-600) hover:underline"
                        >
                          Central de Permissões
                        </Link>
                        <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
                          {isExpanded ? "Fechar" : "Gerenciar acesso"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {deleteErrorId?.id === p.id && (
                    <p className="ml-6 mt-2 rounded-md bg-(--color-red-50) px-2 py-1.5 text-xs text-(--color-red-700)">
                      {deleteErrorId.message}
                    </p>
                  )}

                  {isExpanded && (
                    <div className="ml-6 mt-3 rounded-md bg-(--color-gray-50) p-3">
                      <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">Papéis</p>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r) => {
                          const checked = userRolesList.some((ur) => ur.id === r.id);
                          const key = `${p.id}:${r.id}`;
                          return (
                            <label key={r.id} className="flex items-center gap-1 rounded-full border border-(--color-gray-200) bg-white px-2 py-1 text-xs text-(--color-graphite-700)">
                              <input type="checkbox" checked={checked} disabled={busyKey === key} onChange={() => toggleRole(p.id, r)} />
                              {ROLE_LABELS[r.name] ?? r.name}
                            </label>
                          );
                        })}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">
                            Filiais {userBranches.filter((ub) => ub.user_id === p.id).length === 0 && (
                              <span className="text-(--color-red-600)">— sem nenhuma!</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {branches.map((b) => {
                              const checked = userBranches.some((ub) => ub.user_id === p.id && ub.branch_id === b.id);
                              return (
                                <label
                                  key={b.id}
                                  className="flex items-center gap-1 rounded-full border border-(--color-gray-200) bg-white px-2 py-0.5 text-xs text-(--color-graphite-700)"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={busyKey === p.id}
                                    onChange={() => handleToggleBranch(p, b.id)}
                                  />
                                  {b.name}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">Setor</p>
                          <select
                            value={p.department ?? ""}
                            onChange={(e) => handleDepartmentChange(p, e.target.value)}
                            disabled={busyKey === p.id}
                            className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-xs outline-none focus:border-(--color-red-600)"
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
                          <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">Função</p>
                          <select
                            value={p.job_title_id ?? ""}
                            onChange={(e) => handleJobTitleChange(p, e.target.value)}
                            disabled={busyKey === p.id}
                            className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-xs outline-none focus:border-(--color-red-600)"
                          >
                            <option value="">Nenhuma</option>
                            {jobTitles.map((jt) => (
                              <option key={jt.id} value={jt.id}>
                                {jt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">
                          Parâmetros individuais
                        </p>
                        <p className="mb-2 text-xs text-(--color-graphite-500)">
                          Concede acesso a essa pessoa específica, além do que os papéis já dão.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <label className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
                            <input
                              type="checkbox"
                              checked={taskAdminIds.has(p.id)}
                              disabled={busyKey === `perm:task_admin_permissions:${p.id}`}
                              onChange={() =>
                                handleTogglePermission(p.id, "task_admin_permissions", taskAdminIds, setTaskAdminIds)
                              }
                            />
                            Tarefas avulsas e cutucadas
                          </label>
                          <label className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
                            <input
                              type="checkbox"
                              checked={cancelPermIds.has(p.id)}
                              disabled={busyKey === `perm:protocol_cancel_permissions:${p.id}`}
                              onChange={() =>
                                handleTogglePermission(
                                  p.id,
                                  "protocol_cancel_permissions",
                                  cancelPermIds,
                                  setCancelPermIds,
                                )
                              }
                            />
                            Cancelar com tarefas assumidas
                          </label>
                          <label className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
                            <input
                              type="checkbox"
                              checked={reportPermIds.has(p.id)}
                              disabled={busyKey === `perm:report_access_permissions:${p.id}`}
                              onChange={() =>
                                handleTogglePermission(
                                  p.id,
                                  "report_access_permissions",
                                  reportPermIds,
                                  setReportPermIds,
                                )
                              }
                            />
                            Ver Relatórios
                          </label>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-(--color-graphite-500)">
                        Nome, e-mail, senha e o acesso ao módulo ficam em Usuários do WG Hub (função Cancelamentos).
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
