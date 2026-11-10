"use client";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProtocolBadge } from "@/components/ProtocolBadge";
import { ROLE_LABELS } from "@/lib/current-user";
import { RealtimeListRefresher } from "@/components/RealtimeListRefresher";

async function AprovacoesPage() {
  const supabase = await createClient();

  const { data: approvals, error } = await supabase
    .from("approvals")
    .select(
      `id, required_role, created_at,
       protocols(
         id, protocol_number, description, financial_impact, due_at,
         protocol_types(name),
         branches(name),
         customers(full_name)
       )`
    )
    .eq("status", "pendente")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <RealtimeListRefresher table="approvals" channelName="aprovacoes-list" />
      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">
          Aprovações
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Protocolos aguardando decisão. A fila é a mesma para toda a
          gerência geral e é ordenada pelos mais antigos primeiro.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-(--color-red-50) px-4 py-3 text-sm text-(--color-red-700)">
          Não foi possível carregar a fila agora.
        </p>
      )}

      {!approvals || approvals.length === 0 ? (
        <div className="rounded-lg border border-(--color-gray-200) bg-white p-8 text-center text-sm text-(--color-graphite-500)">
          Nenhuma aprovação pendente para você no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => {
            const protocol = asOne(a.protocols);
            if (!protocol) return null;
            const protocolType = asOne(protocol.protocol_types);
            const branch = asOne(protocol.branches);
            const customer = asOne(protocol.customers);
            const overdue = protocol.due_at
              ? new Date(protocol.due_at) < new Date()
              : false;

            return (
              <Link
                key={a.id}
                href={`/protocolos/${protocol.id}`}
                className="block rounded-lg border border-(--color-gray-200) bg-white p-4 hover:border-(--color-red-600)"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <ProtocolBadge code={protocol.protocol_number} />
                    <span className="text-sm text-(--color-graphite-700)">
                      {protocolType?.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-(--color-gray-100) px-2.5 py-0.5 text-xs font-medium text-(--color-graphite-700)">
                    Exige {ROLE_LABELS[a.required_role as keyof typeof ROLE_LABELS] ?? a.required_role}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-graphite-500)">
                  <span>{customer?.full_name ?? "—"}</span>
                  <span>{branch?.name ?? "—"}</span>
                  {protocol.financial_impact != null && (
                    <span>
                      R$ {Number(protocol.financial_impact).toFixed(2)}
                    </span>
                  )}
                  {protocol.due_at && (
                    <span className={overdue ? "font-medium text-(--color-red-600)" : ""}>
                      Prazo: {new Date(protocol.due_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      {overdue ? " — atrasado" : ""}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={AprovacoesPage} rota="/aprovacoes">{props.children}</__TelaCliente>;
}
