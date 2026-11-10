import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/current-user";
import { SUPABASE_URL } from "@/lib/supabase-config";

export async function POST(request: Request) {
  // Só administrador pode trocar o e-mail de login de outra pessoa.
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.roles.includes("administrador")) {
    return NextResponse.json(
      { error: "Você não tem permissão para trocar o e-mail de outro usuário." },
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

  let body: { userId?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { userId, email } = body;
  if (!userId || !email || !email.includes("@")) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const admin = createAdminClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Troca o e-mail de login (auth) — a pessoa passa a entrar com o
  // e-mail novo a partir de agora, sem precisar confirmar nada.
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });
  if (updateError) {
    const message = updateError.message.toLowerCase().includes("already")
      ? "Já existe um usuário com esse e-mail."
      : `Não foi possível trocar o e-mail: ${updateError.message}`;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Mantém o cadastro (profiles.email) em sincronia com o login.
  await admin.from("profiles").update({ email }).eq("id", userId);

  return NextResponse.json({ ok: true });
}
