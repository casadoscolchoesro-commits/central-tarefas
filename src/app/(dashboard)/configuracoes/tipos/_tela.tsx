"use client";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewTypeForm } from "../new-type-form";
import { ProtocolTypeIcon } from "@/lib/protocol-icons";

async function TiposProtocoloPage() {
  const supabase = await createClient();

  const { data: types } = await supabase
    .from("protocol_types")
    .select("id, code, name, active, sort_order")
    .order("sort_order");

  return (
    <div className="max-w-[1600px] space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-lg font-medium text-(--color-graphite-900)">
          Tipos de protocolo
        </h1>
        <p className="text-sm text-(--color-graphite-500)">
          Cada tipo tem suas próprias tarefas e regras de aprovação.
        </p>
      </div>

      <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
        <ul className="divide-y divide-(--color-gray-100)">
          {(types ?? []).map((t) => (
            <li key={t.id}>
              <Link
                href={`/configuracoes/tipos/${t.id}`}
                className="flex items-center justify-between py-2.5 text-sm hover:text-(--color-red-600)"
              >
                <span className="flex items-center gap-1.5 text-(--color-graphite-700)">
                  <ProtocolTypeIcon code={t.code} className="h-4 w-4 text-(--color-red-600)" />
                  {t.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="protocol-stamp text-xs text-(--color-graphite-500)">
                    {t.code}
                  </span>
                  {!t.active && (
                    <span className="rounded-full bg-(--color-gray-100) px-2 py-0.5 text-xs text-(--color-graphite-500)">
                      Inativo
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-(--color-gray-100) pt-4">
          <NewTypeForm />
        </div>
      </section>
    </div>
  );
}


import { TelaCliente as __TelaCliente } from "@/lib/tela-cliente";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Tela(props: any) {
  return <__TelaCliente render={TiposProtocoloPage} rota="/configuracoes/tipos">{props.children}</__TelaCliente>;
}
