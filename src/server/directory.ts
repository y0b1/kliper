import "server-only";
import { formatDistance } from "@/lib/geo";
import { peso } from "@/lib/money";
import { resolveCardChrome, themePresets, presetIdOrDefault } from "@/lib/theme";
import { addDays, formatManilaDate, manilaDateOf } from "@/lib/time";
import type { DirectoryEntry } from "./barbers";

/** What a directory card needs, as plain serializable data. */
export interface DirectoryCard {
  slug: string;
  name: string;
  initials: string;
  specialties: string[];
  shopName: string | null;
  area: string;
  distance: string | null;
  from: string | null;
  next: string;
  /** "Today", "Tomorrow", a weekday, or "Booked up". */
  nextDay: string;
  openToday: boolean;
  homeService: boolean;
  instant: boolean;
  themeName: string;
  chrome: Record<string, string>;
}

function nextLabel(entry: DirectoryEntry): { text: string; day: string; today: boolean } {
  if (!entry.next) return { text: "None this week", day: "Booked up", today: false };
  const today = manilaDateOf(new Date());
  const day =
    entry.next.date === today
      ? "Today"
      : entry.next.date === addDays(today, 1)
        ? "Tomorrow"
        : formatManilaDate(entry.next.date).split(",")[0];
  return { text: `${day} ${entry.next.slot.label}`, day, today: entry.next.date === today };
}

export function toCard(entry: DirectoryEntry): DirectoryCard {
  const { barber } = entry;
  const next = nextLabel(entry);
  return {
    slug: barber.slug,
    name: barber.displayName,
    initials: barber.displayName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    specialties: barber.specialties.slice(0, 3),
    shopName: entry.location?.shopName ?? null,
    area: entry.location?.label ?? "Davao",
    distance: entry.distanceKm != null ? formatDistance(entry.distanceKm) : null,
    from: entry.fromCentavos != null ? peso(entry.fromCentavos) : null,
    next: next.text,
    nextDay: next.day,
    openToday: next.today,
    homeService: barber.homeService,
    instant: barber.confirmMode === "INSTANT",
    themeName: themePresets[presetIdOrDefault(barber.themePreset)].name,
    chrome: { ...resolveCardChrome(barber.themePreset, barber.themeTokens) },
  };
}
