"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { ProtocolBadge } from "@/components/ProtocolBadge";
import { PdfImportBox } from "./pdf-import-box";
import { CurrencyInput } from "@/components/CurrencyInput";
import { InfoTooltip } from "@/components/InfoTooltip";
import type { ParsedPdfSale } from "@/lib/pdf-import";

type Branch = { id: string; name: string; code: string; address?: string | null };
type ProtocolType = { id: string; code: string; name: string; requires_delivered_product_approval: boolean; requires_scope: boolean };
type Reason = { id: string; category: string; name: string };
type Subreason = { id: string; reason_id: string; name: string };
type Scope = { id: string; code: string; name: string };

type SaleItemRow = { key: string; productName: string; sku: string; quantity: string; unitPrice: string };
type PaymentRow = { key: string; methodId: string; amount: string; installments: string };
type PaymentMethod = { id: string; code: string; label: string };
type DuplicateMatch = { protocol_id: string; protocol_number: string; match_reason: string; match_detail: string };
type ExistingCustomer = { id: string; full_name: string; document: string | null; phone: string | null };
type CustomerHistoryEntry = { protocol_id: string; protocol_number: string; protocol_type_name: string; status: string; sale_number: string; opened_at: string; financial_impact: number | null };

const MATCH_REASON_LABELS: Record<string, string> = { mesmo_lancamento: "Já existe protocolo aberto para este número de venda" };
const PROTOCOL_STATUS_LABELS: Record<string, string> = { aberto: "Aberto", em_analise: "Em análise", concluido: "Concluído", cancelado: "Cancelado" };

function newKey() {
  return Math.random().toString(36).slice(2);
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function NovaSolicitacaoForm({ currentUserId, branches: initialBranches, defaultCompanyId, protocolTypes, reasons, subreasons, paymentMethods: initialPaymentMethods, scopes }: { currentUserId: string; branches: Branch[]; defaultCompanyId: string | null; protocolTypes: ProtocolType[]; reasons: Reason[]; subreasons: Subreason[]; paymentMethods: PaymentMethod[]; scopes: Scope[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [protocolTypeId, setProtocolTypeId] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [subreasonId, setSubreasonId] = useState("");
  const [description, setDescription] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [cashRegisterFinalized, setCashRegisterFinalized] = useState<"" | "sim" | "nao">("");
  const [needsRefund, setNeedsRefund] = useState<"" | "sim" | "nao">("");
  const [refundValueInput, setRefundValueInput] = useState<number | null>(null);
  const [customerPaysDifference, setCustomerPaysDifference] = useState<"" | "sim" | "nao">("");
  const [differenceValue, setDifferenceValue] = useState<number>(0);

  const [saleNumber, setSaleNumber] = useState("");
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [branchId, setBranchId] = useState("");
  const [branchLocked, setBranchLocked] = useState(false);
  const [saleDate, setSaleDate] = useState("");
  const [saleType, setSaleType] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [sellerName, setSellerName] = useState("");

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods);
  const [paymentsLocked, setPaymentsLocked] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const [customerMode, setCustomerMode] = useState<"search" | "new">("search");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<ExistingCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ExistingCustomer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerDocument, setNewCustomerDocument] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const [items, setItems] = useState<SaleItemRow[]>([{ key: newKey(), productName: "", sku: "", quantity: "1", unitPrice: "" }]);
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<PaymentRow[]>([{ key: newKey(), methodId: initialPaymentMethods[0]?.id ?? "", amount: "", installments: "" }]);

  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [acknowledgeDuplicates, setAcknowledgeDuplicates] = useState(false);

  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryEntry[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [successProtocolNumber, setSuccessProtocolNumber] = useState<string | null>(null);

  const selectedProtocolType = protocolTypes.find((t) => t.id === protocolTypeId);
  const requiresScope = selectedProtocolType?.requires_scope ?? false;
  const selectedScope = scopes.find((s) => s.id === scopeId);
  const isPartialScope = selectedScope?.code === "parcial";
  const availableSubreasons = subreasons.filter((s) => s.reason_id === reasonId);

  function itemTotal(it: SaleItemRow) {
    const qty = parseFloat(it.quantity.replace(",", ".")) || 0;
    const price = parseFloat(it.unitPrice.replace(",", ".")) || 0;
    return qty * price;
  }

  const itemsTotal = items.reduce((sum, it) => sum + itemTotal(it), 0);

  // Valor do voucher/estorno: se o escopo é parcial, soma só os itens
  // marcados para devolução; senão, é o valor cheio da venda.
  const returnedTotal =
    isPartialScope
      ? items.filter((it) => selectedItemKeys.has(it.key)).reduce((sum, it) => sum + itemTotal(it), 0)
      : itemsTotal;

  // Quando o cliente precisa de estorno, o valor total (returnedTotal) se
  // divide em duas partes: quanto volta de fato pro cliente (estorno,
  // editável — pode ser menos que o total) e o restante vira crédito na
  // loja (crédito cliente, calculado).
  const refundValue = refundValueInput != null && refundValueInput > 0 ? refundValueInput : returnedTotal;
  const clientCreditValue = Math.max(returnedTotal - refundValue, 0);

  function resetDuplicateCheck() {
    setDuplicates(null);
    setAcknowledgeDuplicates(false);
  }

  function updateItem(key: string, patch: Partial<SaleItemRow>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { key: newKey(), productName: "", sku: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
    setSelectedItemKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }

  function toggleItemSelected(key: string) {
    setSelectedItemKeys((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }

  function updatePayment(key: string, patch: Partial<PaymentRow>) {
    setPayments((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function addPayment() {
    setPayments((prev) => [...prev, { key: newKey(), methodId: paymentMethods[0]?.id ?? "", amount: "", installments: "" }]);
  }

  async function findOrCreatePaymentMethod(rawLabel: string): Promise<string> {
    const trimmed = rawLabel.trim();
    const existing = paymentMethods.find((m) => m.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;

    const code = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || `forma_${Date.now()}`;

    const { data, error: insertError } = await supabase.from("payment_methods").insert({ code, label: trimmed }).select("id, code, label").single();

    if (insertError || !data) {
      const { data: existingRow } = await supabase.from("payment_methods").select("id, code, label").eq("code", code).maybeSingle();
      if (existingRow) {
        setPaymentMethods((prev) => [...prev, existingRow]);
        return existingRow.id;
      }
      throw insertError ?? new Error("Não foi possível cadastrar a forma de pagamento.");
    }

    setPaymentMethods((prev) => [...prev, data]);
    return data.id;
  }

  async function findOrCreateBranch(address: string, phone: string | null, suggestedName: string | null): Promise<string> {
    const normalizedAddress = address.trim().toLowerCase();
    const existing = branches.find(
      (b) => (b.address ?? "").trim().toLowerCase() === normalizedAddress
    );
    if (existing) return existing.id;

    if (!defaultCompanyId) {
      throw new Error("Nenhuma empresa cadastrada para vincular a nova filial.");
    }

    const name = suggestedName?.trim() || `Filial ${address.trim().slice(0, 40)}`;
    const code =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 50) || `filial_${Date.now()}`;

    const { data, error: insertError } = await supabase
      .from("branches")
      .insert({
        company_id: defaultCompanyId,
        name,
        code,
        address: address.trim(),
        phone: phone?.trim() || null,
        active: true,
      })
      .select("id, name, code, address")
      .single();

    const ensureAccessible = async (row: Branch): Promise<string> => {
      const { data: mine } = await supabase.rpc("get_my_accessible_branches");
      const list = (mine ?? []) as Branch[];
      if (!list.some((b) => b.id === row.id)) {
        throw new Error("A filial do PDF não está liberada para o seu usuário.");
      }
      setBranches(list);
      return row.id;
    };

    if (insertError || !data) {
      const { data: existingRow } = await supabase
        .from("branches")
        .select("id, name, code, address")
        .eq("code", code)
        .maybeSingle();
      if (existingRow) return ensureAccessible(existingRow as Branch);
      throw insertError ?? new Error("Não foi possível cadastrar a filial.");
    }

    return ensureAccessible(data as Branch);
  }

  async function handlePdfParsed(parsed: ParsedPdfSale) {
    setImportNotice("Dados importados do PDF. Confira os itens e o que será devolvido antes de salvar.");

    if (parsed.saleNumber) setSaleNumber(parsed.saleNumber);
    if (parsed.saleDate) setSaleDate(parsed.saleDate);

    if (parsed.branchAddress) {
      try {
        const id = await findOrCreateBranch(parsed.branchAddress, parsed.branchPhone, parsed.branchName);
        setBranchId(id);
        setBranchLocked(true);
      } catch (err) {
        console.error(err);
        setImportNotice("Dados importados do PDF. A filial do PDF não está entre as filiais liberadas para o seu usuário — selecione uma filial da lista (ou peça ao administrador para liberar o acesso).");
        setBranchId("");
        setBranchLocked(false);
      }
    }

    if (parsed.saleType) setSaleType(parsed.saleType);
    if (parsed.sellerName) setSellerName(parsed.sellerName);
    if (parsed.notes) setSaleNotes(parsed.notes);
    resetDuplicateCheck();

    if (parsed.customerName) {
      setCustomerMode("new");
      setSelectedCustomer(null);
      setNewCustomerName(parsed.customerName);
      setNewCustomerDocument(parsed.customerDocument ?? "");
      setNewCustomerPhone(parsed.customerPhone ?? "");
      setNewCustomerAddress(parsed.customerAddress ?? "");
    }

    if (parsed.items.length > 0) {
      setItems(
        parsed.items.map((it) => {
          // O Solidus mostra na coluna "V. Unitário" o preço CHEIO (sem
          // desconto), mas o "V. Total" da linha já vem com o desconto do
          // pedido rateado proporcionalmente. Como o formulário sempre
          // recalcula o valor de cada item como quantidade × valor
          // unitário, usamos aqui o unitário EFETIVO (total da linha ÷
          // quantidade) — assim a soma bate com o total realmente cobrado
          // do cliente, não com o valor de tabela.
          const effectiveUnitPrice =
            it.quantity > 0 ? it.totalPrice / it.quantity : it.unitPrice;
          return {
            key: newKey(),
            productName: it.description,
            sku: it.code,
            quantity: String(it.quantity),
            unitPrice: effectiveUnitPrice.toFixed(2).replace(".", ","),
          };
        })
      );
      setSelectedItemKeys(new Set());
    }

    if (parsed.payments.length > 0) {
      try {
        // Uma venda pode ter mais de uma forma de pagamento (ex.: parte no
        // crédito, parte no débito) — criamos uma linha para cada uma,
        // com o valor e as parcelas específicas dela, não o total da venda.
        const rows: PaymentRow[] = [];
        for (const p of parsed.payments) {
          const methodId = await findOrCreatePaymentMethod(p.label);
          rows.push({
            key: newKey(),
            methodId,
            amount: p.amount.toFixed(2).replace(".", ","),
            installments: p.installments ? String(p.installments) : "",
          });
        }
        setPayments(rows);
        setPaymentsLocked(true);
      } catch (err) {
        console.error(err);
        setImportNotice("Dados da venda e itens importados. Não consegui cadastrar uma das formas de pagamento automaticamente — selecione manualmente.");
      }
    }
  }

  function removePayment(key: string) {
    setPayments((prev) => prev.filter((p) => p.key !== key));
  }

  async function handleSearchCustomer() {
    if (!customerSearch.trim()) return;
    const term = `%${customerSearch.trim()}%`;
    const { data } = await supabase.from("customers").select("id, full_name, document, phone").or(`full_name.ilike.${term},document.ilike.${term},phone.ilike.${term}`).limit(8);
    setCustomerResults(data ?? []);
  }

  async function handleCheckDuplicates() {
    setError(null);
    setCheckingDuplicates(true);
    try {
      const productNames = items.map((it) => it.productName.trim()).filter(Boolean);
      const { data, error: rpcError } = await supabase.rpc("detect_duplicate_protocols", {
        p_sale_number: saleNumber.trim() || null,
        p_salesperson_name: sellerName.trim() || null,
        p_product_names: productNames.length > 0 ? productNames : null,
      });
      if (rpcError) throw rpcError;
      setDuplicates(data ?? []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível checar duplicidade agora.");
    } finally {
      setCheckingDuplicates(false);
    }
  }

  async function loadCustomerHistory(document: string | null, phone: string | null) {
    if (!document && !phone) { setCustomerHistory(null); return; }
    setLoadingHistory(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_customer_protocol_history", { p_customer_document: document || null, p_customer_phone: phone || null });
      if (rpcError) throw rpcError;
      setCustomerHistory(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  function validate(): string | null {
    if (!protocolTypeId) return "Selecione o tipo de protocolo.";
    if (!saleNumber.trim()) return "Informe o número da venda.";
    if (!branchId) return "Selecione a filial.";
    if (!saleDate) return "Informe a data da venda.";
    if (customerMode === "search" && !selectedCustomer) return "Busque e selecione um cliente, ou troque para \"Cliente novo\".";
    if (customerMode === "new" && !newCustomerName.trim()) return "Informe o nome do cliente.";
    if (items.length === 0 || items.every((it) => !it.productName.trim())) return "Adicione pelo menos um item da venda.";
    if (requiresScope && !scopeId) return "Selecione o escopo.";
    if (requiresScope && isPartialScope && selectedItemKeys.size === 0) return "Selecione quais itens serão devolvidos.";
    if (!reasonId) return "Selecione o motivo.";
    if (availableSubreasons.length > 0 && !subreasonId) return "Selecione o submotivo.";
    if (!description.trim()) return "Preencha a descrição.";
    if (duplicates === null) return "Clique em \"Verificar duplicidade\" antes de salvar.";
    if (duplicates.length > 0 && !acknowledgeDuplicates) return "Confirme que está ciente das possíveis duplicidades encontradas.";
    if (!cashRegisterFinalized) return "Responda se a venda foi finalizada no caixa.";
    if (!needsRefund) return "Responda se o cliente precisa de estorno.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    // Trava imediata contra clique duplo (não espera o React re-renderizar).
    if (savingRef.current) return;
    savingRef.current = true;

    setError(null);
    setSaving(true);

    try {
      let customerId = selectedCustomer?.id ?? null;
      if (customerMode === "new") {
        const { data: customer, error: customerError } = await supabase.from("customers").insert({
          full_name: newCustomerName.trim(),
          document: newCustomerDocument.trim() || null,
          phone: newCustomerPhone.trim() || null,
          email: newCustomerEmail.trim() || null,
          address: newCustomerAddress.trim() || null,
          created_by: currentUserId,
        }).select("id").single();
        if (customerError) throw customerError;
        customerId = customer.id;
      }

      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        sale_number: saleNumber.trim(),
        branch_id: branchId,
        customer_id: customerId,
        sale_date: saleDate,
        total_amount: itemsTotal,
        sale_type: saleType.trim() || null,
        salesperson_name: sellerName.trim() || null,
        notes: saleNotes.trim() || null,
        created_by: currentUserId,
      }).select("id").single();
      if (saleError) throw saleError;
      const saleId = sale.id;

      const itemsToInsert = items.filter((it) => it.productName.trim()).map((it) => ({
        sale_id: saleId,
        product_name: it.productName.trim(),
        sku: it.sku.trim() || null,
        quantity: parseFloat(it.quantity.replace(",", ".")) || 1,
        unit_price: parseFloat(it.unitPrice.replace(",", ".")) || 0,
        total_price: (parseFloat(it.quantity.replace(",", ".")) || 1) * (parseFloat(it.unitPrice.replace(",", ".")) || 0),
        _key: it.key,
      }));

      const { data: insertedItems, error: itemsError } = await supabase.from("sale_items").insert(itemsToInsert.map(({ _key, ...rest }) => rest)).select("id");
      if (itemsError) throw itemsError;

      const paymentsToInsert = payments.filter((p) => p.amount.trim()).map((p) => ({
        sale_id: saleId,
        method_id: p.methodId,
        amount: parseFloat(p.amount.replace(",", ".")) || 0,
        installments: p.installments ? parseInt(p.installments, 10) : null,
      }));
      if (paymentsToInsert.length > 0) {
        const { error: paymentsError } = await supabase.from("payments").insert(paymentsToInsert);
        if (paymentsError) throw paymentsError;
      }

      const { data: protocolNumber, error: numberError } = await supabase.rpc("generate_protocol_number");
      if (numberError) throw numberError;

      const { data: protocol, error: protocolError } = await supabase.from("protocols").insert({
        protocol_number: protocolNumber,
        protocol_type_id: protocolTypeId,
        sale_id: saleId,
        customer_id: customerId,
        branch_id: branchId,
        reason_id: reasonId || null,
        subreason_id: subreasonId || null,
        cancellation_scope: selectedScope && (selectedScope.code === "total" || selectedScope.code === "parcial") ? selectedScope.code : null,
        scope_id: scopeId || null,
        description: description.trim() || null,
        financial_impact: needsRefund === "sim" ? refundValue || null : null,
        total_value: returnedTotal || null,
        refund_value: needsRefund === "sim" ? refundValue || null : null,
        client_credit_value: needsRefund === "sim" ? clientCreditValue || null : null,
        customer_pays_difference: customerPaysDifference === "sim",
        difference_value: customerPaysDifference === "sim" ? differenceValue || null : null,
        cash_register_finalized: cashRegisterFinalized === "sim",
        needs_refund: needsRefund === "sim",
        opened_by: currentUserId,
      }).select("id").single();
      if (protocolError) throw protocolError;

      if (isPartialScope && insertedItems && insertedItems.length === itemsToInsert.length) {
        const keyToInsertedId = new Map(itemsToInsert.map((it, idx) => [it._key, insertedItems[idx].id]));
        const protocolItemsToInsert = Array.from(selectedItemKeys)
          .map((key) => keyToInsertedId.get(key))
          .filter((id): id is string => Boolean(id))
          .map((saleItemId) => ({ protocol_id: protocol.id, sale_item_id: saleItemId }));
        if (protocolItemsToInsert.length > 0) {
          const { error: protocolItemsError } = await supabase.from("protocol_items").insert(protocolItemsToInsert);
          if (protocolItemsError) throw protocolItemsError;
        }
      }

      if (duplicates && duplicates.length > 0) {
        const uniqueProtocolIds = Array.from(new Set(duplicates.map((d) => d.protocol_id)));
        const relationshipsToInsert = uniqueProtocolIds.map((relatedId) => ({
          protocol_id: protocol.id,
          relationship_type: "duplicidade_suspeita" as const,
          related_protocol_id: relatedId,
          created_by: currentUserId,
        }));
        const { error: relError } = await supabase.from("protocol_relationships").insert(relationshipsToInsert);
        if (relError) throw relError;
      }

      setSuccessProtocolNumber(protocolNumber);
    } catch (err) {
      console.error(err);
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Erro desconhecido.";
      if (/row-level security/i.test(message)) {
        setError("Você não tem permissão para registrar vendas nesta filial. Escolha uma filial da sua lista ou peça ao administrador para liberar o acesso à filial em Configurações → Usuários.");
        return;
      }
      setError(`Não foi possível salvar: ${message}. Nenhuma alteração parcial foi desfeita automaticamente — me avise para eu conferir o que já foi gravado.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (successProtocolNumber) {
    return (
      <div className="rounded-lg border border-(--color-gray-200) bg-white p-8 text-center">
        <p className="mb-2 text-sm text-(--color-graphite-500)">Protocolo criado com sucesso</p>
        <div className="mb-6 flex justify-center"><ProtocolBadge code={successProtocolNumber} /></div>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push("/")} className="rounded-md border border-(--color-gray-200) px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50)">Voltar ao painel</button>
          <button onClick={() => window.location.reload()} className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700)">Abrir outra solicitação</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PdfImportBox onParsed={handlePdfParsed} />

      {importNotice && (
        <p className="rounded-md bg-(--color-gray-100) px-4 py-2 text-sm text-(--color-graphite-700)">{importNotice}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal: a venda, no estilo do comprovante */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-(--color-gray-100) pb-4">
              <div>
                <h2 className="text-sm font-medium text-(--color-graphite-900)">Dados da venda</h2>
                <p className="text-xs text-(--color-graphite-500)">Como aparece no comprovante do Solidus.</p>
              </div>
              <span className="protocol-stamp text-xs text-(--color-graphite-500)">
                Total da venda: R$ {formatMoney(itemsTotal)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Número da venda">
                <input value={saleNumber} onChange={(e) => { setSaleNumber(e.target.value); resetDuplicateCheck(); }} className={selectClass} placeholder="Ex.: 48213" />
              </Field>
              <Field label="Filial">
                <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setBranchLocked(false); }} className={selectClass}>
                  <option value="">Selecione...</option>
                  {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
                {branchLocked && (
                  <p className="mt-1 text-xs text-(--color-graphite-500)">Identificada automaticamente pelo PDF — confira e troque se precisar.</p>
                )}
              </Field>
              <Field label="Data da venda">
                <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className={selectClass} />
              </Field>
              <Field label="Tipo de venda (opcional)">
                <input value={saleType} onChange={(e) => setSaleType(e.target.value)} placeholder="Ex.: Venda Online" className={selectClass} />
              </Field>
              <Field label="Vendedor (opcional)">
                <input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Nome de quem vendeu" className={selectClass} />
              </Field>
            </div>

            <Field label="Observações da venda (opcional)" className="mt-4">
              <textarea value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} rows={2} className={selectClass} placeholder="Ex.: PAGO! Entrega agendada..." />
            </Field>
          </section>

          <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
            <div className="mb-4 flex items-center justify-between border-b border-(--color-gray-100) pb-4">
              <h2 className="text-sm font-medium text-(--color-graphite-900)">Cliente</h2>
              <div className="flex gap-1 text-xs">
                <button onClick={() => { setCustomerMode("search"); setCustomerHistory(null); }} className={tabClass(customerMode === "search")}>Buscar existente</button>
                <button onClick={() => { setCustomerMode("new"); setSelectedCustomer(null); setCustomerHistory(null); }} className={tabClass(customerMode === "new")}>Cliente novo</button>
              </div>
            </div>

            {customerMode === "search" ? (
              <div>
                <div className="flex gap-2">
                  <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Nome, CPF/CNPJ ou telefone" className={selectClass} />
                  <button onClick={handleSearchCustomer} className="shrink-0 rounded-md border border-(--color-gray-200) px-3 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50)">Buscar</button>
                </div>

                {customerResults.length > 0 && (
                  <ul className="mt-3 divide-y divide-(--color-gray-100) rounded-md border border-(--color-gray-200)">
                    {customerResults.map((c) => (
                      <li key={c.id}>
                        <button onClick={() => { setSelectedCustomer(c); setCustomerResults([]); setCustomerSearch(c.full_name); loadCustomerHistory(c.document, c.phone); }} className="w-full px-3 py-2 text-left text-sm hover:bg-(--color-gray-50)">
                          <span className="font-medium">{c.full_name}</span>
                          {c.document && (<span className="text-(--color-graphite-500)"> — {c.document}</span>)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedCustomer && (
                  <p className="mt-3 rounded-md bg-(--color-gray-50) px-3 py-2 text-sm text-(--color-graphite-700)">Selecionado: <strong>{selectedCustomer.full_name}</strong></p>
                )}
              </div>
            ) : (
              <div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome completo"><input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className={selectClass} /></Field>
                  <Field label="CPF ou CNPJ"><input value={newCustomerDocument} onChange={(e) => setNewCustomerDocument(e.target.value)} className={selectClass} /></Field>
                  <Field label="Telefone"><input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className={selectClass} /></Field>
                  <Field label="E-mail (opcional)"><input value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className={selectClass} /></Field>
                </div>
                <Field label="Endereço (opcional)" className="mt-4">
                  <input value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} className={selectClass} placeholder="Rua, número, bairro, cidade - UF" />
                </Field>
                <button onClick={() => loadCustomerHistory(newCustomerDocument.trim() || null, newCustomerPhone.trim() || null)} className="mt-3 text-xs text-(--color-red-600) hover:underline">Consultar histórico deste cliente</button>
              </div>
            )}

            {loadingHistory && (<p className="mt-3 text-xs text-(--color-graphite-500)">Carregando histórico...</p>)}

            {customerHistory !== null && (
              <div className="mt-3">
                {customerHistory.length === 0 ? (
                  <p className="text-sm text-(--color-graphite-500)">Nenhum protocolo anterior encontrado para este cliente.</p>
                ) : (
                  <div className="rounded-md border border-(--color-gray-200)">
                    <p className="border-b border-(--color-gray-200) bg-(--color-gray-50) px-3 py-1.5 text-xs font-medium text-(--color-graphite-700)">Histórico do cliente — {customerHistory.length} protocolo(s) anterior(es)</p>
                    <ul className="divide-y divide-(--color-gray-100)">
                      {customerHistory.map((h) => (
                        <li key={h.protocol_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2"><ProtocolBadge code={h.protocol_number} /><span className="text-(--color-graphite-700)">{h.protocol_type_name}</span></div>
                          <div className="flex items-center gap-3 text-xs text-(--color-graphite-500)">
                            <span>Venda {h.sale_number}</span>
                            <span>{new Date(h.opened_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                            <span>{PROTOCOL_STATUS_LABELS[h.status] ?? h.status}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
            <div className="mb-4 flex items-center justify-between border-b border-(--color-gray-100) pb-4">
              <h2 className="text-sm font-medium text-(--color-graphite-900)">Itens da venda</h2>
              <span className="protocol-stamp text-xs text-(--color-graphite-500)">Total: R$ {formatMoney(itemsTotal)}</span>
            </div>

            {isPartialScope && (
              <p className="mb-3 rounded-md bg-(--color-red-50) px-3 py-2 text-xs text-(--color-red-700)">
                Marque na primeira coluna os itens que serão devolvidos. O valor do voucher/estorno é calculado só com o que for marcado.
              </p>
            )}

            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.key} className="flex flex-wrap items-start gap-2">
                  {isPartialScope && (
                    <input type="checkbox" checked={selectedItemKeys.has(it.key)} onChange={() => toggleItemSelected(it.key)} className="mt-2.5 h-4 w-4" title="Devolver este item" />
                  )}
                  <input value={it.productName} onChange={(e) => updateItem(it.key, { productName: e.target.value })} placeholder="Produto" className={`${selectClass} flex-[2] min-w-[160px]`} />
                  <input value={it.sku} onChange={(e) => updateItem(it.key, { sku: e.target.value })} placeholder="SKU (opcional)" className={`${selectClass} flex-1 min-w-[100px]`} />
                  <input value={it.quantity} onChange={(e) => updateItem(it.key, { quantity: e.target.value })} placeholder="Qtd" className={`${selectClass} w-20`} />
                  <input value={it.unitPrice} onChange={(e) => updateItem(it.key, { unitPrice: e.target.value })} placeholder="Valor unit." className={`${selectClass} w-28`} />
                  <span className="mt-2 w-24 shrink-0 text-right text-sm text-(--color-graphite-500)">R$ {formatMoney(itemTotal(it))}</span>
                  <button onClick={() => removeItem(it.key)} className="mt-1.5 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">Remover</button>
                </div>
              ))}
            </div>

            <button onClick={addItem} className="mt-3 text-xs text-(--color-red-600) hover:underline">+ Adicionar item</button>
          </section>

          <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
            <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">Formas de pagamento</h2>

            {paymentsLocked ? (
              <div>
                <ul className="divide-y divide-(--color-gray-100) rounded-md border border-(--color-gray-200) bg-(--color-gray-50)">
                  {payments.map((p) => {
                    const method = paymentMethods.find((m) => m.id === p.methodId);
                    return (
                      <li key={p.key} className="flex items-center justify-between px-3 py-2 text-sm text-(--color-graphite-700)">
                        <span>
                          {method?.label ?? "—"}
                          {p.installments ? ` — ${p.installments}x` : ""}
                        </span>
                        <span className="protocol-stamp">R$ {p.amount || "0,00"}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-(--color-graphite-500)">
                  Vindo do PDF — não editável.{" "}
                  <button onClick={() => setPaymentsLocked(false)} className="text-(--color-red-600) hover:underline">Alterar manualmente</button>
                </p>
              </div>
            ) : (
              <div>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.key} className="flex flex-wrap items-center gap-2">
                      <select value={p.methodId} onChange={(e) => updatePayment(p.key, { methodId: e.target.value })} className={`${selectClass} flex-1 min-w-[140px]`}>
                        {paymentMethods.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
                      </select>
                      <input value={p.amount} onChange={(e) => updatePayment(p.key, { amount: e.target.value })} placeholder="Valor" className={`${selectClass} w-28`} />
                      <input value={p.installments} onChange={(e) => updatePayment(p.key, { installments: e.target.value })} placeholder="Parcelas" className={`${selectClass} w-24`} />
                      <button onClick={() => removePayment(p.key)} className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">Remover</button>
                    </div>
                  ))}
                </div>
                <button onClick={addPayment} className="mt-3 text-xs text-(--color-red-600) hover:underline">+ Adicionar forma de pagamento</button>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: o que será devolvido — rola de forma independente da
            coluna da esquerda quando o conteúdo passa da altura da tela. */}
        <div className="space-y-6">
          <section className="flex max-h-[calc(100vh-3rem)] flex-col overflow-y-auto rounded-lg border border-(--color-gray-200) bg-white p-5 lg:sticky lg:top-6">
            <h2 className="mb-4 text-sm font-medium text-(--color-graphite-900)">O que será devolvido</h2>

            <div className="space-y-4">
              <Field label="Tipo de protocolo *">
                <select value={protocolTypeId} onChange={(e) => { setProtocolTypeId(e.target.value); setScopeId(""); }} className={selectClass}>
                  <option value="">Selecione...</option>
                  {protocolTypes.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </Field>

              {requiresScope && (
                <Field label="Escopo *">
                  <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className={selectClass}>
                    <option value="">Selecione...</option>
                    {scopes.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </Field>
              )}

              <Field label="Motivo *">
                <select value={reasonId} onChange={(e) => { setReasonId(e.target.value); setSubreasonId(""); }} className={selectClass}>
                  <option value="">Selecione...</option>
                  {reasons.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                </select>
              </Field>

              {availableSubreasons.length > 0 && (
                <Field label="Submotivo *">
                  <select value={subreasonId} onChange={(e) => setSubreasonId(e.target.value)} className={selectClass}>
                    <option value="">Selecione...</option>
                    {availableSubreasons.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </Field>
              )}

              <Field label="Descrição *">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={selectClass} placeholder="Detalhe o que aconteceu..." />
              </Field>

              <Field
                label={
                  <span className="inline-flex items-center gap-1.5">
                    Necessário estorno de caixa? *
                    <InfoTooltip text="Esse estorno normalmente é feito no caixa da loja, para cancelamentos ou devoluções na mesma data da venda." />
                  </span>
                }
              >
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCashRegisterFinalized("sim")} className={toggleClass(cashRegisterFinalized === "sim")}>Sim</button>
                  <button type="button" onClick={() => setCashRegisterFinalized("nao")} className={toggleClass(cashRegisterFinalized === "nao")}>Não</button>
                </div>
              </Field>

              <Field
                label={
                  <span className="inline-flex items-center gap-1.5">
                    Cliente precisa de estorno? *
                    <InfoTooltip text="Marque Sim quando o cliente vai receber de volta algum valor pago — dinheiro, cartão ou outro meio." />
                  </span>
                }
              >
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNeedsRefund("sim")} className={toggleClass(needsRefund === "sim")}>Sim</button>
                  <button type="button" onClick={() => setNeedsRefund("nao")} className={toggleClass(needsRefund === "nao")}>Não</button>
                </div>
              </Field>

              <Field label="Cliente vai pagar diferença?">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCustomerPaysDifference("sim")} className={toggleClass(customerPaysDifference === "sim")}>Sim</button>
                  <button type="button" onClick={() => setCustomerPaysDifference("nao")} className={toggleClass(customerPaysDifference === "nao")}>Não</button>
                </div>
              </Field>

              <div className="rounded-md bg-(--color-gray-50) p-3">
                <p className="text-xs font-medium text-(--color-graphite-700)">Valor total apurado</p>
                <p className="protocol-stamp mt-1 text-xl font-medium text-(--color-graphite-900)">R$ {formatMoney(returnedTotal)}</p>
                <p className="mt-1 text-xs text-(--color-graphite-500)">
                  {isPartialScope ? "Soma só dos itens marcados para devolução." : "Valor cheio da venda."}
                </p>
              </div>

              {customerPaysDifference === "sim" && (
                <div className="rounded-md bg-(--color-gray-50) p-3">
                  <label className="text-xs font-medium text-(--color-graphite-700)">
                    Valor da diferença
                  </label>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="protocol-stamp text-lg font-medium text-(--color-graphite-900)">R$</span>
                    <CurrencyInput
                      value={differenceValue}
                      onChange={setDifferenceValue}
                      className="protocol-stamp w-full border-0 bg-transparent text-lg font-medium text-(--color-graphite-900) outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-(--color-graphite-500)">
                    Quanto o cliente vai pagar a mais pelo produto novo.
                  </p>
                  <div className="mt-3 border-t border-(--color-gray-200) pt-3">
                    <p className="text-xs font-medium text-(--color-graphite-700)">
                      Valor total da troca (produto + diferença)
                    </p>
                    <p className="protocol-stamp mt-1 text-lg font-medium text-(--color-graphite-900)">
                      R$ {formatMoney(returnedTotal + differenceValue)}
                    </p>
                    <p className="mt-1 text-xs text-(--color-graphite-500)">
                      {isPartialScope ? "Valor apurado (parcial)" : "Valor apurado"} + diferença paga
                      pelo cliente.
                    </p>
                  </div>
                </div>
              )}

              {needsRefund === "sim" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-(--color-red-50) p-3">
                    <label className="text-xs font-medium text-(--color-graphite-700)">
                      Valor do estorno
                    </label>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="protocol-stamp text-lg font-medium text-(--color-red-600)">R$</span>
                      <CurrencyInput
                        value={refundValueInput}
                        onChange={setRefundValueInput}
                        placeholder={formatMoney(returnedTotal)}
                        className="protocol-stamp w-full border-0 bg-transparent text-lg font-medium text-(--color-red-600) outline-none placeholder:text-(--color-red-600)/50"
                      />
                    </div>
                    <p className="mt-1 text-xs text-(--color-graphite-500)">
                      Quanto volta pro cliente. Deixe em branco para usar o valor total.
                    </p>
                  </div>
                  <div className="rounded-md bg-emerald-50 p-3">
                    <p className="text-xs font-medium text-(--color-graphite-700)">
                      Valor de crédito cliente
                    </p>
                    <p className="protocol-stamp mt-1 text-lg font-medium text-emerald-700">
                      R$ {formatMoney(clientCreditValue)}
                    </p>
                    <p className="mt-1 text-xs text-(--color-graphite-500)">
                      Valor total menos o estorno — vira crédito para usar na loja.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-(--color-gray-100) pt-4">
              <p className="mb-1 text-xs font-medium text-(--color-graphite-700)">Checagem de lançamento duplicado</p>
              <p className="mb-3 text-xs text-(--color-graphite-500)">Confere se este número de venda já tem um protocolo aberto.</p>
              <button onClick={handleCheckDuplicates} disabled={checkingDuplicates} className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60">
                {checkingDuplicates ? "Verificando..." : "Verificar duplicidade"}
              </button>

              {duplicates !== null && duplicates.length === 0 && (
                <p className="mt-3 text-sm text-(--color-success)">Nenhum protocolo duplicado para este lançamento.</p>
              )}

              {duplicates !== null && duplicates.length > 0 && (
                <div className="mt-3 rounded-md bg-(--color-red-50) p-3">
                  <ul className="space-y-1 text-sm text-(--color-red-700)">
                    {duplicates.map((d, i) => (<li key={i}><ProtocolBadge code={d.protocol_number} /> {MATCH_REASON_LABELS[d.match_reason] ?? d.match_reason}</li>))}
                  </ul>
                  <label className="mt-3 flex items-center gap-2 text-sm text-(--color-graphite-700)">
                    <input type="checkbox" checked={acknowledgeDuplicates} onChange={(e) => setAcknowledgeDuplicates(e.target.checked)} />
                    Estou ciente e quero continuar mesmo assim
                  </label>
                </div>
              )}
            </div>

            {error && (<p role="alert" className="mt-4 rounded-md bg-(--color-red-50) px-3 py-2 text-sm text-(--color-red-700)">{error}</p>)}

            <button onClick={handleSubmit} disabled={saving} className="mt-4 w-full rounded-md bg-(--color-red-600) px-6 py-2.5 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar protocolo"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

const selectClass = "w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)";

function tabClass(active: boolean) {
  return `rounded-md px-2.5 py-1 ${active ? "bg-(--color-red-600) text-white" : "text-(--color-graphite-500) hover:bg-(--color-gray-50)"}`;
}

function toggleClass(active: boolean) {
  return `flex-1 rounded-md border px-3 py-2 text-sm font-medium ${active ? "border-(--color-red-600) bg-(--color-red-600) text-white" : "border-(--color-gray-200) text-(--color-graphite-700) hover:bg-(--color-gray-50)"}`;
}

function Field({ label, children, className = "" }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">{label}</label>
      {children}
    </div>
  );
}
