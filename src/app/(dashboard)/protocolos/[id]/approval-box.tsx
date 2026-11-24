"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { TipoGuiado } from "../novo/tipo-guiado";

type Tipo = { id: string; code: string; name: string; description?: string | null; requires_delivered_product_approval: boolean; requires_scope: boolean };
type Escopo = { id: string; code: string; name: string };

const DECISION_LABELS: Record<string, string> = {
  aprovado: "Aprovar",
  recusado: "Recusar",
  aguardando_informacao: "Pedir mais informações",
};

export function ApprovalBox({
  approvalId,
  requiredRoleLabel,
  protocolId,
  tipoAtualId,
  temEscopo,
  tipos = [],
  escopos = [],
  podeCorrigirTipo = false,
}: {
  approvalId: string;
  requiredRoleLabel: string;
  protocolId?: string;
  tipoAtualId?: string;
  temEscopo?: boolean;
  tipos?: Tipo[];
  escopos?: Escopo[];
  podeCorrigirTipo?: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDecide(decision: string) {
    setError(null);
    setSubmitting(decision);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc("decide_approval", {
      p_approval_id: approvalId,
      p_decision: decision,
      p_notes: notes.trim() || null,
    });

    setSubmitting(null);

    if (rpcError) {
      setError(
        rpcError.message.includes("permissão")
          ? "Você não tem permissão para decidir esta aprovação."
          : "Não foi possível registrar a decisão agora."
      );
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-red-100) bg-(--color-red-50) p-5">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-medium text-(--color-graphite-900)">
          Aguardando sua aprovação
        </h2>
        {podeCorrigirTipo && protocolId && tipos.length > 0 && (
          <CorrigirTipo protocolId={protocolId} tipoAtualId={tipoAtualId ?? ""} temEscopo={!!temEscopo} tipos={tipos} escopos={escopos} />
        )}
      </div>
      <p className="mb-3 text-xs text-(--color-graphite-500)">
        Exige aprovação de: {requiredRoleLabel}. Confira se o tipo está certo antes de aprovar: as tarefas dos setores são criadas na aprovação, de acordo com o tipo.
      </p>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Observações (opcional)"
        className="mb-3 w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
      />

      {error && (
        <p className="mb-3 rounded-md bg-white px-3 py-2 text-sm text-(--color-red-700)">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleDecide("aprovado")}
          disabled={submitting !== null}
          className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
        >
          {submitting === "aprovado" ? "Aprovando..." : "Aprovar"}
        </button>
        <button
          onClick={() => handleDecide("recusado")}
          disabled={submitting !== null}
          className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60"
        >
          {submitting === "recusado" ? "Recusando..." : "Recusar"}
        </button>
        <button
          onClick={() => handleDecide("aguardando_informacao")}
          disabled={submitting !== null}
          className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60"
        >
          {submitting === "aguardando_informacao"
            ? "Enviando..."
            : DECISION_LABELS.aguardando_informacao}
        </button>
      </div>
    </section>
  );
}

// Corrigir o tipo antes de aprovar (ex.: vendedor abriu Cancelamento e é Troca).
function CorrigirTipo({ protocolId, tipoAtualId, temEscopo, tipos, escopos }: { protocolId: string; tipoAtualId: string; temEscopo: boolean; tipos: Tipo[]; escopos: Escopo[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipoId, setTipoId] = useState("");
  const [escopoId, setEscopoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const atual = tipos.find((t) => t.id === tipoAtualId);
  const novo = tipos.find((t) => t.id === tipoId);
  const precisaEscopo = !!novo?.requires_scope && !temEscopo;

  async function salvar() {
    setErro(null);
    if (!tipoId) return setErro("Responda as perguntas para escolher o tipo certo.");
    if (tipoId === tipoAtualId) return setErro("O protocolo já é deste tipo.");
    if (precisaEscopo && !escopoId) return setErro("Escolha o escopo.");
    if (!motivo.trim()) return setErro("Informe o motivo da correção.");
    setSalvando(true);
    const { data, error } = await createClient().rpc("change_protocol_type", {
      p_protocol_id: protocolId, p_type_id: tipoId, p_reason: motivo.trim(), p_scope_id: escopoId || null,
    });
    setSalvando(false);
    if (error) return setErro(error.message || "Não foi possível corrigir o tipo agora.");
    const r = data as { pode_aprovar?: boolean } | null;
    if (r && r.pode_aprovar === false) setAviso("Tipo corrigido. Com o tipo novo, a aprovação passa para outro responsável.");
    setAberto(false);
    router.refresh();
  }

  if (!aberto) {
    return (
      <div className="text-right">
        <button type="button" onClick={() => setAberto(true)}
          className="rounded-md border border-(--color-gray-200) bg-white px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50) hover:text-(--color-red-600)">
          Corrigir tipo
        </button>
        {aviso && <p className="mt-1 text-xs text-(--color-graphite-700)">{aviso}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 w-full rounded-md border border-(--color-gray-200) bg-white p-4">
      <p className="mb-3 text-sm font-medium text-(--color-graphite-900)">
        Corrigir tipo <span className="font-normal text-(--color-graphite-500)">— hoje: {atual?.name ?? "—"}</span>
      </p>
      <TipoGuiado tipos={tipos} value={tipoId} onChange={setTipoId} />
      {precisaEscopo && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Escopo *</label>
          <select value={escopoId} onChange={(e) => setEscopoId(e.target.value)}
            className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)">
            <option value="">Selecione...</option>
            {escopos.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
          </select>
        </div>
      )}
      <label className="mb-1 mt-3 block text-xs font-medium text-(--color-graphite-700)">Motivo da correção *</label>
      <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
        placeholder="Ex.: cliente vai levar outro colchão, é troca"
        className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)" />
      {erro && <p className="mt-2 rounded-md bg-(--color-red-50) px-3 py-2 text-sm text-(--color-red-700)">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={salvar} disabled={salvando}
          className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60">
          {salvando ? "Salvando..." : "Salvar correção"}
        </button>
        <button type="button" onClick={() => { setAberto(false); setErro(null); }} disabled={salvando}
          className="rounded-md border border-(--color-gray-200) bg-white px-4 py-2 text-sm text-(--color-graphite-700) hover:bg-(--color-gray-50)">
          Cancelar
        </button>
      </div>
    </div>
  );
}
