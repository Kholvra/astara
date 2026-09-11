"use client";

import { useState } from "react";
import { Bus, ChevronDown, ChevronUp } from "lucide-react";

import type { PlannerPlanSuccess } from "~/core/planner/plannerTypes";
import type {
  TransitRouteLeg,
  WalkingRouteLeg,
} from "~/core/routing/routingTypes";
import { getCorridorStyle } from "./corridorTokens";
import type { RouteCardStep } from "./routeCardModel";
import { TruthBadge } from "./TruthBadge";

export type RouteTimelineProps = Readonly<{
  route: PlannerPlanSuccess;
  steps: readonly RouteCardStep[];
  className?: string;
}>;

function formatHalteName(name: string): string {
  const trimmed = name.trim();
  if (/^halte\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Halte ${trimmed}`;
}

function formatHeadsign(headsign?: string): string {
  if (!headsign) return "";
  const cleaned = headsign.trim();
  if (cleaned === cleaned.toUpperCase()) {
    return cleaned
      .toLowerCase()
      .split(" ")
      .map((word) => {
        if (["dan", "ke", "di", "dari"].includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  return cleaned;
}

export const RouteTimeline = ({
  route,
  steps,
  className = "",
}: RouteTimelineProps) => {
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>(
    {},
  );

  const toggleStops = (legId: string) => {
    setExpandedStops((prev) => ({
      ...prev,
      [legId]: !prev[legId],
    }));
  };

  const legs = route.result.primary.legs;
  const transitLegs = legs.filter(
    (leg): leg is TransitRouteLeg => leg.kind === "transit",
  );

  const stopLabels = route.stopLabels;
  const getLabel = (stopId: string): string => stopLabels[stopId] ?? stopId;

  // If no transit legs exist, fallback to plain step rendering
  if (transitLegs.length === 0) {
    return (
      <div className={`min-w-0 ${className}`}>
        <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-4">
          {steps.map((step) => (
            <li key={step.id} className="relative">
              <span className="absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600 ring-2 ring-emerald-100" />
              <div>
                <p className="text-sm font-bold text-slate-900">{step.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{step.detail}</p>
                <div className="mt-1">
                  <TruthBadge label={step.status} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className={`min-w-0 space-y-1 ${className}`}>
      {transitLegs.map((leg, idx) => {
        const isFirstTransit = idx === 0;
        const isLastTransit = idx === transitLegs.length - 1;
        const corridor = getCorridorStyle(leg.routeShortName);
        const departureLabel = getLabel(leg.fromStopId);
        const arrivalLabel = getLabel(leg.toStopId);
        const isStopsExpanded = Boolean(expandedStops[leg.legId]);

        // Find if there is a walking/transfer leg right before this transit leg
        const prevLeg = idx > 0 ? transitLegs[idx - 1] : undefined;
        const interLegWalk = prevLeg
          ? legs.find(
              (l): l is WalkingRouteLeg =>
                l.kind === "walking" &&
                l.fromStopId === prevLeg.toStopId &&
                l.toStopId === leg.fromStopId,
            )
          : undefined;

        // Intermediate stops between boarding and alighting
        const intermediateStopIds = leg.stopIds.slice(1, -1);
        const totalPassedStops = Math.max(1, leg.stopIds.length - 1);

        const durationMinutes = leg.durationSeconds
          ? Math.max(1, Math.round(leg.durationSeconds / 60))
          : totalPassedStops * 3;

        return (
          <div key={leg.legId}>
            {/* 1. Station Node (Origin or Transfer Hub) */}
            <div className="flex items-start gap-3">
              <div className="flex h-5 w-4 shrink-0 items-center justify-center">
                {isFirstTransit ? (
                  <span className="h-3 w-3 rounded-full bg-slate-900 ring-4 ring-slate-100" />
                ) : (
                  <span className="h-3 w-3 rounded-full border-2 border-slate-700 bg-white ring-4 ring-slate-100" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-base font-bold tracking-tight text-slate-950">
                  {formatHalteName(departureLabel)}
                </span>
                {!isFirstTransit && (
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {(interLegWalk?.distanceMeters ?? 0) > 30
                      ? `↳ Pindah koridor via JPO (±${interLegWalk?.distanceMeters} m, tanpa tap out)`
                      : `↳ Pindah ke Bus ${leg.routeShortName} di peron (tanpa tap out)`}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Transit Connection Segment */}
            <div className="flex items-stretch gap-3">
              {/* Vertical Corridor Line */}
              <div className="flex w-4 shrink-0 justify-center">
                <div
                  className="w-[3px] rounded-full my-1 transition-colors"
                  style={{ backgroundColor: corridor.cssVar }}
                />
              </div>

              {/* Transit Info: Clean, large, senior-friendly typography */}
              <div className="min-w-0 flex-1 py-2">
                {/* Line 1: Corridor Badge + Direction */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-black text-white shadow-2xs"
                    style={{ backgroundColor: corridor.cssVar }}
                  >
                    <Bus className="h-3.5 w-3.5" />
                    <span>Koridor {leg.routeShortName}</span>
                  </span>

                  {leg.headsign && (
                    <span className="text-sm font-bold text-slate-900">
                      Arah {formatHeadsign(leg.headsign)}
                    </span>
                  )}
                </div>

                {/* Line 2: Stops & Duration + Expand Button */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600 font-medium">
                  <span>
                    {totalPassedStops} halte (±{durationMinutes} mnt)
                  </span>

                  {intermediateStopIds.length > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => toggleStops(leg.legId)}
                        aria-expanded={isStopsExpanded}
                        className="inline-flex cursor-pointer items-center gap-0.5 text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors"
                      >
                        <span>
                          {isStopsExpanded ? "Tutup" : "Lihat halte dilewati"}
                        </span>
                        {isStopsExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Screen reader & test helper */}
                <span className="sr-only">
                  Naik rute {leg.routeShortName} • Turun di{" "}
                  {formatHalteName(arrivalLabel)}
                </span>

                {/* Intermediate Stops Accordion (collapsed by default) */}
                {intermediateStopIds.length > 0 && isStopsExpanded && (
                  <ol className="mt-2 ml-1 space-y-1.5 border-l-2 border-slate-200 pl-3">
                    {intermediateStopIds.map((stopId) => (
                      <li
                        key={stopId}
                        className="relative text-xs font-medium text-slate-700"
                      >
                        <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{formatHalteName(getLabel(stopId))}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* 3. Arrival Node (Only at the very last transit leg) */}
            {isLastTransit && (
              <div className="flex items-start gap-3 pt-0.5">
                <div className="flex h-5 w-4 shrink-0 items-center justify-center">
                  <span className="h-3 w-3 rounded-full bg-slate-900 ring-4 ring-slate-100" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-base font-bold tracking-tight text-slate-950">
                    {formatHalteName(arrivalLabel)}
                  </span>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">
                    Turun di sini · Tujuan akhir
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
