"use client";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReportAccessManager } from "./manager";

async function PermissoesRelatoriosPage() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: permitted }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase.from("report_access_permissions").select("user_id"),
  ]);
  const initialPermittedIds = new Set((permitted ?? []).map((p) => p.user_id));

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
          Permissões de relatórios
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Quem pode ver a tela de Relatórios. Administradores e gerência
          geral já têm essa permissão automaticamente.
        </p>
      </div>

      <ReportAccessManager
        profiles={profiles ?? []}
        initialPermittedIds={Array.from(initialPermittedIds)}
      />
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={PermissoesRelatoriosPage} rota="/configuracoes/permissoes-relatorios">{props.children}</__TelaCliente>;
}
