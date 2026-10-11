/** WhatsApp green: the accent when no brand color is configured. */
export const DEFAULT_BRAND_COLOR = "#25D366";

export interface Brand {
  /** Company name shown next to its logo, when configured. */
  name?: string;
  /** Company logo (https URL or a path under /public), when configured. */
  logoUrl?: string;
  /** Accent color. */
  color: string;
  /** Text color on top of the accent (dark or white, whichever reads better). */
  onColor: string;
  /** The accent darkened until it reads as text on white (WCAG AA, 4.5:1). */
  inkColor: string;
}

type Env = Record<string, string | undefined>;

const DARK_TEXT = "#0B1A12";
const WHITE = "#FFFFFF";

function parseHex(value: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

const toHex = (rgb: number[]) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

function luminance([r, g, b]: number[]): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [parseHex(a)!, parseHex(b)!].map(luminance).sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

function darkenUntilReadable(rgb: [number, number, number]): string {
  for (let keep = 1; keep > 0; keep -= 0.05) {
    const candidate = toHex(rgb.map((v) => v * keep));
    if (contrast(candidate, WHITE) >= 4.5) return candidate;
  }
  return DARK_TEXT;
}

function brandColor(raw: string | undefined): [number, number, number] {
  if (raw) {
    const rgb = parseHex(raw);
    if (rgb) return rgb;
    console.warn(JSON.stringify({ event: "brand_config_invalid", variable: "BRAND_COLOR", value: raw }));
  }
  return parseHex(DEFAULT_BRAND_COLOR)!;
}

function logoUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith("https://") || (value.startsWith("/") && !value.startsWith("//"))) return value;
  console.warn(JSON.stringify({ event: "brand_config_invalid", variable: "BRAND_LOGO_URL", value }));
  return undefined;
}

/**
 * Company branding from the environment (BRAND_NAME, BRAND_LOGO_URL, BRAND_COLOR).
 * Missing or invalid values fall back to the default look, with a warning in the logs.
 */
export function getBrand(env: Env = process.env): Brand {
  const rgb = brandColor(env.BRAND_COLOR);
  const color = toHex(rgb);
  return {
    name: env.BRAND_NAME?.trim().slice(0, 40) || undefined,
    logoUrl: logoUrl(env.BRAND_LOGO_URL),
    color,
    onColor: contrast(color, DARK_TEXT) >= contrast(color, WHITE) ? DARK_TEXT : WHITE,
    inkColor: darkenUntilReadable(rgb),
  };
}
