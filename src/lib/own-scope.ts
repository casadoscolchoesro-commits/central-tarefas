import type { SupabaseClient } from "@supabase/supabase-js";

// Quem tem alcance "própria" enxerga como seus:
//  1) os protocolos que ele mesmo abriu;
//  2) os protocolos de vendas em que ele é o vendedor (muitas vezes quem
//     abre o protocolo é o SAC, em nome do vendedor);
//  3) os protocolos em que ele tem uma tarefa direcionada ou assumida
//     (senão a tarefa chegaria nele e o protocolo ficaria fechado).
//
// Esta regra fica só aqui, pra Painel, Central de Protocolos, tela do
// protocolo e tela de Tarefas nunca divergirem entre si.

/** Texto de filtro `.or(...)` do PostgREST para a lista de protocolos. */
export async function getOwnProtocolOrFilter(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("tasks")
    .select("protocol_id")
    .not("protocol_id", "is", null)
    .or(`assigned_to_user_id.eq.${userId},claimed_by.eq.${userId}`)
    .limit(300);

  const ids = Array.from(new Set((data ?? []).map((r) => r.protocol_id as string)));
  const parts = [`opened_by.eq.${userId}`, `salesperson_id.eq.${userId}`];
  if (ids.length > 0) parts.push(`id.in.(${ids.join(",")})`);
  return parts.join(",");
}

/** Versão para um protocolo já carregado (os dois primeiros critérios). */
export function isOwnProtocol(
  protocol: { opened_by: string | null; salesperson_id?: string | null },
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  return protocol.opened_by === userId || protocol.salesperson_id === userId;
}

/** A tarefa está direcionada ou assumida por esta pessoa. */
export function isTaskMine(
  task: { assigned_to_user_id?: string | null; claimed_by?: string | null },
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  return task.assigned_to_user_id === userId || task.claimed_by === userId;
}
