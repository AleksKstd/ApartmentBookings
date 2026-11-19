import { langFor } from "@/lib/utils";

/** The address on its own enamel plaque, like the house-number plates on Burgas façades. */
export function AddressPlate({ address, href, label, newTab }: { address: string; href?: string; label?: string; newTab?: string }) {
  const face = <span lang={langFor(address)} className="plate-face block px-4 py-2.5 font-display text-lg font-bold leading-snug">{address}</span>;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="plate inline-block max-w-full transition-colors hover:bg-sea-800" aria-label={label ? `${label}: ${address}` : undefined}>
      {face}
      {newTab && <span className="sr-only"> ({newTab})</span>}
    </a>
  ) : (
    <p className="plate inline-block max-w-full">{face}</p>
  );
}
