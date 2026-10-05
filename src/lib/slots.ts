import { atManilaMinute, formatManilaTime, manilaWeekday } from "./time";

/**
 * The slot engine. Pure functions only: callers load schedules and bookings,
 * this decides which start times can hold a service of a given length.
 */

export interface MinuteRange {
  startMin: number;
  endMin: number;
}

export interface WeeklyBlock extends MinuteRange {
  weekday: number;
}

export interface ShopDayHours {
  weekday: number;
  openMin: number;
  closeMin: number;
}

export interface Busy {
  startsAt: Date;
  endsAt: Date;
}

export interface SlotRequest {
  /** Manila calendar date, YYYY-MM-DD. */
  date: string;
  /** Package minutes plus add-on minutes. */
  durationMin: number;
  schedule: WeeklyBlock[];
  /** When the barber works at a shop, they can only take bookings inside its hours. */
  shopHours?: ShopDayHours[];
  bookings: Busy[];
  timeOff: Busy[];
  /** Gap kept on both sides of every existing booking, e.g. travel time for home service. */
  bufferMin?: number;
  /** Start times land on this grid, counted from local midnight. */
  stepMin?: number;
  /** Earliest bookable moment is now + lead time. */
  now?: Date;
  minLeadMin?: number;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  label: string;
}

const MINUTE = 60_000;

interface Interval {
  start: number; // epoch ms
  end: number;
}

function subtract(free: Interval[], busy: Interval[]): Interval[] {
  let result = free;
  for (const block of busy) {
    const next: Interval[] = [];
    for (const range of result) {
      if (block.end <= range.start || block.start >= range.end) {
        next.push(range);
        continue;
      }
      if (block.start > range.start) next.push({ start: range.start, end: block.start });
      if (block.end < range.end) next.push({ start: block.end, end: range.end });
    }
    result = next;
  }
  return result;
}

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return out;
}

/** Working intervals for the date, before bookings are removed. */
function workingIntervals(req: SlotRequest): Interval[] {
  const weekday = manilaWeekday(req.date);
  const toInterval = (startMin: number, endMin: number): Interval => ({
    start: atManilaMinute(req.date, startMin).getTime(),
    end: atManilaMinute(req.date, endMin).getTime(),
  });

  let intervals = req.schedule
    .filter((block) => block.weekday === weekday && block.endMin > block.startMin)
    .map((block) => toInterval(block.startMin, block.endMin));

  if (req.shopHours) {
    const open = req.shopHours
      .filter((h) => h.weekday === weekday && h.closeMin > h.openMin)
      .map((h) => toInterval(h.openMin, h.closeMin));
    intervals = intersect(intervals, open);
  }
  return intervals.sort((x, y) => x.start - y.start);
}

export function findSlots(req: SlotRequest): Slot[] {
  if (req.durationMin <= 0) return [];
  const step = (req.stepMin ?? 15) * MINUTE;
  const duration = req.durationMin * MINUTE;
  const buffer = (req.bufferMin ?? 0) * MINUTE;
  const midnight = atManilaMinute(req.date, 0).getTime();
  const earliest = req.now ? req.now.getTime() + (req.minLeadMin ?? 0) * MINUTE : -Infinity;

  const busy: Interval[] = [
    ...req.bookings.map((b) => ({ start: b.startsAt.getTime() - buffer, end: b.endsAt.getTime() + buffer })),
    ...req.timeOff.map((t) => ({ start: t.startsAt.getTime(), end: t.endsAt.getTime() })),
  ];

  const free = subtract(workingIntervals(req), busy);
  const slots: Slot[] = [];

  for (const range of free) {
    const from = Math.max(range.start, earliest);
    // First grid point at or after `from`.
    let t = midnight + Math.ceil((from - midnight) / step) * step;
    for (; t + duration <= range.end; t += step) {
      const startsAt = new Date(t);
      slots.push({ startsAt, endsAt: new Date(t + duration), label: formatManilaTime(startsAt) });
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export interface BarberSlots {
  barberId: string;
  slots: Slot[];
}

/**
 * "First available": merge several barbers' slots. Each start time keeps the
 * barber listed first among those free, so callers control the tie-break order.
 */
export function mergeFirstAvailable(perBarber: BarberSlots[]): Array<Slot & { barberId: string }> {
  const byStart = new Map<number, Slot & { barberId: string }>();
  for (const { barberId, slots } of perBarber) {
    for (const slot of slots) {
      const key = slot.startsAt.getTime();
      if (!byStart.has(key)) byStart.set(key, { ...slot, barberId });
    }
  }
  return [...byStart.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Total length and price of a package plus chosen add-ons. */
export function quote(
  pkg: { durationMin: number; priceCentavos: number },
  addOns: Array<{ durationMin: number; priceCentavos: number }>,
): { durationMin: number; priceCentavos: number } {
  return addOns.reduce(
    (sum, a) => ({ durationMin: sum.durationMin + a.durationMin, priceCentavos: sum.priceCentavos + a.priceCentavos }),
    { durationMin: pkg.durationMin, priceCentavos: pkg.priceCentavos },
  );
}
