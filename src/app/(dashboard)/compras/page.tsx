import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { ViewedIcon } from "@/components/ViewedIcon";
import { RealtimeListRefresher } from "@/components/RealtimeListRefresher";

const KIND_LABELS: Record<string, string> = {
  preco_custo: "Preço de Produto",
  cadastro: "Cadastro de produto",
  prazo_encomenda: "Prazo de encomenda",
};

export default async function PurchasingRequestsListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("purchasing_requests")
    .select("id, request_number, kind, product_description, status, created_at, viewed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-4xl space-y-6">
      <RealtimeListRefresher table="purchasing_requests" channelName="purchasing-requests-list" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium text-(--color-graphite-900)">Solicitações ao Compras</h1>
          <p className="text-sm text-(--color-graphite-500)">
            Pedidos de preço de produto e cadastro de produtos.
          </p>
        </div>
        <Link
          href="/compras/nova"
          className="shrink-0 rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700)"
        >
          + Solicitar ao Compras
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--color-gray-200) bg-white">
        {!requests || requests.length === 0 ? (
          <p className="p-8 text-center text-sm text-(--color-graphite-500)">
            Nenhuma solicitação encontrada.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-gray-200) bg-(--color-gray-50) text-left text-xs text-(--color-graphite-500)">
                <th className="px-4 py-2 font-medium">Nº</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">Pedido em</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-gray-100)">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-(--color-gray-50)">
                  <td className="px-4 py-3">
                    <Link href={`/compras/${r.id}`}>
                      <span className="protocol-stamp inline-flex items-center rounded border border-teal-600/20 bg-teal-500/15 px-2 py-0.5 text-xs uppercase text-teal-700">
                        {r.request_number}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-(--color-graphite-700)">{KIND_LABELS[r.kind] ?? r.kind}</td>
                  <td className="px-4 py-3 text-(--color-graphite-700)">{r.product_description}</td>
                  <td className="px-4 py-3 text-(--color-graphite-500)">
                    {new Date(r.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-medium ${
                          r.status === "concluido" ? "text-(--color-success)" : "text-(--color-warning)"
                        }`}
                      >
                        {r.status === "concluido" ? "Concluída" : "Pendente"}
                      </span>
                      {r.status === "concluido" && (
                        <span
                          className={r.viewed_at ? "text-sky-600" : "text-(--color-graphite-400)"}
                          title={r.viewed_at ? "Quem pediu já visualizou a resposta" : "Quem pediu ainda não visualizou a resposta"}
                        >
                          <ViewedIcon viewed={Boolean(r.viewed_at)} className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
