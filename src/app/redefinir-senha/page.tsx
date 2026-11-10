"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function RedefinirSenhaForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // O link do e-mail de recuperação abre uma sessão temporária só pra
    // essa troca de senha — confere se ela existe antes de liberar o
    // formulário (senão a pessoa pode ter chegado aqui sem passar pelo
    // link, ou o link já expirou).
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) {
        setError("Este link de recuperação é inválido ou já expirou. Solicite um novo na tela de login.");
      }
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Não foi possível trocar a senha agora. Tente pedir um novo link de recuperação.");
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-gray-50) px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-(--color-red-600) text-white font-semibold">
            WG
          </div>
          <h1 className="text-lg font-medium text-(--color-graphite-900)">Nova senha</h1>
          <p className="mt-1 text-sm text-(--color-graphite-500)">
            Escolha uma nova senha para entrar na Central de Cancelamentos.
          </p>
        </div>

        <div className="rounded-lg border border-(--color-gray-200) bg-white p-6">
          {done ? (
            <p className="text-sm text-emerald-700">
              Senha alterada com sucesso! Levando você pra tela de login...
            </p>
          ) : !ready && !error ? (
            <p className="text-sm text-(--color-graphite-500)">Verificando o link...</p>
          ) : !ready ? (
            <p className="text-sm text-(--color-red-600)">{error}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mín. 8 caracteres"
                  className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
                />
              </div>

              {error && (
                <p className="rounded-md bg-(--color-red-50) px-3 py-2 text-xs text-(--color-red-700)">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}
