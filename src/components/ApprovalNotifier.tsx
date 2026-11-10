"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { type RoleName } from "@/lib/current-user";
import { playMessageSound } from "@/lib/sounds";

export function ApprovalNotifier({ myRoles }: { myRoles: RoleName[] }) {
  // Guarda a versão mais recente sem forçar re-inscrição no canal.
  const rolesRef = useRef(myRoles);
  rolesRef.current = myRoles;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("approvals-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "approvals" },
        (payload) => {
          const row = payload.new as { required_role: RoleName; status: string };
          if (row.status !== "pendente") return;
          const mine = rolesRef.current;
          const canDecide =
            mine.includes(row.required_role) ||
            mine.includes("gerencia_geral") ||
            mine.includes("administrador");
          if (canDecide) {
            playMessageSound();
          }
        }
      )
      .subscribe((status, err) => {
        console.info("[nova aprovação] status da conexão de tempo real:", status, err ?? "");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
