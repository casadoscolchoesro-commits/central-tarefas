import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PermissionsCenter } from "./permissions-center";

export default async function UserPermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (!currentUser.roles.includes("administrador")) redirect("/configuracoes");

  const supabase = await createClient();

  const [
    { data: profile },
    { data: roles },
    { data: jobTitles },
    { data: branches },
    { data: myRoleRows },
    { data: myBranchRows },
    { data: taskAdminPerm },
    { data: cancelPerm },
    { data: reportPerm },
    { data: assignPerm },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, active, department, job_title_id, job_titles(id, name, protocol_visibility_scope, task_visibility_scope, feature_access)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("roles").select("id, name").order("name"),
    supabase.from("job_titles").select("id, name, active").eq("active", true).order("name"),
    supabase.from("branches").select("id, name").eq("active", true).order("name"),
    supabase.from("user_roles").select("role_id").eq("user_id", id),
    supabase.from("user_branches").select("branch_id").eq("user_id", id),
    supabase.from("task_admin_permissions").select("user_id").eq("user_id", id).maybeSingle(),
    supabase.from("protocol_cancel_permissions").select("user_id").eq("user_id", id).maybeSingle(),
    supabase.from("report_access_permissions").select("user_id").eq("user_id", id).maybeSingle(),
    supabase.from("task_assign_permissions").select("user_id").eq("user_id", id).maybeSingle(),
  ]);

  if (!profile) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/configuracoes/usuarios"
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          ← Usuários
        </Link>
        <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
          Central de Permissões
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Tudo que decide o que <strong>{profile.full_name}</strong> pode ver e fazer, num lugar
          só.
        </p>
      </div>

      <PermissionsCenter
        profile={profile}
        roles={roles ?? []}
        jobTitles={jobTitles ?? []}
        branches={branches ?? []}
        initialRoleIds={(myRoleRows ?? []).map((r) => r.role_id)}
        initialBranchIds={(myBranchRows ?? []).map((b) => b.branch_id)}
        initialTaskAdmin={Boolean(taskAdminPerm)}
        initialCancelPerm={Boolean(cancelPerm)}
        initialReportPerm={Boolean(reportPerm)}
        initialAssignPerm={Boolean(assignPerm)}
      />
    </div>
  );
}
