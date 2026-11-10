import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JobTitleManager } from "./job-title-manager";

export default async function FuncoesPage() {
  const supabase = await createClient();
  const { data: jobTitles } = await supabase
    .from("job_titles")
    .select("id, name, active, protocol_visibility_scope, task_visibility_scope, feature_access")
    .order("name");

  return (
    <div className="max-w-[1600px] space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">Funções</h1>
        <p className="text-sm text-(--color-graphite-500)">
          Cargo de cada pessoa (Vendedor, Motorista, Gerente de Loja...). Além de organizar quem
          é quem, cada função define quanto essa pessoa vê em Protocolos e Tarefas — própria, por
          setor ou geral.
        </p>
      </div>

      <JobTitleManager initialJobTitles={jobTitles ?? []} />
    </div>
  );
}
