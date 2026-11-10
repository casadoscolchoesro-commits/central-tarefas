"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";

const TASK_DEPARTMENTS: TaskDepartment[] = [
  "fiscal",
  "financeiro",
  "logistica",
  "estoque",
  "sac",
  "vendas",
  "gerencia",
  "compras",
];

type ProtocolOption = { id: string; protocol_number: string };
type JobTitleOption = { id: string; name: string };
type UserOption = { id: string; full_name: string };
type TargetType = "department" | "job_title" | "user";

export function CreateTaskForm({
  fixedProtocol,
  currentUserId,
  restrictProtocolLinkToOwnSales,
  onDone,
  onCancel,
}: {
  /** Quando informado, a tarefa é sempre criada vinculada a este protocolo
   *  e a busca de protocolo não aparece (usado dentro da tela do protocolo).
   *  Nesse caso o direcionamento é sempre por setor, como as tarefas
   *  geradas automaticamente. */
  fixedProtocol?: ProtocolOption;
  currentUserId?: string;
  /** Vendedor sem papel de gerência: só pode vincular aos próprios
   * protocolos (venda em que ele é o vendedor). */
  restrictProtocolLinkToOwnSales?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<TargetType>("department");
  const [department, setDepartment] = useState<TaskDepartment>("vendas");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const [jobTitles, setJobTitles] = useState<JobTitleOption[] | null>(null);
  const [jobTitleId, setJobTitleId] = useState("");

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userBoxRef = useRef<HTMLDivElement>(null);

  const [linkProtocol, setLinkProtocol] = useState(false);
  const [protocolQuery, setProtocolQuery] = useState("");
  const [protocolResults, setProtocolResults] = useState<ProtocolOption[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolOption | null>(null);
  const [protocolDropdownOpen, setProtocolDropdownOpen] = useState(false);
  const protocolBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userBoxRef.current && !userBoxRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
      if (protocolBoxRef.current && !protocolBoxRef.current.contains(e.target as Node)) setProtocolDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function ensureJobTitlesLoaded() {
    if (jobTitles !== null) return;
    const supabase = createClient();
    const { data } = await supabase.from("job_titles").select("id, name").eq("active", true).order("name");
    setJobTitles(data ?? []);
  }

  async function handleUserQueryChange(value: string) {
    setUserQuery(value);
    setUserDropdownOpen(true);
    if (!value.trim()) {
      setUserResults([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.rpc("search_task_assignable_users", { p_query: value.trim() });
    setUserResults(data ?? []);
  }

  async function handleProtocolQueryChange(value: string) {
    setProtocolQuery(value);
    setProtocolDropdownOpen(true);
    if (!value.trim()) {
      setProtocolResults([]);
      return;
    }
    const supabase = createClient();
    let data: ProtocolOption[] | null = null;
    if (restrictProtocolLinkToOwnSales && currentUserId) {
      // Os que a pessoa abriu + os de vendas em que ela é a vendedora.
      const res = await supabase
        .from("protocols")
        .select("id, protocol_number")
        .ilike("protocol_number", `%${value.trim()}%`)
        .or(`opened_by.eq.${currentUserId},salesperson_id.eq.${currentUserId}`)
        .order("opened_at", { ascending: false })
        .limit(8);
      data = res.data ?? [];
    } else {
      const res = await supabase
        .from("protocols")
        .select("id, protocol_number")
        .ilike("protocol_number", `%${value.trim()}%`)
        .order("opened_at", { ascending: false })
        .limit(8);
      data = res.data ?? [];
    }
    setProtocolResults(data ?? []);
  }

  async function handleCreate() {
    if (!description.trim()) {
      setError("Descreva a tarefa.");
      return;
    }
    if (!fixedProtocol) {
      if (targetType === "job_title" && !jobTitleId) {
        setError("Escolha a função.");
        return;
      }
      if (targetType === "user" && !selectedUser) {
        setError("Escolha a pessoa.");
        return;
      }
    }
    // Trava imediata contra clique duplo (não espera o React re-renderizar).
    if (creatingRef.current) return;
    creatingRef.current = true;
    setError(null);
    setCreating(true);
    const supabase = createClient();
    const protocolId = fixedProtocol?.id ?? (linkProtocol ? (selectedProtocol?.id ?? null) : null);

    const useDepartment = fixedProtocol || targetType === "department";
    const { error: rpcError } = await supabase.rpc("create_standalone_task", {
      p_description: description.trim(),
      p_department: useDepartment ? department : null,
      p_protocol_id: protocolId,
      p_assigned_to_job_title_id: !fixedProtocol && targetType === "job_title" ? jobTitleId : null,
      p_assigned_to_user_id: !fixedProtocol && targetType === "user" ? selectedUser?.id : null,
    });
    creatingRef.current = false;
    setCreating(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível criar a tarefa agora.");
      return;
    }
    setDescription("");
    setSelectedProtocol(null);
    setProtocolQuery("");
    setProtocolResults([]);
    setLinkProtocol(false);
    setJobTitleId("");
    setSelectedUser(null);
    setUserQuery("");
    setUserResults([]);
    router.refresh();
    onDone();
  }

  const targetClass = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-xs font-medium ${
      active
        ? "border-(--color-red-600) bg-(--color-red-50) text-(--color-red-600)"
        : "border-(--color-gray-200) bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50)"
    }`;

  return (
    <div className="rounded-lg border border-(--color-gray-200) bg-white p-4">
      <p className="mb-3 text-sm font-medium text-(--color-graphite-900)">
        {fixedProtocol ? `Nova tarefa — ${fixedProtocol.protocol_number}` : "Nova tarefa avulsa"}
      </p>

      {!fixedProtocol && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Direcionar para
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTargetType("department")} className={targetClass(targetType === "department")}>
              Setor
            </button>
            <button
              type="button"
              onClick={() => { setTargetType("job_title"); ensureJobTitlesLoaded(); }}
              className={targetClass(targetType === "job_title")}
            >
              Função
            </button>
            <button type="button" onClick={() => setTargetType("user")} className={targetClass(targetType === "user")}>
              Pessoa
            </button>
          </div>
          <p className="mt-1 text-xs text-(--color-graphite-500)">
            {targetType === "department" && "Todo o setor pode ver e assumir a tarefa."}
            {targetType === "job_title" && "Só quem tem essa função pode ver a tarefa."}
            {targetType === "user" && "Só essa pessoa pode ver a tarefa."}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(fixedProtocol || targetType === "department") && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Setor</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as TaskDepartment)}
              className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
            >
              {TASK_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
        )}

        {!fixedProtocol && targetType === "job_title" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Função</label>
            <select
              value={jobTitleId}
              onChange={(e) => setJobTitleId(e.target.value)}
              className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
            >
              <option value="">Selecione...</option>
              {(jobTitles ?? []).map((jt) => (
                <option key={jt.id} value={jt.id}>
                  {jt.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!fixedProtocol && targetType === "user" && (
          <div className="relative sm:col-span-2" ref={userBoxRef}>
            <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Pessoa</label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-md border border-(--color-gray-200) bg-(--color-gray-50) px-2 py-1.5 text-sm">
                <span className="text-(--color-graphite-700)">{selectedUser.full_name}</span>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={userQuery}
                  onChange={(e) => handleUserQueryChange(e.target.value)}
                  onFocus={() => setUserDropdownOpen(true)}
                  placeholder="Digite o nome da pessoa..."
                  className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
                />
                {userDropdownOpen && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-(--color-gray-200) bg-white shadow-lg">
                    {userResults.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-(--color-graphite-500)">
                        {userQuery.trim() ? "Nada encontrado." : "Digite pra buscar..."}
                      </li>
                    ) : (
                      userResults.map((u) => (
                        <li key={u.id}>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setUserResults([]);
                              setUserQuery("");
                              setUserDropdownOpen(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-(--color-gray-50)"
                          >
                            {u.full_name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Descrição</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Organizar mostruário da vitrine"
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
      </div>

      {!fixedProtocol && (
        <div className="mt-3">
          <label className="flex items-center gap-2 text-xs text-(--color-graphite-700)">
            <input
              type="checkbox"
              checked={linkProtocol}
              onChange={(e) => {
                setLinkProtocol(e.target.checked);
                if (!e.target.checked) {
                  setSelectedProtocol(null);
                  setProtocolQuery("");
                  setProtocolResults([]);
                }
              }}
            />
            Vincular a um protocolo existente
            {restrictProtocolLinkToOwnSales && " (só os seus)"}
          </label>

          {linkProtocol && (
            <div className="relative mt-2 rounded-md bg-(--color-gray-50) p-3" ref={protocolBoxRef}>
              {selectedProtocol ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="protocol-stamp text-(--color-graphite-700)">
                    {selectedProtocol.protocol_number}
                  </span>
                  <button
                    onClick={() => setSelectedProtocol(null)}
                    className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={protocolQuery}
                    onChange={(e) => handleProtocolQueryChange(e.target.value)}
                    onFocus={() => setProtocolDropdownOpen(true)}
                    placeholder="Digite o número do protocolo..."
                    className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
                  />
                  {protocolDropdownOpen && (
                    <ul className="absolute left-3 right-3 z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-(--color-gray-200) bg-white shadow-lg">
                      {protocolResults.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-(--color-graphite-500)">
                          {protocolQuery.trim() ? "Nada encontrado." : "Digite pra buscar..."}
                        </li>
                      ) : (
                        protocolResults.map((p) => (
                          <li key={p.id}>
                            <button
                              onClick={() => {
                                setSelectedProtocol(p);
                                setProtocolResults([]);
                                setProtocolDropdownOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-sm hover:bg-(--color-gray-50)"
                            >
                              <span className="protocol-stamp">{p.protocol_number}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
        >
          {creating ? "Criando..." : "Criar tarefa"}
        </button>
        <button onClick={onCancel} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
          Cancelar
        </button>
      </div>
    </div>
  );
}
