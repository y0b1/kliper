import { describe, expect, it } from "vitest";
import { boundingBox, distanceKm, formatDistance, isValidLatLng } from "./geo";

describe("geo", () => {
  it("measures a known Davao distance roughly right", () => {
    // City Hall to SM Lanang is about 4 km in a straight line.
    const km = distanceKm({ lat: 7.0731, lng: 125.6128 }, { lat: 7.0998, lng: 125.6315 });
    expect(km).toBeGreaterThan(3.5);
    expect(km).toBeLessThan(4.5);
  });

  it("builds a box that contains points inside the radius", () => {
    const box = boundingBox({ lat: 7.07, lng: 125.61 }, 5);
    expect(box.maxLat - box.minLat).toBeCloseTo(0.0898, 3);
    expect(box.minLng).toBeLessThan(125.61);
  });

  it("rejects junk coordinates", () => {
    expect(isValidLatLng({ lat: Number.NaN, lng: 1 })).toBe(false);
    expect(isValidLatLng({ lat: 91, lng: 1 })).toBe(false);
    expect(isValidLatLng({ lat: 7, lng: 125 })).toBe(true);
  });

  it("formats short and long distances", () => {
    expect(formatDistance(0.42)).toBe("400 m");
    expect(formatDistance(3.26)).toBe("3.3 km");
    expect(formatDistance(14.6)).toBe("15 km");
  });
});
