import type { GtfsSnapshot } from "~/core/ingestion/gtfsTypes";
import type { TransferEdge } from "~/core/transfer/transferTypes";

import type { ResolvedRouteEngineConfig } from "./routeEngineSupport";
import type { TripRideOption } from "./routeEngineRides";
import type {
  JourneyRoute,
  RouteCandidate,
  RouteEngineIndex,
  RouteLeg,
  RouteLineage,
  RouteSelectionRequest,
} from "./routingTypes";

export type SearchState = Readonly<{
  stopId: string;
  readyAtSeconds: number;
  requiredRouteId?: string;
  legs: readonly RouteLeg[];
  rides: readonly TripRideOption[];
  usedTripIds: ReadonlySet<string>;
  usedEdgeIds: ReadonlySet<string>;
  transferCount: number;
  decisionPointCount: number;
}>;

export type SearchContext = Readonly<{
  request: RouteSelectionRequest;
  snapshot: GtfsSnapshot;
  index: RouteEngineIndex;
  config: ResolvedRouteEngineConfig;
  lineage: RouteLineage;
  requestedSeconds: number;
  nowMs: () => number;
  activeServiceIdsByDate: ReadonlyMap<string, ReadonlySet<string>>;
  transferEdgesByFromStop: ReadonlyMap<string, readonly TransferEdge[]>;
  routeTransferDistanceToDestination: ReadonlyMap<string, number>;
  destinationAccessStopIds: ReadonlySet<string>;
}>;

export type JourneyCandidateFactory = (
  context: SearchContext,
  state: SearchState,
) => RouteCandidate;

export type JourneyRouteFactory = (
  context: SearchContext,
  state: SearchState,
) => JourneyRoute;
