"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  Bus,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";

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

  const formatHalteName = (name: string): string => {
    const trimmed = name.trim();
    if (/^halte\b/i.test(trimmed)) {
      return trimmed;
    }
    return `Halte ${trimmed}`;
  };

  // If no transit legs exist, fallback to plain step rendering
  if (transitLegs.length === 0) {
    return (
      <div className={`min-w-0 ${className}`}>
        <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-4">
          {steps.map((step) => (
            <li key={step.id} className="relative">
              <span className="absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600 ring-2 ring-emerald-100" />
              <div>
                <p className="text-xs font-bold text-slate-900">{step.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{step.detail}</p>
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
    <div className={`min-w-0 space-y-2 ${className}`}>
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
          <div key={leg.legId} className="relative">
            {/* 1. Station Node (Origin or Transfer Hub) */}
            <div className="flex items-start gap-3">
              <div className="relative flex flex-col items-center">
                {isFirstTransit ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs ring-4 ring-amber-100">
                    <ArrowRightLeft className="h-3 w-3" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <h3 className="text-sm font-black tracking-tight text-slate-900">
                    {formatHalteName(departureLabel)}
                  </h3>
                  {isFirstTransit ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Halte Keberangkatan
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Transit di Halte
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                  {isFirstTransit
                    ? `Masuk halte dan menuju peron rute ${leg.routeShortName}`
                    : (interLegWalk?.distanceMeters ?? 0) > 30
                      ? `Pindah koridor via JPO/peron (±${interLegWalk?.distanceMeters} m, tanpa tap out)`
                      : `Pindah ke Koridor ${leg.routeShortName} di dalam halte (tanpa tap out)`}
                </p>

                {interLegWalk?.evidenceState && (
                  <div className="mt-1">
                    <TruthBadge
                      label={
                        interLegWalk.evidenceState === "Terverifikasi"
                          ? "Terverifikasi"
                          : interLegWalk.evidenceState === "Perlu dicek"
                            ? "Perlu dicek"
                            : "Data terbatas"
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 2. Transit Connection Segment */}
            <div className="ml-3 flex gap-3 pl-0">
              {/* Vertical Corridor Line */}
              <div
                className="w-1 shrink-0 rounded-full my-1 transition-colors"
                style={{ backgroundColor: corridor.hex }}
              />

              {/* Transit Card Details */}
              <div className="my-2 min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 shadow-2xs">
                {/* Corridor Badge & Headsign */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black text-white shadow-2xs"
                      style={{ backgroundColor: corridor.hex }}
                    >
                      <Bus className="h-3.5 w-3.5" />
                      <span>Koridor {leg.routeShortName}</span>
                    </span>
                    {leg.headsign && (
                      <span className="text-xs font-bold tracking-tight text-slate-800">
                        Arah {leg.headsign.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-slate-500">
                    ~{durationMinutes} mnt
                  </span>
                </div>

                {/* Explicit Wayfinding Action Text for screen readers and search */}
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">
                    Naik rute {leg.routeShortName}
                  </span>{" "}
                  • Turun di {formatHalteName(arrivalLabel)}
                </div>

                {/* Intermediate Stops Dropdown Accordion */}
                {intermediateStopIds.length > 0 && (
                  <div className="mt-2.5 border-t border-slate-200/60 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleStops(leg.legId)}
                      aria-expanded={isStopsExpanded}
                      className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
                    >
                      {isStopsExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span>
                        {intermediateStopIds.length} halte dilewati sebelum
                        turun
                      </span>
                    </button>

                    {isStopsExpanded && (
                      <ol className="mt-2 ml-1.5 space-y-1.5 border-l-2 border-slate-300 pl-3">
                        {intermediateStopIds.map((stopId) => (
                          <li
                            key={stopId}
                            className="relative text-[11px] text-slate-600"
                          >
                            <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span>{formatHalteName(getLabel(stopId))}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Arrival / Destination Node (Only at the very last transit leg) */}
            {isLastTransit && (
              <div className="flex items-start gap-3 pt-1">
                <div className="relative flex flex-col items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-xs ring-4 ring-slate-200">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <h3 className="text-sm font-black tracking-tight text-slate-900">
                      {formatHalteName(arrivalLabel)}
                    </h3>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      Tujuan Akhir
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Turun dari bus & tiba di tujuan akhir
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
