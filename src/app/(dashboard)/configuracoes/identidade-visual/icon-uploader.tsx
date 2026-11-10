"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_APP_ICON_URL } from "@/lib/app-settings-constants";

export function IconUploader({
  currentUrl,
  currentUserId,
}: {
  currentUrl: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handlePick(f: File | undefined) {
    setError(null);
    setSuccess(false);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem (PNG, JPG ou SVG).");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError("A imagem precisa ter até 2MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSave() {
    if (!file) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();

    const ext = file.name.split(".").pop() || "png";
    const path = `icon.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

    if (uploadError) {
      setUploading(false);
      setError("Não foi possível enviar a imagem agora.");
      return;
    }

    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: settingsError } = await supabase.from("app_settings").upsert({
      key: "app_icon_url",
      value: url,
      updated_by: currentUserId,
      updated_at: new Date().toISOString(),
    });

    setUploading(false);
    if (settingsError) {
      setError("A imagem foi enviada, mas não foi possível salvar a configuração.");
      return;
    }
    setSuccess(true);
    setFile(null);
    router.refresh();
  }

  async function handleReset() {
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("app_settings")
      .delete()
      .eq("key", "app_icon_url");
    setUploading(false);
    if (deleteError) {
      setError("Não foi possível restaurar o padrão agora.");
      return;
    }
    setPreview(null);
    setFile(null);
    setSuccess(false);
    router.refresh();
  }

  const showingCustom = currentUrl !== DEFAULT_APP_ICON_URL;

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">
        Ícone / logo do sistema
      </h2>
      <p className="mb-4 text-xs text-(--color-graphite-500)">
        Usado na aba do navegador (favicon) e no cabeçalho do menu lateral.
        Prefira uma imagem quadrada, com fundo — PNG ou JPG, até 2MB.
      </p>

      <div className="flex flex-wrap items-center gap-6">
        <div className="text-center">
          <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">Atual</p>
          <img
            src={currentUrl}
            alt="Ícone atual"
            className="h-16 w-16 rounded-lg border border-(--color-gray-200) object-cover"
          />
        </div>
        {preview && (
          <div className="text-center">
            <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">Nova imagem</p>
            <img
              src={preview}
              alt="Prévia da nova imagem"
              className="h-16 w-16 rounded-lg border border-(--color-red-600) object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-[220px]">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePick(e.target.files?.[0])}
            className="block w-full text-sm text-(--color-graphite-700) file:mr-3 file:rounded-md file:border-0 file:bg-(--color-red-600) file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-(--color-red-700)"
          />
          {error && (
            <p className="mt-2 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-2 text-xs text-(--color-success)">
              Imagem atualizada — pode levar alguns segundos para aparecer em todo lugar.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={!file || uploading}
              className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
            >
              {uploading ? "Salvando..." : "Salvar nova imagem"}
            </button>
            {showingCustom && (
              <button
                onClick={handleReset}
                disabled={uploading}
                className="rounded-md border border-(--color-gray-200) px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60"
              >
                Restaurar padrão
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
