"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { resolveCurrentLocation } from "~/core/search/currentLocationResolution";
import type { GeoCoordinate } from "~/core/geojson/geometry";
import type {
  CurrentLocationReading,
  RoutableLocation,
  SearchContext,
} from "~/core/search/search.types";
import {
  createDefaultDepartAt,
  DEFAULT_SERVICE_TIMEZONE,
  type DepartAtValidation,
} from "~/core/timing/tripTiming";
import type { LocationRequestFailure } from "~/ui/map/locationReader";
import { Module1Explore } from "~/ui/explore/Module1Explore";
import { Module2Search } from "~/ui/explore/Module2Search";
import { api } from "~/trpc/react";
import { createPlannerClient } from "./plannerClient";
import { PlannerMap } from "./PlannerMap";
import { PlannerStatus } from "./PlannerStatus";
import { usePlanner } from "./usePlanner";
import { usePlannerHistory } from "./usePlannerHistory";

export type PlannerProps = Readonly<{
  mapStyleUrl?: string;
}>;

type PlannerScreen = "explore" | "search";

export const Planner = ({ mapStyleUrl }: PlannerProps) => {
  const transport = api.useUtils();
  const dependencies = useMemo(
    () => createPlannerClient(transport),
    [transport],
  );
  const { controller, snapshot } = usePlanner(dependencies);
  const [screen, setScreen] = useState<PlannerScreen>("explore");
  const [activeContext, setActiveContext] = useState<SearchContext>("origin");
  const [initialQuery, setInitialQuery] = useState("");
  const [userLocation, setUserLocation] = useState<GeoCoordinate | null>(null);
  const currentDepartAtRef = useRef<DepartAtValidation | null>(null);
  const [locationMessage, setLocationMessage] = useState<string>();
  const [mapRetryNonce, setMapRetryNonce] = useState(0);
  const focusContextRef = useRef<SearchContext | null>(null);
  const routeRef = useRef<unknown>(null);
  const {
    markerRef: historyMarkerRef,
    pushMarker: pushHistoryMarker,
    replaceMarker: replaceHistoryMarker,
  } = usePlannerHistory({ controller, screen, setScreen, snapshot });

  const locationRequestKey = [
    activeContext,
    snapshot.state,
    snapshot.catalog?.snapshotId ?? "",
    snapshot.origin?.id ?? "",
    snapshot.destination?.id ?? "",
    snapshot.departAt?.localDate ?? "",
    snapshot.departAt?.localTime ?? "",
  ].join("|");

  useEffect(() => {
    const syncCurrentTiming = () => {
      const current = createDefaultDepartAt({
        timezone: DEFAULT_SERVICE_TIMEZONE,
      });
      const prev = currentDepartAtRef.current;
      if (
        prev?.draft.localTime === current.draft.localTime &&
        prev?.draft.localDate === current.draft.localDate
      ) {
        return;
      }
      currentDepartAtRef.current = current;
      controller.setDepartAt(current.state === "valid" ? current.input : null);
    };

    syncCurrentTiming();
    const interval = setInterval(syncCurrentTiming, 10_000);
    return () => clearInterval(interval);
  }, [controller]);

  useEffect(() => {
    if (routeRef.current !== snapshot.route) {
      routeRef.current = snapshot.route;
      setMapRetryNonce(0);
    }
  }, [snapshot.route]);

  useEffect(() => {
    if (
      screen === "search" &&
      snapshot.catalog === null &&
      (snapshot.state === "error" || snapshot.state === "stale-data")
    ) {
      setScreen("explore");
      replaceHistoryMarker("explore");
    }
  }, [replaceHistoryMarker, screen, snapshot.catalog, snapshot.state]);

  useEffect(() => {
    if (snapshot.state === "ready") {
      controller.plan();
    }
  }, [controller, snapshot.state]);

  useEffect(() => {
    if (screen === "explore" && focusContextRef.current) {
      const context = focusContextRef.current;
      focusContextRef.current = null;
      window.setTimeout(() => {
        document.getElementById(`planner-${context}-field`)?.focus();
      }, 0);
    }
    if (snapshot.state === "result" || snapshot.state === "detail") {
      window.setTimeout(() => {
        document.getElementById("route-card-heading")?.focus();
      }, 0);
    }
  }, [screen, snapshot.state]);

  const openSearch = (context: SearchContext, query = "") => {
    focusContextRef.current = context;
    setActiveContext(context);
    setInitialQuery(query);
    setLocationMessage(undefined);
    setScreen("search");
    pushHistoryMarker("search");
  };

  const selectLocation = (
    context: SearchContext,
    location: RoutableLocation,
  ) => {
    controller.setEndpoint(context, location);
    focusContextRef.current = otherContext(context);
    setActiveContext(otherContext(context));
    setInitialQuery("");
    setLocationMessage(undefined);
    setScreen("explore");
    replaceHistoryMarker("explore");
  };

  const handleLocationResolved = (
    context: SearchContext,
    reading: CurrentLocationReading,
  ) => {
    setUserLocation(reading.coordinates);
    const resolution = resolveCurrentLocation(
      reading,
      snapshot.catalog?.items ?? [],
    );
    if (resolution.state !== "selected") {
      setLocationMessage(resolution.message);
      return;
    }
    selectLocation(context, resolution.location);
    setLocationMessage(undefined);
  };

  const handleLocationError = (
    _context: SearchContext,
    failure: LocationRequestFailure,
  ) => {
    if (failure === "denied") {
      setLocationMessage(
        "Izin lokasi belum aktif. Aktifkan izin lokasi browser atau pilih halte langsung.",
      );
      return;
    }
    if (failure === "timeout") {
      setLocationMessage(
        "Waktu pencarian lokasi habis. Coba lagi atau pilih halte langsung.",
      );
      return;
    }
    setLocationMessage(
      "Sinyal GPS belum kedeteksi nih. Coba lagi atau pilih halte langsung.",
    );
  };

  const handleReset = () => {
    controller.reset();
    const defaultTiming = createDefaultDepartAt({
      timezone: DEFAULT_SERVICE_TIMEZONE,
    });
    currentDepartAtRef.current = defaultTiming;
    controller.setDepartAt(
      defaultTiming.state === "valid" ? defaultTiming.input : null,
    );
    setScreen("explore");
    setInitialQuery("");
    setLocationMessage(undefined);
    replaceHistoryMarker("explore");
  };

  const handleSwap = () => {
    controller.swap();
    replaceHistoryMarker("explore");
  };

  const handleSearchBack = () => {
    if (historyMarkerRef.current === "search") {
      window.history.back();
      return;
    }
    setScreen("explore");
    controller.back();
  };

  const handlePrimaryStatusAction = () => {
    if (snapshot.state === "idle") {
      controller.open();
      openSearch("origin");
      return;
    }
    if (snapshot.state === "ready") {
      controller.plan();
      return;
    }
    if (snapshot.state === "loading") {
      controller.edit();
      replaceHistoryMarker("explore");
      return;
    }
    if (snapshot.state === "error" || snapshot.state === "stale-data") {
      if (snapshot.retryAvailable) controller.retry();
      else controller.edit();
      return;
    }
    if (snapshot.state === "no-route") controller.edit();
  };

  const timingControls = (
    <div className="grid gap-3">
      <PlannerStatus
        snapshot={snapshot}
        onPrimaryAction={handlePrimaryStatusAction}
      />
    </div>
  );

  if (screen === "search") {
    return (
      <main data-planner-state={snapshot.state} className="h-full w-full">
        <Module2Search
          context={activeContext}
          initialQuery={initialQuery}
          localIndexAvailable={snapshot.catalog !== null}
          searchItems={snapshot.catalog?.items ?? []}
          onBack={handleSearchBack}
          onSelectLocation={selectLocation}
        />
      </main>
    );
  }

  return (
    <main data-planner-state={snapshot.state} className="h-full w-full">
      <Module1Explore
        activeContext={activeContext}
        destination={snapshot.destination}
        locationRequestKey={locationRequestKey}
        locationMessage={locationMessage}
        onDismissLocationMessage={() => setLocationMessage(undefined)}
        onLocateUser={handleLocationResolved}
        onLocationError={handleLocationError}
        onOpenSearch={openSearch}
        onSelectDestination={(query) => openSearch("destination", query)}
        onPlan={snapshot.state === "ready" ? controller.plan : undefined}
        onReset={handleReset}
        onSwap={handleSwap}
        origin={snapshot.origin}
        planEnabled={snapshot.state === "ready"}
        timingControls={timingControls}
        route={snapshot.route}
        departAt={snapshot.departAt}
        stepsOpen={
          snapshot.state === "detail" ||
          (snapshot.state === "map-failure" &&
            snapshot.mapReturnState === "detail" &&
            snapshot.detailOpen)
        }
        onStepsToggle={(open) => {
          if (open) {
            controller.openDetail();
            if (
              snapshot.state === "map-failure" &&
              snapshot.mapReturnState === "result"
            ) {
              pushHistoryMarker("detail");
            }
          } else {
            controller.closeDetail();
            if (
              snapshot.state === "detail" ||
              (snapshot.state === "map-failure" &&
                snapshot.mapReturnState === "detail")
            ) {
              replaceHistoryMarker("result");
            }
          }
        }}
        mapNotice={
          snapshot.state === "map-failure"
            ? "Peta tidak dapat dimuat. Langkah perjalanan tetap dapat diikuti."
            : undefined
        }
        onMapRetry={
          snapshot.mapRetryAvailable
            ? () => {
                setMapRetryNonce((value) => value + 1);
                controller.retryMap();
              }
            : undefined
        }
      >
        <PlannerMap
          key={mapRetryNonce > 0 ? `map-retry-${mapRetryNonce}` : undefined}
          styleUrl={mapStyleUrl}
          showRecoveryAction={false}
          showLoadingStatus={false}
          userLocation={userLocation}
          route={snapshot.route?.mapData}
          onMapFailure={() => {
            controller.reportMapFailure(undefined, mapRetryNonce);
          }}
        />
      </Module1Explore>
    </main>
  );
};

function otherContext(context: SearchContext): SearchContext {
  return context === "origin" ? "destination" : "origin";
}
