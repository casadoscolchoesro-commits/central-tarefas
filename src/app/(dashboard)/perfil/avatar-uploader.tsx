"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navegacao";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";

export function AvatarUploader({
  userId,
  fullName,
  currentUrl,
}: {
  userId: string;
  fullName: string;
  currentUrl: string | null;
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
      setError("Envie um arquivo de imagem (PNG ou JPG).");
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
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

    if (uploadError) {
      setUploading(false);
      setError("Não foi possível enviar a imagem agora.");
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", userId);

    setUploading(false);
    if (updateError) {
      setError("A imagem foi enviada, mas não foi possível salvar no seu perfil.");
      return;
    }
    setSuccess(true);
    setFile(null);
    router.refresh();
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    setUploading(false);
    if (updateError) {
      setError("Não foi possível remover a foto agora.");
      return;
    }
    setPreview(null);
    setFile(null);
    setSuccess(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-(--color-gray-200) bg-white p-5">
      <h2 className="mb-1 text-sm font-medium text-(--color-graphite-900)">Foto de perfil</h2>
      <p className="mb-4 text-xs text-(--color-graphite-500)">
        Aparece ao lado do seu nome nas tarefas — quando você assume ou conclui uma. PNG ou JPG,
        até 2MB.
      </p>

      <div className="flex flex-wrap items-center gap-6">
        <div className="text-center">
          <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">Atual</p>
          <Avatar url={preview ?? currentUrl} name={fullName} size={64} />
        </div>

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
            <p className="mt-2 text-xs text-(--color-success)">Foto atualizada.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={!file || uploading}
              className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
            >
              {uploading ? "Salvando..." : "Salvar foto"}
            </button>
            {currentUrl && (
              <button
                onClick={handleRemove}
                disabled={uploading}
                className="rounded-md border border-(--color-gray-200) px-3 py-1.5 text-xs text-(--color-graphite-700) hover:bg-(--color-gray-50) disabled:opacity-60"
              >
                Remover foto
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
