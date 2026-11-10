import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaskAdminPermissionsManager } from "./manager";

export default async function PermissoesTarefasPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: permitted }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase.from("task_admin_permissions").select("user_id"),
  ]);

  const permittedIds = new Set((permitted ?? []).map((r) => r.user_id));

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
          Permissões de tarefas
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Quem pode criar tarefas avulsas (fora do fluxo de um protocolo) e
          enviar "cutucadas" — um alerta sonoro na tela de tarefas de outra
          pessoa, de um setor inteiro, ou de todo mundo. Administradores e
          gerência geral já têm essa permissão automaticamente.
        </p>
      </div>

      <TaskAdminPermissionsManager profiles={profiles ?? []} initialPermittedIds={Array.from(permittedIds)} />
    </div>
  );
}
