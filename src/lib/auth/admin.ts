import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "./session";

export async function getAdminSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Guards every admin page and server action (defence in depth on top of proxy.ts). */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function startAdminSession(username: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endAdminSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
