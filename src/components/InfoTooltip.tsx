"use client";

import { useState } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-(--color-gray-200) text-[10px] font-semibold text-(--color-graphite-700) hover:bg-(--color-gray-300)"
        aria-label="Mais informações"
      >
        ?
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-md bg-(--color-graphite-900) px-2.5 py-1.5 text-xs text-white shadow-lg">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-(--color-graphite-900)" />
        </span>
      )}
    </span>
  );
}
