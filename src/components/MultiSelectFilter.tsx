"use client";

import { useEffect, useRef, useState } from "react";
import { IconSearch } from "@/lib/protocol-icons";

type Option = { value: string; label: string };

export function MultiSelectFilter({
  name,
  label,
  options,
  defaultValues,
}: {
  /** Nome do campo — usado nos inputs ocultos, pra o form GET nativo
   * enviar cada valor marcado como uma entrada repetida (?name=a&name=b). */
  name: string;
  label: string;
  options: Option[];
  defaultValues: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );
  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1 block text-xs font-medium text-(--color-graphite-700)">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-44 items-center justify-between gap-2 rounded-md border border-(--color-gray-200) bg-white px-3 py-2 text-left text-sm hover:border-(--color-red-600)"
      >
        <span className="truncate text-(--color-graphite-700)">
          {selectedLabels.length === 0
            ? "Todos"
            : selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels.length} selecionados`}
        </span>
        <IconSearch className="h-4 w-4 shrink-0 text-(--color-graphite-500)" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-60 rounded-md border border-(--color-gray-200) bg-white shadow-lg">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            autoFocus
            className="w-full border-b border-(--color-gray-200) px-3 py-2 text-sm outline-none"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <p className="px-3 py-2 text-xs text-(--color-graphite-500)">Nada encontrado.</p>
            )}
            {filteredOptions.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-(--color-gray-50)"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="w-full border-t border-(--color-gray-100) px-3 py-1.5 text-left text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
