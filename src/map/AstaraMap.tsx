"use client";

import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  setWorkerUrl,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { GeoCoordinate } from "~/core/geojson/geometry";
import {
  prepareRouteMapData,
  type RouteMapPayload,
  type RouteMapPreparation,
} from "~/core/geojson/routeGeometry";
import {
  applyActiveStep,
  EMPTY_MAP_PAYLOAD,
  focusPayload,
  focusMap,
  installMapSourcesAndLayers,
  selectMapStep,
  syncMapSources,
} from "./mapLifecycle";
import { getMapFocusCoordinates, MAP_LAYER_IDS } from "./mapPresentation";
import { AstaraMapSurface } from "./AstaraMapSurface";
import {
  CONFIGURATION_FAILURE,
  PROVIDER_FAILURE,
  type AstaraMapFailure,
  type AstaraMapStatus,
  type MapRouteState,
} from "./mapTypes";

const JAKARTA_CENTER: [number, number] = [106.827, -6.175];

export type { AstaraMapFailure, AstaraMapStatus } from "./mapTypes";

export type AstaraMapProps = {
  styleUrl?: string;
  route?: unknown;
  activeStepId?: string;
  onStepSelect?: (stepId: string) => void;
  onMapFailure?: (failure: AstaraMapFailure) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
  showRecoveryAction?: boolean;
  showLoadingStatus?: boolean;
  showStatusPanel?: boolean;
  showLegend?: boolean;
  showDecisionMarkers?: boolean;
  userLocation?: GeoCoordinate | null;
};

export const AstaraMap = ({
  styleUrl,
  route,
  activeStepId,
  onStepSelect,
  onMapFailure,
  collapsible = false,
  defaultExpanded = true,
  className,
  showRecoveryAction = true,
  showLoadingStatus,
  showStatusPanel,
  showLegend,
  showDecisionMarkers,
  userLocation,
}: AstaraMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const mapGenerationRef = useRef(0);
  const mapLoadedRef = useRef(false);
  const sourceSyncGenerationRef = useRef(0);
  const activeRouteIdRef = useRef<string | undefined>(undefined);
  const wasExpandedRef = useRef(collapsible ? defaultExpanded : true);
  const latestPayloadRef = useRef<RouteMapPayload | undefined>(undefined);
  const onStepSelectRef = useRef(onStepSelect);
  const onMapFailureRef = useRef(onMapFailure);
  const lastFailureKeyRef = useRef<string | undefined>(undefined);
  const lastGeometryFailureKeyRef = useRef<string | undefined>(undefined);
  const reportFailureRef = useRef<(failure: AstaraMapFailure) => void>(() => {
    return;
  });
  const [retryNonce, setRetryNonce] = useState(0);
  const [expanded, setExpanded] = useState(
    collapsible ? defaultExpanded : true,
  );
  const [status, setStatus] = useState<AstaraMapStatus>(() =>
    normalizeStyleUrl(styleUrl) ? "loading" : "unconfigured",
  );
  const mapRegionId = `astara-map-region-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const preparation = useMemo<RouteMapPreparation | undefined>(
    () => (route === undefined ? undefined : prepareRouteMapData(route)),
    [route],
  );
  const payload =
    preparation?.state === "valid" ? preparation.payload : undefined;
  const routeState: MapRouteState =
    preparation?.state === "invalid"
      ? "invalid"
      : (payload?.state ?? "unavailable");
  const routeFailureKey =
    preparation?.state === "invalid"
      ? preparation.issues
          .map((issue) => `${issue.path}:${issue.message}`)
          .join("|")
      : "";

  onStepSelectRef.current = onStepSelect;
  onMapFailureRef.current = onMapFailure;
  latestPayloadRef.current = payload;
  reportFailureRef.current = (failure) => {
    const key = `${failure.kind}:${failure.message}`;
    if (lastFailureKeyRef.current === key) {
      return;
    }
    lastFailureKeyRef.current = key;
    if (failure.kind === "provider") {
      setStatus("error");
    } else if (failure.kind === "configuration") {
      setStatus("unconfigured");
    }
    onMapFailureRef.current?.(failure);
  };

  useEffect(() => {
    if (preparation?.state !== "invalid") {
      lastGeometryFailureKeyRef.current = undefined;
      if (lastFailureKeyRef.current?.startsWith("geometry:")) {
        lastFailureKeyRef.current = undefined;
      }
      return;
    }
    if (lastGeometryFailureKeyRef.current === routeFailureKey) {
      return;
    }
    lastGeometryFailureKeyRef.current = routeFailureKey;
    reportFailureRef.current({
      kind: "geometry",
      message: preparation.message,
      recoveryAction: preparation.recoveryAction,
    });
  }, [preparation, routeFailureKey]);

  useEffect(() => {
    const container = containerRef.current;
    const normalizedStyleUrl = normalizeStyleUrl(styleUrl);
    const generation = mapGenerationRef.current + 1;
    mapGenerationRef.current = generation;
    activeRouteIdRef.current = undefined;

    if (!normalizedStyleUrl || !container) {
      setStatus("unconfigured");
      if (!normalizedStyleUrl) {
        reportFailureRef.current(CONFIGURATION_FAILURE);
      }
      return;
    }

    let disposed = false;
    let markerListenerAttached = false;
    let map: MapLibreMap;
    const isCurrent = (): boolean =>
      !disposed &&
      mapRef.current === map &&
      mapGenerationRef.current === generation;
    const reportProviderFailure = (): void => {
      if (isCurrent()) {
        reportFailureRef.current(PROVIDER_FAILURE);
      }
    };

    setStatus("loading");
    try {
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new MapLibreMap({
        container,
        style: normalizedStyleUrl,
        center: JAKARTA_CENTER,
        zoom: 11,
        attributionControl: false,
      });
    } catch {
      reportFailureRef.current(PROVIDER_FAILURE);
      return;
    }
    mapRef.current = map;
    mapLoadedRef.current = false;

    const handleMarkerClick = (event: MapLayerMouseEvent): void => {
      if (!isCurrent()) {
        return;
      }
      const stepId = getMapFeatureStepId(event.features?.[0]);
      if (typeof stepId === "string") {
        selectMapStep(
          stepId,
          latestPayloadRef.current,
          mapRef.current,
          mapLoadedRef.current,
          onStepSelectRef.current,
        );
      }
    };
    const handleLoad = (): void => {
      if (!isCurrent()) {
        return;
      }
      try {
        installMapSourcesAndLayers(
          map,
          latestPayloadRef.current ?? EMPTY_MAP_PAYLOAD,
        );
        map.on("click", MAP_LAYER_IDS.decisionMarker, handleMarkerClick);
        markerListenerAttached = true;
        mapLoadedRef.current = true;
        setStatus("ready");
      } catch {
        reportProviderFailure();
      }
    };
    const handleError = (): void => reportProviderFailure();

    map.once("load", handleLoad);
    map.on("error", handleError);

    return () => {
      disposed = true;
      mapLoadedRef.current = false;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      sourceSyncGenerationRef.current += 1;
      if (mapGenerationRef.current === generation) {
        mapGenerationRef.current += 1;
      }
      map.off("load", handleLoad);
      map.off("error", handleError);
      if (markerListenerAttached) {
        map.off("click", MAP_LAYER_IDS.decisionMarker, handleMarkerClick);
      }
      if (mapRef.current === map) {
        mapRef.current = null;
      }
      map.remove();
    };
  }, [retryNonce, styleUrl]);

  useEffect(() => {
    if (status !== "ready" || !mapLoadedRef.current || !mapRef.current) {
      return;
    }
    const map = mapRef.current;
    const generation = mapGenerationRef.current;
    const sourceSyncGeneration = sourceSyncGenerationRef.current + 1;
    sourceSyncGenerationRef.current = sourceSyncGeneration;
    void syncMapSources(
      map,
      payload ?? EMPTY_MAP_PAYLOAD,
      () =>
        sourceSyncGenerationRef.current === sourceSyncGeneration &&
        mapRef.current === map &&
        mapGenerationRef.current === generation &&
        mapLoadedRef.current,
    ).catch(() => {
      if (
        sourceSyncGenerationRef.current === sourceSyncGeneration &&
        mapRef.current === map &&
        mapGenerationRef.current === generation
      ) {
        reportFailureRef.current(PROVIDER_FAILURE);
      }
    });
  }, [payload, status]);

  useEffect(() => {
    if (status !== "ready" || !mapLoadedRef.current || !mapRef.current) {
      return;
    }
    const map = mapRef.current;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "astara-user-marker";
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.position = "relative";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";

      const ping = document.createElement("div");
      ping.style.position = "absolute";
      ping.style.width = "100%";
      ping.style.height = "100%";
      ping.style.borderRadius = "9999px";
      ping.style.backgroundColor = "rgba(59, 130, 246, 0.4)";
      ping.style.animation = "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite";

      const dot = document.createElement("div");
      dot.style.position = "relative";
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "9999px";
      dot.style.backgroundColor = "#2563eb";
      dot.style.border = "2.5px solid #ffffff";
      dot.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.25)";

      el.appendChild(ping);
      el.appendChild(dot);

      userMarkerRef.current = new MapLibreMarker({ element: el })
        .setLngLat([userLocation[0], userLocation[1]])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation[0], userLocation[1]]);
    }

    if (!latestPayloadRef.current?.routeId) {
      map.flyTo({
        center: [userLocation[0], userLocation[1]],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [userLocation, status]);

  useEffect(() => {
    if (status !== "ready" || !mapLoadedRef.current || !mapRef.current) {
      return;
    }
    const map = mapRef.current;
    applyActiveStep(map, activeStepId);
    const previousRouteId = activeRouteIdRef.current;
    const currentRouteId = payload?.routeId;
    activeRouteIdRef.current = currentRouteId;
    const activeCoordinates = activeStepId
      ? getMapFocusCoordinates(payload ?? EMPTY_MAP_PAYLOAD, activeStepId)
      : undefined;
    if (activeCoordinates) {
      focusMap(map, activeCoordinates);
    } else if (
      currentRouteId &&
      currentRouteId !== previousRouteId &&
      payload
    ) {
      map.resize();
      focusPayload(map, payload);
    }
  }, [activeStepId, payload, status]);

  useEffect(() => {
    const wasExpanded = wasExpandedRef.current;
    wasExpandedRef.current = expanded;
    if (!collapsible) {
      setExpanded(true);
      return;
    }
    if (!expanded) {
      if (wasExpanded) {
        toggleRef.current?.focus();
      }
      return;
    }
    const map = mapRef.current;
    if (!map || status !== "ready") {
      return;
    }
    const frame = window.requestAnimationFrame(() => map.resize());
    return () => window.cancelAnimationFrame(frame);
  }, [collapsible, expanded, status]);

  return (
    <AstaraMapSurface
      activeStepId={activeStepId}
      collapsible={collapsible}
      containerRef={containerRef}
      expanded={expanded}
      hasPayload={payload !== undefined}
      mapRegionId={mapRegionId}
      onRetry={() => {
        lastFailureKeyRef.current = undefined;
        setStatus("loading");
        setRetryNonce((current) => current + 1);
      }}
      onStepSelect={(stepId) => {
        selectMapStep(
          stepId,
          latestPayloadRef.current,
          mapRef.current,
          mapLoadedRef.current,
          onStepSelectRef.current,
        );
      }}
      onToggle={() => setExpanded((current) => !current)}
      payload={payload}
      routeState={routeState}
      showRecoveryAction={showRecoveryAction}
      showLoadingStatus={showLoadingStatus ?? Boolean(route)}
      showStatusPanel={showStatusPanel}
      showLegend={showLegend}
      showDecisionMarkers={showDecisionMarkers}
      status={status}
      toggleRef={toggleRef}
      className={className}
    />
  );
};

function normalizeStyleUrl(styleUrl: string | undefined): string | undefined {
  const normalized = styleUrl?.trim();
  return normalized ?? undefined;
}

function getMapFeatureStepId(
  feature: MapGeoJSONFeature | undefined,
): string | undefined {
  const properties = feature?.properties as unknown;
  if (typeof properties !== "object" || properties === null) {
    return undefined;
  }
  const stepId = (properties as { stepId?: unknown }).stepId;
  return typeof stepId === "string" ? stepId : undefined;
}
