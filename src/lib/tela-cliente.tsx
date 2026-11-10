"use client";
// Tela lida no navegador: executa a função que antes rodava no servidor
// (consultas + JSX) e mostra o resultado. Recarrega quando a tela pede
// (router.refresh) e quando muda o endereço.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams, useRouter as useRouterNext } from "next/navigation";
import { BASE } from "@/lib/supabase-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Render = (props: any) => Promise<ReactNode>;

const Filhos = createContext<ReactNode>(null);
function Filho() { return <>{useContext(Filhos)}</>; }

function parametros(rota: string, caminho: string) {
  const r: Record<string, string> = {};
  const a = rota.split("/").filter(Boolean);
  const b = caminho.split("/").filter(Boolean);
  a.forEach((s, i) => { const m = s.match(/^\[(.+)\]$/); if (m && b[i]) r[m[1]] = decodeURIComponent(b[i]); });
  return r;
}

function Carregando() {
  return <div className="p-6 text-sm text-(--color-graphite-500)">Carregando…</div>;
}

export function TelaCliente({ render, rota, children }: { render: Render; rota: string; children?: ReactNode }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouterNext();
  const [el, setEl] = useState<ReactNode>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const chave = sp.toString();

  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    window.addEventListener("wg-recarregar", f);
    return () => window.removeEventListener("wg-recarregar", f);
  }, []);

  useEffect(() => {
    let vivo = true;
    // o número da tela de detalhe vem do endereço real (um só arquivo serve todos os números)
    const caminhoReal = window.location.pathname.replace(new RegExp("^" + BASE), "") || pathname;
    const q: Record<string, string | string[]> = {};
    new URLSearchParams(chave).forEach((v, k) => {
      const atual = q[k];
      q[k] = atual === undefined ? v : Array.isArray(atual) ? [...atual, v] : [atual, v];
    });
    render({ searchParams: Promise.resolve(q), params: Promise.resolve(parametros(rota, caminhoReal)), children: <Filho /> })
      .then((r) => { if (vivo) { setEl(r); setErro(null); } })
      .catch((e: { digest?: string; message?: string }) => {
        if (!vivo) return;
        const d = String(e?.digest ?? "");
        if (d === "WG_LOGIN") return;
        if (d.startsWith("NEXT_REDIRECT")) { router.replace(d.split(";")[2] || "/"); return; }
        if (d.startsWith("NEXT_HTTP_ERROR_FALLBACK;404") || d === "NEXT_NOT_FOUND") { setErro("Não encontrado."); return; }
        setErro(e?.message || "Não foi possível carregar esta tela.");
      });
    return () => { vivo = false; };
  }, [render, rota, chave, pathname, versao, router]);

  if (erro) return <div className="m-6 rounded-md border border-(--color-gray-200) bg-white p-4 text-sm">{erro}</div>;
  return <Filhos.Provider value={children}>{el ?? <Carregando />}</Filhos.Provider>;
}
