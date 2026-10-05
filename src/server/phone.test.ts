import { describe, expect, it } from "vitest";
import { normalizePhMobile } from "./phone";

describe("normalizePhMobile", () => {
  it.each(["09171234567", "+639171234567", "639171234567", "0917 123 4567", "0917-123-4567"])("accepts %s", (input) => {
    expect(normalizePhMobile(input)).toBe("+639171234567");
  });

  it.each(["0817123456", "1234", "+15551234567", ""])("rejects %s", (input) => {
    expect(normalizePhMobile(input)).toBeNull();
  });
});
