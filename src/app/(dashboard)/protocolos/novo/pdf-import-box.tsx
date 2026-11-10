"use client";

import { useRef, useState } from "react";
import { parseSolidusPdf, type ParsedPdfSale, type PdfTextItem } from "@/lib/pdf-import";

// O pdfjs-dist tenta primeiro um Worker dedicado; quando isso falha (comum
// no Safari/Chrome iOS), ele cai para um modo de repasse (LoopbackPort) que
// chama structuredClone(obj, { transfer }) — essa variante com o segundo
// argumento quebra em várias versões do WebKit no iOS mesmo com
// structuredClone nativo presente, gerando "undefined is not a function".
// Por isso não basta checar se a função existe: testamos se ela realmente
// funciona do jeito que o pdfjs usa, e só então decidimos usar o polyfill.
function ensureStructuredClonePolyfill() {
  if (typeof window === "undefined") return;

  function cloneValue(value: unknown): unknown {
    if (value === null || typeof value !== "object") return value;
    if (value instanceof ArrayBuffer) return value.slice(0);
    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      const Ctor = view.constructor as new (buffer: ArrayBufferLike) => ArrayBufferView;
      return new Ctor((view.buffer as ArrayBuffer).slice(0));
    }
    if (value instanceof Date) return new Date(value.getTime());
    if (Array.isArray(value)) return value.map(cloneValue);
    if (value instanceof Map) {
      return new Map(Array.from(value, ([k, v]) => [cloneValue(k), cloneValue(v)]));
    }
    if (value instanceof Set) return new Set(Array.from(value, cloneValue));
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = cloneValue((value as Record<string, unknown>)[key]);
    }
    return result;
  }

  function polyfill(value: unknown): unknown {
    return cloneValue(value);
  }

  let nativeWorks = typeof window.structuredClone === "function";
  if (nativeWorks) {
    try {
      const probe = new Uint8Array([1]);
      window.structuredClone(probe, {
        transfer: [probe.buffer],
      } as unknown as StructuredSerializeOptions);
    } catch {
      nativeWorks = false;
    }
  }

  if (!nativeWorks) {
    window.structuredClone = polyfill as typeof structuredClone;
    // O bundle do pdfjs referencia `structuredClone` como identificador
    // global solto (não `window.structuredClone`) em alguns caminhos.
    (globalThis as typeof globalThis & { structuredClone: typeof structuredClone }).structuredClone =
      polyfill as typeof structuredClone;
  }
}

export function PdfImportBox({ onParsed }: { onParsed: (parsed: ParsedPdfSale) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    setFileName(file.name);

    try {
      ensureStructuredClonePolyfill();

      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const buffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({
        data: buffer,
        disableFontFace: true,
        verbosity: 0,
      }).promise;
      const page = await doc.getPage(1);
      const content = await page.getTextContent();

      const items: PdfTextItem[] = content.items
        .filter((it): it is typeof it & { str: string; transform: number[] } => "str" in it)
        .map((it) => ({
          text: it.str,
          x: it.transform[4],
          // A origem do PDF é no canto inferior esquerdo; invertemos para
          // que y cresça de cima para baixo, como no restante do parser.
          y: page.view[3] - it.transform[5],
        }))
        .filter((it) => it.text.trim().length > 0);

      const parsed = parseSolidusPdf(items);

      if (parsed.items.length === 0 && !parsed.saleNumber) {
        setError(
          "Não foi possível reconhecer este PDF como um documento de venda do Solidus. Preencha manualmente."
        );
        setLoading(false);
        return;
      }

      onParsed(parsed);
    } catch (err) {
      console.error(err);
      const detail =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : null;
      setError(
        `Não foi possível ler este PDF${detail ? ` (${detail})` : ""}. Preencha manualmente.`
      );
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-lg border border-(--color-red-100) bg-(--color-red-50) p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
        Importar do PDF de venda (Solidus)
      </h2>
      <p className="mb-3 text-xs text-(--color-graphite-500)">
        Envie o PDF de impressão do documento de saída. Os campos abaixo são
        preenchidos automaticamente — confira tudo antes de salvar.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="block w-full text-sm text-(--color-graphite-700) file:mr-3 file:rounded-md file:border-0 file:bg-(--color-red-600) file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-(--color-red-700)"
      />

      {loading && (
        <p className="mt-2 text-xs text-(--color-graphite-500)">Lendo {fileName}...</p>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs text-(--color-red-700)">{error}</p>
      )}
    </section>
  );
}
