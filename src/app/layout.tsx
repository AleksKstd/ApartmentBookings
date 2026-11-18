import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import { htmlLang, isLocale } from "@/i18n";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// Self-hosted at build time (no request to Google from the visitor's browser); both include Cyrillic.
const display = Playfair_Display({ subsets: ["latin", "cyrillic"], variable: "--font-display", display: "swap" });
const sans = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b2422",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-locale");
  return (
    <html lang={htmlLang(isLocale(locale) ? locale : "bg")} className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
