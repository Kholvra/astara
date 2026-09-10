import type { GtfsConsumerStatus } from "~/core/ingestion/gtfsTypes";
import type { RouteMapData } from "~/core/geojson/routeGeometry";
import type {
  RouteSelectionFailure,
  RouteSelectionSuccess,
} from "~/core/routing/routingTypes";
import type { DepartAtInput } from "~/core/timing/tripTiming";
import type {
  RoutableLocation,
  SearchResultItem,
} from "~/core/search/search.types";

export const PLANNER_STATES = [
  "idle",
  "select",
  "ready",
  "loading",
  "result",
  "detail",
  "no-route",
  "error",
  "stale-data",
  "map-failure",
] as const;

export type PlannerState = (typeof PLANNER_STATES)[number];

export type PlannerCatalog = Readonly<{
  snapshotId: string;
  configurationHash: string;
  items: readonly SearchResultItem[];
  status: GtfsConsumerStatus;
}>;

export type PlannerPlanInput = Readonly<{
  origin: RoutableLocation;
  destination: RoutableLocation;
  departAt: DepartAtInput;
  catalog: PlannerCatalog;
}>;

export type PlannerPlanSuccess = Readonly<{
  state: "success";
  snapshotId: string;
  configurationHash: string;
  result: RouteSelectionSuccess;
  stopLabels: Readonly<Record<string, string>>;
  mapData: RouteMapData;
  status: GtfsConsumerStatus;
}>;

export type PlannerPlanFailure = Readonly<{
  state: "failure";
  kind: "no-route" | "error" | "stale-data";
  message: string;
  retryable: boolean;
  routeFailure?: RouteSelectionFailure;
}>;

export type PlannerPlanOutcome = PlannerPlanSuccess | PlannerPlanFailure;

export type PlannerCatalogFailure = Readonly<{
  state: "failure";
  kind: "error" | "stale-data";
  message: string;
  retryable: boolean;
}>;

export type PlannerCatalogOutcome =
  | Readonly<{ state: "success"; catalog: PlannerCatalog }>
  | PlannerCatalogFailure;

export type PlannerRouteRequest = Readonly<{
  originId: string;
  destinationId: string;
  departAt: DepartAtInput;
  snapshotId: string;
  configurationHash: string;
}>;

export type PlannerOperation = Readonly<{
  kind: "catalog" | "route";
  revision: number;
  attempt: number;
}>;

export type PlannerStateSnapshot = Readonly<{
  state: PlannerState;
  origin: RoutableLocation | null;
  destination: RoutableLocation | null;
  departAt: DepartAtInput | null;
  catalog: PlannerCatalog | null;
  route: PlannerPlanSuccess | null;
  message?: string;
  operation: PlannerOperation | null;
  retryAvailable: boolean;
  mapRetryAvailable: boolean;
  detailOpen: boolean;
  mapReturnState: "result" | "detail" | null;
}>;

export type PlannerControllerDependencies = Readonly<{
  loadCatalog: () => Promise<PlannerCatalog>;
  planRoute: (input: PlannerPlanInput) => Promise<PlannerPlanOutcome>;
  timeoutMs?: number;
}>;

export type PlannerController = Readonly<{
  getState: () => PlannerStateSnapshot;
  subscribe: (listener: (state: PlannerStateSnapshot) => void) => () => void;
  open: () => void;
  setEndpoint: (
    context: "origin" | "destination",
    location: RoutableLocation | null,
  ) => void;
  setDepartAt: (input: DepartAtInput | null) => void;
  plan: () => void;
  retry: () => void;
  edit: () => void;
  swap: () => void;
  openDetail: () => void;
  closeDetail: () => void;
  back: () => void;
  reset: () => void;
  reportMapFailure: (message?: string, mapAttempt?: number) => void;
  retryMap: () => void;
  dismissMapFailure: () => void;
  dispose: () => void;
}>;
