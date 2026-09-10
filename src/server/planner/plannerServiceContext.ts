import { getGtfsConsumerStatus } from "~/core/ingestion/gtfsLifecycle";
import type {
  FreshnessPolicy,
  GtfsConsumerStatus,
  GtfsSnapshot,
  GtfsStatusFacts,
} from "~/core/ingestion/gtfsTypes";
import type { PlannerCatalogOutcome } from "~/core/planner/plannerTypes";
import type { RouteEngineConfig } from "~/core/routing/routingTypes";
import type { TransferCostPolicy } from "~/core/transfer/transferTypes";
import type { GtfsSnapshotRepository } from "~/server/gtfs/gtfsSnapshotRepository";
import { resolveConfiguration } from "./plannerServiceSupport";

export type PlannerContextDependencies = Readonly<{
  repository: Pick<
    GtfsSnapshotRepository,
    "getActiveSnapshot" | "getActiveStatusFacts"
  >;
  policy: FreshnessPolicy;
  now: () => string;
  routeConfig: RouteEngineConfig;
  transferCostPolicy: TransferCostPolicy;
}>;

export type ActiveContext = Readonly<{
  snapshot: GtfsSnapshot;
  statusFacts: GtfsStatusFacts;
  status: GtfsConsumerStatus;
  configurationHash: string;
  routeConfig: RouteEngineConfig;
  transferCostPolicy: TransferCostPolicy;
}>;

export type PlannerCatalogFailure = Extract<
  PlannerCatalogOutcome,
  { state: "failure" }
>;

export async function readActivePlannerContext(
  dependencies: PlannerContextDependencies,
): Promise<
  | Readonly<{ state: "success"; context: ActiveContext }>
  | Readonly<{ state: "failure"; failure: PlannerCatalogFailure }>
> {
  const [snapshot, statusFacts] = await Promise.all([
    dependencies.repository.getActiveSnapshot(),
    dependencies.repository.getActiveStatusFacts(),
  ]);
  if (!snapshot || !statusFacts) return unavailableContext();
  if (snapshot.metadata.snapshotId !== statusFacts.metadata.snapshotId) {
    return inconsistentContext();
  }
  const status = getGtfsConsumerStatus(
    statusFacts,
    dependencies.now(),
    dependencies.policy,
  );
  if (!status.activeSnapshotId || status.networkAvailability !== "available") {
    return unavailableContext(status.operatorReason);
  }
  return {
    state: "success",
    context: createActiveContext(dependencies, snapshot, statusFacts, status),
  };
}

function createActiveContext(
  dependencies: PlannerContextDependencies,
  snapshot: GtfsSnapshot,
  statusFacts: GtfsStatusFacts,
  status: GtfsConsumerStatus,
): ActiveContext {
  const resolvedConfig = resolveConfiguration(
    dependencies.routeConfig,
    dependencies.transferCostPolicy,
    dependencies.policy,
  );
  return {
    snapshot,
    statusFacts,
    status,
    configurationHash: resolvedConfig.configurationHash,
    routeConfig: {
      ...resolvedConfig.routeConfig,
      freshness: status.freshness,
      ...(status.staticDemoNote
        ? { staticDemoNote: status.staticDemoNote }
        : {}),
    },
    transferCostPolicy: dependencies.transferCostPolicy,
  };
}

function unavailableContext(operatorReason?: string): Readonly<{
  state: "failure";
  failure: PlannerCatalogFailure;
}> {
  return {
    state: "failure",
    failure: {
      state: "failure",
      kind: "stale-data",
      message:
        operatorReason ??
        "Data transit belum siap. Coba lagi atau ubah pilihan.",
      retryable: true,
    },
  };
}

function inconsistentContext(): Readonly<{
  state: "failure";
  failure: PlannerCatalogFailure;
}> {
  return {
    state: "failure",
    failure: {
      state: "failure",
      kind: "error",
      message: "Data transit berubah saat dibaca. Coba lagi.",
      retryable: true,
    },
  };
}
