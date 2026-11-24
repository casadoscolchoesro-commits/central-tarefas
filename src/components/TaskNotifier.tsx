"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { type TaskDepartment } from "@/lib/departments";
import { playMessageSound } from "@/lib/sounds";

const LOG_PREFIX = "[nova tarefa]";

type TaskRow = {
  id: string;
  department: TaskDepartment | null;
  status: string;
  assigned_to_user_id?: string | null;
  assigned_to_job_title_id?: string | null;
};

export function TaskNotifier({
  myDepartments,
  currentUserId,
  myJobTitleId,
}: {
  myDepartments: TaskDepartment[] | "all";
  currentUserId?: string;
  myJobTitleId?: string | null;
}) {
  // Guarda a versão mais recente sem forçar re-inscrição no canal.
  const departmentsRef = useRef(myDepartments);
  departmentsRef.current = myDepartments;
  const meRef = useRef({ currentUserId, myJobTitleId });
  meRef.current = { currentUserId, myJobTitleId };
  const seenIdsRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    const supabase = createClient();

    function isForMe(row: TaskRow) {
      if (row.status !== "pendente") return false;
      // tarefa direcionada a mim ou à minha função (com ou sem setor)
      const me = meRef.current;
      if (row.assigned_to_user_id) return row.assigned_to_user_id === me.currentUserId;
      if (row.assigned_to_job_title_id && me.myJobTitleId && row.assigned_to_job_title_id === me.myJobTitleId) return true;
      if (!row.department) return false;
      const mine = departmentsRef.current;
      // Administrador/gerência geral têm alcance "geral" — também
      // recebem o alerta, já que enxergam tarefas de todos os setores.
      return mine === "all" || mine.includes(row.department);
    }

    function handleTask(row: TaskRow, source: string) {
      if (seenIdsRef.current.has(row.id)) return;
      seenIdsRef.current.add(row.id);
      const mine = isForMe(row);
      console.info(`${LOG_PREFIX} recebida via ${source}`, { row, éPraMim: mine });
      if (mine) playMessageSound();
    }

    const channel = supabase
      .channel("tasks-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "cancelamentos", table: "tasks" },
        (payload) => {
          handleTask(payload.new as TaskRow, "tempo real");
        }
      )
      .subscribe((status, err) => {
        console.info(`${LOG_PREFIX} status da conexão de tempo real:`, status, err ?? "");
      });

    // Reforço: se o tempo real cair (rede, firewall, aba em segundo
    // plano), essa consulta periódica garante que o alerta ainda chega.
    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, department, status, assigned_to_user_id, assigned_to_job_title_id, created_at")
        .eq("status", "pendente")
        .gt("created_at", startedAtRef.current)
        .order("created_at", { ascending: true })
        .limit(20);
      if (error) {
        console.warn(`${LOG_PREFIX} falha na consulta de reforço`, error);
        return;
      }
      for (const row of data ?? []) {
        handleTask(row, "consulta periódica");
      }
    }, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  return null;
}
