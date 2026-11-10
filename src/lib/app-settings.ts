import { createClient } from "@/lib/supabase/server";
import { DEFAULT_APP_ICON_URL } from "@/lib/app-settings-constants";

export { DEFAULT_APP_ICON_URL };

export async function getAppIconUrl(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_icon_url")
      .maybeSingle();
    return data?.value || DEFAULT_APP_ICON_URL;
  } catch {
    return DEFAULT_APP_ICON_URL;
  }
}

/** Lê uma configuração genérica de app_settings, com valor padrão se não
 * existir ainda. Usado por identidade visual, etc. */
export async function getAppSetting(key: string, fallback: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value || fallback;
  } catch {
    return fallback;
  }
}

