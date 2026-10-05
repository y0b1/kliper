/**
 * The barber demo: a practice shop a barber builds on /demo to see how Kliper
 * would show it. It lives only in the visitor's browser; nothing is sent to
 * the server or shown to customers.
 */
import { z } from "zod";
import { defaultTokens, themePresetIdSchema, validateThemeRead, type ThemePresetId, type ThemeTokens } from "./theme";

export const DEMO_LIMITS = {
  text: 60,
  description: 120,
  chairs: { min: 1, max: 20 },
  barbers: 12,
  cuts: 12,
  addOns: 12,
  /** ₱20,000 */
  priceCentavos: 2_000_000,
  minutes: { min: 5, max: 480 },
} as const;

const text = z.string().max(DEMO_LIMITS.text);
const centavos = z.number().int().min(0).max(DEMO_LIMITS.priceCentavos);

const demoSchema = z.object({
  name: text,
  address: text,
  area: text,
  chairs: z.number().int().min(DEMO_LIMITS.chairs.min).max(DEMO_LIMITS.chairs.max),
  barbers: z.array(z.object({ id: z.string(), name: text, specialties: text })).max(DEMO_LIMITS.barbers),
  cuts: z
    .array(
      z.object({
        id: z.string(),
        name: text,
        priceCentavos: centavos,
        durationMin: z.number().int().min(0).max(DEMO_LIMITS.minutes.max),
        description: z.string().max(DEMO_LIMITS.description),
      }),
    )
    .max(DEMO_LIMITS.cuts),
  addOns: z
    .array(
      z.object({
        id: z.string(),
        name: text,
        priceCentavos: centavos,
        durationMin: z.number().int().min(0).max(DEMO_LIMITS.minutes.max),
      }),
    )
    .max(DEMO_LIMITS.addOns),
  theme: z.object({ preset: themePresetIdSchema, tokens: z.unknown() }),
});

export interface DemoShop {
  name: string;
  address: string;
  area: string;
  chairs: number;
  barbers: Array<{ id: string; name: string; specialties: string }>;
  cuts: Array<{ id: string; name: string; priceCentavos: number; durationMin: number; description: string }>;
  addOns: Array<{ id: string; name: string; priceCentavos: number; durationMin: number }>;
  theme: { preset: ThemePresetId; tokens: ThemeTokens };
}

/** What a new visitor starts from, so the preview isn't empty. */
export const sampleDemo: DemoShop = {
  name: "Your Shop Name",
  address: "Street and building",
  area: "Poblacion",
  chairs: 3,
  barbers: [
    { id: "b1", name: "You", specialties: "Fades, Line-ups" },
    { id: "b2", name: "Second barber", specialties: "Classic cuts, Kids" },
  ],
  cuts: [
    { id: "c1", name: "Basic cut", priceCentavos: 15_000, durationMin: 30, description: "Scissor or clipper cut, styled." },
    { id: "c2", name: "Cut + wash", priceCentavos: 25_000, durationMin: 45, description: "" },
  ],
  addOns: [
    { id: "a1", name: "Beard trim", priceCentavos: 8_000, durationMin: 15 },
    { id: "a2", name: "Hot towel", priceCentavos: 5_000, durationMin: 10 },
  ],
  theme: { preset: "woodshop", tokens: defaultTokens("woodshop") },
};

/**
 * Reading a saved draft back. Anything stale or tampered with falls back to the
 * sample; theme tokens fall back to the preset's defaults, as on real pages.
 */
export function parseDemo(value: unknown): DemoShop {
  const result = demoSchema.safeParse(value);
  if (!result.success) return sampleDemo;
  const { theme, ...rest } = result.data;
  return { ...rest, theme: { preset: theme.preset, tokens: validateThemeRead(theme.preset, theme.tokens) } };
}

/** Things worth telling the barber before they'd go live. Not errors: the preview still renders. */
export function demoWarnings(demo: DemoShop): string[] {
  const warnings: string[] = [];
  if (!demo.name.trim()) warnings.push("Your shop needs a name.");
  if (demo.cuts.length === 0) warnings.push("Add at least one cut so customers have something to book.");
  if (demo.cuts.some((c) => !c.name.trim())) warnings.push("One of your cuts has no name.");
  if (demo.cuts.some((c) => c.durationMin < DEMO_LIMITS.minutes.min))
    warnings.push(`Cuts need at least ${DEMO_LIMITS.minutes.min} minutes, or no times will open up.`);
  if (demo.addOns.some((a) => !a.name.trim())) warnings.push("One of your add-ons has no name.");
  if (demo.barbers.length === 0) warnings.push("Add at least one barber.");
  if (demo.barbers.some((b) => !b.name.trim())) warnings.push("One of your barbers has no name.");
  if (demo.barbers.length > demo.chairs)
    warnings.push(`${demo.barbers.length} barbers and ${demo.chairs} ${demo.chairs === 1 ? "chair" : "chairs"}. Fine if they work different shifts.`);
  return warnings;
}

/** A cut plus add-ons: what the customer pays and how long the chair is taken. */
export function demoTotal(demo: DemoShop, cutId: string, addOnIds: string[]): { priceCentavos: number; durationMin: number } {
  const cut = demo.cuts.find((c) => c.id === cutId);
  const addOns = demo.addOns.filter((a) => addOnIds.includes(a.id));
  return {
    priceCentavos: (cut?.priceCentavos ?? 0) + addOns.reduce((sum, a) => sum + a.priceCentavos, 0),
    durationMin: (cut?.durationMin ?? 0) + addOns.reduce((sum, a) => sum + a.durationMin, 0),
  };
}
