"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconBell } from "@/lib/protocol-icons";
import { type TaskDepartment } from "@/lib/departments";

type NudgeRow = {
  id: string;
  sender_id: string | null;
  sender: { full_name: string } | { full_name: string }[] | null;
  target_type: string;
  target_user_id: string | null;
  target_department: TaskDepartment | null;
  target_job_title_id: string | null;
  message: string | null;
  created_at: string;
};

function asOne<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export function NudgeHistoryButton({
  currentUserId,
  myDepartments,
  myJobTitleId,
}: {
  currentUserId: string;
  myDepartments: TaskDepartment[] | "all";
  myJobTitleId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nudges, setNudges] = useState<NudgeRow[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (!willOpen) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("nudges")
      .select(
        "id, sender_id, sender:profiles!sender_id(full_name), target_type, target_user_id, target_department, target_job_title_id, message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    setLoading(false);
    setNudges((data ?? []) as unknown as NudgeRow[]);
  }

  const forMe = nudges.filter((n) => {
    if (n.sender_id === currentUserId) return false;
    if (n.target_type === "all") return true;
    if (n.target_type === "user") return n.target_user_id === currentUserId;
    if (n.target_type === "department") {
      return myDepartments === "all" || (n.target_department ? myDepartments.includes(n.target_department) : false);
    }
    if (n.target_type === "job_title") {
      return Boolean(myJobTitleId) && n.target_job_title_id === myJobTitleId;
    }
    return false;
  });

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={handleToggle}
        title="Cutucadas recebidas"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-(--color-gray-200) bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50)"
      >
        <IconBell className="h-4.5 w-4.5" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-(--color-gray-200) bg-white shadow-lg">
          <div className="border-b border-(--color-gray-100) px-4 py-2.5">
            <p className="text-sm font-medium text-(--color-graphite-900)">Cutucadas recebidas</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-4 text-xs text-(--color-graphite-500)">Carregando...</p>
            ) : forMe.length === 0 ? (
              <p className="px-4 py-4 text-xs text-(--color-graphite-500)">Nenhuma cutucada por aqui.</p>
            ) : (
              <ul className="divide-y divide-(--color-gray-100)">
                {forMe.map((n) => {
                  const sender = asOne(n.sender);
                  return (
                    <li key={n.id} className="px-4 py-2.5">
                      <p className="text-sm text-(--color-graphite-700)">
                        <span className="font-medium">{sender?.full_name ?? "Alguém"}</span> te cutucou
                      </p>
                      {n.message && (
                        <p className="mt-0.5 text-xs text-(--color-graphite-500)">{n.message}</p>
                      )}
                      <p className="mt-0.5 text-xs text-(--color-graphite-400)">
                        {new Date(n.created_at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
