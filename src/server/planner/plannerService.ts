import type { FreshnessPolicy } from "~/core/ingestion/gtfsTypes";
import { createRouteMapDataForJourney } from "~/core/planner/plannerPresentation";
import type {
  PlannerCatalogOutcome,
  PlannerPlanOutcome,
  PlannerRouteRequest,
} from "~/core/planner/plannerTypes";
import { selectPrimaryRoute } from "~/core/routing/routeEngine";
import type {
  RouteEngineConfig,
  RouteSelectionRequest,
  RouteSelectionResult,
} from "~/core/routing/routingTypes";
import type { TransferCostPolicy } from "~/core/transfer/transferTypes";
import {
  createTripPlanningInput,
  DEFAULT_SERVICE_TIMEZONE,
} from "~/core/timing/tripTiming";

import type { GtfsSnapshotRepository } from "~/server/gtfs/gtfsSnapshotRepository";
import {
  readActivePlannerContext,
  type PlannerContextDependencies,
} from "./plannerServiceContext";
import {
  createStopCatalog,
  createStopLabels,
  createTransferEdges,
  DEFAULT_ROUTE_CONFIG,
  DEFAULT_TRANSFER_COST_POLICY,
  mapRouteFailure,
  routeFailure,
  staleFailure,
} from "./plannerServiceSupport";

export {
  createPlannerConfigurationHash,
  DEFAULT_TRANSFER_COST_POLICY,
  MAX_TRANSFER_EDGE_CANDIDATES,
} from "./plannerServiceSupport";

export type PlannerServiceDependencies = Readonly<{
  repository: Pick<
    GtfsSnapshotRepository,
    "getActiveSnapshot" | "getActiveStatusFacts"
  >;
  policy: FreshnessPolicy;
  now?: () => string;
  routeConfig?: RouteEngineConfig;
  transferCostPolicy?: TransferCostPolicy;
  selectRoute?: (request: RouteSelectionRequest) => RouteSelectionResult;
}>;

export type PlannerService = Readonly<{
  getCatalog: () => Promise<PlannerCatalogOutcome>;
  planRoute: (request: PlannerRouteRequest) => Promise<PlannerPlanOutcome>;
}>;

type ActiveContextResult = Awaited<ReturnType<typeof readActivePlannerContext>>;
type ActiveContextReader = () => Promise<ActiveContextResult>;

export function createPlannerService(
  dependencies: PlannerServiceDependencies,
): PlannerService {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const transferCostPolicy =
    dependencies.transferCostPolicy ?? DEFAULT_TRANSFER_COST_POLICY;
  const routeConfig = dependencies.routeConfig ?? DEFAULT_ROUTE_CONFIG;
  const selectRoute = dependencies.selectRoute ?? selectPrimaryRoute;
  const contextDependencies: PlannerContextDependencies = {
    repository: dependencies.repository,
    policy: dependencies.policy,
    now,
    routeConfig,
    transferCostPolicy,
  };
  const readActiveContext = () => readActivePlannerContext(contextDependencies);

  return {
    getCatalog: () => getCatalog(readActiveContext),
    planRoute: (request) => planRoute(readActiveContext, selectRoute, request),
  };
}

async function getCatalog(
  readActiveContext: ActiveContextReader,
): Promise<PlannerCatalogOutcome> {
  const active = await readActiveContext();
  if (active.state === "failure") return active.failure;
  return {
    state: "success",
    catalog: {
      snapshotId: active.context.snapshot.metadata.snapshotId,
      configurationHash: active.context.configurationHash,
      items: createStopCatalog(active.context.snapshot, active.context.status),
      status: active.context.status,
    },
  };
}

async function planRoute(
  readActiveContext: ActiveContextReader,
  selectRoute: (request: RouteSelectionRequest) => RouteSelectionResult,
  request: PlannerRouteRequest,
): Promise<PlannerPlanOutcome> {
  const active = await readActiveContext();
  if (active.state === "failure") return active.failure;
  const context = active.context;
  if (
    request.snapshotId !== context.snapshot.metadata.snapshotId ||
    request.configurationHash !== context.configurationHash
  ) {
    return staleFailure(
      "Data rute berubah. Muat ulang data sebelum mencoba lagi.",
      false,
    );
  }
  if (request.departAt.timezone !== DEFAULT_SERVICE_TIMEZONE) {
    return routeFailure(
      "error",
      "Waktu keberangkatan harus menggunakan waktu lokal Jakarta.",
      false,
    );
  }
  const planning = createTripPlanningInput({
    originId: request.originId,
    destinationId: request.destinationId,
    departAt: request.departAt,
  });
  const routeResult = selectRoute({
    snapshot: context.snapshot,
    planning,
    transferEdges: createTransferEdges(
      context.snapshot,
      context.transferCostPolicy,
    ),
    config: context.routeConfig,
  });
  if (routeResult.state !== "selected") return mapRouteFailure(routeResult);
  return {
    state: "success",
    snapshotId: context.snapshot.metadata.snapshotId,
    configurationHash: context.configurationHash,
    result: routeResult,
    stopLabels: createStopLabels(context.snapshot, routeResult.primary),
    mapData: createRouteMapDataForJourney(routeResult.primary),
    status: context.status,
  };
}
