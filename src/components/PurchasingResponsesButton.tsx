"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IconCart } from "@/lib/protocol-icons";
import { playMessageSound } from "@/lib/sounds";

type RequestRow = {
  id: string;
  request_number: string;
  kind: string;
  product_description: string;
  completed_at: string | null;
};

const KIND_LABELS: Record<string, string> = {
  preco_custo: "Preço de Produto",
  cadastro: "Cadastro de produto",
  prazo_encomenda: "Prazo de encomenda",
};

export function PurchasingResponsesButton({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  // Evita tocar o som mais de uma vez pra mesma solicitação — o "visto"
  // também gera um UPDATE na linha, e não é isso que deve soar.
  const soundedIdsRef = useRef<Set<string>>(new Set());

  async function load(markAsKnown = false) {
    const supabase = createClient();
    const { data } = await supabase
      .from("purchasing_requests")
      .select("id, request_number, kind, product_description, completed_at")
      .eq("requested_by", currentUserId)
      .eq("status", "concluido")
      .is("viewed_at", null)
      .order("completed_at", { ascending: false })
      .limit(30);
    const rows = (data ?? []) as RequestRow[];
    setRequests(rows);
    if (markAsKnown) {
      // Primeira carga: essas respostas já existiam antes de a pessoa
      // abrir a tela — não tocar som por elas, só pelas que chegarem
      // dali pra frente.
      rows.forEach((r) => soundedIdsRef.current.add(r.id));
    }
  }

  // Confere ao carregar a tela, e ao vivo sempre que alguma solicitação
  // dessa pessoa for respondida ou visualizada em outra aba — assim a
  // contagem nunca fica desatualizada.
  useEffect(() => {
    load(true);
    const supabase = createClient();
    const channel = supabase
      .channel("purchasing-responses-badge")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "cancelamentos", table: "purchasing_requests", filter: `requested_by=eq.${currentUserId}` },
        (payload) => {
          const row = payload.new as { id: string; status: string; viewed_at: string | null };
          if (row.status === "concluido" && !row.viewed_at && !soundedIdsRef.current.has(row.id)) {
            soundedIdsRef.current.add(row.id);
            playMessageSound();
          }
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  }

  if (requests.length === 0 && !open) {
    return (
      <button
        onClick={handleToggle}
        title="Respostas do Compras"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-(--color-gray-200) bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50)"
      >
        <IconCart className="h-4.5 w-4.5" />
      </button>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={handleToggle}
        title="Respostas do Compras"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50) ${
          requests.length > 0 && !open ? "animate-pulse border-(--color-red-300)" : "border-(--color-gray-200)"
        }`}
      >
        <IconCart className="h-4.5 w-4.5" />
        {requests.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-(--color-red-600) px-1 text-[10px] font-medium text-white">
            {requests.length > 9 ? "9+" : requests.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-(--color-gray-200) bg-white shadow-lg">
          <div className="border-b border-(--color-gray-100) px-4 py-2.5">
            <p className="text-sm font-medium text-(--color-graphite-900)">Respostas do Compras</p>
            <p className="text-xs text-(--color-graphite-500)">Solicitações suas já respondidas, que você ainda não abriu.</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-4 text-xs text-(--color-graphite-500)">Carregando...</p>
            ) : requests.length === 0 ? (
              <p className="px-4 py-4 text-xs text-(--color-graphite-500)">Tudo visto por aqui.</p>
            ) : (
              <ul className="divide-y divide-(--color-gray-100)">
                {requests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/compras/${r.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 hover:bg-(--color-gray-50)"
                    >
                      <p className="text-sm text-(--color-graphite-700)">
                        <span className="protocol-stamp font-medium">{r.request_number}</span>{" "}
                        — {KIND_LABELS[r.kind] ?? r.kind}
                      </p>
                      <p className="mt-0.5 text-xs text-(--color-graphite-500)">{r.product_description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
