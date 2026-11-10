"use client";
import { useState } from "react";
import { BASE } from "@/lib/supabase-config";
import Link from "next/link";

export const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "12 meses", days: 365 },
];

export function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-gray-100)">
      <div
        className="h-full rounded-full bg-(--color-red-600)/55"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Lê o período (from/to) da URL, com padrão de últimos 30 dias. */
export { parseDateRange } from "@/lib/report-date-range";

export function BackToReportsLink() {
  return (
    <Link
      href="/relatorios"
      className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
    >
      ← Relatórios
    </Link>
  );
}

const KPI_VARIANT_CLASSES = {
  neutral: "border-(--color-gray-200) bg-white",
  good: "border-emerald-200 bg-emerald-50",
  bad: "border-(--color-red-100) bg-(--color-red-50)",
} as const;

const KPI_VALUE_CLASSES = {
  neutral: "text-(--color-graphite-900)",
  good: "text-emerald-700",
  bad: "text-(--color-red-600)",
} as const;

/** Card grande de KPI, no estilo "Venda global / Margem bruta" do
 * exemplo — rótulo pequeno, valor grande, uma linha de contexto embaixo. */
export function KpiCard({
  label,
  value,
  hint,
  variant = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  variant?: "neutral" | "good" | "bad";
}) {
  return (
    <div className={`rounded-lg border p-4 ${KPI_VARIANT_CLASSES[variant]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-(--color-graphite-500)">
        {label}
      </p>
      <p className={`protocol-stamp mt-1 text-2xl font-medium ${KPI_VALUE_CLASSES[variant]}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-(--color-graphite-500)">{hint}</p>}
    </div>
  );
}

/** Faixa amarela de atenção — só aparece quando faz sentido mostrar
 * (a página decide a condição, este componente só desenha a faixa). */
export function AlertBanner({ title = "Alerta", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <span className="mt-0.5 text-amber-600">⚠</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{title}</p>
        <p className="mt-0.5 text-sm text-amber-900">{children}</p>
      </div>
    </div>
  );
}

/** Faixa verde de destaque — um ponto positivo pra chamar atenção. */
export function HighlightBanner({ title = "Destaque", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
      <span className="mt-0.5 text-emerald-600">↗</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{title}</p>
        <p className="mt-0.5 text-sm text-emerald-900">{children}</p>
      </div>
    </div>
  );
}

export function DownloadPdfButton({
  type,
  fromStr,
  toStr,
}: {
  type: string;
  fromStr: string;
  toStr: string;
}) {
  const [gerando, setGerando] = useState(false);
  async function baixar() {
    setGerando(true);
    try {
      const { gerarRelatorioPdf } = await import("@/lib/pdf/gerar-relatorio");
      const blob = await gerarRelatorioPdf(type, fromStr, toStr);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `relatorio-${type}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      alert("Não foi possível gerar o PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGerando(false);
    }
  }
  return (
    <button
      type="button"
      onClick={baixar}
      disabled={gerando}
      className="inline-flex items-center gap-1.5 rounded-md border border-(--color-gray-200) bg-white px-3 py-2 text-sm text-(--color-graphite-700) hover:border-(--color-red-600) hover:text-(--color-red-600) disabled:opacity-60"
    >
      {gerando ? "Gerando PDF…" : "Baixar PDF"}
    </button>
  );
}

export function DateFilterForm({
  basePath,
  fromStr,
  toStr,
  today,
}: {
  basePath: string;
  fromStr: string;
  toStr: string;
  today: Date;
}) {
  return (
    <form
      action={BASE + basePath}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-(--color-gray-200) bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
          De
        </label>
        <input
          type="date"
          name="from"
          defaultValue={fromStr}
          className="rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
          Até
        </label>
        <input
          type="date"
          name="to"
          defaultValue={toStr}
          className="rounded-md border border-(--color-gray-200) px-3 py-2 text-sm outline-none focus:border-(--color-red-600)"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-(--color-red-600) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-red-700)"
      >
        Aplicar
      </button>
      <div className="flex flex-wrap gap-2 text-xs">
        {PRESETS.map((p) => {
          const presetFrom = new Date(today.getTime() - p.days * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          const presetTo = today.toISOString().slice(0, 10);
          return (
            <a
              key={p.label}
              href={`${BASE}${basePath}?from=${presetFrom}&to=${presetTo}`}
              className="rounded-full border border-(--color-gray-200) px-3 py-1.5 text-(--color-graphite-700) hover:border-(--color-red-600) hover:text-(--color-red-600)"
            >
              {p.label}
            </a>
          );
        })}
      </div>
    </form>
  );
}
