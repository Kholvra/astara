import type { PlannerCatalog, PlannerStateSnapshot } from "./plannerTypes";

export function isActiveRouteState(
  state: PlannerStateSnapshot["state"],
): boolean {
  return (
    state === "result" ||
    state === "detail" ||
    state === "map-failure" ||
    state === "loading"
  );
}

export function getReadyState(
  origin: PlannerStateSnapshot["origin"],
  destination: PlannerStateSnapshot["destination"],
  departAt: PlannerStateSnapshot["departAt"],
  catalog: PlannerCatalog | null,
): "select" | "ready" {
  return origin && destination && departAt && catalog ? "ready" : "select";
}
