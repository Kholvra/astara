import type {
  PlannerCatalogOutcome,
  PlannerControllerDependencies,
  PlannerPlanInput,
  PlannerPlanOutcome,
  PlannerRouteRequest,
} from "~/core/planner/plannerTypes";

export type PlannerTransport = Readonly<{
  planner: Readonly<{
    catalog: Readonly<{ fetch: () => Promise<PlannerCatalogOutcome> }>;
    route: Readonly<{
      fetch: (input: PlannerRouteRequest) => Promise<PlannerPlanOutcome>;
    }>;
  }>;
}>;

export class PlannerTransportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PlannerTransportError";
  }
}

export function createPlannerClient(
  transport: PlannerTransport,
): PlannerControllerDependencies {
  return {
    loadCatalog: async () => {
      const outcome = await transport.planner.catalog.fetch();
      if (outcome.state !== "success") {
        throw new PlannerTransportError(outcome.message);
      }
      return outcome.catalog;
    },
    planRoute: async (input: PlannerPlanInput) =>
      transport.planner.route.fetch({
        originId: input.origin.id,
        destinationId: input.destination.id,
        departAt: input.departAt,
        snapshotId: input.catalog.snapshotId,
        configurationHash: input.catalog.configurationHash,
      }),
  };
}
