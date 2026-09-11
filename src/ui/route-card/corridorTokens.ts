export type CorridorStyle = Readonly<{
  hex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  lineClass: string;
  dotClass: string;
}>;

export function getCorridorStyle(routeShortName: string): CorridorStyle {
  const normalized = routeShortName.trim().toUpperCase();
  const numMatch = /^(\d+)/.exec(normalized);
  const corridorNum = numMatch?.[1] ? Number.parseInt(numMatch[1], 10) : null;

  if (normalized.startsWith("JAK") || normalized.startsWith("MIKRO")) {
    return {
      hex: "#0284C7",
      bgClass: "bg-sky-600",
      borderClass: "border-sky-500",
      textClass: "text-white",
      lineClass: "border-sky-500",
      dotClass: "bg-sky-500",
    };
  }

  switch (corridorNum) {
    case 1:
      return {
        hex: "#E11D48",
        bgClass: "bg-rose-600",
        borderClass: "border-rose-500",
        textClass: "text-white",
        lineClass: "border-rose-500",
        dotClass: "bg-rose-500",
      };
    case 2:
      return {
        hex: "#2563EB",
        bgClass: "bg-blue-600",
        borderClass: "border-blue-500",
        textClass: "text-white",
        lineClass: "border-blue-500",
        dotClass: "bg-blue-500",
      };
    case 3:
      return {
        hex: "#D97706",
        bgClass: "bg-amber-600",
        borderClass: "border-amber-500",
        textClass: "text-white",
        lineClass: "border-amber-500",
        dotClass: "bg-amber-500",
      };
    case 4:
      return {
        hex: "#7C3AED",
        bgClass: "bg-purple-600",
        borderClass: "border-purple-500",
        textClass: "text-white",
        lineClass: "border-purple-500",
        dotClass: "bg-purple-500",
      };
    case 5:
      return {
        hex: "#0D9488",
        bgClass: "bg-teal-600",
        borderClass: "border-teal-500",
        textClass: "text-white",
        lineClass: "border-teal-500",
        dotClass: "bg-teal-500",
      };
    case 6:
      return {
        hex: "#16A34A",
        bgClass: "bg-emerald-600",
        borderClass: "border-emerald-500",
        textClass: "text-white",
        lineClass: "border-emerald-500",
        dotClass: "bg-emerald-500",
      };
    case 7:
      return {
        hex: "#DC2626",
        bgClass: "bg-red-600",
        borderClass: "border-red-500",
        textClass: "text-white",
        lineClass: "border-red-500",
        dotClass: "bg-red-500",
      };
    case 8:
      return {
        hex: "#9333EA",
        bgClass: "bg-purple-700",
        borderClass: "border-purple-600",
        textClass: "text-white",
        lineClass: "border-purple-600",
        dotClass: "bg-purple-600",
      };
    case 9:
      return {
        hex: "#EA580C",
        bgClass: "bg-orange-600",
        borderClass: "border-orange-500",
        textClass: "text-white",
        lineClass: "border-orange-500",
        dotClass: "bg-orange-500",
      };
    case 10:
      return {
        hex: "#4F46E5",
        bgClass: "bg-indigo-600",
        borderClass: "border-indigo-500",
        textClass: "text-white",
        lineClass: "border-indigo-500",
        dotClass: "bg-indigo-500",
      };
    case 11:
      return {
        hex: "#0284C7",
        bgClass: "bg-sky-600",
        borderClass: "border-sky-500",
        textClass: "text-white",
        lineClass: "border-sky-500",
        dotClass: "bg-sky-500",
      };
    case 12:
      return {
        hex: "#059669",
        bgClass: "bg-emerald-700",
        borderClass: "border-emerald-600",
        textClass: "text-white",
        lineClass: "border-emerald-600",
        dotClass: "bg-emerald-600",
      };
    case 13:
      return {
        hex: "#C026D3",
        bgClass: "bg-fuchsia-600",
        borderClass: "border-fuchsia-500",
        textClass: "text-white",
        lineClass: "border-fuchsia-500",
        dotClass: "bg-fuchsia-500",
      };
    default:
      return {
        hex: "#0284C7",
        bgClass: "bg-sky-600",
        borderClass: "border-sky-500",
        textClass: "text-white",
        lineClass: "border-sky-500",
        dotClass: "bg-sky-500",
      };
  }
}
