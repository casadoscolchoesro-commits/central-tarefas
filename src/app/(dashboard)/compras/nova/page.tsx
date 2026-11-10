import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { NewPurchasingRequestForm } from "@/components/NewPurchasingRequestForm";

export default async function NovaSolicitacaoComprasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium text-(--color-graphite-900)">Solicitar ao Compras</h1>
          <p className="text-sm text-(--color-graphite-500)">
            Peça um preço de produto, o cadastro de um produto novo, ou o prazo de uma encomenda
            ou pedido. O Compras responde direto nessa solicitação, e você recebe um aviso quando
            estiver pronto.
          </p>
        </div>
        <Link
          href="/compras"
          className="shrink-0 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          Ver todas →
        </Link>
      </div>

      <NewPurchasingRequestForm />
    </div>
  );
}
