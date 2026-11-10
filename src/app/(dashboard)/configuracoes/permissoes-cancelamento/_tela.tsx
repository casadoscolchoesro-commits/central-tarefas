"use client";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CancelPermissionsManager } from "./manager";

async function PermissoesCancelamentoPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: permissions }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase.from("protocol_cancel_permissions").select("user_id"),
  ]);

  const permittedIds = new Set((permissions ?? []).map((p) => p.user_id));

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
          Permissões de cancelamento
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Quando alguma tarefa de um protocolo já foi assumida por alguém, só
          gerência geral, administradores e os usuários marcados aqui podem
          cancelar o protocolo. Sem tarefas assumidas, qualquer pessoa com
          permissão normal de cancelamento continua podendo cancelar.
        </p>
      </div>

      <CancelPermissionsManager
        profiles={profiles ?? []}
        initialPermittedIds={Array.from(permittedIds)}
      />
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={PermissoesCancelamentoPage} rota="/configuracoes/permissoes-cancelamento">{props.children}</__TelaCliente>;
}
