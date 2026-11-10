import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserManager } from "./user-manager";
import { NewUserForm } from "./new-user-form";
import { BulkImportForm } from "./bulk-import-form";

export default async function UsuariosPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: userRoles },
    { data: roles },
    { data: branches },
    { data: jobTitles },
    { data: taskAdminPerms },
    { data: cancelPerms },
    { data: reportPerms },
    { data: userBranches },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, home_branch_id, active, department, job_title_id")
      .order("full_name"),
    supabase.from("user_roles").select("id, user_id, role_id"),
    supabase.from("roles").select("id, name, description").order("name"),
    supabase.from("branches").select("id, name").eq("active", true).order("name"),
    supabase.from("job_titles").select("id, name, active").eq("active", true).order("name"),
    supabase.from("task_admin_permissions").select("user_id"),
    supabase.from("protocol_cancel_permissions").select("user_id"),
    supabase.from("report_access_permissions").select("user_id"),
    supabase.from("user_branches").select("user_id, branch_id"),
  ]);

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
          Usuários
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Crie novos logins e gerencie papéis e filial de origem de quem já
          existe.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <NewUserForm jobTitles={jobTitles ?? []} roles={roles ?? []} branches={branches ?? []} />
        <BulkImportForm jobTitles={jobTitles ?? []} roles={roles ?? []} />
      </div>

      <UserManager
        initialProfiles={profiles ?? []}
        initialUserRoles={userRoles ?? []}
        roles={roles ?? []}
        branches={branches ?? []}
        jobTitles={jobTitles ?? []}
        initialTaskAdminIds={(taskAdminPerms ?? []).map((p) => p.user_id)}
        initialCancelPermIds={(cancelPerms ?? []).map((p) => p.user_id)}
        initialReportPermIds={(reportPerms ?? []).map((p) => p.user_id)}
        initialUserBranches={userBranches ?? []}
      />
    </div>
  );
}
