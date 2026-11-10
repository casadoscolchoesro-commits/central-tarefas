import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReasonManager } from "./reason-manager";

export default async function MotivosPage() {
  const supabase = await createClient();

  const { data: reasons } = await supabase
    .from("reasons")
    .select("id, category, name, active")
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
          Motivos
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Lista de motivos disponíveis na Nova Solicitação. Você pode
          vincular tarefas específicas a um motivo dentro de cada tipo
          de protocolo.
        </p>
      </div>

      <ReasonManager initialReasons={reasons ?? []} />
    </div>
  );
}
