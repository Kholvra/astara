"use client";

import { ArrowLeft, ArrowUpDown, Edit3, RotateCcw } from "lucide-react";

import type { GeoCoordinate } from "~/core/geojson/geometry";
import type { PlannerStateSnapshot } from "~/core/planner/plannerTypes";
import { RouteCard } from "~/ui/route-card/RouteCard";
import { PlannerMap } from "./PlannerMap";

export type PlannerRouteViewProps = Readonly<{
  mapStyleUrl?: string;
  mapRetryNonce: number;
  mapDismissed: boolean;
  snapshot: PlannerStateSnapshot;
  userLocation?: GeoCoordinate | null;
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
  userLocation,
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
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{snapshot.state === "detail" ? "Kembali ke rute" : "Kembali"}</span>
        </button>
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-10 cursor-pointer items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            title="Ubah titik asal atau tujuan"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Ubah</span>
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="flex min-h-10 cursor-pointer items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            title="Tukar arah perjalanan"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Tukar</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex min-h-10 cursor-pointer items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            title="Reset rencana perjalanan"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
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
                  userLocation={userLocation}
                  onMapFailure={() => onMapFailure(mapRetryNonce)}
                />
              )
            }
            onMapRetry={onMapRetry}
            onMapDismiss={onMapDismiss}
            onStepsToggle={onStepsToggle}
            mapOpen={!mapDismissed}
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
