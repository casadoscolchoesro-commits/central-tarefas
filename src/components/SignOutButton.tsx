"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // sai do WG Hub inteiro (mesma sessão)
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleSignOut}
      className="mt-2 text-xs text-(--color-graphite-500) underline hover:text-(--color-red-600)"
    >
      Sair
    </button>
  );
}
