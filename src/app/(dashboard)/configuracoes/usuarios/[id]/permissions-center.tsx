"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/role-labels";
import { departmentsForRoles, DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { NAV_ITEMS } from "@/lib/nav";
import type { RoleName } from "@/lib/current-user";

type Role = { id: string; name: string };
type Branch = { id: string; name: string };
type JobTitle = { id: string; name: string; active: boolean };
type JobTitleDetail = {
  id: string;
  name: string;
  protocol_visibility_scope: "own" | "department" | "all";
  task_visibility_scope: "own" | "department" | "all";
  feature_access: Record<string, boolean> | null;
};
type Profile = {
  id: string;
  full_name: string;
  email: string;
  active: boolean;
  department: TaskDepartment | null;
  job_title_id: string | null;
  job_titles: JobTitleDetail | JobTitleDetail[] | null;
};

const SCOPE_LABELS: Record<string, string> = { own: "Própria", department: "Por setor", all: "Geral" };

function asOne<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export function PermissionsCenter({
  profile,
  roles,
  jobTitles,
  branches,
  initialRoleIds,
  initialBranchIds,
  initialTaskAdmin,
  initialCancelPerm,
  initialReportPerm,
  initialAssignPerm,
}: {
  profile: Profile;
  roles: Role[];
  jobTitles: JobTitle[];
  branches: Branch[];
  initialRoleIds: string[];
  initialBranchIds: string[];
  initialTaskAdmin: boolean;
  initialCancelPerm: boolean;
  initialReportPerm: boolean;
  initialAssignPerm: boolean;
}) {
  const router = useRouter();
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set(initialRoleIds));
  const [branchIds, setBranchIds] = useState<Set<string>>(new Set(initialBranchIds));
  const [jobTitleId, setJobTitleId] = useState(profile.job_title_id ?? "");
  const [taskAdmin, setTaskAdmin] = useState(initialTaskAdmin);
  const [cancelPerm, setCancelPerm] = useState(initialCancelPerm);
  const [reportPerm, setReportPerm] = useState(initialReportPerm);
  const [assignPerm, setAssignPerm] = useState(initialAssignPerm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobTitleDetail = asOne(profile.job_titles);
  const myRoleNames = roles.filter((r) => roleIds.has(r.id)).map((r) => r.name as RoleName);
  const myDepartments = departmentsForRoles(myRoleNames);
  const isBroad = myRoleNames.includes("administrador") || myRoleNames.includes("gerencia_geral");

  async function toggleRole(role: Role) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const has = roleIds.has(role.id);
    const { error: err } = has
      ? await supabase.from("user_roles").delete().eq("user_id", profile.id).eq("role_id", role.id)
      : await supabase.from("user_roles").insert({ user_id: profile.id, role_id: role.id });
    setBusy(false);
    if (err) return setError("Não foi possível atualizar o papel agora.");
    setRoleIds((prev) => {
      const next = new Set(prev);
      has ? next.delete(role.id) : next.add(role.id);
      return next;
    });
    router.refresh();
  }

  async function toggleBranch(branch: Branch) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const has = branchIds.has(branch.id);
    const { error: err } = has
      ? await supabase.from("user_branches").delete().eq("user_id", profile.id).eq("branch_id", branch.id)
      : await supabase.from("user_branches").insert({ user_id: profile.id, branch_id: branch.id });
    setBusy(false);
    if (err) return setError("Não foi possível atualizar a filial agora.");
    setBranchIds((prev) => {
      const next = new Set(prev);
      has ? next.delete(branch.id) : next.add(branch.id);
      return next;
    });
    router.refresh();
  }

  async function handleJobTitleChange(value: string) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("profiles")
      .update({ job_title_id: value || null })
      .eq("id", profile.id);
    setBusy(false);
    if (err) return setError("Não foi possível atualizar a função agora.");
    setJobTitleId(value);
    router.refresh();
  }

  async function togglePermission(
    table: "task_admin_permissions" | "protocol_cancel_permissions" | "report_access_permissions" | "task_assign_permissions",
    current: boolean,
    setter: (v: boolean) => void,
  ) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: err } = current
      ? await supabase.from(table).delete().eq("user_id", profile.id)
      : await supabase.from(table).insert({ user_id: profile.id });
    setBusy(false);
    if (err) return setError("Não foi possível atualizar agora.");
    setter(!current);
    router.refresh();
  }

  const visibleMenuLabels = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.some((r) => myRoleNames.includes(r))) return false;
    if (jobTitleDetail?.feature_access && jobTitleDetail.feature_access[item.href] === false) return false;
    return true;
  }).map((i) => i.label);

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-(--color-red-50) px-3 py-2 text-sm text-(--color-red-700)">{error}</p>
      )}

      {/* Diagnóstico — resumo em linguagem simples do que tudo abaixo resulta */}
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="mb-2 text-sm font-medium text-(--color-graphite-900)">Diagnóstico</h2>
        <ul className="space-y-1 text-sm text-(--color-graphite-700)">
          <li>
            <strong>Filiais:</strong>{" "}
            {isBroad
              ? "todas (papel de administração/gerência geral)"
              : branchIds.size === 0
                ? <span className="font-medium text-(--color-red-600)">nenhuma — não vê protocolo nenhum</span>
                : branches.filter((b) => branchIds.has(b.id)).map((b) => b.name).join(", ")}
          </li>
          <li>
            <strong>Setores de atuação:</strong>{" "}
            {myDepartments === "all"
              ? "todos"
              : myDepartments.length === 0
                ? "nenhum (não assume tarefa de setor nenhum)"
                : myDepartments.map((d) => DEPARTMENT_LABELS[d]).join(", ")}
          </li>
          <li>
            <strong>Alcance de protocolos/tarefas:</strong>{" "}
            {isBroad
              ? "geral (sempre, por papel)"
              : jobTitleDetail
                ? `${SCOPE_LABELS[jobTitleDetail.protocol_visibility_scope]} / ${SCOPE_LABELS[jobTitleDetail.task_visibility_scope]}`
                : "sem função definida — usando o padrão do sistema"}
          </li>
          <li>
            <strong>Menu visível:</strong> {visibleMenuLabels.join(", ") || "nada"}
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Papel</h2>
        <p className="mb-3 text-xs text-(--color-graphite-500)">
          O que a pessoa pode fazer — setor de atuação e ações (assumir/concluir tarefa, aprovar).
        </p>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
              <input type="checkbox" checked={roleIds.has(r.id)} disabled={busy} onChange={() => toggleRole(r)} />
              {ROLE_LABELS[r.name] ?? r.name}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Função</h2>
        <p className="mb-3 text-xs text-(--color-graphite-500)">
          O que a pessoa vê — alcance de protocolos/tarefas e itens de menu. Editar o alcance e o
          menu de cada função fica em{" "}
          <Link href="/configuracoes/funcoes" className="text-(--color-red-600) hover:underline">
            Configurações → Funções
          </Link>
          .
        </p>
        <select
          value={jobTitleId}
          onChange={(e) => handleJobTitleChange(e.target.value)}
          disabled={busy}
          className="rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
        >
          <option value="">Nenhuma</option>
          {jobTitles.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.name}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Filiais</h2>
        <p className="mb-3 text-xs text-(--color-graphite-500)">
          Quais lojas essa pessoa consegue ver protocolos e tarefas. Sem nenhuma marcada, ela não
          vê nada (a não ser que o papel seja administrador/gerência geral).
        </p>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
              <input type="checkbox" checked={branchIds.has(b.id)} disabled={busy} onChange={() => toggleBranch(b)} />
              {b.name}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Parâmetros individuais</h2>
        <p className="mb-3 text-xs text-(--color-graphite-500)">
          Concede acesso a essa pessoa específica, além do que Papel e Função já dão.
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
            <input
              type="checkbox"
              checked={taskAdmin}
              disabled={busy}
              onChange={() => togglePermission("task_admin_permissions", taskAdmin, setTaskAdmin)}
            />
            Tarefas avulsas e cutucadas
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
            <input
              type="checkbox"
              checked={cancelPerm}
              disabled={busy}
              onChange={() => togglePermission("protocol_cancel_permissions", cancelPerm, setCancelPerm)}
            />
            Cancelar com tarefas assumidas
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
            <input
              type="checkbox"
              checked={reportPerm}
              disabled={busy}
              onChange={() => togglePermission("report_access_permissions", reportPerm, setReportPerm)}
            />
            Ver Relatórios
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-(--color-gray-200) bg-white px-2.5 py-1 text-xs text-(--color-graphite-700)">
            <input
              type="checkbox"
              checked={assignPerm}
              disabled={busy}
              onChange={() => togglePermission("task_assign_permissions", assignPerm, setAssignPerm)}
            />
            Direcionar tarefas
          </label>
        </div>
        <p className="mt-2 text-xs text-(--color-graphite-500)">
          &quot;Direcionar tarefas&quot; deixa a pessoa escolher quem vai concluir uma tarefa já criada. Administrador e
          gerência geral já podem, sem precisar marcar.
        </p>
      </section>
    </div>
  );
}
