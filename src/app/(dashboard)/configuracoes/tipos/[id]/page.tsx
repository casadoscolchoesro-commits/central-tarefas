import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TypeSettings } from "./type-settings";
import { TaskTemplateManager } from "./task-template-manager";
import { EditTypeForm } from "./edit-type-form";
import { DeleteTypeButton } from "./delete-type-button";

export default async function TipoProtocoloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: type }, { data: templates }, { data: reasons }, { data: catalog }] =
    await Promise.all([
      supabase
        .from("protocol_types")
        .select(
          "id, code, name, active, requires_delivered_product_approval, requires_replacement_sale, requires_scope"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("task_templates")
        .select(
          "id, department, description, active, sort_order, depends_on_departments, reason_id"
        )
        .eq("protocol_type_id", id)
        .order("sort_order"),
      supabase
        .from("reasons")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("task_catalog")
        .select("id, department, description, active")
        .eq("active", true)
        .order("department")
        .order("description"),
    ]);

  if (!type) {
    notFound();
  }

  return (
    <div className="max-w-[1600px] space-y-6">
      <div>
        <Link
          href="/configuracoes/tipos"
          className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
        >
          ← Configurações
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-medium text-(--color-graphite-900)">
            {type.name}
          </h1>
          <span className="protocol-stamp text-xs text-(--color-graphite-500)">
            {type.code}
          </span>
        </div>
      </div>

      <EditTypeForm id={type.id} code={type.code} name={type.name} />

      <TypeSettings type={type} />

      <TaskTemplateManager
        protocolTypeId={type.id}
        templates={templates ?? []}
        reasons={reasons ?? []}
        catalog={catalog ?? []}
      />

      <div className="border-t border-(--color-gray-100) pt-4">
        <DeleteTypeButton id={type.id} />
      </div>
    </div>
  );
}
