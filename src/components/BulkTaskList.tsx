"use client";

import { TaskItem } from "@/app/(dashboard)/protocolos/[id]/task-item";
import { ProtocolBadge } from "@/components/ProtocolBadge";
import { PurchasingRequestBadge } from "@/components/PurchasingRequestBadge";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { type TaskDepartment } from "@/lib/departments";
import Link from "next/link";

type PersonRef = { full_name: string; avatar_url?: string | null } | null;

type TaskRow = {
  id: string;
  department: TaskDepartment | null;
  description: string;
  status: string;
  created_at: string;
  due_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  claimer: PersonRef | PersonRef[] | null;
  completed_by: string | null;
  completed_at: string | null;
  completer: PersonRef | PersonRef[] | null;
  notes: string | null;
  assigned_to_user_id: string | null;
  assigned_user: { full_name: string } | { full_name: string }[] | null;
  assigned_to_job_title_id: string | null;
  assigned_job_title: { name: string } | { name: string }[] | null;
  requested_by: string | null;
  requester: { full_name: string } | { full_name: string }[] | null;
  protocol_id: string | null;
  protocols:
    | { protocol_number: string; branch_id: string | null; branches: unknown; sales: unknown }
    | { protocol_number: string; branch_id: string | null; branches: unknown; sales: unknown }[]
    | null;
  purchasing_requests: { id: string; request_number: string } | { id: string; request_number: string }[] | null;
};

function asOne<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export function BulkTaskList({
  tasks,
  currentUserId,
  canOverride,
  canNudge,
  canAssign,
  myDepartments,
  myJobTitleId,
  isAdmin,
}: {
  tasks: TaskRow[];
  currentUserId: string | null;
  canOverride: boolean;
  canNudge: boolean;
  canAssign: boolean;
  myDepartments: TaskDepartment[] | "all";
  myJobTitleId: string | null;
  isAdmin: boolean;
}) {
  function canActOnDepartment(d: TaskDepartment) {
    return myDepartments === "all" || myDepartments.includes(d);
  }

  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-(--color-gray-200) bg-white p-8 text-center text-sm text-(--color-graphite-500)">
        Nenhuma tarefa encontrada com esses filtros.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((t) => {
        const claimer = asOne(t.claimer);
        const completer = asOne(t.completer);
        const requester = asOne(t.requester);
        const protocol = asOne(t.protocols);
        const assignedUser = asOne(t.assigned_user);
        const assignedJobTitle = asOne(t.assigned_job_title);
        const purchasingRequest = asOne(t.purchasing_requests);

        const canAct = t.department
          ? canActOnDepartment(t.department)
          : t.assigned_to_user_id
            ? t.assigned_to_user_id === currentUserId
            : t.assigned_to_job_title_id
              ? t.assigned_to_job_title_id === myJobTitleId
              : false;

        const overdue = t.due_at && t.status === "pendente" && new Date(t.due_at) < new Date();

        return (
          <div key={t.id}>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {protocol && t.protocol_id && (
                <Link href={`/protocolos/${t.protocol_id}`}>
                  <ProtocolBadge code={protocol.protocol_number} />
                </Link>
              )}
              {purchasingRequest && (
                <Link href={`/compras/${purchasingRequest.id}`}>
                  <PurchasingRequestBadge code={purchasingRequest.request_number} />
                </Link>
              )}
              {!t.department && !t.protocol_id && !t.assigned_to_user_id && (
                <span className="inline-block rounded-full bg-(--color-gray-100) px-2.5 py-0.5 text-xs font-medium text-(--color-graphite-700)">
                  {t.assigned_to_job_title_id
                    ? `Função: ${assignedJobTitle?.name ?? "—"}`
                    : "Sem setor/função/pessoa"}
                </span>
              )}
              {requester?.full_name && t.requested_by !== currentUserId && (
                <span className="inline-block rounded-full bg-(--color-gray-100) px-2.5 py-0.5 text-xs font-medium text-(--color-graphite-700)">
                  Criada por {requester.full_name}
                </span>
              )}
              {t.requested_by === currentUserId && (
                <span className="inline-block rounded-full bg-(--color-gray-100) px-2.5 py-0.5 text-xs font-medium text-(--color-graphite-700)">
                  Criada por você
                </span>
              )}
              <span className="text-xs text-(--color-graphite-500)">
                Criada em {new Date(t.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
              {t.due_at && (
                <span className={`text-xs ${overdue ? "font-medium text-(--color-red-600)" : "text-(--color-graphite-500)"}`}>
                  · Prazo: {new Date(t.due_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {isAdmin && !t.claimed_by && t.status === "pendente" && (
                <DeleteTaskButton taskId={t.id} />
              )}
            </div>
            <TaskItem
              taskId={t.id}
              protocolId={t.protocol_id}
              department={t.department}
              description={t.description}
              status={t.status}
              dismissalReason={null}
              canAct={canAct}
              claimedBy={t.claimed_by}
              claimedByName={claimer?.full_name ?? null}
              claimedByAvatarUrl={claimer?.avatar_url ?? null}
              claimedAt={t.claimed_at}
              completedByName={completer?.full_name ?? null}
              completedAt={t.completed_at}
              completedByAvatarUrl={completer?.avatar_url ?? null}
              assignedToUserId={t.assigned_to_user_id}
              assignedToJobTitleId={t.assigned_to_job_title_id}
              assignedToUserName={assignedUser?.full_name ?? null}
              currentUserId={currentUserId}
              canOverride={canOverride}
              canNudge={canNudge}
              canAssign={canAssign}
              notes={t.notes}
            />
          </div>
        );
      })}
    </div>
  );
}
