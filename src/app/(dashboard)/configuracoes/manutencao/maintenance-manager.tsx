"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MaintenanceManager({
  initialEnabled,
  initialMessage,
  updatedAt,
  updatedByName,
}: {
  initialEnabled: boolean;
  initialMessage: string;
  updatedAt: string | null;
  updatedByName: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState(initialMessage);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function apply(nextEnabled: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_maintenance_mode", {
      p_enabled: nextEnabled,
      p_message: message.trim() || null,
    });
    busyRef.current = false;
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível alterar agora.");
      return;
    }
    setEnabled(nextEnabled);
    setConfirming(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section
        className={`rounded-lg border p-5 ${
          enabled ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-(--color-graphite-500)">Situação agora</p>
        <p className={`mt-1 text-xl font-medium ${enabled ? "text-amber-800" : "text-emerald-700"}`}>
          {enabled ? "Sistema TRAVADO para manutenção" : "Sistema liberado"}
        </p>
        {updatedAt && (
          <p className="mt-1 text-xs text-(--color-graphite-500)">
            Última alteração{updatedByName ? ` por ${updatedByName}` : ""} em{" "}
            {new Date(updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
          Mensagem para os usuários (opcional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Ex.: Atualização rápida do sistema. Voltamos em cerca de 10 minutos."
          className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
        />
        <p className="mt-1 text-xs text-(--color-graphite-500)">
          Se ficar em branco, aparece um aviso padrão. A mensagem vale a partir do momento em que você travar.
        </p>

        {error && (
          <p className="mt-3 rounded-md bg-(--color-red-50) px-3 py-2 text-sm text-(--color-red-700)">{error}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!enabled ? (
            confirming ? (
              <>
                <span className="text-sm text-(--color-red-700)">
                  Isso bloqueia todos os usuários, menos administradores, agora mesmo. Confirmar?
                </span>
                <button
                  onClick={() => apply(true)}
                  disabled={busy}
                  className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
                >
                  {busy ? "Travando..." : "Sim, travar"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="text-sm text-(--color-graphite-500) hover:text-(--color-graphite-700)"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700)"
              >
                Travar sistema
              </button>
            )
          ) : (
            <>
              <button
                onClick={() => apply(false)}
                disabled={busy}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {busy ? "Liberando..." : "Liberar sistema"}
              </button>
              <button
                onClick={() => apply(true)}
                disabled={busy}
                className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60"
              >
                Atualizar mensagem
              </button>
            </>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5 text-sm text-(--color-graphite-700)">
        <h2 className="mb-2 text-sm font-medium text-(--color-graphite-900)">Como usar numa atualização</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Trave o sistema. Os usuários veem o aviso na hora, na tela que já estiverem usando.</li>
          <li>Faça o deploy (e as mudanças de banco, se houver).</li>
          <li>Confira que está tudo certo — você, como administrador, continua com acesso.</li>
          <li>Libere. Quem estiver com a tela aberta recebe o aviso de nova versão, se tiver saído uma.</li>
        </ol>
        <p className="mt-3 text-xs text-(--color-graphite-500)">
          Se no fim não precisar fazer o deploy, é só liberar de novo — nada se perde. Enquanto está travado,
          ninguém além de administradores consegue gravar nada, nem com uma tela antiga aberta.
        </p>
      </section>
    </div>
  );
}
