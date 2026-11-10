"use client";

import { useState } from "react";
import { CreateTaskForm } from "@/components/CreateTaskForm";

export function NewProtocolTaskButton({
  protocolId,
  protocolNumber,
}: {
  protocolId: string;
  protocolNumber: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-(--color-success)/30 bg-(--color-success)/10 px-3 py-1.5 text-xs font-medium text-(--color-success) hover:bg-(--color-success)/20"
      >
        + Nova tarefa
      </button>
    );
  }

  return (
    <div className="mt-2">
      <CreateTaskForm
        fixedProtocol={{ id: protocolId, protocol_number: protocolNumber }}
        onDone={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
