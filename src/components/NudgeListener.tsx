"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type TaskDepartment } from "@/lib/departments";
import { playNudgeSound } from "@/lib/sounds";

type NudgeRow = {
  id: string;
  sender_id: string | null;
  target_type: "user" | "department" | "job_title" | "all";
  target_user_id: string | null;
  target_department: TaskDepartment | null;
  target_job_title_id: string | null;
  message: string | null;
  created_at?: string;
};

type NudgeAlert = { id: string; senderName: string | null; message: string | null };

const LOG_PREFIX = "[cutucada]";

export function NudgeListener({
  currentUserId,
  myDepartments,
  myJobTitleId,
}: {
  currentUserId: string | null;
  myDepartments: TaskDepartment[] | "all";
  myJobTitleId?: string | null;
}) {
  const departmentsRef = useRef(myDepartments);
  departmentsRef.current = myDepartments;
  const userIdRef = useRef(currentUserId);
  userIdRef.current = currentUserId;
  const jobTitleIdRef = useRef(myJobTitleId ?? null);
  jobTitleIdRef.current = myJobTitleId ?? null;
  const seenIdsRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef(new Date().toISOString());

  const [alert, setAlert] = useState<NudgeAlert | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();

    function isForMe(row: NudgeRow) {
      if (row.sender_id && row.sender_id === userIdRef.current) return false;
      if (row.target_type === "all") return true;
      if (row.target_type === "user") return row.target_user_id === userIdRef.current;
      if (row.target_type === "department") {
        const mine = departmentsRef.current;
        return mine === "all" || (row.target_department ? mine.includes(row.target_department) : false);
      }
      if (row.target_type === "job_title") {
        return !!jobTitleIdRef.current && row.target_job_title_id === jobTitleIdRef.current;
      }
      return false;
    }

    async function handleNudge(row: NudgeRow, source: string) {
      if (seenIdsRef.current.has(row.id)) return;
      seenIdsRef.current.add(row.id);

      const mine = isForMe(row);
      console.info(`${LOG_PREFIX} recebida via ${source}`, { row, éPraMim: mine });
      if (!mine) return;

      console.info(`${LOG_PREFIX} tocando som...`);
      playNudgeSound();

      let senderName: string | null = null;
      if (row.sender_id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", row.sender_id)
          .maybeSingle();
        if (error) console.warn(`${LOG_PREFIX} não achou o nome de quem enviou`, error);
        senderName = data?.full_name ?? null;
      }
      setAlert({ id: row.id, senderName, message: row.message });
      setTimeout(() => {
        setAlert((current) => (current?.id === row.id ? null : current));
      }, 6000);
    }

    // Caminho principal: tempo real (instantâneo).
    const channel = supabase
      .channel("nudges-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nudges" },
        (payload) => {
          handleNudge(payload.new as NudgeRow, "tempo real");
        }
      )
      .subscribe((status, err) => {
        console.info(`${LOG_PREFIX} status da conexão de tempo real:`, status, err ?? "");
      });

    // Reforço: se a conexão de tempo real cair (rede, firewall, aba em
    // segundo plano), essa consulta periódica garante que a cutucada
    // ainda chega, com até ~12s de atraso.
    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from("nudges")
        .select("id, sender_id, target_type, target_user_id, target_department, target_job_title_id, message, created_at")
        .gt("created_at", startedAtRef.current)
        .order("created_at", { ascending: true })
        .limit(20);
      if (error) {
        console.warn(`${LOG_PREFIX} falha na consulta de reforço`, error);
        return;
      }
      for (const row of data ?? []) {
        handleNudge(row as NudgeRow, "consulta periódica");
      }
    }, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [currentUserId]);

  if (!alert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-xs animate-pulse rounded-lg border border-(--color-red-100) bg-white p-4 shadow-lg">
      <p className="text-sm font-medium text-(--color-graphite-900)">
        {alert.senderName ? `${alert.senderName} chamou sua atenção!` : "Alguém chamou sua atenção!"}
      </p>
      {alert.message && (
        <p className="mt-1 text-xs text-(--color-graphite-500)">{alert.message}</p>
      )}
    </div>
  );
}
