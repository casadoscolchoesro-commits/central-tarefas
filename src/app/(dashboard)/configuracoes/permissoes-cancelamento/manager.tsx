"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; full_name: string; email: string };

export function CancelPermissionsManager({
  profiles,
  initialPermittedIds,
}: {
  profiles: Profile[];
  initialPermittedIds: string[];
}) {
  const router = useRouter();
  const [permittedIds, setPermittedIds] = useState<Set<string>>(new Set(initialPermittedIds));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function togglePermission(profile: Profile) {
    setError(null);
    setBusyId(profile.id);
    const supabase = createClient();
    const hasPermission = permittedIds.has(profile.id);

    if (hasPermission) {
      const { error: deleteError } = await supabase
        .from("protocol_cancel_permissions")
        .delete()
        .eq("user_id", profile.id);
      setBusyId(null);
      if (deleteError) {
        setError("Não foi possível remover a permissão agora.");
        return;
      }
      setPermittedIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    } else {
      const { error: insertError } = await supabase
        .from("protocol_cancel_permissions")
        .insert({ user_id: profile.id });
      setBusyId(null);
      if (insertError) {
        setError("Não foi possível conceder a permissão agora.");
        return;
      }
      setPermittedIds((prev) => new Set(prev).add(profile.id));
    }
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      {error && (
        <p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
          {error}
        </p>
      )}

      <ul className="divide-y divide-(--color-gray-100)">
        {profiles.map((p) => {
          const hasPermission = permittedIds.has(p.id);
          return (
            <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <span className="text-(--color-graphite-700)">{p.full_name}</span>
                <span className="ml-2 text-xs text-(--color-graphite-500)">{p.email}</span>
              </div>
              <button
                onClick={() => togglePermission(p)}
                disabled={busyId === p.id}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${
                  hasPermission
                    ? "bg-(--color-red-600) text-white"
                    : "bg-(--color-gray-100) text-(--color-graphite-700)"
                }`}
              >
                {busyId === p.id ? "..." : hasPermission ? "Pode cancelar" : "Sem permissão"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
