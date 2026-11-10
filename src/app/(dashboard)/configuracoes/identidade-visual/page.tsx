import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getAppIconUrl } from "@/lib/app-settings";
import { IconUploader } from "./icon-uploader";

export default async function IdentidadeVisualPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("administrador")) redirect("/configuracoes");

  const iconUrl = await getAppIconUrl();

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
          Identidade visual
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Troque o ícone do sistema sempre que precisar, sem depender de um
          novo deploy.
        </p>
      </div>

      <IconUploader currentUrl={iconUrl} currentUserId={user.id} />
    </div>
  );
}
