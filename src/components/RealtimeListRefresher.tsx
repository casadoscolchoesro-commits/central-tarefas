"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";

export function RealtimeListRefresher({
  table,
  channelName,
  filter,
}: {
  table: string;
  channelName: string;
  /** Filtro opcional do Realtime do Supabase, ex.: "protocol_id=eq.<uuid>".
   * Sem isso, escuta qualquer mudança na tabela inteira. */
  filter?: string;
}) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "cancelamentos", table, ...(filter ? { filter } : {}) },
        () => {
          // Várias mudanças podem chegar quase juntas (ex.: aprovar um
          // protocolo gera várias tarefas de uma vez) — agrupa num só
          // refresh em vez de recarregar a lista repetidas vezes.
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => router.refresh(), 400);
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, channelName, filter]);

  return null;
}
