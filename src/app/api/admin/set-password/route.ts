import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/current-user";
import { SUPABASE_URL } from "@/lib/supabase-config";

export async function POST(request: Request) {
  // Só administrador pode redefinir a senha de outra pessoa. A checagem
  // usa o usuário autenticado da requisição (via cookies), nunca algo
  // que o cliente mande no corpo do POST.
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.roles.includes("administrador")) {
    return NextResponse.json(
      { error: "Você não tem permissão para redefinir senhas." },
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

  let body: { userId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { userId, password } = body;
  if (!userId) {
    return NextResponse.json({ error: "Usuário não informado." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }

  const admin = createAdminClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateError) {
    return NextResponse.json(
      { error: `Não foi possível redefinir a senha: ${updateError.message}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
