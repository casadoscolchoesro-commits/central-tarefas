import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { DeadlineManager } from "./deadline-manager";

export default async function PrazosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("administrador")) redirect("/configuracoes");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("deadline_settings")
    .select("key, label, description, hours")
    .order("label");

  return (
    <div className="max-w-[1600px] space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">Prazos</h1>
        <p className="text-sm text-(--color-graphite-500)">
          Prazo padrão de cada tipo de tarefa/solicitação, contado a partir da abertura em
          horário comercial (feriados e fora do expediente não contam).
        </p>
      </div>

      <DeadlineManager initialSettings={settings ?? []} />
    </div>
  );
}
