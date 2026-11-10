"use client";
// Botões dos outros módulos do WG Hub (mesmo login), como no SAC.
import { useEffect, useState } from "react";

const MODS: [string, string, string, string][] = [
  ["pedidos", "Pedidos", "/", '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'],
  ["logistica", "Logística", "/", '<rect x="1" y="5" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'],
  ["sac", "SAC", "/sac/", '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z"/>'],
  ["validlink", "ValidLink", "/", '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'],
  ["financeiro", "Financeiro", "/", '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>'],
  ["cancelamentos", "Cancel.", "/cancelamentos/", '<path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>'],
];

export function ModulosWgHub({ collapsed }: { collapsed: boolean }) {
  const [lista, setLista] = useState<string[] | null>(null);
  useEffect(() => {
    try { setLista(JSON.parse(localStorage.getItem("modulosPermitidos") || "null")); } catch { setLista(null); }
  }, []);
  const mods = MODS.filter(([m]) => m === "cancelamentos" || (lista ? lista.includes(m) : false));
  if (mods.length < 2) {
    return (
      <a href="/" className="mx-2 mt-2 block rounded-md px-3 py-1.5 text-xs text-(--color-graphite-500) hover:text-(--color-red-600)">
        {collapsed ? "←" : "← Voltar ao WG Hub"}
      </a>
    );
  }
  return (
    <div
      className="mx-2 mt-2 grid gap-1 rounded-xl bg-[#f3efef] p-1"
      style={{ gridTemplateColumns: collapsed ? "1fr" : `repeat(${mods.length <= 3 ? mods.length : 3}, minmax(0,1fr))` }}
    >
      {mods.map(([m, n, href, ic]) => (
        <a
          key={m}
          href={href}
          title={n}
          onClick={() => { try { localStorage.setItem("moduloAtual", m); } catch {} }}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] font-medium ${m === "cancelamentos" ? "bg-[#7b1a2c] text-white" : "text-[#555] hover:bg-white"}`}
        >
          <span
            className="flex h-4 w-4"
            dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic}</svg>` }}
          />
          {!collapsed && <span>{n}</span>}
        </a>
      ))}
    </div>
  );
}
