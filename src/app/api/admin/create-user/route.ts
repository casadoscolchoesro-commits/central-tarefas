import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/current-user";
import { SUPABASE_URL } from "@/lib/supabase-config";

export async function POST(request: Request) {
  // Só administrador pode criar usuários. A checagem é feita com o
  // usuário autenticado da requisição (via cookies), nunca confiando em
  // nada que o cliente mande no corpo do POST.
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.roles.includes("administrador")) {
    return NextResponse.json(
      { error: "Você não tem permissão para criar usuários." },
      { status: 403 },
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor. Adicione essa variável de ambiente no Vercel (Project Settings → Environment Variables) com a Service Role Key do Supabase e faça um novo deploy.",
      },
      { status: 500 },
    );
  }

  let body: {
    email?: string;
    password?: string;
    fullName?: string;
    department?: string | null;
    jobTitleId?: string | null;
    roleIds?: string[];
    branchIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = body.fullName?.trim();
  const department = body.department || null;
  const jobTitleId = body.jobTitleId || null;
  const roleIds = Array.isArray(body.roleIds) ? body.roleIds.filter(Boolean) : [];
  const branchIds = Array.isArray(body.branchIds) ? body.branchIds.filter(Boolean) : [];

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e senha." },
      { status: 400 },
    );
  }
  if (!jobTitleId) {
    return NextResponse.json(
      { error: "Selecione a função da pessoa — é obrigatória (define o que ela vê no sistema)." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "A senha precisa ter pelo menos 8 caracteres." },
      { status: 400 },
    );
  }

  // Cliente com a chave de serviço: só existe nesta rota, roda só no
  // servidor, nunca é exposto ao navegador.
  const admin = createAdminClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "Erro desconhecido.";
    const friendly = message.toLowerCase().includes("already")
      ? "Já existe um usuário com esse e-mail."
      : `Não foi possível criar o usuário agora: ${message}`;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: created.user.id,
        full_name: fullName,
        email,
        active: true,
        department,
        job_title_id: jobTitleId,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    // Evita deixar um usuário de auth "órfão" sem perfil correspondente.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `Usuário criado no login, mas houve erro ao salvar o perfil (operação desfeita): ${profileError.message}` },
      { status: 500 },
    );
  }

  if (branchIds.length > 0) {
    const { error: branchesError } = await admin
      .from("user_branches")
      .insert(branchIds.map((branchId) => ({ user_id: created.user.id, branch_id: branchId })));
    if (branchesError) {
      return NextResponse.json({
        id: created.user.id,
        email,
        fullName,
        warning: `Usuário criado, mas não foi possível atribuir as filiais (${branchesError.message}). Ajuste em Gerenciar acesso.`,
      });
    }
  }

  if (roleIds.length > 0) {
    const { error: rolesError } = await admin
      .from("user_roles")
      .insert(roleIds.map((roleId) => ({ user_id: created.user.id, role_id: roleId })));
    if (rolesError) {
      // O usuário e o perfil já existem; só os papéis falharam — não
      // desfaz tudo, só avisa, já que dá pra corrigir em "Gerenciar acesso".
      return NextResponse.json({
        id: created.user.id,
        email,
        fullName,
        warning: `Usuário criado, mas não foi possível atribuir os papéis de aprovação (${rolesError.message}). Ajuste em Gerenciar acesso.`,
      });
    }
  }

  return NextResponse.json({ id: created.user.id, email, fullName });
}
