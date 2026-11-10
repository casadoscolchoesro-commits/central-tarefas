"use client";
import { ModulosWgHub } from "@/components/ModulosWgHub";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "@/lib/navegacao";
import type { NavItem } from "@/lib/nav";
import { SignOutButton } from "@/components/SignOutButton";
import { Avatar } from "@/components/Avatar";
import { IconMenu, IconX, IconChevronsLeft, IconChevronsRight, IconGrid, IconPlusCircle, IconTicket, IconCheckShield, IconCheckCircle, IconChart, IconSettings, IconCart } from "@/lib/protocol-icons";
import type { NavIconKey } from "@/lib/nav";

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

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";

export function DashboardNav({
  items,
  fullName,
  rolesText,
  iconUrl,
  avatarUrl,
}: {
  items: NavItem[];
  fullName: string;
  rolesText: string;
  iconUrl: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  // Lê a preferência salva só depois de montar, pra não conflitar com o
  // HTML gerado no servidor (evita flash/erro de hidratação).
  useEffect(() => {
    const saved = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      {/* Barra superior — só no mobile */}
      <div className="flex items-center justify-between border-b border-(--color-gray-200) bg-white px-4 py-2 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/cancelamentos/wg-hub-logo.png"
            alt="WG HUB Cancelamentos"
            className="h-24 w-auto shrink-0"
          />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-md p-2 text-(--color-graphite-700) hover:bg-(--color-gray-50)"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Fundo escurecido atrás do menu, só quando aberto no mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu lateral — vira gaveta deslizante no mobile, fixo no desktop.
          No desktop, pode ser recolhido para uma faixa só de ícones. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-(--color-gray-200) bg-white transition-[transform,width] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${hydrated && collapsed ? "lg:w-16" : "lg:w-52"}`}
      >
        <div
          className={`flex items-center gap-2 border-b border-(--color-gray-200) px-4 py-4 ${
            collapsed ? "lg:justify-center lg:px-2" : "justify-between"
          }`}
        >
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <img
              src={collapsed ? "/cancelamentos/wg-hub-icon.png" : "/cancelamentos/wg-hub-logo.png"}
              alt="WG HUB Cancelamentos"
              className={collapsed ? "h-12 w-12 shrink-0 object-contain" : "h-24 w-auto shrink-0"}
            />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-(--color-graphite-500) hover:text-(--color-red-600) lg:hidden"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <ModulosWgHub collapsed={hydrated && collapsed} />

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {items.map((item) => {
            const active = pathname === item.href;
            const ItemIcon = NAV_ICONS[item.iconKey];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
                  collapsed ? "lg:justify-center lg:px-0" : ""
                } ${
                  active
                    ? "bg-(--color-red-50) text-(--color-red-600)"
                    : "text-(--color-graphite-700) hover:bg-(--color-gray-50) hover:text-(--color-red-600)"
                }`}
              >
                <ItemIcon className="h-4.5 w-4.5 shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Botão de recolher — só faz sentido no desktop (no mobile o menu
            é uma gaveta que fecha sozinha). */}
        <button
          onClick={toggleCollapsed}
          className={`hidden items-center gap-2 border-t border-(--color-gray-100) px-4 py-2.5 text-xs text-(--color-graphite-500) hover:bg-(--color-gray-50) hover:text-(--color-red-600) lg:flex ${
            collapsed ? "lg:justify-center" : ""
          }`}
        >
          {collapsed ? (
            <IconChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <IconChevronsLeft className="h-4 w-4" />
              Recolher menu
            </>
          )}
        </button>

        <div className={`border-t border-(--color-gray-200) px-4 py-3 ${collapsed ? "lg:px-2 lg:text-center" : ""}`}>
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 rounded-md hover:bg-(--color-gray-50) ${collapsed ? "lg:justify-center" : "-mx-1.5 px-1.5 py-1"}`}
          >
            <Avatar url={avatarUrl} name={fullName} size={28} />
            <span className={collapsed ? "lg:hidden" : "min-w-0"}>
              <p className="truncate text-sm font-medium text-(--color-graphite-900)">
                {fullName}
              </p>
              <p className="truncate text-xs text-(--color-graphite-500)">{rolesText}</p>
            </span>
          </Link>
          <div className={`mt-1 ${collapsed ? "lg:hidden" : ""}`}>
            <SignOutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
