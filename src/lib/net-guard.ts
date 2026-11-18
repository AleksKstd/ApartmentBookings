import "server-only";
import dns from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * Outbound-request guard for admin-supplied URLs (calendar feeds). Blocks private, loopback,
 * link-local, carrier-grade NAT, multicast and reserved addresses — including IPv4-mapped IPv6 and
 * hostnames that resolve to them — so a feed URL cannot be used to probe internal services.
 */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

/** Expands an IPv6 address to 8 hextets. */
function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  // Trailing dotted IPv4 (e.g. ::ffff:127.0.0.1)
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    addr = addr.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = addr.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  if (tail === undefined && h.length !== 8) return null;
  const fill = tail === undefined ? [] : new Array(8 - h.length - t.length).fill("0");
  const parts = [...h, ...fill, ...t].map((x) => parseInt(x || "0", 16));
  return parts.length === 8 && parts.every((x) => Number.isInteger(x) && x >= 0 && x <= 0xffff) ? parts : null;
}

function isPrivateV6(ip: string): boolean {
  const p = expandV6(ip);
  if (!p) return true; // unparseable: refuse
  const allZeroPrefix = p.slice(0, 5).every((x) => x === 0);
  if (allZeroPrefix && p[5] === 0xffff) {
    return isPrivateV4(`${p[6] >> 8}.${p[6] & 255}.${p[7] >> 8}.${p[7] & 255}`); // IPv4-mapped
  }
  if (p.slice(0, 6).every((x) => x === 0)) return true; // ::, ::1 and deprecated IPv4-compatible
  if ((p[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((p[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((p[0] & 0xff00) === 0xff00) return true; // multicast
  if (p[0] === 0x2002) return true; // 6to4 embeds an arbitrary (possibly private) IPv4
  if (p[0] === 0x2001 && p[1] === 0x0000) return true; // Teredo embeds an IPv4 too
  if (p[0] === 0x2001 && p[1] === 0x0db8) return true; // documentation
  if (p[0] === 0x0064 && p[1] === 0xff9b) return true; // NAT64 can reach IPv4 internals
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip.replace(/^\[|\]$/g, ""));
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) return isPrivateV6(ip);
  return true;
}

export class UnsafeUrlError extends Error {}

/** Syntactic checks only (no DNS) — fast feedback when the admin saves a feed. */
export function assertPublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Невалиден адрес на календара.");
  }
  if (url.protocol !== "https:") throw new UnsafeUrlError("Адресът на календара трябва да започва с https://");
  if (url.username || url.password) throw new UnsafeUrlError("Адресът не може да съдържа потребител или парола.");
  if (url.port && url.port !== "443") throw new UnsafeUrlError("Адресът на календара трябва да използва стандартния порт 443.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("Адресът трябва да сочи към публичен сървър.");
  }
  if (isIP(host) && isPrivateAddress(host)) throw new UnsafeUrlError("Адресът трябва да сочи към публичен сървър.");
  return url;
}

/** Full check: syntax plus every address the hostname resolves to must be public. */
export async function assertPublicDestination(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError("Адресът трябва да сочи към публичен сървър.");
  }
}

/**
 * DNS lookup used for the actual connection: every resolved address is validated at connect time,
 * so a hostname cannot answer with a public IP for the pre-check and a private one for the
 * connection (DNS rebinding).
 */
type LookupCallback = (error: Error | null, address: string | dns.LookupAddress[], family?: number) => void;

export function pinnedLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const unsafe = addresses.find((a) => isPrivateAddress(a.address));
    if (!addresses.length || unsafe) return callback(new UnsafeUrlError("Адресът трябва да сочи към публичен сървър."), "", 0);
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

const guardedAgent = new Agent({ connect: { lookup: pinnedLookup as never } });

type FetchLike = (url: URL, init: { headers?: HeadersInit; signal: AbortSignal; redirect: "manual" }) => Promise<Response>;

const pinnedFetch: FetchLike = (url, init) =>
  undiciFetch(url, { ...init, headers: init.headers as Record<string, string> | undefined, dispatcher: guardedAgent }) as unknown as Promise<Response>;

/**
 * fetch() for untrusted URLs: validates DNS before and during connection, re-validates every
 * redirect hop, enforces a timeout and streams the body with a hard byte cap.
 */
export async function safeFetchText(
  raw: string,
  {
    maxBytes,
    timeoutMs,
    maxRedirects = 3,
    headers,
    fetchImpl = pinnedFetch,
  }: { maxBytes: number; timeoutMs: number; maxRedirects?: number; headers?: HeadersInit; fetchImpl?: FetchLike },
): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);
  let url = assertPublicHttpsUrl(raw);
  for (let hop = 0; ; hop++) {
    await assertPublicDestination(url);
    const res = await fetchImpl(url, { headers, signal, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      if (hop >= maxRedirects) throw new UnsafeUrlError("Твърде много пренасочвания.");
      url = assertPublicHttpsUrl(new URL(res.headers.get("location")!, url).toString());
      await res.body?.cancel();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`Сървърът на календара отговори с грешка ${res.status}.`);
    }
    if (Number(res.headers.get("content-length") ?? 0) > maxBytes) {
      await res.body?.cancel();
      throw new Error("Календарът е твърде голям.");
    }
    if (!res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Календарът е твърде голям.");
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
}
