import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { DEMO_ADMIN_PASSWORD, DEMO_ADMIN_USERNAME } from "@/lib/auth/password";
import { isDemoMode } from "@/lib/data";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход — администрация", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");
  const showDemo = isDemoMode() && !process.env.ADMIN_PASSWORD_HASH && (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true");
  return (
    <main className="grid flex-1 place-items-center bg-sea-900 px-4 py-16">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-2xl">Администрация</h1>
        <p className="mt-1 text-sm text-ink-muted">Влезте, за да управлявате резервациите.</p>
        <LoginForm />
        {showDemo && (
          <p className="mt-6 rounded-xl bg-sand-100 p-3 text-xs text-ink-muted">
            Демо режим: потребител <code className="font-semibold">{DEMO_ADMIN_USERNAME}</code>, парола{" "}
            <code className="font-semibold">{DEMO_ADMIN_PASSWORD}</code>
          </p>
        )}
      </div>
    </main>
  );
}
