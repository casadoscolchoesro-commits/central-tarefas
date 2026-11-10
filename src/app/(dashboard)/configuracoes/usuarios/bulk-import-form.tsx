"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { ROLE_LABELS } from "@/lib/role-labels";

type Role = { id: string; name: string };
type JobTitle = { id: string; name: string };

type ParsedRow = {
  fullName: string;
  email: string;
  password: string;
  passwordWasGenerated: boolean;
  department: string;
  jobTitleId: string;
  roleIds: string[];
};
type RowResult = ParsedRow & { status: "pendente" | "ok" | "erro"; message?: string };

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_LABELS) as TaskDepartment[];

function randomPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function matchDepartment(text: string): string {
  const t = text.trim().toLowerCase();
  if (!t) return "";
  const found = DEPARTMENT_OPTIONS.find(
    (d) => d === t || DEPARTMENT_LABELS[d].toLowerCase() === t,
  );
  return found ?? "";
}

function matchJobTitle(text: string, jobTitles: JobTitle[]): string {
  const t = text.trim().toLowerCase();
  if (!t) return "";
  const found = jobTitles.find((jt) => jt.name.toLowerCase() === t);
  return found?.id ?? "";
}

function matchRoles(text: string, roles: Role[]): string[] {
  if (!text.trim()) return [];
  const parts = text
    .split(/[,;/]/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const ids: string[] = [];
  for (const part of parts) {
    const found = roles.find(
      (r) => r.name.toLowerCase() === part || (ROLE_LABELS[r.name] ?? r.name).toLowerCase() === part,
    );
    if (found) ids.push(found.id);
  }
  return ids;
}

function normalizeRow(raw: Record<string, unknown>, jobTitles: JobTitle[], roles: Role[]): ParsedRow | null {
  const norm: Record<string, string> = {};
  for (const key of Object.keys(raw)) {
    norm[key.trim().toLowerCase()] = String(raw[key] ?? "").trim();
  }
  const fullName = norm["nome"] || norm["nome completo"] || "";
  const email = (norm["email"] || norm["e-mail"] || "").toLowerCase();
  const rawPassword = norm["senha"] || "";
  const rawDepartment = norm["setor"] || "";
  const rawJobTitle = norm["função"] || norm["funcao"] || norm["cargo"] || "";
  const rawRoles = norm["papéis"] || norm["papeis"] || norm["papéis de aprovação"] || norm["papeis de aprovacao"] || "";
  if (!fullName && !email) return null;
  return {
    fullName,
    email,
    password: rawPassword || randomPassword(),
    passwordWasGenerated: !rawPassword,
    department: matchDepartment(rawDepartment),
    jobTitleId: matchJobTitle(rawJobTitle, jobTitles),
    roleIds: matchRoles(rawRoles, roles),
  };
}

export function BulkImportForm({ jobTitles, roles }: { jobTitles: JobTitle[]; roles: Role[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RowResult[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function handleDownloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "Email", "Senha", "Setor", "Função", "Papéis"],
      ["Maria da Silva", "maria@example.com", "", "Vendas", "Vendedor", "vendedor"],
      ["João Souza", "joao@example.com", "umaSenh@123", "Logística", "Motorista", ""],
      [],
      ["Papéis válidos (separe com vírgula se for mais de um):"],
      ...roles.map((r) => [`${r.name} (${ROLE_LABELS[r.name] ?? r.name})`]),
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuários");
    XLSX.writeFile(wb, "modelo-cadastro-usuarios.xlsx");
  }

  async function handleFile(file: File | undefined) {
    setParseError(null);
    setDone(false);
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
      const parsed = json
        .map((r) => normalizeRow(r, jobTitles, roles))
        .filter((r): r is ParsedRow => r !== null);
      if (parsed.length === 0) {
        setParseError(
          "Não encontrei nenhuma linha com Nome/Email. Confira se a primeira linha da planilha tem os cabeçalhos Nome, Email, Senha, Setor e Função.",
        );
        setRows([]);
        return;
      }
      setRows(parsed.map((r) => ({ ...r, status: "pendente" as const })));
    } catch {
      setParseError("Não foi possível ler esse arquivo. Envie um .xlsx ou .csv válido.");
      setRows([]);
    }
  }

  function updateRow(index: number, patch: Partial<RowResult>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleImportAll() {
    setRunning(true);
    setDone(false);
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      const row = next[i];
      if (!row.fullName || !row.email) {
        next[i] = { ...row, status: "erro", message: "Nome ou e-mail em branco." };
        setRows([...next]);
        continue;
      }
      if (!row.jobTitleId) {
        next[i] = { ...row, status: "erro", message: "Função obrigatória — selecione na lista." };
        setRows([...next]);
        continue;
      }
      try {
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: row.fullName,
            email: row.email,
            password: row.password,
            department: row.department || null,
            jobTitleId: row.jobTitleId || null,
            roleIds: row.roleIds,
          }),
        });
        const data = await res.json();
        next[i] = res.ok
          ? { ...row, status: "ok" }
          : { ...row, status: "erro", message: data.error ?? "Falha desconhecida." };
      } catch {
        next[i] = { ...row, status: "erro", message: "Não foi possível falar com o servidor." };
      }
      setRows([...next]);
    }
    setRunning(false);
    setDone(true);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50)"
      >
        Cadastro em massa (Excel)
      </button>
    );
  }

  const okCount = rows.filter((r) => r.status === "ok").length;
  const errorCount = rows.filter((r) => r.status === "erro").length;

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-(--color-graphite-900)">Cadastro em massa</p>
          <p className="text-xs text-(--color-graphite-500)">
            Planilha com colunas <strong>Nome</strong>, <strong>Email</strong>,{" "}
            <strong>Senha</strong> (opcional), <strong>Setor</strong> e <strong>Função</strong>{" "}
            (obrigatória — dá pra ajustar em lista suspensa antes de confirmar).
          </p>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setRows([]);
            setDone(false);
          }}
          className="shrink-0 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          Fechar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleDownloadTemplate}
          className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50)"
        >
          Baixar modelo (.xlsx)
        </button>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="block text-xs text-(--color-graphite-700) file:mr-3 file:rounded-md file:border-0 file:bg-(--color-red-600) file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-(--color-red-700)"
        />
      </div>

      {parseError && (
        <p className="mt-3 rounded-md bg-(--color-red-50) px-2 py-1.5 text-xs text-(--color-red-700)">
          {parseError}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-(--color-graphite-500)">
              {rows.length} linha(s) encontradas.
              {done && ` ${okCount} criada(s), ${errorCount} com erro.`}
            </p>
            {!done && (
              <button
                onClick={handleImportAll}
                disabled={running}
                className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
              >
                {running ? "Cadastrando..." : `Cadastrar ${rows.length} usuário(s)`}
              </button>
            )}
          </div>

          <div className="max-h-[28rem] overflow-y-auto rounded-md border border-(--color-gray-200)">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-(--color-gray-50)">
                <tr className="text-left text-(--color-graphite-500)">
                  <th className="px-2 py-1.5 font-medium">Nome</th>
                  <th className="px-2 py-1.5 font-medium">E-mail</th>
                  <th className="px-2 py-1.5 font-medium">Senha</th>
                  <th className="px-2 py-1.5 font-medium">Setor</th>
                  <th className="px-2 py-1.5 font-medium">Função</th>
                  <th className="px-2 py-1.5 font-medium">Papéis</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-gray-100)">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5 text-(--color-graphite-700)">{r.fullName || "—"}</td>
                    <td className="px-2 py-1.5 text-(--color-graphite-700)">{r.email || "—"}</td>
                    <td className="px-2 py-1.5">
                      <span className="protocol-stamp text-(--color-graphite-700)">{r.password}</span>
                      {r.passwordWasGenerated && (
                        <span className="ml-1 text-(--color-graphite-500)">(gerada)</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.department}
                        disabled={done}
                        onChange={(e) => updateRow(i, { department: e.target.value })}
                        className="rounded-md border border-(--color-gray-200) bg-white px-1.5 py-1 text-xs outline-none focus:border-(--color-red-600)"
                      >
                        <option value="">—</option>
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {DEPARTMENT_LABELS[d]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.jobTitleId}
                        disabled={done}
                        onChange={(e) => updateRow(i, { jobTitleId: e.target.value })}
                        className="rounded-md border border-(--color-gray-200) bg-white px-1.5 py-1 text-xs outline-none focus:border-(--color-red-600)"
                      >
                        <option value="">—</option>
                        {jobTitles.map((jt) => (
                          <option key={jt.id} value={jt.id}>
                            {jt.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        multiple
                        value={r.roleIds}
                        disabled={done}
                        onChange={(e) =>
                          updateRow(i, {
                            roleIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                          })
                        }
                        size={Math.min(roles.length, 4)}
                        className="w-36 rounded-md border border-(--color-gray-200) bg-white px-1.5 py-1 text-xs outline-none focus:border-(--color-red-600)"
                      >
                        {roles.map((r2) => (
                          <option key={r2.id} value={r2.id}>
                            {ROLE_LABELS[r2.name] ?? r2.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      {r.status === "pendente" && (
                        <span className="text-(--color-graphite-500)">Aguardando</span>
                      )}
                      {r.status === "ok" && <span className="text-(--color-success)">Criado</span>}
                      {r.status === "erro" && (
                        <span className="text-(--color-red-600)" title={r.message}>
                          Erro{r.message ? `: ${r.message}` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {done && okCount > 0 && (
            <p className="mt-2 text-xs text-(--color-graphite-500)">
              Anote as senhas geradas antes de fechar — elas não ficam salvas em nenhum lugar
              visível depois disso. Combine com cada pessoa para trocar a senha no primeiro
              acesso.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
