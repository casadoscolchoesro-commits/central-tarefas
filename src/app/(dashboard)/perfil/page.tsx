import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "./avatar-uploader";
import { ChangePasswordForm } from "./change-password-form";

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-medium text-(--color-graphite-900)">Meu perfil</h1>
        <p className="text-sm text-(--color-graphite-500)">{user.fullName} — {user.email}</p>
      </div>

      <ChangePasswordForm mustChangePassword={user.mustChangePassword} />

      <AvatarUploader userId={user.id} fullName={user.fullName} currentUrl={profile?.avatar_url ?? null} />
    </div>
  );
}
