"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserOption = { id: string; full_name: string };

/**
 * "Direcionar" uma tarefa que já existe para uma pessoa específica concluir.
 * Quem recebe é avisada (som + aviso na tela, como a cutucada), e a tarefa
 * continua visível ao setor, mas só ela (ou a administração) consegue agir.
 */
export function AssignTaskControl({
  taskId,
  assignedToUserId,
  canRemove,
}: {
  taskId: string;
  assignedToUserId: string | null;
  /** Só dá pra tirar o direcionamento se a tarefa tiver setor/função de
   * onde voltar (senão ela ficaria sem destinatário nenhum). */
  canRemove: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.rpc("search_task_assignable_users", { p_query: value.trim() });
    setResults((data ?? []) as UserOption[]);
  }

  async function handleAssign(userId: string | null) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("assign_task_to_user", {
      p_task_id: taskId,
      p_user_id: userId,
    });
    busyRef.current = false;
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível direcionar agora.");
      return;
    }
    setOpen(false);
    setQuery("");
    setResults([]);
    router.refresh();
  }

  return (
    <div className="relative inline-block" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-(--color-gray-200) bg-white px-2 py-0.5 text-xs font-medium text-(--color-graphite-700) hover:bg-(--color-gray-50)"
      >
        {assignedToUserId ? "Trocar pessoa" : "Direcionar a uma pessoa"}
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-72 rounded-lg border border-(--color-gray-200) bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Digite o nome da pessoa..."
            className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />

          <ul className="mt-1 max-h-48 overflow-y-auto">
            {results.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-(--color-graphite-500)">
                {query.trim() ? "Nada encontrado." : "Digite pra buscar..."}
              </li>
            ) : (
              results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAssign(u.id)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-(--color-gray-50) disabled:opacity-60"
                  >
                    {u.full_name}
                  </button>
                </li>
              ))
            )}
          </ul>

          {assignedToUserId && canRemove && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAssign(null)}
              className="mt-1 w-full rounded-md border-t border-(--color-gray-100) px-2 pt-2 text-left text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60"
            >
              Remover direcionamento (volta pro setor)
            </button>
          )}

          {error && (
            <p className="mt-1 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
