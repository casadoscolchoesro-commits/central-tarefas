"use client";
// Tipo de protocolo por perguntas: o vendedor responde o que sabe do cliente
// e a tela escolhe o tipo (Troca x Cancelamento, antes x depois da entrega).
// Regra combinada com a loja: se o cliente continua com alguma compra (outro
// produto ou o mesmo, com nota/pagamento/detalhe corrigido), é TROCA; só é
// CANCELAMENTO quando o cliente desiste e não leva nada.
import { useEffect, useState } from "react";

type Tipo = { id: string; code: string; name: string; description?: string | null; requires_delivered_product_approval: boolean; requires_scope: boolean };

const CODIGOS = {
  troca: { nao: "TROCA_ANTES_DA_ENTREGA", sim: "TROCA_APOS_A_ENTREGA" },
  cancelamento: { nao: "CANC_ANTES_ENTREGA", sim: "CANC_APOS_ENTREGA" },
} as const;
const PRINCIPAIS: string[] = [...Object.values(CODIGOS.troca), ...Object.values(CODIGOS.cancelamento)];

type Continua = "outro" | "mesmo" | "desiste";

export function TipoGuiado({
  tipos,
  value,
  onChange,
}: {
  tipos: Tipo[];
  value: string;
  onChange: (id: string) => void;
}) {
  const porCodigo = (c: string) => tipos.find((t) => t.code === c);
  const temPrincipais = PRINCIPAIS.every((c) => porCodigo(c));
  const outros = tipos.filter((t) => !PRINCIPAIS.includes(t.code));

  const [continua, setContinua] = useState<Continua | null>(null);
  const [entregue, setEntregue] = useState<"sim" | "nao" | null>(null);
  const [modoOutros, setModoOutros] = useState(false);

  // respostas → tipo
  useEffect(() => {
    if (modoOutros || !temPrincipais) return;
    if (!continua || !entregue) { if (value) onChange(""); return; }
    const codigo = CODIGOS[continua === "desiste" ? "cancelamento" : "troca"][entregue];
    const id = porCodigo(codigo)?.id ?? "";
    if (id !== value) onChange(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continua, entregue, modoOutros]);

  const escolhido = tipos.find((t) => t.id === value);

  // se os tipos principais forem renomeados/desativados, volta para a lista
  if (!temPrincipais) {
    return (
      <Lista tipos={tipos} value={value} onChange={onChange} />
    );
  }

  return (
    <div className="space-y-4">
      {!modoOutros ? (
        <>
          <Pergunta titulo="Depois disso, o cliente continua com alguma compra na loja? *">
            <Opcao ativo={continua === "outro"} onClick={() => setContinua("outro")}
              titulo="Sim, vai levar outro produto" detalhe="outra cor, medida, modelo…" />
            <Opcao ativo={continua === "mesmo"} onClick={() => setContinua("mesmo")}
              titulo="Sim, fica com o mesmo produto" detalhe="só corrige nota, pagamento ou outro detalhe" />
            <Opcao ativo={continua === "desiste"} onClick={() => setContinua("desiste")}
              titulo="Não, desiste da compra" detalhe="não leva nada no lugar" />
          </Pergunta>

          <Pergunta titulo="O produto já foi entregue ao cliente? *">
            <div className="flex gap-2">
              <Botao ativo={entregue === "nao"} onClick={() => setEntregue("nao")}>Ainda não</Botao>
              <Botao ativo={entregue === "sim"} onClick={() => setEntregue("sim")}>Já foi entregue</Botao>
            </div>
          </Pergunta>
        </>
      ) : (
        <Lista tipos={outros} value={value} onChange={onChange} />
      )}

      {escolhido && (
        <div className={`rounded-md border p-3 text-sm ${escolhido.code.startsWith("CANC") ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className="font-medium text-(--color-graphite-900)">Tipo: {escolhido.name}</p>
          {escolhido.description && <p className="mt-0.5 text-xs text-(--color-graphite-700)">{escolhido.description}</p>}
          {escolhido.code.startsWith("TROCA") && (
            <p className="mt-1 text-xs text-(--color-graphite-700)">Depois da aprovação, será pedida a venda substituta.</p>
          )}
          {escolhido.requires_delivered_product_approval && (
            <p className="mt-1 text-xs text-(--color-graphite-700)">Precisa da aprovação do gerente de SAC.</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => { setModoOutros(!modoOutros); setContinua(null); setEntregue(null); onChange(""); }}
        className="text-xs text-(--color-graphite-500) underline hover:text-(--color-red-600)"
      >
        {modoOutros ? "← Voltar para troca ou cancelamento" : "Outros casos (exclusão de orçamento, devolução com crédito…)"}
      </button>
    </div>
  );
}

function Lista({ tipos, value, onChange }: { tipos: Tipo[]; value: string; onChange: (id: string) => void }) {
  const t = tipos.find((x) => x.id === value);
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">Tipo de protocolo *</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)">
        <option value="">Selecione...</option>
        {tipos.map((x) => (<option key={x.id} value={x.id}>{x.name}</option>))}
      </select>
      {t?.description && <p className="mt-1 text-xs text-(--color-graphite-500)">{t.description}</p>}
    </div>
  );
}

function Pergunta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">{titulo}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Opcao({ ativo, onClick, titulo, detalhe }: { ativo: boolean; onClick: () => void; titulo: string; detalhe: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${ativo ? "border-(--color-red-600) bg-(--color-red-50) text-(--color-red-700)" : "border-(--color-gray-200) bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50)"}`}>
      <span className="font-medium">{titulo}</span>
      <span className="block text-xs opacity-80">{detalhe}</span>
    </button>
  );
}

function Botao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-2 text-sm ${ativo ? "border-(--color-red-600) bg-(--color-red-50) font-medium text-(--color-red-700)" : "border-(--color-gray-200) bg-white text-(--color-graphite-700) hover:bg-(--color-gray-50)"}`}>
      {children}
    </button>
  );
}
