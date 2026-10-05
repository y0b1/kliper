/**
 * Kliper runs on Philippine time. The Philippines is UTC+8 all year (no daylight
 * saving), so converting with a fixed offset is exact and avoids Intl quirks.
 */
export const MANILA_OFFSET_MIN = 8 * 60;
const MINUTE = 60_000;

/** "2026-10-05" → the UTC instant of local midnight in Manila. */
export function manilaMidnight(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Expected YYYY-MM-DD, got ${isoDate}`);
  const [, y, m, d] = match.map(Number);
  return new Date(Date.UTC(y, m - 1, d) - MANILA_OFFSET_MIN * MINUTE);
}

/** Minutes from local midnight → UTC instant on that Manila date. */
export function atManilaMinute(isoDate: string, minuteOfDay: number): Date {
  return new Date(manilaMidnight(isoDate).getTime() + minuteOfDay * MINUTE);
}

/** 0 = Sunday, matching WeeklySchedule.weekday. */
export function manilaWeekday(isoDate: string): number {
  return new Date(manilaMidnight(isoDate).getTime() + MANILA_OFFSET_MIN * MINUTE).getUTCDay();
}

/** The Manila calendar date for an instant, as YYYY-MM-DD. */
export function manilaDateOf(instant: Date): string {
  return new Date(instant.getTime() + MANILA_OFFSET_MIN * MINUTE).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const base = manilaMidnight(isoDate).getTime() + MANILA_OFFSET_MIN * MINUTE;
  return new Date(base + days * 24 * 60 * MINUTE).toISOString().slice(0, 10);
}

/** "3:30 PM" in Manila time. */
export function formatManilaTime(instant: Date): string {
  const local = new Date(instant.getTime() + MANILA_OFFSET_MIN * MINUTE);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon, Oct 5" for a Manila date. */
export function formatManilaDate(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${WEEKDAYS[manilaWeekday(isoDate)]}, ${MONTHS[m - 1]} ${d}`;
}

/** 540 → "9:00 AM" */
export function formatMinuteOfDay(minuteOfDay: number): string {
  return formatManilaTime(atManilaMinute("2000-01-01", minuteOfDay));
}
