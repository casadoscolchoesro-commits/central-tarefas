"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm({ mustChangePassword }: { mustChangePassword: boolean }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setError(null);
    if (newPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setSaving(false);
      setError("Não foi possível trocar a senha agora.");
      return;
    }
    await supabase.rpc("clear_must_change_password");
    setSaving(false);
    setSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
    router.refresh();
  }

  return (
    <section
      className={`rounded-lg border p-5 ${
        mustChangePassword
          ? "border-(--color-red-100) bg-(--color-red-50)"
          : "border-(--color-gray-200) bg-white"
      }`}
    >
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Trocar senha</h2>
      <p className="mb-4 text-xs text-(--color-graphite-500)">
        {mustChangePassword
          ? "Você já usou bastante a senha temporária — defina uma senha sua abaixo."
          : "Defina uma nova senha para o seu login."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Nova senha
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="mín. 8 caracteres"
            className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
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
            className="w-full rounded-md border border-(--color-gray-200) bg-white px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-white px-2 py-1.5 text-xs text-(--color-red-700)">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 text-xs text-(--color-success)">Senha atualizada.</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !newPassword || !confirmPassword}
        className="mt-3 rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar nova senha"}
      </button>
    </section>
  );
}
