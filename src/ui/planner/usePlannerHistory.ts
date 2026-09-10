"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  PlannerController,
  PlannerStateSnapshot,
} from "~/core/planner/plannerTypes";

type PlannerScreen = "explore" | "search";
type PlannerHistoryMarker = "base" | "search" | "explore" | "result" | "detail";

export type PlannerHistory = Readonly<{
  markerRef: { current: PlannerHistoryMarker };
  pushMarker: (marker: PlannerHistoryMarker) => void;
  replaceMarker: (marker: PlannerHistoryMarker) => void;
}>;

export function usePlannerHistory(input: {
  controller: PlannerController;
  screen: PlannerScreen;
  setScreen: Dispatch<SetStateAction<PlannerScreen>>;
  snapshot: PlannerStateSnapshot;
}): PlannerHistory {
  const { controller, screen, setScreen, snapshot } = input;
  const markerRef = useRef<PlannerHistoryMarker>("base");
  const previousPlannerStateRef = useRef(snapshot.state);

  const pushMarker = useCallback((marker: PlannerHistoryMarker) => {
    markerRef.current = marker;
    window.history.pushState(
      addHistoryMarker(window.history.state, marker),
      "",
      window.location.href,
    );
  }, []);

  const replaceMarker = useCallback((marker: PlannerHistoryMarker) => {
    markerRef.current = marker;
    window.history.replaceState(
      addHistoryMarker(window.history.state, marker),
      "",
      window.location.href,
    );
  }, []);

  useEffect(() => {
    const marker = readHistoryMarker(window.history.state);
    if (!marker) {
      replaceMarker("base");
      return;
    }
    markerRef.current = marker;
  }, [replaceMarker]);

  useEffect(() => {
    const previousState = previousPlannerStateRef.current;
    if (
      snapshot.state === "result" &&
      snapshot.route &&
      previousState === "loading"
    ) {
      pushMarker("result");
    } else if (snapshot.state === "detail" && previousState === "result") {
      pushMarker("detail");
    }
    previousPlannerStateRef.current = snapshot.state;
  }, [pushMarker, snapshot.route, snapshot.state]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      markerRef.current = readHistoryMarker(event.state) ?? "base";
      if (screen === "search") {
        setScreen("explore");
        controller.back();
        return;
      }
      if (snapshot.state === "detail" || snapshot.state === "result") {
        controller.back();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [controller, screen, setScreen, snapshot.state]);

  return { markerRef, pushMarker, replaceMarker };
}

function readHistoryMarker(value: unknown): PlannerHistoryMarker | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const marker = (value as { astaraPlanner?: unknown }).astaraPlanner;
  return marker === "base" ||
    marker === "search" ||
    marker === "explore" ||
    marker === "result" ||
    marker === "detail"
    ? marker
    : undefined;
}

function addHistoryMarker(
  value: unknown,
  marker: PlannerHistoryMarker,
): Record<string, unknown> {
  const base =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return { ...base, astaraPlanner: marker };
}
