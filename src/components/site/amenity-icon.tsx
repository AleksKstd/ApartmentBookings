import {
  AirVent,
  ArrowUpDown,
  Baby,
  Car,
  Coffee,
  CookingPot,
  Flame,
  KeyRound,
  Laptop,
  Shirt,
  Sparkles,
  Sun,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  ac: AirVent,
  heating: Flame,
  kitchen: CookingPot,
  dishwasher: UtensilsCrossed,
  washer: WashingMachine,
  tv: Tv,
  workspace: Laptop,
  balcony: Sun,
  seaView: Waves,
  parking: Car,
  elevator: ArrowUpDown,
  coffee: Coffee,
  linens: Sparkles,
  hairdryer: Wind,
  iron: Shirt,
  crib: Baby,
  selfCheckIn: KeyRound,
};

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
