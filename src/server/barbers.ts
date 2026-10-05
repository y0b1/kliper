import "server-only";
import { db } from "@/lib/db";
import { distanceKm, type LatLng } from "@/lib/geo";
import type { Rating } from "@/lib/ratings";
import { findSlots, type Busy, type Slot } from "@/lib/slots";
import { addDays, manilaDateOf, manilaMidnight } from "@/lib/time";

const LIVE = ["PENDING", "CONFIRMED"] as const;

const barberInclude = {
  packages: { where: { active: true }, orderBy: { sortOrder: "asc" } },
  addOns: { where: { active: true }, orderBy: { priceCentavos: "asc" } },
  schedules: true,
  memberships: { where: { active: true }, include: { shop: { include: { hours: true } } } },
} as const;

export async function getBarberBySlug(slug: string) {
  return db.barber.findUnique({ where: { slug }, include: barberInclude });
}

export type BarberWithRelations = NonNullable<Awaited<ReturnType<typeof getBarberBySlug>>>;

/** Where a barber can be found: their shop, or their own spot if they work solo. */
export function barberLocation(
  barber: BarberWithRelations,
): (LatLng & { label: string; shopName?: string; shopSlug?: string }) | null {
  const shop = barber.memberships[0]?.shop;
  if (shop) return { lat: shop.lat, lng: shop.lng, label: shop.barangay ?? shop.city, shopName: shop.name, shopSlug: shop.slug };
  if (barber.lat != null && barber.lng != null) return { lat: barber.lat, lng: barber.lng, label: barber.areaLabel ?? "Davao" };
  return null;
}

export interface AvailabilityInput {
  barber: BarberWithRelations;
  date: string;
  durationMin: number;
  locationType: "SHOP" | "HOME";
  now?: Date;
}

/** Load a barber's busy time for one Manila day and run the slot engine on it. */
export async function getAvailability({ barber, date, durationMin, locationType, now = new Date() }: AvailabilityInput): Promise<Slot[]> {
  const dayStart = manilaMidnight(date);
  const dayEnd = manilaMidnight(addDays(date, 1));
  const travel = barber.travelBufferMin * 60_000;

  const [bookings, timeOff] = await Promise.all([
    db.booking.findMany({
      where: {
        barberId: barber.id,
        status: { in: [...LIVE] },
        startsAt: { lt: new Date(dayEnd.getTime() + travel) },
        endsAt: { gt: new Date(dayStart.getTime() - travel) },
      },
      select: { startsAt: true, endsAt: true, locationType: true },
    }),
    db.timeOff.findMany({
      where: { barberId: barber.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  // Travel time surrounds every home visit, and every booking when the new one is a home visit.
  const busy: Busy[] = bookings.map((b) => {
    const pad = b.locationType === "HOME" || locationType === "HOME" ? travel : 0;
    return { startsAt: new Date(b.startsAt.getTime() - pad), endsAt: new Date(b.endsAt.getTime() + pad) };
  });

  const shop = barber.memberships[0]?.shop;
  return findSlots({
    date,
    durationMin,
    schedule: barber.schedules,
    shopHours: locationType === "SHOP" && shop ? shop.hours : undefined,
    bookings: busy,
    timeOff,
    now,
    minLeadMin: 30,
  });
}

/** The soonest open start time in the next week for a barber's quickest package. */
export async function nextOpening(barber: BarberWithRelations, now = new Date()): Promise<{ date: string; slot: Slot } | null> {
  const shortest = Math.min(...barber.packages.map((p) => p.durationMin));
  if (!Number.isFinite(shortest)) return null;
  const today = manilaDateOf(now);
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today, offset);
    const locationType = barber.memberships.length > 0 || !barber.homeService ? "SHOP" : "HOME";
    const slots = await getAvailability({ barber, date, durationMin: shortest, locationType, now });
    if (slots.length > 0) return { date, slot: slots[0] };
  }
  return null;
}

/** A shop with its active barbers, for the shop page. */
export async function getShopBySlug(slug: string) {
  return db.shop.findUnique({
    where: { slug },
    include: {
      hours: true,
      memberships: { where: { active: true }, include: { barber: { include: barberInclude } }, orderBy: { role: "asc" } },
    },
  });
}

export interface DirectoryEntry {
  barber: BarberWithRelations;
  location: ReturnType<typeof barberLocation>;
  distanceKm: number | null;
  fromCentavos: number | null;
  next: Awaited<ReturnType<typeof nextOpening>>;
  /** Mean of the barber's review stars; null before their first review. */
  rating: Rating | null;
}

/**
 * Directory listing. With a center, results sort by distance; the center is used
 * for this call only and is never written anywhere.
 */
export async function listDirectory(center?: LatLng): Promise<DirectoryEntry[]> {
  const [barbers, reviewStats] = await Promise.all([
    db.barber.findMany({ include: barberInclude, orderBy: { displayName: "asc" } }),
    db.review.groupBy({ by: ["barberId"], _avg: { stars: true }, _count: { _all: true } }),
  ]);
  const ratings = new Map(reviewStats.map((r) => [r.barberId, { average: r._avg.stars!, count: r._count._all }]));
  const now = new Date();
  const entries = await Promise.all(
    barbers.map(async (barber) => {
      const location = barberLocation(barber);
      const prices = barber.packages.map((p) => p.priceCentavos);
      return {
        barber,
        location,
        distanceKm: center && location ? distanceKm(center, location) : null,
        fromCentavos: prices.length ? Math.min(...prices) : null,
        next: await nextOpening(barber, now),
        rating: ratings.get(barber.id) ?? null,
      };
    }),
  );
  return entries.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    const at = a.next?.slot.startsAt.getTime() ?? Infinity;
    const bt = b.next?.slot.startsAt.getTime() ?? Infinity;
    return at - bt;
  });
}
