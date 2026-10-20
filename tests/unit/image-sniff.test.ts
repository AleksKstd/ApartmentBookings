import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/image-sniff";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("sniffImageType", () => {
  it("recognises allowed formats by magic bytes", () => {
    expect(sniffImageType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(bytes([0x89], "PNG", [0x0d, 0x0a]))).toBe("image/png");
    expect(sniffImageType(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(bytes([0, 0, 0, 0x1c], "ftypavif"))).toBe("image/avif");
  });

  it("rejects SVG, HTML and other content regardless of extension", () => {
    expect(sniffImageType(bytes("<svg xmlns="))).toBeNull();
    expect(sniffImageType(bytes("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImageType(bytes("GIF89a"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
