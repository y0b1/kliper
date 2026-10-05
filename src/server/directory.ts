import "server-only";
import { formatDistance } from "@/lib/geo";
import { peso } from "@/lib/money";
import { resolveCardChrome, themePresets, presetIdOrDefault } from "@/lib/theme";
import { addDays, formatManilaDate, manilaDateOf } from "@/lib/time";
import type { DirectoryEntry } from "./barbers";

/** What a barber card needs, as plain serializable data. */
export interface DirectoryCard {
  slug: string;
  name: string;
  initials: string;
  specialties: string[];
  shopName: string | null;
  shopSlug: string | null;
  area: string;
  distance: string | null;
  /** Raw distance for sorting; null when no location was given. */
  distanceKm: number | null;
  from: string | null;
  fromCentavos: number | null;
  next: string;
  /** "Today", "Tomorrow", a weekday, or "Booked up". */
  nextDay: string;
  /** Epoch ms of the next opening, for sorting; null when booked up. */
  nextAt: number | null;
  /** "3:30" and "PM", split so the time can be set large. */
  nextClock: string | null;
  nextMeridiem: string | null;
  openToday: boolean;
  homeService: boolean;
  instant: boolean;
  themeName: string;
  chrome: Record<string, string>;
}

/** A shop in the directory, listed before its barbers. */
export interface ShopCard {
  slug: string;
  name: string;
  area: string;
  address: string;
  distance: string | null;
  from: string | null;
  next: string;
  openToday: boolean;
  homeService: boolean;
  chrome: Record<string, string>;
  barbers: DirectoryCard[];
}

export interface Directory {
  shops: ShopCard[];
  /** Solo and home-service barbers who don't work out of a listed shop. */
  independents: DirectoryCard[];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
    initials: initials(barber.displayName),
    specialties: barber.specialties.slice(0, 3),
    shopName: entry.location?.shopName ?? null,
    shopSlug: entry.location?.shopSlug ?? null,
    area: entry.location?.label ?? "Davao",
    distance: entry.distanceKm != null ? formatDistance(entry.distanceKm) : null,
    distanceKm: entry.distanceKm,
    from: entry.fromCentavos != null ? peso(entry.fromCentavos) : null,
    fromCentavos: entry.fromCentavos,
    next: next.text,
    nextDay: next.day,
    nextAt: entry.next?.slot.startsAt.getTime() ?? null,
    nextClock: entry.next ? entry.next.slot.label.split(" ")[0] : null,
    nextMeridiem: entry.next ? entry.next.slot.label.split(" ")[1] : null,
    openToday: next.today,
    homeService: barber.homeService,
    instant: barber.confirmMode === "INSTANT",
    themeName: themePresets[presetIdOrDefault(barber.themePreset)].name,
    chrome: { ...resolveCardChrome(barber.themePreset, barber.themeTokens) },
  };
}

/**
 * Group barbers under their shops. Shops keep the order of their best-placed
 * barber, so a distance sort or soonest-opening sort carries over to shops.
 */
export function toDirectory(entries: DirectoryEntry[]): Directory {
  // Each group keeps barbers in the incoming order (distance or soonest opening).
  const shops = new Map<string, ShopCard>();
  const independents: DirectoryCard[] = [];

  for (const entry of entries) {
    const card = toCard(entry);
    const shop = entry.barber.memberships[0]?.shop;
    if (!shop) {
      independents.push(card);
      continue;
    }
    let group = shops.get(shop.id);
    if (!group) {
      group = {
        slug: shop.slug,
        name: shop.name,
        area: shop.barangay ?? shop.city,
        address: shop.address,
        distance: card.distance,
        from: null,
        next: card.next,
        openToday: false,
        homeService: false,
        chrome: { ...resolveCardChrome(shop.themePreset, shop.themeTokens) },
        barbers: [],
      };
      shops.set(shop.id, group);
    }
    group.barbers.push(card);
  }

  for (const group of shops.values()) {
    const prices = group.barbers.map((b) => b.fromCentavos).filter((p): p is number => p != null);
    group.from = prices.length ? peso(Math.min(...prices)) : null;
    group.openToday = group.barbers.some((b) => b.openToday);
    group.homeService = group.barbers.some((b) => b.homeService);
    const soonest = [...group.barbers].filter((b) => b.nextAt != null).sort((a, b) => a.nextAt! - b.nextAt!)[0];
    group.next = soonest ? soonest.next : "None this week";
  }

  return { shops: [...shops.values()], independents };
}
