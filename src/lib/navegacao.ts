"use client";
// Igual a next/navigation, mas "router.refresh()" também recarrega os dados da tela
// (no site estático as telas leem os dados no navegador).
import { useRouter as useRouterNext } from "next/navigation";
import { useMemo } from "react";
export * from "next/navigation";

export function recarregarTela() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("wg-recarregar"));
}

export function useRouter() {
  const r = useRouterNext();
  return useMemo(() => ({ ...r, refresh: () => { recarregarTela(); } }), [r]);
}
