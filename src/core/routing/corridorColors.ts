export const DEFAULT_TRANSIT_HEX_COLOR = "#0f766e";
export const DEFAULT_FEEDER_HEX_COLOR = "#0284c7";
export const MIKROTRANS_HEX_COLOR = "#0284c7";

export const CORRIDOR_HEX_COLORS: Readonly<Record<number, string>> = {
  1: "#e11d48",
  2: "#2563eb",
  3: "#d97706",
  4: "#7c3aed",
  5: "#0d9488",
  6: "#16a34a",
  7: "#dc2626",
  8: "#9333ea",
  9: "#ea580c",
  10: "#4f46e5",
  11: "#0284c7",
  12: "#059669",
  13: "#c026d3",
};

export function getCorridorHexColor(routeShortName: string): string {
  const normalized = routeShortName.trim().toUpperCase();
  if (normalized.startsWith("JAK") || normalized.startsWith("MIKRO")) {
    return MIKROTRANS_HEX_COLOR;
  }
  const numMatch = /^(\d+)/.exec(normalized);
  const corridorNum = numMatch?.[1] ? Number.parseInt(numMatch[1], 10) : null;
  if (corridorNum !== null && corridorNum in CORRIDOR_HEX_COLORS) {
    return CORRIDOR_HEX_COLORS[corridorNum] ?? DEFAULT_FEEDER_HEX_COLOR;
  }
  return DEFAULT_FEEDER_HEX_COLOR;
}
