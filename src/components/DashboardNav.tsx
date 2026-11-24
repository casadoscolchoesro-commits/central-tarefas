"use client";
// Menu lateral igual ao do WG Hub: recolhido por padrão, abre ao passar o
// mouse; a setinha fixa/recolhe (preferência "menuFixo", a mesma do WG Hub);
// no celular vira gaveta, aberta pelo botão da barra do topo.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "@/lib/navegacao";
import type { NavItem, NavIconKey } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { ShakeableLogo } from "@/components/ShakeableLogo";
import { IconGrid, IconPlusCircle, IconTicket, IconCheckShield, IconCheckCircle, IconChart, IconSettings, IconCart } from "@/lib/protocol-icons";

const NAV_ICONS: Record<NavIconKey, (p: { className?: string }) => React.ReactElement> = {
  grid: IconGrid,
  plusCircle: IconPlusCircle,
  ticket: IconTicket,
  checkShield: IconCheckShield,
  checkCircle: IconCheckCircle,
  chart: IconChart,
  settings: IconSettings,
  cart: IconCart,
};

// Módulos do WG Hub, na mesma ordem, nomes e ícones do seletor do WG Hub.
const SVG = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const MODULOS: Record<string, { nome: string; curto: string; href: string; ico: string }> = {
  pedidos: { nome: "Controle de Pedidos", curto: "Pedidos", href: "/", ico: SVG('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>') },
  logistica: { nome: "Logística", curto: "Logística", href: "/", ico: SVG('<rect x="1" y="5" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>') },
  sac: { nome: "SAC · Assistência", curto: "SAC", href: "/sac/", ico: SVG('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z"/>') },
  cancelamentos: { nome: "Cancelamentos", curto: "Cancel.", href: "/cancelamentos/", ico: SVG('<path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>') },
  validlink: { nome: "ValidLink · Compras por link", curto: "ValidLink", href: "/", ico: SVG('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>') },
  financeiro: { nome: "Financeiro", curto: "Financeiro", href: "/", ico: SVG('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>') },
};

function useModulos(): string[] {
  const [mods, setMods] = useState<string[]>(["cancelamentos"]);
  useEffect(() => {
    let lista: string[] | null = null;
    try { lista = JSON.parse(localStorage.getItem("modulosPermitidos") || "null"); } catch {}
    const ordem = Object.keys(MODULOS);
    const sel = (lista ?? []).filter((m) => MODULOS[m]);
    if (!sel.includes("cancelamentos")) sel.push("cancelamentos");
    sel.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
    setMods(sel);
  }, []);
  return mods;
}

// Liga o modo recolhido no <body> (como o WG Hub) e fecha a gaveta ao trocar de tela.
export function useMenuWgHub() {
  const pathname = usePathname();
  useEffect(() => {
    let fixo = false;
    try { fixo = localStorage.getItem("menuFixo") === "1"; } catch {}
    document.body.classList.toggle("sb-mini", !fixo);
  }, []);
  useEffect(() => {
    document.body.classList.remove("sb-aberta");
  }, [pathname]);
  useEffect(() => {
    function fora(ev: MouseEvent) {
      if (!document.body.classList.contains("sb-aberta")) return;
      const t = ev.target as HTMLElement;
      if (t.closest(".wg-sidebar") || t.closest(".wg-menu-mobile")) return;
      document.body.classList.remove("sb-aberta");
    }
    document.addEventListener("click", fora);
    return () => document.removeEventListener("click", fora);
  }, []);
}

function alternarMenu() {
  document.body.classList.toggle("sb-mini");
  try { localStorage.setItem("menuFixo", document.body.classList.contains("sb-mini") ? "0" : "1"); } catch {}
}

async function sair() {
  await createClient().auth.signOut();
  // sai do WG Hub inteiro (mesma sessão)
  window.location.href = "/";
}

export function DashboardNav({
  items,
  fullName,
  rolesText,
  avatarUrl,
}: {
  items: NavItem[];
  fullName: string;
  rolesText: string;
  iconUrl?: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const mods = useModulos();
  useMenuWgHub();

  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  // "Central de protocolos" não fica marcada junto com "Nova solicitação"
  const marcado = (href: string) =>
    ativo(href) && !items.some((o) => o.href !== href && o.href.startsWith(href + "/") && ativo(o.href));

  return (
    <aside className="wg-sidebar">
      <button className="wg-toggle" title="Fixar / recolher o menu" onClick={alternarMenu}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <Link className="wg-brand" href="/" title="Painel">
        <div className="wg-banner">
          <ShakeableLogo src="/cancelamentos/sb-arte.png" alt="A Gigante Vermelhinha" />
        </div>
        <div className="wg-sub">Casa dos Colchões · Cancelamentos</div>
        <div className="wg-mini-logo"><img src="/cancelamentos/sb-mini-logo.png" alt="Grupo WG" /></div>
      </Link>

      <nav className="wg-nav">
        {mods.length > 1 ? (
          <div className="wg-mods" style={{ ["--mods-col" as string]: mods.length <= 3 ? mods.length : mods.length === 4 ? 2 : 3 }}>
            {mods.map((m) => (
              <a
                key={m}
                className={m === "cancelamentos" ? "on" : ""}
                href={MODULOS[m].href}
                title={MODULOS[m].nome}
                onClick={() => { try { localStorage.setItem("moduloAtual", m); } catch {} }}
              >
                <span style={{ display: "flex" }} dangerouslySetInnerHTML={{ __html: MODULOS[m].ico }} />
                <span className="wg-label">{MODULOS[m].curto}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="wg-sep">Cancelamentos</div>
        )}
        {/* tela inicial do WG Hub com as tarefas de todos os módulos */}
        <a href="/#/inicio" title="Minhas tarefas (todos os módulos)" className="wg-item">
          <span style={{ display: "flex" }} dangerouslySetInnerHTML={{ __html: SVG('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>') }} />
          <span className="wg-label">Minhas tarefas</span>
        </a>
        {items.map((item) => {
          const ItemIcon = NAV_ICONS[item.iconKey];
          return (
            <Link key={item.href} href={item.href} title={item.label} className={`wg-item ${marcado(item.href) ? "ativo" : ""}`}>
              <ItemIcon />
              <span className="wg-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="wg-foot">
        <Link href="/perfil" title="Meu perfil" style={{ display: "flex" }}>
          <Avatar url={avatarUrl} name={fullName} size={32} />
        </Link>
        <Link href="/perfil" className="wg-user" title="Meu perfil">
          <b>{fullName}</b>
          <small>{rolesText}</small>
        </Link>
        <button className="wg-icon-btn" title="Sair" onClick={sair}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </button>
      </div>
    </aside>
  );
}

// Barra do topo, como a do WG Hub: botão do menu (celular) e os avisos do
// módulo (respostas do Compras e cutucadas) à direita.
export function WgTopbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="wg-topbar">
      <button
        className="wg-icon-btn wg-menu-mobile"
        title="Menu"
        onClick={(e) => { e.stopPropagation(); document.body.classList.toggle("sb-aberta"); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
      </button>
      <div style={{ flex: 1 }} />
      {children}
    </header>
  );
}

