import { z } from "zod";
import { deriveAccessibleAccent, deriveAccessibleForeground } from "./contrast";
import { themePresets } from "./presets";
import {
  type CardChrome,
  type ResolvedTheme,
  themePresetIds,
  type ThemePresetId,
  type ThemeTexture,
  type ThemeTokens,
} from "./types";

export const themePresetIdSchema = z.enum(themePresetIds);
const HEX = /^#[0-9a-fA-F]{6}$/;

function schemaFor(presetId: ThemePresetId) {
  const preset = themePresets[presetId];
  return z
    .object({
      accent: z.string().regex(HEX),
      fontDisplay: z.enum(preset.fonts as [string, ...string[]]),
      texture: z.enum(preset.textures as [string, ...string[]]),
      radius: z
        .number()
        .min(preset.radius.min)
        .max(preset.radius.max)
        .refine((v) => Number.isInteger(v * 4), "Radius moves in 0.25rem steps"),
    })
    .strict();
}

export function defaultTokens(presetId: ThemePresetId): ThemeTokens {
  const preset = themePresets[presetId];
  return {
    accent: preset.accent.default,
    fontDisplay: preset.fonts[0],
    texture: preset.textures[0],
    radius: preset.radius.default,
  };
}

/** Saving: reject anything that isn't an allowed value for this preset. */
export function validateThemeWrite(presetId: ThemePresetId, tokens: unknown): ThemeTokens {
  return schemaFor(presetId).parse(tokens) as ThemeTokens;
}

/** Rendering: stale or tampered rows fall back to defaults instead of breaking the page. */
export function validateThemeRead(presetId: ThemePresetId, tokens: unknown): ThemeTokens {
  const merged = { ...defaultTokens(presetId), ...(typeof tokens === "object" && tokens ? tokens : {}) };
  const result = schemaFor(presetId).safeParse(merged);
  return result.success ? (result.data as ThemeTokens) : defaultTokens(presetId);
}

export function presetIdOrDefault(value: unknown): ThemePresetId {
  const parsed = themePresetIdSchema.safeParse(value);
  return parsed.success ? parsed.data : "woodshop";
}

const fontVariable: Record<string, string> = {
  "Big Shoulders Display": "var(--font-big-shoulders)",
  Outfit: "var(--font-outfit)",
  Oswald: "var(--font-oswald)",
  "Playfair Display": "var(--font-playfair)",
  "Space Mono": "var(--font-space-mono)",
  "Bebas Neue": "var(--font-bebas)",
  Righteous: "var(--font-righteous)",
};

/** Preset-owned texture fragments. Barbers choose a name; they never write CSS. */
export function textureCss(texture: ThemeTexture): string {
  switch (texture) {
    case "wood-grain":
      return "repeating-linear-gradient(100deg, rgb(60 40 25 / 0.05) 0 3px, transparent 3px 9px, rgb(60 40 25 / 0.035) 9px 11px, transparent 11px 19px)";
    case "concrete":
      return "radial-gradient(circle at 20% 30%, rgb(0 0 0 / 0.045) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, rgb(255 255 255 / 0.18) 0 1px, transparent 1.5px)";
    case "pole-stripes":
      return "repeating-linear-gradient(135deg, rgb(179 38 30 / 0.06) 0 14px, transparent 14px 28px, rgb(30 58 95 / 0.05) 28px 42px, transparent 42px 56px)";
    case "scanlines":
      return "repeating-linear-gradient(0deg, rgb(255 255 255 / 0.03) 0 1px, transparent 1px 4px)";
    case "halftone":
      return "radial-gradient(circle, rgb(0 0 0 / 0.1) 0 1px, transparent 1.4px)";
    case "paper-grain":
      return "radial-gradient(circle at 35% 45%, rgb(0 0 0 / 0.05) 0 0.7px, transparent 1px)";
    default:
      return "none";
  }
}

function textureSize(texture: ThemeTexture): string {
  if (texture === "concrete") return "7px 7px, 11px 11px";
  if (texture === "halftone") return "8px 8px";
  if (texture === "paper-grain") return "5px 5px";
  return "auto";
}

export function resolveTheme(presetValue: unknown, tokenValue: unknown): ResolvedTheme {
  const presetId = presetIdOrDefault(presetValue);
  const preset = themePresets[presetId];
  const tokens = validateThemeRead(presetId, tokenValue);
  const accent = deriveAccessibleAccent(tokens.accent);

  return {
    preset,
    tokens,
    accentAdjusted: accent.adjusted,
    cssProperties: {
      "--page-bg": preset.palette.background,
      "--page-surface": preset.palette.surface,
      "--page-text": deriveAccessibleForeground(preset.palette.text, preset.palette.surface),
      "--page-muted": deriveAccessibleForeground(preset.palette.muted, preset.palette.surface),
      "--page-border": preset.palette.border,
      "--page-ink": preset.palette.ink,
      "--page-on-ink": deriveAccessibleForeground(preset.palette.onInk, preset.palette.ink),
      "--page-accent": accent.accent,
      "--page-on-accent": accent.onAccent,
      "--page-radius": `${tokens.radius}rem`,
      "--page-font-display": fontVariable[tokens.fontDisplay] ?? fontVariable.Outfit,
      "--page-texture": textureCss(tokens.texture),
      "--page-texture-size": textureSize(tokens.texture),
    },
  };
}

/** Directory cards stay in Kliper's layout; only the accent and display font come from the barber. */
export function resolveCardChrome(presetValue: unknown, tokenValue: unknown): CardChrome {
  const presetId = presetIdOrDefault(presetValue);
  const preset = themePresets[presetId];
  const tokens = validateThemeRead(presetId, tokenValue);
  const accent = deriveAccessibleAccent(tokens.accent);
  return {
    "--card-accent": accent.accent,
    "--card-on-accent": accent.onAccent,
    "--card-surface": preset.palette.surface,
    "--card-text": deriveAccessibleForeground(preset.palette.text, preset.palette.surface),
    "--card-muted": deriveAccessibleForeground(preset.palette.muted, preset.palette.surface),
    "--card-font-display": fontVariable[tokens.fontDisplay] ?? fontVariable.Outfit,
  };
}
