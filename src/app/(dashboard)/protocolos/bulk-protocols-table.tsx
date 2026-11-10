"use client";

import Link from "next/link";
import { ProtocolBadge } from "@/components/ProtocolBadge";
import { PurchasingRequestBadge } from "@/components/PurchasingRequestBadge";
import { ViewedIcon } from "@/components/ViewedIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteProtocolButton } from "./[id]/delete-protocol-button";
import { DeletePurchasingRequestButton } from "@/components/DeletePurchasingRequestButton";
import { ProtocolTypeIcon, IconCart } from "@/lib/protocol-icons";

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const PURCHASING_KIND_LABELS: Record<string, string> = {
  preco_custo: "Preço de Produto",
  cadastro: "Cadastro de produto",
  prazo_encomenda: "Prazo de encomenda",
};

type ProtocolRow = {
  id: string;
  protocol_number: string;
  status: string;
  opened_at: string;
  due_at: string | null;
  protocol_types: unknown;
  branches: unknown;
  customers: unknown;
  sales: unknown;
};

type PurchasingRow = {
  id: string;
  request_number: string;
  kind: string;
  product_description: string;
  status: string;
  created_at: string;
  due_at: string | null;
  reference_number: string | null;
  viewed_at: string | null;
  requester: { full_name: string } | { full_name: string }[] | null;
  branch: { name: string } | { name: string }[] | null;
};

export type Row =
  | { kind: "protocol"; date: string; data: ProtocolRow }
  | { kind: "purchasing"; date: string; data: PurchasingRow };

export function BulkProtocolsTable({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-(--color-gray-200) bg-white">
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-(--color-graphite-500)">
          Nenhum protocolo encontrado com esses filtros.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-gray-200) bg-(--color-gray-50) text-left text-xs text-(--color-graphite-500)">
              <th className="px-4 py-2 font-medium">Protocolo</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Vendedor</th>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Aberto em</th>
              <th className="px-4 py-2 font-medium">Prazo</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-gray-100)">
            {rows.map((row) => {
              const key = `${row.kind}:${row.data.id}`;

              if (row.kind === "purchasing") {
                const r = row.data;
                const branch = asOne(r.branch);
                const requester = asOne(r.requester);
                const overdue = r.due_at && new Date(r.due_at) < new Date() && r.status !== "concluido";
                return (
                  <tr key={key} className="hover:bg-(--color-gray-50)">
                    <td className="px-4 py-3">
                      <Link href={`/compras/${r.id}`}>
                        <PurchasingRequestBadge code={r.request_number} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-(--color-graphite-700)">
                      <span className="inline-flex items-center gap-1.5">
                        <IconCart className="h-4 w-4 text-amber-600" />
                        {PURCHASING_KIND_LABELS[r.kind] ?? r.kind} — {r.product_description}
                        {r.reference_number && (
                          <span className="text-(--color-graphite-500)"> (venda {r.reference_number})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-(--color-graphite-700)">{requester?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-(--color-graphite-700)">{branch?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-(--color-graphite-500)">—</td>
                    <td className="px-4 py-3 text-(--color-graphite-500)">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </td>
                    <td className="px-4 py-3">
                      {r.due_at ? (
                        <span
                          className={
                            overdue
                              ? "text-xs font-medium text-(--color-red-600)"
                              : "text-xs text-(--color-graphite-500)"
                          }
                        >
                          {new Date(r.due_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-(--color-graphite-500)">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        {r.status === "concluido" && (
                          <span
                            className={r.viewed_at ? "text-sky-600" : "text-(--color-graphite-400)"}
                            title={r.viewed_at ? "Quem pediu já visualizou a resposta" : "Quem pediu ainda não visualizou a resposta"}
                          >
                            <ViewedIcon viewed={Boolean(r.viewed_at)} className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin && <DeletePurchasingRequestButton requestId={r.id} />}
                    </td>
                  </tr>
                );
              }

              const p = row.data;
              const protocolType = asOne(p.protocol_types) as { name?: string; code?: string } | null;
              const branch = asOne(p.branches) as { name?: string } | null;
              const customer = asOne(p.customers) as { full_name?: string } | null;
              const sale = asOne(p.sales) as { salesperson_name?: string; salesperson?: unknown } | null;
              const salesperson = sale ? (asOne(sale.salesperson) as { full_name?: string } | null) : null;
              return (
                <tr key={key} className="hover:bg-(--color-gray-50)">
                  <td className="px-4 py-3">
                    <Link href={`/protocolos/${p.id}`}>
                      <ProtocolBadge code={p.protocol_number} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-(--color-graphite-700)">
                    <span className="inline-flex items-center gap-1.5">
                      <ProtocolTypeIcon code={protocolType?.code} className="h-4 w-4 text-(--color-red-600)" />
                      {protocolType?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-(--color-graphite-700)">{sale?.salesperson_name ?? salesperson?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-(--color-graphite-700)">{branch?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-(--color-graphite-700)">{customer?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-(--color-graphite-500)">
                    {new Date(p.opened_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </td>
                  <td className="px-4 py-3">
                    {p.due_at ? (
                      <span
                        className={
                          new Date(p.due_at) < new Date() && p.status !== "concluido" && p.status !== "cancelado"
                            ? "text-xs font-medium text-(--color-red-600)"
                            : "text-xs text-(--color-graphite-500)"
                        }
                      >
                        {new Date(p.due_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-(--color-graphite-500)">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && <DeleteProtocolButton protocolId={p.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
