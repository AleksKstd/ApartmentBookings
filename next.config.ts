import type { NextConfig } from "next";
import { NON_PAGE_CSP } from "./src/lib/csp";

const isDev = process.env.NODE_ENV !== "production";

const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Uploaded photos: Supabase Storage in production, /api/media in demo mode; /demo/* starter SVGs
    // are served as-is (next/image never optimises SVG).
    remotePatterns: supabaseOrigin ? [new URL(`${supabaseOrigin}/storage/v1/object/public/media/**`)] : [],
    localPatterns: [{ pathname: "/api/media/**", search: "" }, { pathname: "/demo/**", search: "" }],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    // With Supabase, photos upload straight from the browser to Storage, so server actions only carry
    // small forms. The demo store has no Storage and uploads through a server action instead.
    serverActions: { bodySizeLimit: supabaseOrigin ? "1mb" : "12mb" },
  },
  async headers() {
    return [
      // HTML pages get a nonce-based CSP from src/proxy.ts; everything else gets a deny-all policy.
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: NON_PAGE_CSP }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
