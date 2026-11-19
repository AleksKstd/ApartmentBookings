import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `lang="bg"` for Cyrillic content (addresses, names) so Sofia Sans draws Bulgarian letterforms on English pages too. */
export function langFor(text: string | null | undefined): "bg" | undefined {
  return text && /[\u0400-\u04FF]/.test(text) ? "bg" : undefined;
}
