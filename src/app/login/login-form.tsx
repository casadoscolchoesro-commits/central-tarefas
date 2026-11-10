"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("E-mail ou senha incorretos, ou usuário inativo.");
      return;
    }

    // Conta mais um acesso — a partir do 5º login, a pessoa é avisada
    // para trocar a senha temporária (aviso exibido dentro do app).
    await supabase.rpc("record_login");

    setLoading(false);
    const redirectTo = searchParams.get("redirectTo") ?? "/";
    router.push(redirectTo);
    router.refresh();
  }

  async function handleResetPassword() {
    if (!email) {
      setError("Informe seu e-mail para receber o link de recuperação.");
      return;
    }
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/redefinir-senha` }
    );
    if (resetError) {
      setError("Não foi possível enviar o e-mail de recuperação.");
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-gray-50) px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-(--color-red-600) text-white font-semibold">
            WG
          </div>
          <h1 className="text-lg font-medium text-(--color-graphite-900)">
            Central de Cancelamentos
          </h1>
          <p className="text-sm text-(--color-graphite-500)">
            Grupo WG Colchões &amp; Estofados
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-(--color-gray-200) bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-(--color-graphite-700)"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
              placeholder="seunome@wgcolchoes.com.br"
            />
          </div>

          <div className="mb-2">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-(--color-graphite-700)"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
              placeholder="••••••••"
            />
          </div>

          <div className="mb-4 text-right">
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-xs text-(--color-graphite-500) underline hover:text-(--color-red-600)"
            >
              Esqueci minha senha
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-md bg-(--color-red-50) px-3 py-2 text-sm text-(--color-red-700)"
            >
              {error}
            </p>
          )}

          {resetSent && (
            <p className="mb-4 rounded-md bg-(--color-gray-100) px-3 py-2 text-sm text-(--color-graphite-700)">
              Se o e-mail existir, enviamos um link de recuperação.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white transition hover:bg-(--color-red-700) disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
