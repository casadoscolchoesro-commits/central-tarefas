"use client";
import { irParaLogin } from "@/lib/wghub";
import { redirect } from "@/lib/navegacao";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "./avatar-uploader";
import { ChangePasswordForm } from "./change-password-form";

async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) irParaLogin();

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


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={PerfilPage} rota="/perfil">{props.children}</__TelaCliente>;
}
