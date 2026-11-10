import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DepartmentManager } from "./department-manager";

export default async function SetoresPage() {
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, description, active")
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
        <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
          Setores
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Lista de setores da empresa, usada como referência geral. As
          tarefas automáticas (Configurações → Tarefas) usam um conjunto
          fixo de setores operacionais (Fiscal, Financeiro, Logística,
          Estoque, SAC, Vendas, Gerência) por estarem ligadas ao fluxo de
          aprovação — esta lista aqui é para fins organizacionais.
        </p>
      </div>

      <DepartmentManager initialDepartments={departments ?? []} />
    </div>
  );
}
