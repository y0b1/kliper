import { describe, expect, it } from "vitest";
import { demoNextOpening, demoSchedule, demoSlots, demoTotal, demoWarnings, parseDemo, sampleDemo, type DemoBarber } from "./demo";
import { atManilaMinute } from "./time";
import { defaultTokens } from "./theme";

describe("parseDemo", () => {
  it("keeps a valid saved draft", () => {
    const saved = { ...sampleDemo, name: "Barbero Uno", chairs: 5 };
    expect(parseDemo(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("gives drafts saved before working hours existed the default hours", () => {
    const old = { ...sampleDemo, barbers: [{ id: "b1", name: "Jun", specialties: "" }] };
    expect(parseDemo(old).barbers[0]).toEqual({ id: "b1", name: "Jun", specialties: "", days: [1, 2, 3, 4, 5, 6], startMin: 540, endMin: 1080, breakTime: null });
  });

  it("falls back to the sample for junk", () => {
    expect(parseDemo(null)).toBe(sampleDemo);
    expect(parseDemo("hello")).toBe(sampleDemo);
    expect(parseDemo({ ...sampleDemo, chairs: 0 })).toBe(sampleDemo);
    expect(parseDemo({ ...sampleDemo, cuts: [{ id: "x", name: "Cut", priceCentavos: -1, durationMin: 30, description: "" }] })).toBe(sampleDemo);
  });

  it("falls back to preset defaults for bad theme tokens", () => {
    const saved = { ...sampleDemo, theme: { preset: "kanto", tokens: { accent: "red", fontDisplay: "Comic Sans" } } };
    expect(parseDemo(saved).theme).toEqual({ preset: "kanto", tokens: defaultTokens("kanto") });
  });
});

describe("demoWarnings", () => {
  it("is quiet for the sample", () => {
    expect(demoWarnings(sampleDemo)).toEqual([]);
  });

  it("flags a menu with nothing to book", () => {
    expect(demoWarnings({ ...sampleDemo, cuts: [] })).toContain("Add at least one cut so customers have something to book.");
  });

  it("notes more barbers than chairs", () => {
    expect(demoWarnings({ ...sampleDemo, chairs: 1 })).toContain("2 barbers and 1 chair. Fine if they work different shifts.");
  });
});

describe("demoTotal", () => {
  it("adds the cut and chosen add-ons", () => {
    expect(demoTotal(sampleDemo, "c1", ["a1", "a2"])).toEqual({ priceCentavos: 28_000, durationMin: 55 });
  });

  it("ignores unknown ids", () => {
    expect(demoTotal(sampleDemo, "nope", ["nope"])).toEqual({ priceCentavos: 0, durationMin: 0 });
  });
});

// Mon Oct 5 2026, Manila. Times below are Manila local.
const MONDAY = "2026-10-05";
const barber: DemoBarber = { id: "b", name: "Jun", specialties: "", days: [1, 2], startMin: 9 * 60, endMin: 12 * 60, breakTime: { startMin: 10 * 60, endMin: 11 * 60 } };

describe("demoSchedule", () => {
  it("splits each working day around the break", () => {
    expect(demoSchedule(barber)).toEqual([
      { weekday: 1, startMin: 540, endMin: 600 },
      { weekday: 1, startMin: 660, endMin: 720 },
      { weekday: 2, startMin: 540, endMin: 600 },
      { weekday: 2, startMin: 660, endMin: 720 },
    ]);
  });

  it("ignores a break outside the hours, and hours that end before they start", () => {
    expect(demoSchedule({ ...barber, days: [1], breakTime: { startMin: 13 * 60, endMin: 14 * 60 } })).toEqual([{ weekday: 1, startMin: 540, endMin: 720 }]);
    expect(demoSchedule({ ...barber, startMin: 720, endMin: 540 })).toEqual([]);
  });
});

describe("demoSlots", () => {
  it("offers times that fit before and after the break", () => {
    const early = atManilaMinute(MONDAY, 6 * 60);
    expect(demoSlots(barber, MONDAY, 30, early).map((s) => s.label)).toEqual(["9:00 AM", "9:15 AM", "9:30 AM", "11:00 AM", "11:15 AM", "11:30 AM"]);
  });

  it("keeps 30 minutes' notice from now", () => {
    // 8:50 + 30 min = 9:20, so the first quarter-hour start is 9:30.
    const now = atManilaMinute(MONDAY, 8 * 60 + 50);
    expect(demoSlots(barber, MONDAY, 30, now)[0].label).toBe("9:30 AM");
  });

  it("skips a start that would run into the break", () => {
    // 9:05 + 30 min allows 9:45, but 9:45 to 10:15 crosses the 10:00 break.
    const now = atManilaMinute(MONDAY, 9 * 60 + 5);
    expect(demoSlots(barber, MONDAY, 30, now)[0].label).toBe("11:00 AM");
  });

  it("is empty on a day off", () => {
    expect(demoSlots(barber, "2026-10-07", 30, atManilaMinute(MONDAY, 0))).toEqual([]);
  });
});

describe("demoNextOpening", () => {
  it("skips to the next working day once today is over", () => {
    const next = demoNextOpening(barber, 30, atManilaMinute(MONDAY, 13 * 60));
    expect(next?.date).toBe("2026-10-06");
    expect(next?.slot.label).toBe("9:00 AM");
  });

  it("is null for a barber with no working days", () => {
    expect(demoNextOpening({ ...barber, days: [] }, 30, atManilaMinute(MONDAY, 0))).toBeNull();
  });
});

describe("demoWarnings for hours", () => {
  it("flags no working days and a break outside the hours", () => {
    const demo = { ...sampleDemo, barbers: [{ ...barber, days: [] }, { ...barber, id: "c", name: "Ana", breakTime: { startMin: 8 * 60, endMin: 9 * 60 } }] };
    expect(demoWarnings(demo)).toEqual(expect.arrayContaining(["Jun has no working days, so customers can't book them.", "Ana's break has to fit inside their hours."]));
  });
});
