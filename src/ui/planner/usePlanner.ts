"use client";

import { useEffect, useRef, useState } from "react";

import { createPlannerController } from "~/core/planner/plannerState";
import type {
  PlannerControllerDependencies,
  PlannerController,
  PlannerStateSnapshot,
} from "~/core/planner/plannerTypes";

export type UsePlannerResult = Readonly<{
  controller: PlannerController;
  snapshot: PlannerStateSnapshot;
}>;

export function usePlanner(
  dependencies: PlannerControllerDependencies,
): UsePlannerResult {
  const controllerRef = useRef<PlannerController | null>(null);
  controllerRef.current ??= createPlannerController(dependencies);
  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState<PlannerStateSnapshot>(() =>
    controller.getState(),
  );
  const mountedCountRef = useRef(0);

  useEffect(() => {
    mountedCountRef.current += 1;
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.open();
    return () => {
      mountedCountRef.current -= 1;
      unsubscribe();
      queueMicrotask(() => {
        if (mountedCountRef.current === 0) controller.dispose();
      });
    };
  }, [controller]);

  return { controller, snapshot };
}
