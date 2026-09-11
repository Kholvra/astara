import type { TransferEdge } from "~/core/transfer/transferTypes";

import { getTransferDurationSeconds } from "./routeEngineSupport";
import type { TripRideOption } from "./routeEngineRides";
import type { SearchContext } from "./routeEngineInternalTypes";

export type RaptorLabel = Readonly<{
  key: string;
  stopId: string;
  readyAtSeconds: number;
  requiredRouteId?: string;
  rides: readonly TripRideOption[];
  accessEdges: readonly TransferEdge[];
  transferEdges: readonly TransferEdge[];
  usedTripIds: ReadonlySet<string>;
  usedEdgeIds: ReadonlySet<string>;
  transferCount: number;
  decisionPointCount: number;
}>;

type RaptorLabelFields = Omit<RaptorLabel, "key">;

export function createInitialLabels(
  context: SearchContext,
): readonly RaptorLabel[] {
  const labels: RaptorLabel[] = [
    createRaptorLabel({
      stopId: context.request.planning.originId,
      readyAtSeconds: context.requestedSeconds,
      rides: [],
      accessEdges: [],
      transferEdges: [],
      usedTripIds: new Set(),
      usedEdgeIds: new Set(),
      transferCount: 0,
      decisionPointCount: 0,
    }),
  ];
  const accessEdges =
    context.transferEdgesByFromStop.get(context.request.planning.originId) ??
    [];
  for (const edge of accessEdges) {
    labels.push(
      createRaptorLabel({
        stopId: edge.to.stopId,
        readyAtSeconds:
          context.requestedSeconds + getTransferDurationSeconds(edge),
        ...(edge.to.transitServiceId
          ? { requiredRouteId: edge.to.transitServiceId }
          : {}),
        rides: [],
        accessEdges: [edge],
        transferEdges: [],
        usedTripIds: new Set(),
        usedEdgeIds: new Set([edge.edgeId]),
        transferCount: 0,
        decisionPointCount: 1,
      }),
    );
  }
  return labels.sort(compareRaptorLabels);
}

export function createRideLabel(
  label: RaptorLabel,
  ride: TripRideOption,
): RaptorLabel {
  return createRaptorLabel({
    stopId: ride.toStopTime.stopId,
    readyAtSeconds: ride.scheduled.actualArrivalSeconds,
    rides: [...label.rides, ride],
    accessEdges: label.accessEdges,
    transferEdges: label.transferEdges,
    usedTripIds: new Set([...label.usedTripIds, ride.trip.id]),
    usedEdgeIds: label.usedEdgeIds,
    transferCount: label.transferCount,
    decisionPointCount: label.decisionPointCount + 1,
  });
}

export function createTransferLabel(
  label: RaptorLabel,
  edge: TransferEdge,
): RaptorLabel {
  const requiredRouteId = edge.to.transitServiceId;
  return createRaptorLabel({
    stopId: edge.to.stopId,
    readyAtSeconds: label.readyAtSeconds + getTransferDurationSeconds(edge),
    ...(requiredRouteId ? { requiredRouteId } : {}),
    rides: label.rides,
    accessEdges: label.accessEdges,
    transferEdges: [...label.transferEdges, edge],
    usedTripIds: label.usedTripIds,
    usedEdgeIds: new Set([...label.usedEdgeIds, edge.edgeId]),
    transferCount: label.transferCount + 1,
    decisionPointCount: label.decisionPointCount + 1,
  });
}

export function groupLabels(
  labels: readonly RaptorLabel[],
): Map<string, RaptorLabel[]> {
  const grouped = new Map<string, RaptorLabel[]>();
  for (const label of labels) {
    addRaptorLabel(grouped, label);
  }
  return grouped;
}

export function addRaptorLabel(
  grouped: Map<string, RaptorLabel[]>,
  label: RaptorLabel,
): void {
  const current = grouped.get(label.stopId) ?? [];
  const labelKey = label.key;
  if (current.some((candidate) => candidate.key === labelKey)) {
    return;
  }
  if (current.some((candidate) => dominates(candidate, label))) {
    return;
  }
  const sameBoardingState = current.filter(
    (candidate) =>
      candidate.requiredRouteId === label.requiredRouteId &&
      candidate.transferCount === label.transferCount,
  );
  const bestSameBoardingState = sameBoardingState
    .slice()
    .sort(compareRaptorLabels)[0];
  if (bestSameBoardingState && canDiscardLabel(bestSameBoardingState, label)) {
    return;
  }
  const survivors = current.filter(
    (candidate) => !canDiscardLabel(label, candidate),
  );
  grouped.set(label.stopId, [...survivors, label].sort(compareRaptorLabels));
}

export function addDestinationLabel(
  destinationLabels: RaptorLabel[],
  label: RaptorLabel,
): void {
  if (destinationLabels.some((candidate) => dominates(candidate, label))) {
    return;
  }
  const labelKey = label.key;
  if (destinationLabels.some((candidate) => candidate.key === labelKey)) {
    return;
  }
  const survivors = destinationLabels.filter(
    (candidate) => !dominates(label, candidate),
  );
  destinationLabels.splice(0, destinationLabels.length, ...survivors, label);
}

export function compareRaptorLabels(
  left: RaptorLabel,
  right: RaptorLabel,
): number {
  return (
    left.readyAtSeconds - right.readyAtSeconds ||
    left.transferCount - right.transferCount ||
    left.decisionPointCount - right.decisionPointCount ||
    compareOptionalNumbers(
      getWalkingDistance(left),
      getWalkingDistance(right),
    ) ||
    compareOrdinal(left.key, right.key)
  );
}

function dominates(left: RaptorLabel, right: RaptorLabel): boolean {
  if (
    left.stopId !== right.stopId ||
    left.requiredRouteId !== right.requiredRouteId ||
    left.readyAtSeconds > right.readyAtSeconds ||
    left.transferCount > right.transferCount ||
    left.decisionPointCount > right.decisionPointCount ||
    compareOptionalNumbers(
      getWalkingDistance(left),
      getWalkingDistance(right),
    ) > 0 ||
    getWalkingDurationKnown(left) > getWalkingDurationKnown(right) ||
    getEvidenceRank(left) > getEvidenceRank(right)
  ) {
    return false;
  }
  if (
    !isSubset(left.usedTripIds, right.usedTripIds) ||
    !isSubset(left.usedEdgeIds, right.usedEdgeIds)
  ) {
    return false;
  }

  return (
    left.readyAtSeconds < right.readyAtSeconds ||
    left.transferCount < right.transferCount ||
    left.decisionPointCount < right.decisionPointCount ||
    compareOptionalNumbers(
      getWalkingDistance(left),
      getWalkingDistance(right),
    ) < 0 ||
    getWalkingDurationKnown(left) < getWalkingDurationKnown(right) ||
    getEvidenceRank(left) < getEvidenceRank(right)
  );
}

function canDiscardLabel(left: RaptorLabel, right: RaptorLabel): boolean {
  return (
    left.stopId === right.stopId &&
    left.requiredRouteId === right.requiredRouteId &&
    left.transferCount === right.transferCount &&
    compareRaptorLabels(left, right) <= 0 &&
    isSubset(left.usedTripIds, right.usedTripIds) &&
    isSubset(left.usedEdgeIds, right.usedEdgeIds)
  );
}

function isSubset(
  subset: ReadonlySet<string>,
  superset: ReadonlySet<string>,
): boolean {
  return [...subset].every((value) => superset.has(value));
}

function getWalkingDistance(label: RaptorLabel): number | undefined {
  const edges = [...label.accessEdges, ...label.transferEdges];
  if (edges.some((edge) => edge.walkingPath?.distanceMeters === undefined)) {
    return undefined;
  }
  return edges.reduce(
    (total, edge) => total + (edge.walkingPath?.distanceMeters ?? 0),
    0,
  );
}

function getWalkingDurationKnown(label: RaptorLabel): number {
  const edges = [...label.accessEdges, ...label.transferEdges];
  return edges.every((edge) => edge.walkingPath?.durationSeconds !== undefined)
    ? 0
    : 1;
}

function getEvidenceRank(label: RaptorLabel): number {
  const edges = [...label.accessEdges, ...label.transferEdges];
  if (
    edges.some(
      (edge) =>
        edge.evidenceState === "Unknown" ||
        edge.evidenceState === "Perlu dicek",
    )
  ) {
    return 2;
  }
  return edges.some((edge) => edge.evidenceState !== "Terverifikasi") ? 1 : 0;
}

function createRaptorLabel(label: RaptorLabelFields): RaptorLabel {
  return { ...label, key: createRaptorLabelKey(label) };
}

function createRaptorLabelKey(label: RaptorLabelFields): string {
  return [
    label.stopId,
    String(label.readyAtSeconds),
    label.requiredRouteId ?? "",
    label.accessEdges.map((edge) => edge.edgeId).join(","),
    label.rides
      .map(
        (ride) =>
          `${ride.route.id}:${ride.trip.id}:${ride.serviceDate}:${ride.fromStopTime.stopId}-${ride.toStopTime.stopId}:${ride.scheduled.actualDepartureSeconds}-${ride.scheduled.actualArrivalSeconds}`,
      )
      .join(","),
    label.transferEdges.map((edge) => edge.edgeId).join(","),
  ].join("|");
}

function compareOptionalNumbers(
  left: number | undefined,
  right: number | undefined,
): number {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return 1;
  }
  if (right === undefined) {
    return -1;
  }
  return left - right;
}

function compareOrdinal(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (leftCode !== rightCode) {
      return leftCode - rightCode;
    }
  }
  return left.length - right.length;
}
