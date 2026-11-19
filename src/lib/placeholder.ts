import { DEFAULT_SETTINGS } from "@/lib/data/defaults";
import type { PropertyInfo } from "@/lib/types";

// Starter content the host still has to fill in is written in [square brackets]. The admin area shows
// these values so they are easy to spot; the public site hides them so guests never see them — except
// in demo mode, where they stay visible to show the layout.

export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || /^\s*\[[\s\S]*\]\s*$/.test(value);
}

/** The value if it is real content (or we are in demo mode), otherwise null. */
export function shown(value: string | null | undefined, demo: boolean): string | null {
  if (!value || !value.trim()) return null;
  return demo || !isPlaceholder(value) ? value : null;
}

/**
 * Contact details that are still the starter values (or bracketed) are hidden on the public site,
 * except in demo mode, so a sample address or phone number never reaches real guests.
 */
export function publicContact(
  property: Pick<PropertyInfo, "address" | "contactEmail" | "contactPhone">,
  demo: boolean,
): { address: string | null; email: string | null; phone: string | null } {
  const starter = DEFAULT_SETTINGS.property;
  const keep = (value: string, starterValue: string) =>
    value?.trim() && (demo || (value !== starterValue && !isPlaceholder(value))) ? value : null;
  return {
    address: keep(property.address, starter.address),
    email: keep(property.contactEmail, starter.contactEmail),
    phone: keep(property.contactPhone, starter.contactPhone),
  };
}

/** True while a contact field still holds its starter value; admin lists these as to-do. */
export function isStarterContact(field: "address" | "contactEmail" | "contactPhone", value: string): boolean {
  return value === DEFAULT_SETTINGS.property[field] || isPlaceholder(value);
}
