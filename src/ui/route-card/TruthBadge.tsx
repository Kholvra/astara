import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import type { RouteCardStatusLabel } from "./routeCardModel";

export type TruthBadgeProps = Readonly<{
  label: RouteCardStatusLabel;
  className?: string;
}>;

export const TruthBadge = ({ label, className = "" }: TruthBadgeProps) => {
  if (label === "Terverifikasi") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ${className}`}
      >
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        <span>Terverifikasi</span>
      </span>
    );
  }

  if (label === "Perlu dicek") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ${className}`}
      >
        <AlertCircle className="h-3 w-3 text-amber-600" />
        <span>Perlu dicek</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ${className}`}
    >
      <HelpCircle className="h-3 w-3 text-slate-500" />
      <span>Data terbatas</span>
    </span>
  );
};
