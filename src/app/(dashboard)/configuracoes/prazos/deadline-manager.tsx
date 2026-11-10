"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";

type DeadlineSetting = { key: string; label: string; description: string | null; hours: number };
type Unit = "horas" | "minutos";

export function DeadlineManager({ initialSettings }: { initialSettings: DeadlineSetting[] }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [inputs, setInputs] = useState<Record<string, string>>(
    Object.fromEntries(initialSettings.map((s) => [s.key, String(s.hours)]))
  );
  const [units, setUnits] = useState<Record<string, Unit>>(
    Object.fromEntries(initialSettings.map((s) => [s.key, "horas" as Unit]))
  );
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function handleUnitChange(key: string, newUnit: Unit) {
    const current = parseFloat((inputs[key] ?? "").replace(",", "."));
    const oldUnit = units[key] ?? "horas";
    if (!isNaN(current) && oldUnit !== newUnit) {
      const converted = newUnit === "minutos" ? current * 60 : current / 60;
      setInputs((prev) => ({ ...prev, [key]: String(Number(converted.toFixed(2))) }));
    }
    setUnits((prev) => ({ ...prev, [key]: newUnit }));
  }

  async function handleSave(key: string) {
    const raw = parseFloat((inputs[key] ?? "").replace(",", "."));
    if (!raw || raw <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    const unit = units[key] ?? "horas";
    const hours = unit === "minutos" ? raw / 60 : raw;
    setError(null);
    setSubmitting(key);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("deadline_settings")
      .update({ hours, updated_at: new Date().toISOString() })
      .eq("key", key);
    setSubmitting(null);
    if (updateError) {
      setError("Não foi possível salvar agora.");
      return;
    }
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, hours } : s)));
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      {error && (
        <p className="mb-3 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
          {error}
        </p>
      )}
      <ul className="divide-y divide-(--color-gray-100)">
        {settings.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-(--color-graphite-900)">{s.label}</p>
              {s.description && (
                <p className="text-xs text-(--color-graphite-500)">{s.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={inputs[s.key] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [s.key]: e.target.value }))}
                inputMode="decimal"
                className="w-20 rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm text-right outline-none focus:border-(--color-red-600)"
              />
              <select
                value={units[s.key] ?? "horas"}
                onChange={(e) => handleUnitChange(s.key, e.target.value as Unit)}
                className="rounded-md border border-(--color-gray-200) px-2 py-1.5 text-xs text-(--color-graphite-700) outline-none focus:border-(--color-red-600)"
              >
                <option value="horas">horas</option>
                <option value="minutos">minutos</option>
              </select>
              <button
                onClick={() => handleSave(s.key)}
                disabled={submitting === s.key}
                className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
              >
                {submitting === s.key ? "Salvando..." : saved === s.key ? "Salvo!" : "Salvar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
