import type {
  FreshnessPolicy,
  GtfsSnapshot,
  GtfsConsumerStatus,
} from "~/core/ingestion/gtfsTypes";
import type {
  PlannerCatalog,
  PlannerPlanFailure,
} from "~/core/planner/plannerTypes";
import type {
  JourneyRoute,
  RouteEngineConfig,
  RouteSelectionResult,
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
  routeRulesVersion: "route-engine-v1",
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
  return snapshot.stops
    .filter((stop) => stop.locationType !== 2)
    .map((stop) => ({
      id: stop.id,
      title: stop.name,
      type: "stop_or_route" as const,
      coordinates: stop.coordinate,
      source: "gtfs_local" as const,
      verification,
      confidence: "high" as const,
      ...(stop.stopCode ? { aliases: [stop.stopCode] } : {}),
    }));
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
