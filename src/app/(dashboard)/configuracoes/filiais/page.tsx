import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BranchManager } from "./branch-manager";

export default async function FiliaisPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: companies }] = await Promise.all([
    supabase
      .from("branches")
      .select("id, company_id, parent_branch_id, name, code, is_matriz, address, phone, active")
      .order("name"),
    supabase
      .from("companies")
      .select("id, legal_name, trade_name")
      .eq("active", true)
      .order("trade_name"),
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
          Filiais
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Lojas cadastradas no sistema. Ao importar um PDF de venda, o
          sistema identifica a filial pelo endereço no cabeçalho — se não
          existir ainda, ela é criada automaticamente aqui.
        </p>
      </div>

      <BranchManager
        initialBranches={branches ?? []}
        companies={(companies ?? []).map((c) => ({
          id: c.id,
          label: c.trade_name || c.legal_name,
        }))}
      />
    </div>
  );
}
