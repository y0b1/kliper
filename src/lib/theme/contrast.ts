// Ported unchanged from slate.ph (packages/core/theme/contrast.ts).
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function toRgb(hex: string): [number, number, number] {
  if (!HEX_COLOR.test(hex)) throw new Error(`Invalid hex color: ${hex}`);
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = toRgb(hex).map(channelToLinear) as [number, number, number];
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(hex: string, target: "#000000" | "#ffffff", amount: number): string {
  const source = toRgb(hex);
  const destination = toRgb(target);
  return rgbToHex(
    source[0] + (destination[0] - source[0]) * amount,
    source[1] + (destination[1] - source[1]) * amount,
    source[2] + (destination[2] - source[2]) * amount,
  );
}

export interface AccessibleAccent {
  accent: string;
  onAccent: "#0b1015" | "#f7f9fb";
  adjusted: boolean;
  ratio: number;
}

export function deriveAccessibleAccent(input: string): AccessibleAccent {
  const accent = input.toLowerCase();
  const dark = "#0b1015" as const;
  const light = "#f7f9fb" as const;
  const darkRatio = contrastRatio(accent, dark);
  const lightRatio = contrastRatio(accent, light);
  const foreground = darkRatio >= lightRatio ? dark : light;
  const initialRatio = Math.max(darkRatio, lightRatio);
  if (initialRatio >= 4.5) {
    return { accent, onAccent: foreground, adjusted: false, ratio: initialRatio };
  }

  const target = foreground === dark ? "#ffffff" : "#000000";
  for (let step = 1; step <= 20; step += 1) {
    const candidate = mix(accent, target, step * 0.025);
    const ratio = contrastRatio(candidate, foreground);
    if (ratio >= 4.5) {
      return { accent: candidate, onAccent: foreground, adjusted: true, ratio };
    }
  }

  return { accent, onAccent: foreground, adjusted: false, ratio: initialRatio };
}

/**
 * Preserve a preferred foreground colour when possible, then move it toward
 * whichever end of the neutral ramp has the stronger contrast with the given
 * opaque background. This is for text and marks drawn on an existing surface;
 * unlike deriveAccessibleAccent, it never treats a foreground as a surface.
 */
export function deriveAccessibleForeground(input: string, background: string): string {
  const foreground = input.toLowerCase();
  const surface = background.toLowerCase();
  if (contrastRatio(foreground, surface) >= 4.5) return foreground;

  const dark = "#000000" as const;
  const light = "#ffffff" as const;
  const target = contrastRatio(dark, surface) >= contrastRatio(light, surface) ? dark : light;

  for (let step = 1; step <= 40; step += 1) {
    const candidate = mix(foreground, target, step * 0.025);
    if (contrastRatio(candidate, surface) >= 4.5) return candidate;
  }

  return target;
}
