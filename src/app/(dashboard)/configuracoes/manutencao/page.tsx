import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceManager } from "./maintenance-manager";

export default async function ManutencaoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("administrador")) redirect("/configuracoes");

  const supabase = await createClient();
  const { data } = await supabase
    .from("maintenance_mode")
    .select("enabled, message, updated_at, updater:profiles!updated_by(full_name)")
    .eq("id", 1)
    .maybeSingle();

  const updater = Array.isArray(data?.updater) ? data?.updater[0] : data?.updater;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">Manutenção</h1>
        <p className="text-sm text-(--color-graphite-500)">
          Trava o sistema para todos os usuários (menos administradores) enquanto você faz uma
          atualização, e libera de novo quando terminar.
        </p>
      </div>

      <MaintenanceManager
        initialEnabled={data?.enabled ?? false}
        initialMessage={data?.message ?? ""}
        updatedAt={data?.updated_at ?? null}
        updatedByName={updater?.full_name ?? null}
      />
    </div>
  );
}
