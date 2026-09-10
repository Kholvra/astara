"use client";

import type { RefObject } from "react";

import type {
  RouteMapAttribution,
  RouteMapPayload,
} from "~/core/geojson/routeGeometry";
import {
  getMapMarkerStatusLabel,
  getMapRouteStateLabel,
  MAP_LEGEND,
} from "./mapPresentation";
import {
  CONFIGURATION_FAILURE,
  PROVIDER_FAILURE,
  type AstaraMapStatus,
  type MapRouteState,
} from "./mapTypes";

export type AstaraMapSurfaceProps = Readonly<{
  activeStepId?: string;
  collapsible: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  expanded: boolean;
  hasPayload: boolean;
  mapRegionId: string;
  onRetry: () => void;
  onStepSelect: (stepId: string) => void;
  onToggle: () => void;
  payload: RouteMapPayload | undefined;
  routeState: MapRouteState;
  status: AstaraMapStatus;
  showRecoveryAction: boolean;
  toggleRef: RefObject<HTMLButtonElement | null>;
  className?: string;
}>;

export const AstaraMapSurface = ({
  activeStepId,
  collapsible,
  containerRef,
  expanded,
  hasPayload,
  mapRegionId,
  onRetry,
  onStepSelect,
  onToggle,
  payload,
  routeState,
  status,
  showRecoveryAction,
  toggleRef,
  className,
}: AstaraMapSurfaceProps) => {
  const markerFeatures = payload?.decisionMarkers.features ?? [];
  const activeStepLabel = getActiveStepLabel(payload, activeStepId);
  const statusPanel = getStatusPanel(status, routeState, hasPayload);
  const rootClassName = [
    "astara-map relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-100",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={rootClassName}
      data-map-status={status}
      data-route-state={routeState}
    >
      {collapsible && (
        <button
          ref={toggleRef}
          type="button"
          className="relative z-20 flex min-h-11 w-full min-w-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
          aria-expanded={expanded}
          aria-controls={mapRegionId}
          onClick={onToggle}
        >
          <span>{expanded ? "Tutup peta" : "Buka peta"}</span>
          <span className="min-w-0 truncate text-xs font-normal text-slate-500">
            {getMapSummary(status, routeState, hasPayload)}
          </span>
        </button>
      )}

      <div
        id={mapRegionId}
        role="region"
        aria-label="Peta pendamping rute"
        aria-hidden={collapsible && !expanded ? true : undefined}
        tabIndex={-1}
        className={
          collapsible && !expanded ? "hidden" : "relative min-h-0 flex-1"
        }
      >
        <div
          ref={containerRef}
          className={expanded ? "absolute inset-0 h-full w-full" : "hidden"}
        />

        {expanded && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto flex min-w-0 flex-col items-start gap-2">
              {statusPanel && (
                <div
                  className={`max-w-full rounded-xl border px-3 py-2 text-xs leading-5 shadow-sm ${statusPanel.tone}`}
                  role={statusPanel.role}
                  aria-live="polite"
                >
                  <p>{statusPanel.message}</p>
                  {statusPanel.retry && showRecoveryAction && (
                    <button
                      type="button"
                      className="mt-2 min-h-11 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      onClick={onRetry}
                    >
                      Coba lagi
                    </button>
                  )}
                </div>
              )}
              <ul
                className="flex max-w-full flex-wrap gap-2 rounded-xl bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-sm backdrop-blur"
                aria-label="Legenda peta"
              >
                {MAP_LEGEND.map((entry) => (
                  <li key={entry.id} className="min-w-0 break-words">
                    {entry.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pointer-events-auto flex min-w-0 flex-col items-start gap-2">
              {markerFeatures.length > 0 && (
                <div className="max-h-44 w-full max-w-sm overflow-y-auto rounded-xl bg-white/95 p-2 shadow-sm backdrop-blur">
                  <p className="px-2 pb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                    Titik keputusan
                  </p>
                  <ul className="grid gap-1" aria-label="Titik keputusan rute">
                    {markerFeatures.map((feature) => {
                      const marker = feature.properties;
                      return (
                        <li key={feature.id}>
                          <button
                            type="button"
                            className="flex min-h-11 w-full min-w-0 items-start gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500"
                            aria-pressed={activeStepId === marker.stepId}
                            onClick={() => onStepSelect(marker.stepId)}
                          >
                            <span className="min-w-0 flex-1 font-semibold break-words">
                              {marker.label}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {getMapMarkerStatusLabel(
                                marker.geometryState,
                                marker.connectionState,
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {activeStepLabel && (
                <p className="sr-only" aria-live="polite">
                  Menyorot langkah: {activeStepLabel}.
                </p>
              )}

              <AttributionList attributions={payload?.attributions ?? []} />
            </div>
          </div>
        )}
      </div>

      {collapsible && !expanded && (
        <p
          className="border-b border-slate-200 bg-white px-4 py-2 text-xs leading-5 text-slate-600"
          role="status"
          aria-live="polite"
        >
          {getMapSummary(status, routeState, hasPayload)}
        </p>
      )}
    </section>
  );
};

function getActiveStepLabel(
  payload: RouteMapPayload | undefined,
  activeStepId: string | undefined,
): string | undefined {
  if (!payload || !activeStepId) {
    return undefined;
  }
  return (
    payload.selectedRoute.features.find(
      (feature) => feature.properties.stepId === activeStepId,
    )?.properties.label ??
    payload.decisionMarkers.features.find(
      (feature) => feature.properties.stepId === activeStepId,
    )?.properties.label
  );
}

function getMapSummary(
  status: AstaraMapStatus,
  routeState: MapRouteState,
  hasPayload: boolean,
): string {
  if (status === "unconfigured") {
    return CONFIGURATION_FAILURE.message;
  }
  if (status === "loading") {
    return "Memuat peta. Instruksi rute tetap tersedia di kartu.";
  }
  if (status === "error") {
    return PROVIDER_FAILURE.message;
  }
  if (routeState === "invalid") {
    return "Geometri rute tidak dapat ditampilkan. Gunakan instruksi rute di kartu.";
  }
  if (!hasPayload) {
    return "Pilih rute untuk melihat jalurnya.";
  }
  if (routeState === "unavailable") {
    return "Jalur peta belum tersedia. Gunakan instruksi rute di kartu.";
  }
  return getMapRouteStateLabel(routeState);
}

type StatusPanel = Readonly<{
  message: string;
  role: "status" | "alert";
  tone: string;
  retry: boolean;
}>;

function getStatusPanel(
  status: AstaraMapStatus,
  routeState: MapRouteState,
  hasPayload: boolean,
): StatusPanel | undefined {
  if (status === "ready" && routeState === "supported" && hasPayload) {
    return undefined;
  }
  if (status === "error") {
    return {
      message: PROVIDER_FAILURE.message,
      role: "alert",
      tone: "border-red-200 bg-red-50 text-red-900",
      retry: true,
    };
  }
  if (status === "unconfigured") {
    return {
      message: CONFIGURATION_FAILURE.message,
      role: "status",
      tone: "border-slate-200 bg-white/95 text-slate-700",
      retry: false,
    };
  }
  if (status === "loading") {
    return {
      message: "Memuat peta. Instruksi rute tetap tersedia di kartu.",
      role: "status",
      tone: "border-slate-200 bg-white/95 text-slate-700",
      retry: false,
    };
  }
  if (routeState === "invalid") {
    return {
      message:
        "Geometri rute tidak dapat ditampilkan. Gunakan instruksi rute di kartu.",
      role: "alert",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      retry: false,
    };
  }
  if (!hasPayload) {
    return {
      message: "Pilih rute untuk melihat jalurnya.",
      role: "status",
      tone: "border-slate-200 bg-white/95 text-slate-700",
      retry: false,
    };
  }
  if (routeState === "unavailable") {
    return {
      message: "Jalur peta belum tersedia. Gunakan instruksi rute di kartu.",
      role: "status",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      retry: false,
    };
  }
  return {
    message:
      "Data peta terbatas. Ikuti instruksi rute di kartu untuk bagian yang belum terpetakan.",
    role: "status",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    retry: false,
  };
}

function AttributionList({
  attributions,
}: Readonly<{ attributions: readonly RouteMapAttribution[] }>) {
  if (attributions.length === 0) {
    return null;
  }
  return (
    <ul
      className="max-w-full rounded-xl bg-white/95 px-3 py-2 text-[10px] leading-4 text-slate-600 shadow-sm backdrop-blur"
      aria-label="Atribusi data rute"
    >
      {attributions.map((attribution) => (
        <li key={attribution.id} className="break-words">
          {attribution.href ? (
            <a
              href={attribution.href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {attribution.label}
            </a>
          ) : (
            attribution.label
          )}
        </li>
      ))}
    </ul>
  );
}
