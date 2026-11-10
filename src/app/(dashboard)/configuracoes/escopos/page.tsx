import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScopeManager } from "./scope-manager";

export default async function EscoposPage() {
  const supabase = await createClient();

  const { data: scopes } = await supabase
    .from("protocol_scopes")
    .select("id, code, name, active, sort_order")
    .order("sort_order");

  return (
    <div className="max-w-[1600px] space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
          Escopos
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Opções que aparecem no campo "Escopo" da Nova Solicitação (ex.:
          Total, Parcial). Para vincular o escopo a um tipo de protocolo,
          entre em Configurações → Tipos de protocolo → o tipo desejado e
          ative "Exige escopo".
        </p>
      </div>

      <ScopeManager initialScopes={scopes ?? []} />
    </div>
  );
}
