"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, FileText, Images, Inbox, LayoutDashboard, LogOut, Mail, Menu, RefreshCw, Tag, X } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Табло", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Резервации", icon: Inbox },
  { href: "/admin/calendar", label: "Календар", icon: CalendarDays },
  { href: "/admin/pricing", label: "Цени", icon: Tag },
  { href: "/admin/media", label: "Снимки", icon: Images },
  { href: "/admin/content", label: "Съдържание", icon: FileText },
  { href: "/admin/sync", label: "Синхронизация", icon: RefreshCw },
  { href: "/admin/emails", label: "Имейли", icon: Mail },
];

export function AdminSidebar({ siteName, pendingCount, demo }: { siteName: string; pendingCount: number; demo: boolean }) {
  const pathname = usePathname() ?? "/admin";
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  // Mobile drawer: focus the first link on open, close on Escape and hand focus back to the toggle.
  useEffect(() => {
    if (!open) return;
    asideRef.current?.querySelector<HTMLElement>("nav a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Администрация" className="flex flex-1 flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sea-100 hover:bg-white/10",
            active(href) && "bg-white/15 text-white",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
          {href === "/admin/bookings" && pendingCount > 0 && (
            <span className="badge ml-auto bg-clay-600 text-white">{pendingCount}</span>
          )}
        </Link>
      ))}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
        <Link href="/bg" target="_blank" className="block rounded-xl px-3 py-2 text-sm text-sea-200 hover:bg-white/10">
          Към сайта <span aria-hidden>↗</span>
          <span className="sr-only"> (отваря се в нов раздел)</span>
        </Link>
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sea-200 hover:bg-white/10">
            <LogOut className="h-4 w-4" aria-hidden /> Изход
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between bg-sea-900 px-4 py-3 text-white lg:hidden">
        <span className="font-display text-lg">{siteName}</span>
        <button ref={toggleRef} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-sidebar" aria-label={open ? "Затвори менюто" : "Отвори менюто"} className="rounded-lg p-2 hover:bg-white/10">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {/* Closed on mobile = invisible, which also takes the off-screen links out of the tab order.
          Visibility only transitions on close (stays visible while sliding out); on open it flips at once so focus can land. */}
      <aside
        ref={asideRef}
        id="admin-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 bg-sea-900 p-5 lg:visible lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "visible translate-x-0 transition-transform" : "invisible -translate-x-full transition-[transform,visibility]",
        )}
      >
        <div>
          <p className="font-display text-xl text-white">{siteName}</p>
          <p className="text-xs text-sea-200">Администрация{demo ? " · демо" : ""}</p>
        </div>
        {nav}
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
    </>
  );
}
