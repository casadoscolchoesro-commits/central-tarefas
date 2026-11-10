"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { type TaskDepartment } from "@/lib/departments";
import { playMessageSound } from "@/lib/sounds";

const LOG_PREFIX = "[nova tarefa]";

export function TaskNotifier({
  myDepartments,
}: {
  myDepartments: TaskDepartment[] | "all";
}) {
  // Guarda a versão mais recente sem forçar re-inscrição no canal.
  const departmentsRef = useRef(myDepartments);
  departmentsRef.current = myDepartments;
  const seenIdsRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    const supabase = createClient();

    function isForMe(row: { department: TaskDepartment | null; status: string }) {
      if (row.status !== "pendente") return false;
      if (!row.department) return false;
      const mine = departmentsRef.current;
      // Administrador/gerência geral têm alcance "geral" — também
      // recebem o alerta, já que enxergam tarefas de todos os setores.
      return mine === "all" || mine.includes(row.department);
    }

    function handleTask(row: { id: string; department: TaskDepartment | null; status: string }, source: string) {
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
          handleTask(payload.new as { id: string; department: TaskDepartment | null; status: string }, "tempo real");
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
        .select("id, department, status, created_at")
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
