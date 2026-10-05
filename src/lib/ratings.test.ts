import { describe, expect, it } from "vitest";
import { formatStars, shopRating, type Rating } from "./ratings";

const rating = (average: number, count: number): Rating => ({ average, count });

describe("shopRating", () => {
  it("averages barbers equally, not reviews", () => {
    // 10 reviews at 5 and 1 review at 3: mean of barbers is 4, mean of reviews would be ~4.8.
    const busy = rating(5, 10);
    const quiet = rating(3, 1);
    expect(shopRating([busy, quiet])).toEqual({ average: 4, count: 11 });
  });

  it("leaves out barbers with no reviews", () => {
    expect(shopRating([rating(4, 1), null])).toEqual({ average: 4, count: 1 });
  });

  it("is null when no barber has reviews", () => {
    expect(shopRating([null, null])).toBeNull();
    expect(shopRating([])).toBeNull();
  });
});

describe("formatStars", () => {
  it("shows one decimal", () => {
    expect(formatStars(5)).toBe("5.0");
    expect(formatStars(4.7321)).toBe("4.7");
    expect(formatStars(4.75)).toBe("4.8");
  });
});
