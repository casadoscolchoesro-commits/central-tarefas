import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { NovaSolicitacaoForm } from "./form";

export default async function NovaSolicitacaoPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // RLS já garante que só vêm as filiais que este usuário pode acessar.
  const [{ data: branches }, { data: companies }, { data: protocolTypes }, { data: reasons }, { data: subreasons }, { data: paymentMethods }, { data: scopes }] =
    await Promise.all([
      supabase.rpc("get_my_accessible_branches"),
      supabase.from("companies").select("id").eq("active", true).order("created_at").limit(1),
      supabase
        .from("protocol_types")
        .select("id, code, name, requires_delivered_product_approval, requires_scope")
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("reasons")
        .select("id, category, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("subreasons")
        .select("id, reason_id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("payment_methods")
        .select("id, code, label")
        .eq("active", true)
        .order("label"),
      supabase
        .from("protocol_scopes")
        .select("id, code, name")
        .eq("active", true)
        .order("sort_order"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">
          Nova solicitação
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Preencha os dados da venda, do cliente e do que precisa ser
          resolvido. Um número de protocolo é gerado automaticamente ao
          salvar.
        </p>
      </div>

      <NovaSolicitacaoForm
        currentUserId={user?.id ?? ""}
        branches={branches ?? []}
        defaultCompanyId={companies?.[0]?.id ?? null}
        protocolTypes={protocolTypes ?? []}
        reasons={reasons ?? []}
        subreasons={subreasons ?? []}
        paymentMethods={paymentMethods ?? []}
        scopes={scopes ?? []}
      />
    </div>
  );
}
