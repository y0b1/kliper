import { describe, expect, it } from "vitest";
import { demoTotal, demoWarnings, parseDemo, sampleDemo } from "./demo";
import { defaultTokens } from "./theme";

describe("parseDemo", () => {
  it("keeps a valid saved draft", () => {
    const saved = { ...sampleDemo, name: "Barbero Uno", chairs: 5 };
    expect(parseDemo(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
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
