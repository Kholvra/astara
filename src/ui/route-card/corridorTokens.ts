import { getCorridorHexColor } from "~/core/routing/corridorColors";

export type CorridorStyle = Readonly<{
  cssVar: string;
  bgClass: string;
  textClass: string;
  hex: string;
}>;

export function getCorridorStyle(routeShortName: string): CorridorStyle {
  const hex = getCorridorHexColor(routeShortName);
  const normalized = routeShortName.trim().toUpperCase();
  const numMatch = /^(\d+)/.exec(normalized);
  const corridorNum = numMatch?.[1] ? Number.parseInt(numMatch[1], 10) : null;

  if (normalized.startsWith("JAK") || normalized.startsWith("MIKRO")) {
    return {
      cssVar: "var(--tj-mikrotrans)",
      bgClass: "bg-tj-mikrotrans",
      textClass: "text-white",
      hex,
    };
  }

  switch (corridorNum) {
    case 1:
      return {
        cssVar: "var(--tj-corridor-1)",
        bgClass: "bg-tj-1",
        textClass: "text-white",
        hex,
      };
    case 2:
      return {
        cssVar: "var(--tj-corridor-2)",
        bgClass: "bg-tj-2",
        textClass: "text-white",
        hex,
      };
    case 3:
      return {
        cssVar: "var(--tj-corridor-3)",
        bgClass: "bg-tj-3",
        textClass: "text-white",
        hex,
      };
    case 4:
      return {
        cssVar: "var(--tj-corridor-4)",
        bgClass: "bg-tj-4",
        textClass: "text-white",
        hex,
      };
    case 5:
      return {
        cssVar: "var(--tj-corridor-5)",
        bgClass: "bg-tj-5",
        textClass: "text-white",
        hex,
      };
    case 6:
      return {
        cssVar: "var(--tj-corridor-6)",
        bgClass: "bg-tj-6",
        textClass: "text-white",
        hex,
      };
    case 7:
      return {
        cssVar: "var(--tj-corridor-7)",
        bgClass: "bg-tj-7",
        textClass: "text-white",
        hex,
      };
    case 8:
      return {
        cssVar: "var(--tj-corridor-8)",
        bgClass: "bg-tj-8",
        textClass: "text-white",
        hex,
      };
    case 9:
      return {
        cssVar: "var(--tj-corridor-9)",
        bgClass: "bg-tj-9",
        textClass: "text-white",
        hex,
      };
    case 10:
      return {
        cssVar: "var(--tj-corridor-10)",
        bgClass: "bg-tj-10",
        textClass: "text-white",
        hex,
      };
    case 11:
      return {
        cssVar: "var(--tj-corridor-11)",
        bgClass: "bg-tj-11",
        textClass: "text-white",
        hex,
      };
    case 12:
      return {
        cssVar: "var(--tj-corridor-12)",
        bgClass: "bg-tj-12",
        textClass: "text-white",
        hex,
      };
    case 13:
      return {
        cssVar: "var(--tj-corridor-13)",
        bgClass: "bg-tj-13",
        textClass: "text-white",
        hex,
      };
    default:
      return {
        cssVar: "var(--tj-feeder)",
        bgClass: "bg-tj-feeder",
        textClass: "text-white",
        hex,
      };
  }
}
