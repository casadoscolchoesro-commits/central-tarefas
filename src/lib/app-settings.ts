import { createClient } from "@/lib/supabase/server";
import { DEFAULT_APP_ICON_URL } from "@/lib/app-settings-constants";

export { DEFAULT_APP_ICON_URL };

// a identidade visual passa a ser a do WG Hub
export async function getAppIconUrl(): Promise<string> {
  return DEFAULT_APP_ICON_URL;
}

/** Lê uma configuração genérica de app_settings, com valor padrão se não existir ainda. */
export async function getAppSetting(key: string, fallback: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
    return data?.value || fallback;
  } catch {
    return fallback;
  }
}
