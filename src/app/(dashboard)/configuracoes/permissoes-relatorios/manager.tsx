"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export function ReportAccessManager({
  profiles,
  initialPermittedIds,
}: {
  profiles: Profile[];
  initialPermittedIds: string[];
}) {
  const router = useRouter();
  const [permitted, setPermitted] = useState(new Set(initialPermittedIds));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(profile: Profile) {
    setError(null);
    setLoadingId(profile.id);
    const supabase = createClient();

    if (permitted.has(profile.id)) {
      const { error } = await supabase
        .from("report_access_permissions")
        .delete()
        .eq("user_id", profile.id);
      setLoadingId(null);
      if (error) {
        setError("Não foi possível remover a permissão agora.");
        return;
      }
      setPermitted((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    } else {
      const { error } = await supabase
        .from("report_access_permissions")
        .insert({ user_id: profile.id });
      setLoadingId(null);
      if (error) {
        setError("Não foi possível conceder a permissão agora.");
        return;
      }
      setPermitted((prev) => new Set(prev).add(profile.id));
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
        {profiles.map((profile) => {
          const isPermitted = permitted.has(profile.id);
          return (
            <li
              key={profile.id}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <div>
                <span className="text-(--color-graphite-700)">
                  {profile.full_name}
                </span>
                <span className="ml-2 text-xs text-(--color-graphite-500)">
                  {profile.email}
                </span>
              </div>
              <button
                onClick={() => toggle(profile)}
                disabled={loadingId === profile.id}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${
                  isPermitted
                    ? "bg-(--color-red-600) text-white"
                    : "bg-(--color-gray-100) text-(--color-graphite-700)"
                }`}
              >
                {loadingId === profile.id
                  ? "..."
                  : isPermitted
                    ? "Tem acesso"
                    : "Sem acesso"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
