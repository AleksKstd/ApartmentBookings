import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth/admin";
import { getRepository, isDemoMode } from "@/lib/data";

export const metadata: Metadata = { title: { default: "Администрация", template: "%s · Администрация" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const repo = getRepository();
  const [{ property }, pending] = await Promise.all([repo.getSettings(), repo.listBookings({ status: ["pending"] })]);
  return (
    <div className="flex min-h-screen flex-col bg-sand-100 lg:flex-row">
      <AdminSidebar siteName={property.name} pendingCount={pending.length} demo={isDemoMode()} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  );
}
