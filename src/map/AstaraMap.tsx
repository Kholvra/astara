"use client";

import {
  Map as MapLibreMap,
  setWorkerUrl,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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
}: AstaraMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
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
