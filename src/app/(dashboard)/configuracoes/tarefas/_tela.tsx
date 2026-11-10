"use client";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaskCatalogManager } from "./task-catalog-manager";
import { FieldTriggerManager } from "./field-trigger-manager";

async function TarefasConfigPage() {
  const supabase = await createClient();

  const [{ data: catalog }, { data: triggers }] = await Promise.all([
    supabase
      .from("task_catalog")
      .select("id, department, description, active, attach_value")
      .order("department")
      .order("description"),
    supabase
      .from("field_trigger_tasks")
      .select("id, field_key, field_value, catalog_task_id, depends_on_catalog_task_id"),
  ]);

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
          Tarefas
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Cadastre aqui as tarefas que os setores podem precisar fazer. Depois,
          dentro de cada tipo de protocolo, você escolhe quais dessas tarefas
          usar — sem precisar digitar tudo de novo toda vez.
        </p>
      </div>

      <TaskCatalogManager initialCatalog={catalog ?? []} />

      <FieldTriggerManager catalog={(catalog ?? []).filter((c) => c.active)} initialTriggers={triggers ?? []} />
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={TarefasConfigPage} rota="/configuracoes/tarefas">{props.children}</__TelaCliente>;
}
