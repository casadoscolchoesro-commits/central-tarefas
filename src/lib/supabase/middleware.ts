import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Mapeia o caminho da requisição pra chave de funcionalidade (mesmas
// chaves usadas em Configurações → Funções → "Funcionalidades do
// sistema"). null = rota que não é controlada por essa lista (perfil,
// login, recuperação de senha, apis).
function matchFeatureKey(pathname: string): string | null {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/protocolos/novo")) return "/protocolos/novo";
  if (pathname.startsWith("/compras")) return "/compras/nova";
  if (pathname.startsWith("/protocolos")) return "/protocolos";
  if (pathname.startsWith("/tarefas")) return "/tarefas";
  if (pathname.startsWith("/aprovacoes")) return "/aprovacoes";
  if (pathname.startsWith("/relatorios")) return "/relatorios";
  if (pathname.startsWith("/configuracoes")) return "/configuracoes";
  return null;
}

// Mantém a sessão do Supabase viva a cada requisição, protege rotas que
// exigem autenticação, e bloqueia — mesmo por link direto — telas que a
// Função da pessoa não libera (Configurações → Funções).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");
  const isResetRoute = request.nextUrl.pathname.startsWith("/redefinir-senha");
  const isAuthRoute = isLoginRoute || isResetRoute;

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Só /login redireciona quem já está logado pra fora — /redefinir-senha
  // precisa continuar acessível mesmo com uma sessão (a de recuperação
  // de senha do Supabase é uma sessão temporária como qualquer outra).
  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && !isAuthRoute && !request.nextUrl.pathname.startsWith("/api")) {
    const featureKey = matchFeatureKey(request.nextUrl.pathname);
    if (featureKey) {
      const [{ data: roleRows }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("job_title:job_titles(feature_access)")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      const myRoles = (roleRows ?? [])
        .map((r) => {
          const role = Array.isArray(r.roles) ? r.roles[0] : r.roles;
          return role?.name as string | undefined;
        })
        .filter(Boolean);
      const isBroad = myRoles.includes("administrador") || myRoles.includes("gerencia_geral");

      const jobTitle = profile?.job_title
        ? (Array.isArray(profile.job_title) ? profile.job_title[0] : profile.job_title)
        : null;
      const featureAccess = jobTitle?.feature_access as Record<string, boolean> | null;

      const blocked = !isBroad && featureAccess && featureAccess[featureKey] === false;

      if (blocked) {
        const url = request.nextUrl.clone();
        // Se até o Painel estiver bloqueado pra essa função, manda pro
        // perfil (nunca bloqueado) em vez de criar um loop de redirect.
        url.pathname = featureKey === "/" ? "/perfil" : "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
