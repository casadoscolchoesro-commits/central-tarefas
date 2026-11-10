"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProtocolTypeSettings = {
  id: string;
  active: boolean;
  requires_delivered_product_approval: boolean;
  requires_replacement_sale: boolean;
  requires_scope: boolean;
};

export function TypeSettings({ type }: { type: ProtocolTypeSettings }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(field: keyof Omit<ProtocolTypeSettings, "id">) {
    setSaving(field);
    const supabase = createClient();
    await supabase
      .from("protocol_types")
      .update({ [field]: !type[field] })
      .eq("id", type.id);
    setSaving(null);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-(--color-graphite-900)">
        Comportamento
      </h2>
      <div className="space-y-3">
        <ToggleRow
          label="Tipo ativo"
          description="Se desativado, não aparece na Nova Solicitação."
          checked={type.active}
          disabled={saving === "active"}
          onClick={() => toggle("active")}
        />
        <ToggleRow
          label="Exige aprovação de produto entregue"
          description="Roteia a aprovação para o gerente do SAC em vez do padrão."
          checked={type.requires_delivered_product_approval}
          disabled={saving === "requires_delivered_product_approval"}
          onClick={() => toggle("requires_delivered_product_approval")}
        />
        <ToggleRow
          label="Usa venda substituta"
          description="Mostra a seção de registrar venda substituta no protocolo."
          checked={type.requires_replacement_sale}
          disabled={saving === "requires_replacement_sale"}
          onClick={() => toggle("requires_replacement_sale")}
        />
        <ToggleRow
          label="Exige escopo (total/parcial)"
          description="Pergunta se o total ou só uma parte da venda é afetada. Vincule quais escopos aparecem em Configurações → Escopos."
          checked={type.requires_scope}
          disabled={saving === "requires_scope"}
          onClick={() => toggle("requires_scope")}
        />
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-(--color-graphite-700)">{label}</p>
        <p className="text-xs text-(--color-graphite-500)">{description}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${
          checked
            ? "bg-(--color-red-600) text-white"
            : "bg-(--color-gray-100) text-(--color-graphite-700)"
        }`}
      >
        {checked ? "Sim" : "Não"}
      </button>
    </div>
  );
}
