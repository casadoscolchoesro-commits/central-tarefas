"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Kind = "preco_custo" | "cadastro" | "prazo_encomenda";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "preco_custo", label: "Preço de Produto" },
  { value: "cadastro", label: "Cadastro de produto" },
  { value: "prazo_encomenda", label: "Prazo de encomenda" },
];

const KIND_HELP: Record<Kind, string> = {
  preco_custo:
    "O Compras responde com o valor e o prazo de entrega. Você recebe um aviso quando a resposta chegar.",
  cadastro: "O Compras cadastra o produto e conclui a solicitação. Você recebe um aviso quando estiver feito.",
  prazo_encomenda:
    "Pra consultar o prazo de um produto encomendado numa venda, que o cliente está aguardando. O Compras responde com a data prevista.",
};

export function NewPurchasingRequestForm() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("preco_custo");
  const [productDescription, setProductDescription] = useState("");
  const [measure, setMeasure] = useState("");
  const [brand, setBrand] = useState("");
  const [colorNumber, setColorNumber] = useState("");
  const [colorDescription, setColorDescription] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [hasSale, setHasSale] = useState<"sim" | "nao">("nao");
  const [hasPurchaseOrder, setHasPurchaseOrder] = useState<"sim" | "nao">("nao");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const isDeadlineKind = kind === "prazo_encomenda";

  async function handleSubmit() {
    setError(null);
    if (!productDescription.trim() || !measure.trim() || !brand.trim()) {
      setError("Preencha descrição, medida e marca.");
      return;
    }
    if (isDeadlineKind) {
      if (hasSale === "sim" && !referenceNumber.trim()) {
        setError("Informe o número da venda.");
        return;
      }
      if (hasPurchaseOrder === "sim" && !purchaseOrderNumber.trim()) {
        setError("Informe o número do pedido de compra.");
        return;
      }
    } else {
      if (!colorNumber.trim() || !colorDescription.trim()) {
        setError("Preencha o número e a descrição da cor.");
        return;
      }
      if (kind === "preco_custo" && !notes.trim()) {
        setError("Descreva a observação — é obrigatória num pedido de preço de produto.");
        return;
      }
    }
    // Trava imediata (não depende do React re-renderizar): impede qualquer
    // clique repetido de passar enquanto a primeira solicitação ainda está
    // sendo enviada ou a página ainda está trocando.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_purchasing_request", {
      p_kind: kind,
      p_product_description: productDescription.trim(),
      p_measure: measure.trim(),
      p_brand: brand.trim(),
      p_color_number: isDeadlineKind ? colorNumber.trim() || null : colorNumber.trim(),
      p_color_description: isDeadlineKind ? colorDescription.trim() || null : colorDescription.trim(),
      p_notes: notes.trim() || null,
      p_reference_number: isDeadlineKind && hasSale === "sim" ? referenceNumber.trim() : null,
      p_has_purchase_order: isDeadlineKind && hasPurchaseOrder === "sim",
      p_purchase_order_number: isDeadlineKind && hasPurchaseOrder === "sim" ? purchaseOrderNumber.trim() : null,
      p_has_sale: isDeadlineKind && hasSale === "sim",
    });
    if (rpcError || !data) {
      // Só no erro o botão volta a ficar livre — no sucesso ele continua
      // travado até a navegação trocar de tela (era aqui que o clique
      // repetido passava: o botão reabilitava antes da página mudar).
      submittingRef.current = false;
      setSubmitting(false);
      setError(rpcError?.message || "Não foi possível enviar a solicitação agora.");
      return;
    }
    router.push(`/compras/${data}`);
    router.refresh();
  }

  const toggleClass = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-xs font-medium ${
      active
        ? "border-(--color-red-600) bg-(--color-red-50) text-(--color-red-600)"
        : "border-(--color-gray-200) bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50)"
    }`;

  return (
    <div className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {KIND_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setKind(opt.value)}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              kind === opt.value
                ? "border-(--color-red-600) bg-(--color-red-50) text-(--color-red-600)"
                : "border-(--color-gray-200) bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50)"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="mb-4 rounded-md bg-(--color-gray-50) p-3 text-xs text-(--color-graphite-600)">
        {KIND_HELP[kind]}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Descrição do produto <span className="text-(--color-red-600)">*</span>
          </label>
          <input
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Ex.: Sofá retrátil 2,50m"
            className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            {isDeadlineKind ? "Tamanho" : "Medida"} <span className="text-(--color-red-600)">*</span>
          </label>
          <input
            value={measure}
            onChange={(e) => setMeasure(e.target.value)}
            placeholder="Ex.: 2,50m x 0,95m"
            className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Marca <span className="text-(--color-red-600)">*</span>
          </label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Nº da cor {!isDeadlineKind && <span className="text-(--color-red-600)">*</span>}
          </label>
          <input
            value={colorNumber}
            onChange={(e) => setColorNumber(e.target.value)}
            placeholder="Ex.: 08"
            className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Descrição da cor {!isDeadlineKind && <span className="text-(--color-red-600)">*</span>}
          </label>
          <input
            value={colorDescription}
            onChange={(e) => setColorDescription(e.target.value)}
            placeholder="Ex.: Bege caramelo"
            className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>

        {isDeadlineKind && (
          <>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                Possui venda no Sólidus?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasSale("sim")}
                  className={toggleClass(hasSale === "sim")}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setHasSale("nao")}
                  className={toggleClass(hasSale === "nao")}
                >
                  Não
                </button>
              </div>
            </div>

            {hasSale === "sim" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                  Nº da venda <span className="text-(--color-red-600)">*</span>
                </label>
                <input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ex.: 3355"
                  className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                Já possui pedido de compra no Sólidus?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasPurchaseOrder("sim")}
                  className={toggleClass(hasPurchaseOrder === "sim")}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setHasPurchaseOrder("nao")}
                  className={toggleClass(hasPurchaseOrder === "nao")}
                >
                  Não
                </button>
              </div>
            </div>

            {hasPurchaseOrder === "sim" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
                  Nº do pedido de compra <span className="text-(--color-red-600)">*</span>
                </label>
                <input
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
                />
              </div>
            )}
          </>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
            Observação {kind === "preco_custo" && <span className="text-(--color-red-600)">*</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={
              kind === "preco_custo"
                ? "Detalhe o que precisa saber sobre o preço..."
                : "Alguma informação extra (opcional)..."
            }
            className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-(--color-red-50) px-3 py-2 text-sm text-(--color-red-700)">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-4 rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar solicitação"}
      </button>
    </div>
  );
}
