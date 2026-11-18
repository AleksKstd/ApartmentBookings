"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endAdminSession, startAdminSession } from "@/lib/auth/admin";
import { verifyAdminCredentials } from "@/lib/auth/password";
import { getRepository, isDemoMode } from "@/lib/data";
import { clientIp, resetSharedRateLimit, sharedRateLimit } from "@/lib/rate-limit";
import { type ActionResult, fail, str } from "./shared";

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ip = clientIp(await headers());
  if (!(await sharedRateLimit(getRepository(), `login:${ip}`, 5, 15 * 60_000))) {
    return fail("Твърде много неуспешни опити. Опитайте отново след 15 минути.");
  }
  const username = str(formData, "username", 100);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!(await verifyAdminCredentials(username, password, isDemoMode()))) {
    return fail("Невалидно потребителско име или парола.");
  }
  await resetSharedRateLimit(getRepository(), `login:${ip}`);
  await startAdminSession(username);
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}
