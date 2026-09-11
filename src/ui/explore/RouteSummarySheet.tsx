"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Bus, ChevronDown, Footprints } from "lucide-react";

import type { PlannerPlanSuccess } from "~/core/planner/plannerTypes";
import type { TransitRouteLeg } from "~/core/routing/routingTypes";
import {
  DEFAULT_SERVICE_TIMEZONE,
  type DepartAtInput,
  type FareStatus,
} from "~/core/timing/tripTiming";
import { createRouteCardViewModel } from "~/ui/route-card/routeCardModel";

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
  onStepsToggle,
  mapNotice,
  onMapRetry,
}: RouteSummarySheetProps) => {
  const [localStepsOpen, setLocalStepsOpen] = useState(false);
  const isStepsOpen = stepsOpen ?? localStepsOpen;

  const handleStepsToggle = () => {
    const next = !isStepsOpen;
    setLocalStepsOpen(next);
    onStepsToggle?.(next);
  };

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

  if (model.state !== "selected") {
    return null;
  }

  const transitLegs = route.result.primary.legs.filter(
    (leg): leg is TransitRouteLeg => leg.kind === "transit",
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Route Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Transit Line Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {transitLegs.map((leg, idx) => (
              <span key={leg.legId} className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                  <Bus className="h-3.5 w-3.5" />
                  <span>Koridor {leg.routeShortName}</span>
                </span>
                {idx < transitLegs.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                )}
              </span>
            ))}
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
              {model.summary.duration}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {model.summary.timing.label}
            </span>
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

        {/* Fare badge */}
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center rounded-xl border border-emerald-200/80 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs">
            {model.summary.fare}
          </span>
        </div>
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

      {/* Steps Accordion */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60">
        <button
          type="button"
          id="route-steps-toggle"
          onClick={handleStepsToggle}
          aria-expanded={isStepsOpen}
          aria-controls="route-steps-content"
          className="flex min-h-11 w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Footprints className="h-3 w-3" />
            </span>
            <span>Langkah Perjalanan</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {model.steps.length} langkah
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isStepsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isStepsOpen && (
          <div
            id="route-steps-content"
            className="border-t border-slate-200/60 px-4 py-3"
          >
            <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-4">
              {model.steps.map((step, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === model.steps.length - 1;
                const isTransit = step.kind === "transit";

                return (
                  <li key={step.id} className="relative">
                    <span
                      className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        isFirst
                          ? "bg-emerald-600 ring-2 ring-emerald-100"
                          : isLast
                            ? "bg-slate-800 ring-2 ring-slate-200"
                            : isTransit
                              ? "bg-emerald-500"
                              : "bg-amber-400"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {step.detail}
                      </p>
                      {step.status === "Perlu dicek" && (
                        <p className="mt-1 text-[11px] font-medium text-amber-700">
                          {step.statusDetail}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
