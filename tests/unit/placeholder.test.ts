import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/data/defaults";
import { isPlaceholder, isStarterContact, publicContact, shown } from "@/lib/placeholder";

const starter = DEFAULT_SETTINGS.property;

describe("placeholders", () => {
  it("treats a fully bracketed value as a placeholder", () => {
    expect(isPlaceholder("[Usually replies within a few hours]")).toBe(true);
    expect(isPlaceholder("Usually replies within a few hours")).toBe(false);
    expect(shown("[5 min walk]", false)).toBeNull();
    expect(shown("[5 min walk]", true)).toBe("[5 min walk]");
  });
});

describe("publicContact", () => {
  it("hides the starter address, email and phone on the live site", () => {
    expect(publicContact(starter, false)).toEqual({ address: null, email: null, phone: null });
  });

  it("shows the starter values in demo mode", () => {
    expect(publicContact(starter, true)).toEqual({ address: starter.address, email: starter.contactEmail, phone: starter.contactPhone });
  });

  it("shows real values once the host has changed them", () => {
    const real = { address: "ул. „Александровска“ 1, 8000 Бургас", contactEmail: "stay@morskibriz.bg", contactPhone: "+359 56 000 000" };
    expect(publicContact(real, false)).toEqual({ address: real.address, email: real.contactEmail, phone: real.contactPhone });
    expect(isStarterContact("contactEmail", real.contactEmail)).toBe(false);
    expect(isStarterContact("contactEmail", starter.contactEmail)).toBe(true);
  });
});
