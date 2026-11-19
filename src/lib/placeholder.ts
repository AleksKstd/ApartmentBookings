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
