"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateTaskForm } from "@/components/CreateTaskForm";

export function TaskAdminTools({
  currentUserId,
  restrictProtocolLinkToOwnSales,
  showComprasButton,
}: {
  currentUserId: string;
  restrictProtocolLinkToOwnSales: boolean;
  /** Quando quem está vendo não tem permissão de criar tarefa avulsa, a
   * própria página já renderiza o botão do Compras sozinha — aqui só
   * entra quando os dois botões precisam ficar juntos. */
  showComprasButton: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="shrink-0 rounded-md border border-(--color-gray-200) bg-white px-3 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50)"
        >
          + Criar tarefa
        </button>
        {showComprasButton && (
          <Link
            href="/compras/nova"
            className="shrink-0 rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
          >
            + Solicitar ao Compras
          </Link>
        )}
      </div>

      {showCreate && (
        <div className="mt-3 w-full">
          <CreateTaskForm
            currentUserId={currentUserId}
            restrictProtocolLinkToOwnSales={restrictProtocolLinkToOwnSales}
            onDone={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}
    </div>
  );
}
