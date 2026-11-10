"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ArchivePurchasingRequestButton({
  requestId,
  mode,
}: {
  requestId: string;
  mode: "archive" | "unarchive";
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc(
      mode === "archive" ? "archive_purchasing_request" : "unarchive_purchasing_request",
      { p_request_id: requestId }
    );
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível concluir a ação agora.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        onClick={handleClick}
        disabled={submitting}
        className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600) disabled:opacity-60"
      >
        {mode === "archive"
          ? submitting
            ? "Arquivando..."
            : "Arquivar"
          : submitting
            ? "Desarquivando..."
            : "Desarquivar"}
      </button>
      {error && <span className="mt-0.5 text-xs text-(--color-red-600)">{error}</span>}
    </span>
  );
}
