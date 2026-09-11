import type {
  FreshnessPolicy,
  GtfsSnapshot,
  GtfsConsumerStatus,
} from "~/core/ingestion/gtfsTypes";
import type {
  PlannerCatalog,
  PlannerPlanFailure,
} from "~/core/planner/plannerTypes";
import type { SearchResultItem } from "~/core/search/search.types";
import type {
  JourneyRoute,
  RouteEngineConfig,
  RouteSelectionResult,
} from "~/core/routing/routingTypes";
import {
  DEFAULT_MAX_LABEL_EXPANSIONS,
  DEFAULT_MAX_SEARCH_DURATION_MS,
  DEFAULT_ROUTE_RULES_VERSION,
} from "~/core/routing/routingTypes";
import { evaluateTransfer } from "~/core/transfer/transferGraph";
import type {
  TransferCostPolicy,
  TransferEdge,
} from "~/core/transfer/transferTypes";

export const DEFAULT_TRANSFER_COST_POLICY: TransferCostPolicy = {
  safetyBufferSeconds: 30,
  cognitiveDecisionCostSeconds: 45,
};

export const DEFAULT_ROUTE_CONFIG: RouteEngineConfig = {
  supportedRouteTypes: [3],
  maxTransfers: 3,
  maxSearchStates: 5_000,
  maxLabelExpansions: DEFAULT_MAX_LABEL_EXPANSIONS,
  maxSearchDurationMs: DEFAULT_MAX_SEARCH_DURATION_MS,
  routeRulesVersion: DEFAULT_ROUTE_RULES_VERSION,
};

export const MAX_TRANSFER_EDGE_CANDIDATES = 10_000;

export function createPlannerConfigurationHash(
  routeConfig: RouteEngineConfig = DEFAULT_ROUTE_CONFIG,
  transferCostPolicy: TransferCostPolicy = DEFAULT_TRANSFER_COST_POLICY,
  freshnessPolicy?: FreshnessPolicy,
): string {
  return `planner-config-v1:${stableSerialize({
    routeConfig: {
      supportedRouteTypes:
        routeConfig.supportedRouteTypes ??
        DEFAULT_ROUTE_CONFIG.supportedRouteTypes,
      maxTransfers:
        routeConfig.maxTransfers ?? DEFAULT_ROUTE_CONFIG.maxTransfers,
      maxSearchStates:
        routeConfig.maxSearchStates ?? DEFAULT_ROUTE_CONFIG.maxSearchStates,
      maxLabelExpansions:
        routeConfig.maxLabelExpansions ??
        DEFAULT_ROUTE_CONFIG.maxLabelExpansions,
      maxSearchDurationMs:
        routeConfig.maxSearchDurationMs ??
        DEFAULT_ROUTE_CONFIG.maxSearchDurationMs,
      routeRulesVersion:
        routeConfig.routeRulesVersion ?? DEFAULT_ROUTE_CONFIG.routeRulesVersion,
    },
    transferCostPolicy,
    freshnessPolicy: freshnessPolicy
      ? {
          agingAfterHours: freshnessPolicy.agingAfterHours,
          staleAfterHours: freshnessPolicy.staleAfterHours,
          allowStaleDemo: freshnessPolicy.allowStaleDemo,
          staleDemoNote: freshnessPolicy.staleDemoNote,
        }
      : undefined,
  })}`;
}

export function resolveConfiguration(
  routeConfig: RouteEngineConfig,
  transferCostPolicy: TransferCostPolicy,
  freshnessPolicy: FreshnessPolicy,
): Readonly<{ routeConfig: RouteEngineConfig; configurationHash: string }> {
  const configurationHash = createPlannerConfigurationHash(
    routeConfig,
    transferCostPolicy,
    freshnessPolicy,
  );
  return {
    configurationHash,
    routeConfig: {
      ...routeConfig,
      candidateConfigurationHash: configurationHash,
    },
  };
}

export function createStopCatalog(
  snapshot: GtfsSnapshot,
  status: GtfsConsumerStatus,
): PlannerCatalog["items"] {
  const verification =
    status.evidenceState === "Terverifikasi"
      ? "Terverifikasi"
      : status.evidenceState === "Perlu dicek"
        ? "Perlu dicek"
        : "Data terbatas";
  const routeNamesByStopId = createRouteNamesByStopId(snapshot);
  const parentStops = new Map(
    snapshot.stops
      .filter((stop) => stop.locationType === 1)
      .map((stop) => [stop.id, stop]),
  );
  const childrenByParent = new Map<string, GtfsSnapshot["stops"]>();
  for (const stop of snapshot.stops) {
    if (stop.locationType === 1 || stop.locationType === 2) continue;
    const parentId = stop.parentStationId?.trim();
    if (!parentId || !parentStops.has(parentId)) continue;
    const children = childrenByParent.get(parentId) ?? [];
    childrenByParent.set(parentId, [...children, stop]);
  }

  const items: SearchResultItem[] = [];
  for (const stop of snapshot.stops) {
    if (stop.locationType === 2) continue;
    if (stop.locationType === 1) {
      const children = childrenByParent.get(stop.id) ?? [];
      if (children.length === 0) continue;
      items.push(
        createCatalogItem(stop, children, routeNamesByStopId, verification),
      );
      continue;
    }
    const parentId = stop.parentStationId?.trim();
    if (parentId && parentStops.has(parentId)) continue;
    items.push(
      createCatalogItem(stop, [stop], routeNamesByStopId, verification),
    );
  }
  return items;
}

function createCatalogItem(
  representative: GtfsSnapshot["stops"][number],
  representedStops: readonly GtfsSnapshot["stops"][number][],
  routeNamesByStopId: ReadonlyMap<string, readonly string[]>,
  verification: SearchResultItem["verification"],
): SearchResultItem {
  const routes = sortRouteNames(
    representedStops.flatMap((stop) => routeNamesByStopId.get(stop.id) ?? []),
  );
  const subtitle = routes.join(" · ");
  const stationSubtitle =
    representative.locationType === 1 && representedStops.length > 0
      ? `${representedStops.length} halte · ${subtitle}`
      : subtitle;
  return {
    id: representative.id,
    title: representative.name,
    type: "stop_or_route",
    coordinates: representative.coordinate,
    source: "gtfs_local",
    verification,
    confidence: "high",
    ...(stationSubtitle ? { subtitle: stationSubtitle } : {}),
    ...(routes.length > 0 ? { routes } : {}),
    ...(representative.stopCode ? { aliases: [representative.stopCode] } : {}),
  };
}

function createRouteNamesByStopId(
  snapshot: GtfsSnapshot,
): ReadonlyMap<string, readonly string[]> {
  const routeNamesById = new Map(
    snapshot.routes.map((route) => [
      route.id,
      route.shortName.trim() || route.longName.trim(),
    ]),
  );
  const tripById = new Map(snapshot.trips.map((trip) => [trip.id, trip]));
  const routeNamesByStopId = new Map<string, Set<string>>();
  for (const stopTime of snapshot.stopTimes) {
    const trip = tripById.get(stopTime.tripId);
    const routeName = trip ? routeNamesById.get(trip.routeId) : undefined;
    if (!routeName) continue;
    const routeNames = routeNamesByStopId.get(stopTime.stopId) ?? new Set();
    routeNames.add(routeName);
    routeNamesByStopId.set(stopTime.stopId, routeNames);
  }
  return new Map(
    [...routeNamesByStopId.entries()].map(([stopId, routeNames]) => [
      stopId,
      sortRouteNames([...routeNames]),
    ]),
  );
}

function sortRouteNames(routeNames: readonly string[]): readonly string[] {
  return [...new Set(routeNames)].sort((left, right) =>
    left.localeCompare(right, "en", { numeric: true }),
  );
}

export function createStopLabels(
  snapshot: GtfsSnapshot,
  journey: JourneyRoute,
): Readonly<Record<string, string>> {
  const routeStopIds = new Set<string>([
    journey.originStopId,
    journey.destinationStopId,
    ...journey.boardingAlighting.stopIds,
  ]);
  for (const leg of journey.legs) {
    routeStopIds.add(leg.fromStopId);
    routeStopIds.add(leg.toStopId);
    if (leg.kind === "transit") {
      for (const stopId of leg.stopIds) routeStopIds.add(stopId);
    }
  }
  return Object.fromEntries(
    snapshot.stops
      .filter((stop) => routeStopIds.has(stop.id))
      .map((stop) => [stop.id, stop.name]),
  );
}

export function createTransferEdges(
  snapshot: GtfsSnapshot,
  costPolicy: TransferCostPolicy,
): readonly TransferEdge[] {
  const pairs = new Map<string, Readonly<{ from: string; to: string }>>();
  const addPair = (from: string, to: string): void => {
    if (from === to || pairs.size >= MAX_TRANSFER_EDGE_CANDIDATES) return;
    pairs.set(`${from}→${to}`, { from, to });
  };
  for (const transfer of snapshot.transfers) {
    addPair(transfer.fromStopId, transfer.toStopId);
  }
  const byParent = new Map<string, string[]>();
  for (const stop of snapshot.stops) {
    if (!stop.parentStationId) continue;
    const current = byParent.get(stop.parentStationId) ?? [];
    current.push(stop.id);
    byParent.set(stop.parentStationId, current);
  }
  for (const [parentId, stopIds] of byParent.entries()) {
    const bounded = [...new Set(stopIds)].slice(0, 40);
    for (const from of bounded) {
      addPair(parentId, from);
      addPair(from, parentId);
      for (const to of bounded) addPair(from, to);
    }
  }
  const edges: TransferEdge[] = [];
  for (const pair of pairs.values()) {
    const result = evaluateTransfer({
      snapshot,
      from: { stopId: pair.from },
      to: { stopId: pair.to },
      costPolicy,
    });
    if (result.kind === "edge" && result.edge.eligibleForRouting) {
      edges.push(result.edge);
    }
  }
  return edges;
}

export function mapRouteFailure(
  failure: Exclude<RouteSelectionResult, { state: "selected" }>,
): PlannerPlanFailure {
  if (failure.code === "SEARCH_EXHAUSTED") {
    return {
      state: "failure",
      kind: "error",
      message:
        "Pencarian rute terlalu kompleks untuk diselesaikan sekarang. Coba halte atau waktu lain.",
      retryable: true,
      routeFailure: failure,
    };
  }
  if (failure.state === "no-route") {
    return {
      state: "failure",
      kind: "no-route",
      message: "Tidak ada rute yang cocok. Coba halte atau waktu lain.",
      retryable: false,
      routeFailure: failure,
    };
  }
  if (failure.state === "limited-data" || failure.state === "unavailable") {
    return {
      state: "failure",
      kind: "stale-data",
      message: "Data transit belum cukup untuk memastikan rute. Coba lagi.",
      retryable: true,
      routeFailure: failure,
    };
  }
  return {
    state: "failure",
    kind: "error",
    message: "Rute belum dapat dihitung. Periksa pilihan lalu coba lagi.",
    retryable: true,
    routeFailure: failure,
  };
}

export function routeFailure(
  kind: PlannerPlanFailure["kind"],
  message: string,
  retryable: boolean,
): PlannerPlanFailure {
  return { state: "failure", kind, message, retryable };
}

export function staleFailure(
  message: string,
  retryable: boolean,
): PlannerPlanFailure {
  return routeFailure("stale-data", message, retryable);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
