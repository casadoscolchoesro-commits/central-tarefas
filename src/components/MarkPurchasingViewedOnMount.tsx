"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/navegacao";

export function MarkPurchasingViewedOnMount({ requestId }: { requestId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("mark_purchasing_request_viewed", { p_request_id: requestId }).then(() => {
      router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return null;
}
