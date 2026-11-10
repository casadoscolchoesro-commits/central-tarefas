import { IconTicket } from "@/lib/protocol-icons";

export function ProtocolBadge({ code }: { code: string }) {
  return (
    <span className="protocol-stamp inline-flex items-center gap-1 rounded border border-emerald-600/20 bg-emerald-500/15 px-2 py-0.5 text-xs uppercase text-emerald-700">
      <IconTicket className="h-3.5 w-3.5 text-emerald-600" />
      {code}
    </span>
  );
}
