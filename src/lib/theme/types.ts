/**
 * Barber page themes. Same model as slate.ph: a fixed preset plus a few validated
 * tokens. Barbers get expressive pages without raw CSS that can break layout,
 * contrast or privacy.
 */

export const themePresetIds = [
  "woodshop",
  "concrete-loft",
  "classic-pole",
  "gentlemans-club",
  "neon-fade",
  "kanto",
  "clean-studio",
  "retro-pomade",
] as const;

export type ThemePresetId = (typeof themePresetIds)[number];

/** Self-hosted through next/font; a theme can only pick from this list. */
export const themeFonts = ["Big Shoulders Display", "Outfit", "Oswald", "Playfair Display", "Space Mono", "Bebas Neue", "Righteous"] as const;
export type ThemeFont = (typeof themeFonts)[number];

export const themeTextures = ["none", "wood-grain", "concrete", "pole-stripes", "scanlines", "halftone", "paper-grain"] as const;
export type ThemeTexture = (typeof themeTextures)[number];

export interface ThemePalette {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  /** The dark card (history, totals), like the reference UI's session list. */
  ink: string;
  onInk: string;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  palette: ThemePalette;
  accent: { default: string };
  fonts: readonly ThemeFont[];
  textures: readonly ThemeTexture[];
  radius: { min: number; max: number; default: number };
}

export interface ThemeTokens {
  accent: string;
  fontDisplay: ThemeFont;
  texture: ThemeTexture;
  /** Corner radius in rem. */
  radius: number;
}

export type PageCssProperties = Record<`--page-${string}`, string>;

/** The small slice of a barber's theme that directory cards may use. */
export interface CardChrome {
  "--card-accent": string;
  "--card-on-accent": string;
  "--card-surface": string;
  "--card-text": string;
  "--card-muted": string;
  "--card-font-display": string;
}

export interface ResolvedTheme {
  preset: ThemePreset;
  tokens: ThemeTokens;
  accentAdjusted: boolean;
  cssProperties: PageCssProperties;
}
