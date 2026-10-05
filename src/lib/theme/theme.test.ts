import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { themePresets } from "./presets";
import { defaultTokens, resolveCardChrome, resolveTheme, validateThemeRead, validateThemeWrite } from "./schema";
import { themePresetIds } from "./types";

describe("barber themes", () => {
  it.each(themePresetIds)("accepts its own defaults: %s", (id) => {
    expect(validateThemeWrite(id, defaultTokens(id))).toEqual(defaultTokens(id));
  });

  it.each(themePresetIds)("keeps body text readable on its surface: %s", (id) => {
    const css = resolveTheme(id, {}).cssProperties;
    expect(contrastRatio(css["--page-text"], themePresets[id].palette.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(css["--page-accent"], css["--page-on-accent"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(css["--page-on-ink"], themePresets[id].palette.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it("rejects extra properties and fonts outside the preset", () => {
    expect(() => validateThemeWrite("woodshop", { ...defaultTokens("woodshop"), css: "body{}" })).toThrow();
    expect(() => validateThemeWrite("woodshop", { ...defaultTokens("woodshop"), fontDisplay: "Comic Sans MS" })).toThrow();
  });

  it("falls back to defaults for tampered stored tokens", () => {
    expect(validateThemeRead("kanto", { accent: "url(https://evil.example)" })).toEqual(defaultTokens("kanto"));
  });

  it("treats an unknown preset as Woodshop", () => {
    expect(resolveTheme("not-a-theme", {}).preset.id).toBe("woodshop");
  });

  it("gives directory cards only the allowed keys", () => {
    expect(Object.keys(resolveCardChrome("neon-fade", {})).sort()).toEqual([
      "--card-accent",
      "--card-font-display",
      "--card-muted",
      "--card-on-accent",
      "--card-surface",
      "--card-text",
    ]);
  });
});
