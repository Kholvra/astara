"use client";

import { useMemo } from "react";
import { ArrowRight, Bus, Footprints } from "lucide-react";

import type { PlannerPlanSuccess } from "~/core/planner/plannerTypes";
import type { TransitRouteLeg } from "~/core/routing/routingTypes";
import {
  DEFAULT_SERVICE_TIMEZONE,
  type DepartAtInput,
  type FareStatus,
} from "~/core/timing/tripTiming";
import { getCorridorStyle } from "~/ui/route-card/corridorTokens";
import { createRouteCardViewModel } from "~/ui/route-card/routeCardModel";
import { RouteTimeline } from "~/ui/route-card/RouteTimeline";

export type RouteSummarySheetProps = Readonly<{
  route: PlannerPlanSuccess;
  departAt?: DepartAtInput | null;
  fare?: FareStatus;
  stepsOpen?: boolean;
  onStepsToggle?: (open: boolean) => void;
  mapNotice?: string;
  onMapRetry?: () => void;
}>;

export const RouteSummarySheet = ({
  route,
  departAt,
  fare,
  stepsOpen,
  onStepsToggle: _onStepsToggle,
  mapNotice,
  onMapRetry,
}: RouteSummarySheetProps) => {
  const isStepsOpen = Boolean(stepsOpen);

  const model = useMemo(() => {
    return createRouteCardViewModel({
      result: route.result,
      stopLabels: route.stopLabels,
      departAt: departAt ?? {
        mode: "depart-at",
        timezone: DEFAULT_SERVICE_TIMEZONE,
        localDate: "",
        localTime: "",
      },
      fare,
    });
  }, [route, departAt, fare]);

  const transitLegs = useMemo(() => {
    return route.result.primary.legs.filter(
      (leg): leg is TransitRouteLeg => leg.kind === "transit",
    );
  }, [route.result.primary.legs]);

  const durationDisplay = useMemo(() => {
    if (model.state !== "selected") return "";
    if (model.summary.duration !== "Data terbatas") {
      return model.summary.duration;
    }
    const totalStops = transitLegs.reduce(
      (acc, leg) => acc + Math.max(1, leg.stopIds.length - 1),
      0,
    );
    if (totalStops > 0) {
      const estimatedMins = Math.max(15, totalStops * 3);
      return `~${estimatedMins} mnt`;
    }
    return "Jadwal Fleksibel";
  }, [model, transitLegs]);

  if (model.state !== "selected") {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Route Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Transit Line Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {transitLegs.map((leg, idx) => {
              const corridor = getCorridorStyle(leg.routeShortName);
              return (
                <span key={leg.legId} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
                    style={{ backgroundColor: corridor.hex }}
                  >
                    <Bus className="h-3.5 w-3.5" />
                    <span>Koridor {leg.routeShortName}</span>
                  </span>
                  {idx < transitLegs.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </span>
              );
            })}
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
              {route.result.primary.transferCount === 0
                ? "Langsung"
                : `${route.result.primary.transferCount}x transit`}
            </span>
          </div>

          {/* Duration & Timing */}
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <h2
              id="route-card-heading"
              tabIndex={-1}
              className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl focus:outline-none"
            >
              {durationDisplay}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {model.summary.timing.label}
            </span>
          </div>
        </div>

        {/* Walking Distance if available */}
        {model.summary.walking !== "Jalan kaki: Data terbatas" &&
          model.summary.walking !== "Data terbatas" && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Footprints className="h-3.5 w-3.5 text-slate-400" />
              <span>{model.summary.walking}</span>
            </div>
          )}
      </div>

      {/* Map notice if any */}
      {mapNotice && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          <span>{mapNotice}</span>
          {onMapRetry && (
            <button
              type="button"
              onClick={onMapRetry}
              className="cursor-pointer rounded-lg bg-amber-200/80 px-2 py-1 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-300"
            >
              Coba lagi
            </button>
          )}
        </div>
      )}

      {/* Steps Section: Smooth CSS accordion transition without abrupt unmount */}
      <div
        id="route-steps-content"
        aria-hidden={!isStepsOpen}
        className={`grid transition-all duration-300 ease-in-out ${
          isStepsOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="min-w-0 border-t border-slate-100 pt-3">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Footprints className="h-3 w-3" />
                </span>
                <span className="text-xs font-bold tracking-wider text-slate-800 uppercase">
                  Langkah Perjalanan
                </span>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {transitLegs.length <= 1
                  ? "Langsung tanpa transit"
                  : `${transitLegs.length - 1}x pindah koridor`}
              </span>
            </div>

            <RouteTimeline route={route} steps={model.steps} />
          </div>
        </div>
      </div>
    </div>
  );
};
