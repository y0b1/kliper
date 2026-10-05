import { describe, expect, it } from "vitest";
import { findSlots, mergeFirstAvailable, quote, type WeeklyBlock } from "./slots";
import { atManilaMinute, manilaWeekday } from "./time";

const DATE = "2026-10-05"; // a Monday
const MON = manilaWeekday(DATE);
const at = (h: number, m = 0) => atManilaMinute(DATE, h * 60 + m);
const labels = (slots: { label: string }[]) => slots.map((s) => s.label);

const nineToTwelve: WeeklyBlock[] = [{ weekday: MON, startMin: 9 * 60, endMin: 12 * 60 }];

describe("findSlots", () => {
  it("is a Monday", () => {
    expect(MON).toBe(1);
  });

  it("fits a 60-minute cut on a 15-minute grid", () => {
    const slots = findSlots({ date: DATE, durationMin: 60, schedule: nineToTwelve, bookings: [], timeOff: [] });
    expect(slots[0].label).toBe("9:00 AM");
    expect(slots.at(-1)?.label).toBe("11:00 AM");
    expect(slots).toHaveLength(9);
  });

  it("returns nothing on a day off", () => {
    const sunday = "2026-10-04";
    expect(findSlots({ date: sunday, durationMin: 30, schedule: nineToTwelve, bookings: [], timeOff: [] })).toEqual([]);
  });

  it("works around an existing booking", () => {
    const slots = findSlots({
      date: DATE,
      durationMin: 30,
      schedule: nineToTwelve,
      bookings: [{ startsAt: at(10), endsAt: at(10, 45) }],
      timeOff: [],
    });
    expect(labels(slots)).toEqual(["9:00 AM", "9:15 AM", "9:30 AM", "10:45 AM", "11:00 AM", "11:15 AM", "11:30 AM"]);
  });

  it("keeps a travel buffer around bookings for home service", () => {
    const slots = findSlots({
      date: DATE,
      durationMin: 30,
      schedule: nineToTwelve,
      bookings: [{ startsAt: at(10), endsAt: at(10, 30) }],
      timeOff: [],
      bufferMin: 30,
    });
    expect(labels(slots)).toEqual(["9:00 AM", "11:00 AM", "11:15 AM", "11:30 AM"]);
  });

  it("respects time off and split shifts", () => {
    const split: WeeklyBlock[] = [
      { weekday: MON, startMin: 9 * 60, endMin: 10 * 60 },
      { weekday: MON, startMin: 13 * 60, endMin: 14 * 60 },
    ];
    const slots = findSlots({
      date: DATE,
      durationMin: 45,
      schedule: split,
      bookings: [],
      timeOff: [{ startsAt: at(13), endsAt: at(13, 15) }],
    });
    expect(labels(slots)).toEqual(["9:00 AM", "9:15 AM", "1:15 PM"]);
  });

  it("stays inside shop hours", () => {
    const slots = findSlots({
      date: DATE,
      durationMin: 60,
      schedule: [{ weekday: MON, startMin: 8 * 60, endMin: 20 * 60 }],
      shopHours: [{ weekday: MON, openMin: 10 * 60, closeMin: 12 * 60 }],
      bookings: [],
      timeOff: [],
      stepMin: 30,
    });
    expect(labels(slots)).toEqual(["10:00 AM", "10:30 AM", "11:00 AM"]);
  });

  it("skips past times plus lead time", () => {
    const slots = findSlots({
      date: DATE,
      durationMin: 30,
      schedule: nineToTwelve,
      bookings: [],
      timeOff: [],
      now: at(10, 7),
      minLeadMin: 30,
    });
    expect(slots[0].label).toBe("10:45 AM");
  });
});

describe("mergeFirstAvailable", () => {
  it("keeps one barber per start time, preferring the first listed", () => {
    const a = findSlots({ date: DATE, durationMin: 60, schedule: nineToTwelve, bookings: [{ startsAt: at(9), endsAt: at(10) }], timeOff: [], stepMin: 60 });
    const b = findSlots({ date: DATE, durationMin: 60, schedule: nineToTwelve, bookings: [], timeOff: [], stepMin: 60 });
    const merged = mergeFirstAvailable([{ barberId: "a", slots: a }, { barberId: "b", slots: b }]);
    expect(merged.map((s) => `${s.label}:${s.barberId}`)).toEqual(["9:00 AM:b", "10:00 AM:a", "11:00 AM:a"]);
  });
});

describe("quote", () => {
  it("adds add-on price and time to the package", () => {
    expect(quote({ durationMin: 60, priceCentavos: 35000 }, [{ durationMin: 15, priceCentavos: 8000 }])).toEqual({
      durationMin: 75,
      priceCentavos: 43000,
    });
  });
});
