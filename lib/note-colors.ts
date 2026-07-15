export const noteColors: Record<string, { label: string; card: string; swatch: string }> = {
  none: { label: "Default", card: "bg-card", swatch: "bg-background" },
  red: { label: "Red", card: "bg-red-50 dark:bg-red-950/40", swatch: "bg-red-400" },
  orange: { label: "Orange", card: "bg-orange-50 dark:bg-orange-950/40", swatch: "bg-orange-400" },
  yellow: { label: "Yellow", card: "bg-yellow-50 dark:bg-yellow-950/40", swatch: "bg-yellow-400" },
  green: { label: "Green", card: "bg-green-50 dark:bg-green-950/40", swatch: "bg-green-400" },
  blue: { label: "Blue", card: "bg-blue-50 dark:bg-blue-950/40", swatch: "bg-blue-400" },
  purple: { label: "Purple", card: "bg-purple-50 dark:bg-purple-950/40", swatch: "bg-purple-400" },
};

export type NoteColorKey = keyof typeof noteColors;

export function noteCardClass(color: string | null): string {
  return noteColors[color ?? "none"]?.card ?? noteColors.none.card;
}
