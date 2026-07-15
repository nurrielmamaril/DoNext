export const ACCENTS = [
  { key: "neutral", label: "Neutral", swatch: "oklch(0.205 0 0)", checkClass: "text-white" },
  { key: "aqua", label: "Aqua Blue", swatch: "oklch(0.55 0.14 220)", checkClass: "text-white" },
  { key: "violet", label: "Violet", swatch: "oklch(0.5 0.18 290)", checkClass: "text-white" },
  { key: "forest", label: "Forest", swatch: "oklch(0.5 0.13 155)", checkClass: "text-white" },
  { key: "sunset", label: "Sunset", swatch: "oklch(0.62 0.17 45)", checkClass: "text-white" },
  { key: "mustard", label: "Mustard", swatch: "oklch(0.72 0.14 90)", checkClass: "text-black" },
] as const;

export type AccentKey = (typeof ACCENTS)[number]["key"];

export const DEFAULT_ACCENT: AccentKey = "neutral";

export function isAccentKey(value: string | null): value is AccentKey {
  return ACCENTS.some((a) => a.key === value);
}
