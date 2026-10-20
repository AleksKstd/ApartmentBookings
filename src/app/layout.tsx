import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { htmlLang, isLocale } from "@/i18n";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1d4e5f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-locale");
  return (
    <html lang={htmlLang(isLocale(locale) ? locale : "bg")}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
