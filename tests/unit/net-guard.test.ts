import { afterEach, describe, expect, it, vi } from "vitest";

const dns = { answers: new Map<string, string[]>() };
vi.mock("node:dns/promises", () => ({
  lookup: async (host: string) => (dns.answers.get(host) ?? ["93.184.216.34"]).map((address) => ({ address, family: address.includes(":") ? 6 : 4 })),
}));

const { assertPublicHttpsUrl, isPrivateAddress, pinnedLookup, safeFetchText } = await import("@/lib/net-guard");

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "224.0.0.1", "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1",
  ])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "172.32.0.1", "93.184.216.34", "2606:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe("assertPublicHttpsUrl", () => {
  it("accepts public https feed URLs", () => {
    expect(assertPublicHttpsUrl("https://admin.booking.com/hotel/hoteladmin/ical.html?t=abc").hostname).toBe("admin.booking.com");
  });
  it.each([
    "http://example.com/a.ics",
    "https://localhost/a.ics",
    "https://127.0.0.1/a.ics",
    "https://[::1]/a.ics",
    "https://172.20.1.1/a.ics",
    "https://user:pw@example.com/a.ics",
    "https://example.com:8443/a.ics",
    "https://printer.local/a.ics",
    "not a url",
  ])("rejects %s", (url) => expect(() => assertPublicHttpsUrl(url)).toThrow());
});

describe("safeFetchText", () => {
  afterEach(() => dns.answers.clear());
  const opts = (fetchImpl: ReturnType<typeof vi.fn>) => ({ maxBytes: 100, timeoutMs: 1000, fetchImpl: fetchImpl as never });

  it("refuses hostnames that resolve to private addresses (DNS rebinding style)", async () => {
    dns.answers.set("127.0.0.1.nip.io", ["127.0.0.1"]);
    const fetchMock = vi.fn();
    await expect(safeFetchText("https://127.0.0.1.nip.io/feed.ics", opts(fetchMock))).rejects.toThrow(/публичен/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("re-validates every redirect hop", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://169.254.169.254/latest/meta-data" } }));
    await expect(safeFetchText("https://example.com/feed.ics", opts(fetchMock))).rejects.toThrow(/публичен/);
  });

  it("follows safe redirects and returns the body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/moved.ics" } }))
      .mockResolvedValueOnce(new Response("BEGIN:VCALENDAR"));
    expect(await safeFetchText("https://example.com/feed.ics", opts(fetchMock))).toBe("BEGIN:VCALENDAR");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://example.com/moved.ics");
  });

  it("stops reading bodies larger than the cap, even without content-length", async () => {
    const fetchMock = vi.fn(async () => new Response("x".repeat(500)));
    await expect(safeFetchText("https://example.com/feed.ics", opts(fetchMock))).rejects.toThrow(/голям/);
  });
});

describe("connect-time DNS check (anti DNS rebinding)", () => {
  it("rejects a hostname that resolves to loopback at connection time", async () => {
    const error = await new Promise((resolve) => pinnedLookup("localhost", {}, (err) => resolve(err)));
    expect(String(error)).toMatch(/публичен/);
  });
});
