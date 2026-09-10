"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { resolveCurrentLocation } from "~/core/search/currentLocationResolution";
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
import { TripTimingControls } from "~/ui/planner/TripTimingControls";
import { api } from "~/trpc/react";
import { createPlannerClient } from "./plannerClient";
import { PlannerMap } from "./PlannerMap";
import { PlannerRouteView } from "./PlannerRouteView";
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
  const [timingValidation, setTimingValidation] =
    useState<DepartAtValidation | null>(null);
  const [locationMessage, setLocationMessage] = useState<string>();
  const [mapRetryNonce, setMapRetryNonce] = useState(0);
  const [mapDismissed, setMapDismissed] = useState(false);
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
    const defaultTiming = createDefaultDepartAt({
      timezone: DEFAULT_SERVICE_TIMEZONE,
    });
    setTimingValidation(defaultTiming);
    controller.setDepartAt(
      defaultTiming.state === "valid" ? defaultTiming.input : null,
    );
  }, [controller]);

  useEffect(() => {
    if (snapshot.state !== "select" || !snapshot.catalog || timingValidation) {
      return;
    }
    const next = createDefaultDepartAt({ timezone: DEFAULT_SERVICE_TIMEZONE });
    setTimingValidation(next);
    controller.setDepartAt(next.state === "valid" ? next.input : null);
  }, [controller, snapshot.catalog, snapshot.state, timingValidation]);

  useEffect(() => {
    if (routeRef.current !== snapshot.route) {
      routeRef.current = snapshot.route;
      setMapDismissed(false);
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
    const resolution = resolveCurrentLocation(
      reading,
      snapshot.catalog?.items ?? [],
    );
    if (resolution.state !== "selected") {
      setLocationMessage(resolution.message);
      return;
    }
    selectLocation(context, resolution.location);
    setLocationMessage(
      resolution.distanceBasis === "straight_line_only"
        ? "Lokasi dipakai untuk endpoint ini. Perkiraan garis lurus; jalur jalan kaki belum diverifikasi."
        : "Lokasi dipakai untuk endpoint ini dengan jarak jalan kaki dari data pendukung.",
    );
  };

  const handleLocationError = (
    _context: SearchContext,
    _failure: LocationRequestFailure,
  ) => {
    setLocationMessage(
      "Lokasi tidak tersedia atau kurang presisi. Cari halte secara manual.",
    );
  };

  const handleTimingChange = (next: DepartAtValidation) => {
    setTimingValidation(next);
    controller.setDepartAt(next.state === "valid" ? next.input : null);
  };

  const handleReset = () => {
    controller.reset();
    setTimingValidation(null);
    setScreen("explore");
    setInitialQuery("");
    setLocationMessage(undefined);
    replaceHistoryMarker("explore");
  };

  const handleBack = () => {
    if (snapshot.state === "map-failure") {
      controller.back();
      return;
    }
    if (
      (snapshot.state === "result" || snapshot.state === "detail") &&
      (historyMarkerRef.current === "result" ||
        historyMarkerRef.current === "detail")
    ) {
      window.history.back();
      return;
    }
    controller.back();
  };

  const handleEdit = () => {
    controller.edit();
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

  const timingControls = timingValidation ? (
    <div className="grid gap-3">
      <PlannerStatus
        snapshot={snapshot}
        onPrimaryAction={handlePrimaryStatusAction}
        onReset={handleReset}
      />
      <TripTimingControls
        validation={timingValidation}
        onValidationChange={handleTimingChange}
        onUseNow={() => {
          const next = createDefaultDepartAt({
            timezone: DEFAULT_SERVICE_TIMEZONE,
          });
          setTimingValidation(next);
          controller.setDepartAt(next.state === "valid" ? next.input : null);
        }}
      />
    </div>
  ) : null;

  if (
    snapshot.route &&
    (snapshot.state === "result" ||
      snapshot.state === "detail" ||
      snapshot.state === "map-failure")
  ) {
    return (
      <PlannerRouteView
        mapStyleUrl={mapStyleUrl}
        mapRetryNonce={mapRetryNonce}
        mapDismissed={mapDismissed}
        snapshot={snapshot}
        onBack={handleBack}
        onEdit={handleEdit}
        onSwap={handleSwap}
        onReset={handleReset}
        onMapRetry={
          snapshot.mapRetryAvailable
            ? () => {
                setMapDismissed(false);
                setMapRetryNonce((value) => value + 1);
                controller.retryMap();
              }
            : undefined
        }
        onMapDismiss={() => {
          setMapDismissed(true);
          controller.dismissMapFailure();
        }}
        onMapFailure={(mapAttempt) =>
          controller.reportMapFailure(undefined, mapAttempt)
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
      />
    );
  }

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
      >
        <PlannerMap styleUrl={mapStyleUrl} showRecoveryAction={false} />
      </Module1Explore>
    </main>
  );
};

function otherContext(context: SearchContext): SearchContext {
  return context === "origin" ? "destination" : "origin";
}
