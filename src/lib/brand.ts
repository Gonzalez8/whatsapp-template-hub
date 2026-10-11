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
  /** The accent lightened until it stands out on the dark top bar and sidebar (4.5:1). */
  brightColor: string;
  /** Text color on top of `brightColor`. */
  onBrightColor: string;
  /** Show the logo on a white plate (for dark logos that would vanish on the dark bar). */
  logoOnWhite: boolean;
}

type Env = Record<string, string | undefined>;

const DARK_TEXT = "#0B1A12";
const WHITE = "#FFFFFF";
/** Darkest of the dark surfaces (top bar), matches --color-chrome. */
const CHROME = "#14181A";

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

function lightenUntilReadable(rgb: [number, number, number]): string {
  for (let mix = 0; mix <= 1; mix += 0.05) {
    const candidate = toHex(rgb.map((v) => v + (255 - v) * mix));
    if (contrast(candidate, CHROME) >= 4.5) return candidate;
  }
  return WHITE;
}

const textOn = (color: string) => (contrast(color, DARK_TEXT) >= contrast(color, WHITE) ? DARK_TEXT : WHITE);

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
 * Company branding from the environment (BRAND_NAME, BRAND_LOGO_URL, BRAND_COLOR,
 * BRAND_LOGO_BACKGROUND).
 * Missing or invalid values fall back to the default look, with a warning in the logs.
 */
export function getBrand(env: Env = process.env): Brand {
  const rgb = brandColor(env.BRAND_COLOR);
  const color = toHex(rgb);
  const brightColor = lightenUntilReadable(rgb);
  return {
    name: env.BRAND_NAME?.trim().slice(0, 40) || undefined,
    logoUrl: logoUrl(env.BRAND_LOGO_URL),
    color,
    onColor: textOn(color),
    inkColor: darkenUntilReadable(rgb),
    brightColor,
    onBrightColor: textOn(brightColor),
    logoOnWhite: env.BRAND_LOGO_BACKGROUND?.trim().toLowerCase() === "white",
  };
}
