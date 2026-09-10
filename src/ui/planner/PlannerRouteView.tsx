"use client";

import type { PlannerStateSnapshot } from "~/core/planner/plannerTypes";
import { RouteCard } from "~/ui/route-card/RouteCard";
import { PlannerMap } from "./PlannerMap";

export type PlannerRouteViewProps = Readonly<{
  mapStyleUrl?: string;
  mapRetryNonce: number;
  mapDismissed: boolean;
  snapshot: PlannerStateSnapshot;
  onBack: () => void;
  onEdit: () => void;
  onSwap: () => void;
  onReset: () => void;
  onMapRetry?: () => void;
  onMapDismiss: () => void;
  onMapFailure: (mapAttempt: number) => void;
  onStepsToggle: (open: boolean) => void;
}>;

export const PlannerRouteView = ({
  mapStyleUrl,
  mapRetryNonce,
  mapDismissed,
  snapshot,
  onBack,
  onEdit,
  onSwap,
  onReset,
  onMapRetry,
  onMapDismiss,
  onMapFailure,
  onStepsToggle,
}: PlannerRouteViewProps) => {
  if (!snapshot.route || !snapshot.departAt) return null;

  return (
    <main
      data-planner-state={snapshot.state}
      className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#F6F8FA] font-sans"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {snapshot.state === "detail" ? "Kembali ke rute" : "Kembali"}
        </button>
        <div className="flex min-w-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 rounded-xl px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Ubah
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="min-h-11 rounded-xl px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Tukar
          </button>
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-xl px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Reset
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto grid w-full max-w-2xl min-w-0 gap-3">
          <div
            data-planner-state={snapshot.state}
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {snapshot.message ??
              "Rute siap diikuti dengan instruksi berurutan."}
          </div>
          <RouteCard
            result={snapshot.route.result}
            stopLabels={snapshot.route.stopLabels}
            departAt={snapshot.departAt}
            mapState={
              snapshot.state === "map-failure"
                ? "error"
                : mapDismissed
                  ? undefined
                  : "available"
            }
            mapCompanion={
              mapDismissed ? undefined : (
                <PlannerMap
                  key={`${snapshot.route.result.primary.routeId}-${mapRetryNonce}`}
                  route={snapshot.route.mapData}
                  styleUrl={mapStyleUrl}
                  showRecoveryAction={false}
                  onMapFailure={() => onMapFailure(mapRetryNonce)}
                />
              )
            }
            onMapRetry={onMapRetry}
            onMapDismiss={onMapDismiss}
            onStepsToggle={onStepsToggle}
            mapOpen={snapshot.state === "map-failure"}
            stepsOpen={
              snapshot.state === "detail" ||
              (snapshot.state === "map-failure" &&
                snapshot.mapReturnState === "detail" &&
                snapshot.detailOpen)
            }
          />
        </div>
      </div>
    </main>
  );
};
