import "server-only";
import { DemoRepository } from "./demo-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

let instance: Repository | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Supabase when credentials are configured, otherwise the local file-backed demo store. */
export function getRepository(): Repository {
  if (!instance) {
    instance = isSupabaseConfigured()
      ? new SupabaseRepository(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : new DemoRepository();
  }
  return instance;
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export * from "./repository";
