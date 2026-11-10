"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BUILD_ID } from "@/lib/build-id";

type State = { enabled: boolean; message: string | null };

const DEFAULT_MESSAGE =
  "Estamos atualizando o sistema. Em instantes ele será liberado — você não precisa recarregar a página.";

export function MaintenanceGate({ initial, isAdmin }: { initial: State; isAdmin: boolean }) {
  const [state, setState] = useState<State>(initial);
  const [newVersion, setNewVersion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasEnabledRef = useRef(initial.enabled);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId?: string };
      if (buildId && buildId !== BUILD_ID) setNewVersion(true);
    } catch {
      // sem rede agora — tenta de novo na próxima checagem
    }
  }, []);

  // Estado da manutenção: ao vivo + consulta de reforço (mesmo padrão dos
  // outros avisos — se a conexão em tempo real cair, ainda chega).
  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data } = await supabase
        .from("maintenance_mode")
        .select("enabled, message")
        .eq("id", 1)
        .maybeSingle();
      if (data) setState({ enabled: data.enabled, message: data.message });
    }

    const channel = supabase
      .channel("maintenance-mode")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_mode" }, (payload) => {
        const row = payload.new as Partial<State> | null;
        if (row && typeof row.enabled === "boolean") {
          setState({ enabled: row.enabled, message: row.message ?? null });
        }
      })
      .subscribe();

    const poll = setInterval(refresh, 10000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  // Versão: confere a cada minuto, e na hora em que o sistema é liberado
  // (é nesse momento que costuma ter versão nova no ar).
  useEffect(() => {
    checkVersion();
    const t = setInterval(checkVersion, 60000);
    return () => clearInterval(t);
  }, [checkVersion]);

  useEffect(() => {
    if (wasEnabledRef.current && !state.enabled) checkVersion();
    wasEnabledRef.current = state.enabled;
  }, [state.enabled, checkVersion]);

  async function handleRelease() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_maintenance_mode", { p_enabled: false });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível liberar agora.");
      return;
    }
    setState((s) => ({ ...s, enabled: false }));
  }

  // Usuário comum: quadro que cobre a tela inteira enquanto durar.
  if (state.enabled && !isAdmin) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Sistema em manutenção"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm"
      >
        <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
            🛠️
          </div>
          <h2 className="text-lg font-medium text-(--color-graphite-900)">Sistema em manutenção</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-(--color-graphite-700)">
            {state.message || DEFAULT_MESSAGE}
          </p>
          <p className="mt-4 animate-pulse text-xs text-(--color-graphite-500)">
            Esta tela libera sozinha assim que o sistema voltar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Administrador: continua com acesso, mas nunca esquece que está travado. */}
      {state.enabled && isAdmin && (
        <div className="sticky top-0 z-[90] flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900">
          <span>
            <strong>Modo manutenção ligado</strong> — os usuários estão bloqueados. Você continua com acesso.
          </span>
          <span className="flex items-center gap-3">
            {error && <span className="text-xs text-(--color-red-700)">{error}</span>}
            <Link href="/configuracoes/manutencao" className="text-xs underline">
              Configurar aviso
            </Link>
            <button
              onClick={handleRelease}
              disabled={busy}
              className="rounded-md bg-amber-900 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {busy ? "Liberando..." : "Liberar sistema"}
            </button>
          </span>
        </div>
      )}

      {/* Saiu uma versão nova enquanto a tela estava aberta. */}
      {newVersion && !(state.enabled && !isAdmin) && (
        <div className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900 shadow-lg">
          <span>Saiu uma nova versão do sistema.</span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-sky-700 px-3 py-1 text-xs font-medium text-white hover:bg-sky-800"
          >
            Atualizar agora
          </button>
        </div>
      )}
    </>
  );
}
