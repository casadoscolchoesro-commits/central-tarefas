"use client";
import { irParaLogin } from "@/lib/wghub";
import { redirect } from "@/lib/navegacao";
import { getCurrentUser, ROLE_LABELS } from "@/lib/current-user";
import { visibleNavItems } from "@/lib/nav";
import { departmentsForRoles } from "@/lib/departments";
import { TaskNotifier } from "@/components/TaskNotifier";
import { NudgeListener } from "@/components/NudgeListener";
import { ApprovalNotifier } from "@/components/ApprovalNotifier";
import { AudioUnlockListener } from "@/components/AudioUnlockListener";
import { DashboardNav } from "@/components/DashboardNav";
import { TopBrandBanner } from "@/components/TopBrandBanner";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { createClient } from "@/lib/supabase/server";
import { getAppIconUrl } from "@/lib/app-settings";

async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Middleware já protege a rota, mas o shell não deve renderizar
  // sem um perfil válido (ex.: usuário desativado após o login).
  if (!user) {
    irParaLogin();
  }

  const supabase = await createClient();
  const { data: canViewReports } = await supabase.rpc("has_report_access", {
    p_user_id: user.id,
  });
  const iconUrl = await getAppIconUrl();
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("avatar_url, job_title_id, job_title:job_titles(feature_access)")
    .eq("id", user.id)
    .maybeSingle();
  const myJobTitle = myProfile?.job_title
    ? (Array.isArray(myProfile.job_title) ? myProfile.job_title[0] : myProfile.job_title)
    : null;

  const items = visibleNavItems(user.roles, myJobTitle?.feature_access ?? null).filter(
    (item) => item.href !== "/relatorios" || canViewReports,
  );
  const myDepartments = departmentsForRoles(user.roles);

  const { data: maintenance } = await supabase.schema("public")
    .from("sistema_estado")
    .select("manutencao, mensagem")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col">
      <MaintenanceGate
        initial={{ enabled: maintenance?.manutencao ?? false, message: maintenance?.mensagem ?? null }}
        isAdmin={user.roles.includes("administrador")}
      />
      <TopBrandBanner
        currentUserId={user.id}
        myDepartments={myDepartments}
        myJobTitleId={myProfile?.job_title_id ?? null}
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <TaskNotifier myDepartments={myDepartments} />
        <NudgeListener
          currentUserId={user.id}
          myDepartments={myDepartments}
          myJobTitleId={myProfile?.job_title_id ?? null}
        />
        <ApprovalNotifier myRoles={user.roles} />
        <AudioUnlockListener />
        <DashboardNav
          items={items}
          fullName={user.fullName}
          rolesText={user.roles.map((r) => ROLE_LABELS[r]).join(", ")}
          iconUrl={iconUrl}
          avatarUrl={myProfile?.avatar_url ?? null}
        />
        <main
          className="flex-1 px-4 py-4 lg:px-8 lg:py-6"
          style={{
            background:
              "radial-gradient(120% 60% at 15% 0%, rgba(185,28,60,0.05) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #ffffff 0%, #fbfaf9 100%)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}



import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={DashboardLayout} rota="/">{props.children}</__TelaCliente>;
}
