import { IconTicket } from "@/lib/protocol-icons";

export function PurchasingRequestBadge({ code }: { code: string }) {
  return (
    <span className="protocol-stamp inline-flex items-center gap-1 rounded border border-amber-500/25 bg-amber-400/20 px-2 py-0.5 text-xs uppercase text-amber-700">
      <IconTicket className="h-3.5 w-3.5 text-amber-600" />
      {code}
    </span>
  );
}
