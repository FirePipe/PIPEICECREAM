import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

const isValidSupabaseUrl = (url: any): boolean => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null") return false;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
};

const isValidSupabaseKey = (key: any): boolean => {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed !== "" && trimmed !== "undefined" && trimmed !== "null";
};

export const getSupabaseClient = (url?: string, anonKey?: string): SupabaseClient | null => {
  // 1. If explicit keys are provided, we re-initialize the client
  if (url && anonKey && isValidSupabaseUrl(url) && isValidSupabaseKey(anonKey)) {
    try {
      supabaseInstance = createClient(
        url.trim().replace(/\/$/, "").replace(/\/rest\/v1$/, ""),
        anonKey.trim()
      );
      return supabaseInstance;
    } catch (e) {
      console.error("[Supabase] Failed to create custom client:", e);
      return null;
    }
  }

  // 2. Return cached instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // 3. Initialize from localStorage or environment variables
  const localUrl = typeof localStorage !== "undefined" ? localStorage.getItem("supabase_url") : null;
  const localKey = typeof localStorage !== "undefined" ? localStorage.getItem("supabase_anon_key") : null;

  const supabaseUrl = localUrl || (import.meta as any).env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = localKey || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

  if (isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabaseAnonKey)) {
    try {
      supabaseInstance = createClient(
        supabaseUrl.trim().replace(/\/$/, "").replace(/\/rest\/v1$/, ""),
        supabaseAnonKey.trim()
      );
    } catch (e) {
      console.error("[Supabase] Failed to create default client:", e);
      supabaseInstance = null;
    }
  }
  
  return supabaseInstance;
};
