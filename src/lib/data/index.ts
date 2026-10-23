import "server-only";
import { DemoRepository } from "./demo-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

let instance: Repository | undefined;

/** Server-only key: the legacy service_role JWT or a newer `sb_secret_…` key (either name works). */
function supabaseServerKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseServerKey());
}

/** Supabase when credentials are configured, otherwise the local file-backed demo store. */
export function getRepository(): Repository {
  if (!instance) {
    if (!isSupabaseConfigured() && process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
      throw new Error(
        "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY). Set DEMO_MODE=true to run the local demo store in production.",
      );
    }
    instance = isSupabaseConfigured()
      ? new SupabaseRepository(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseServerKey()!)
      : new DemoRepository();
  }
  return instance;
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export * from "./repository";
