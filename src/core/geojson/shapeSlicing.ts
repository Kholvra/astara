import { isGeoCoordinate, type GeoCoordinate } from "./geometry";

const METERS_PER_DEGREE = 111_320;
const EXACT_VERTEX_DISTANCE_METERS = 1;
const DEFAULT_MAX_STOP_TO_SHAPE_DISTANCE_METERS = 250;
const DEFAULT_AMBIGUITY_THRESHOLD_METERS = 5;
const POSITION_EPSILON = 1e-7;

export type ShapeSlicePoint = Readonly<{
  coordinate: GeoCoordinate;
  sequence: number;
}>;

export type ShapeSliceInput = Readonly<{
  points: readonly ShapeSlicePoint[];
  fromStop: GeoCoordinate;
  toStop: GeoCoordinate;
}>;

export type ShapeSliceOptions = Readonly<{
  maxStopToShapeDistanceMeters?: number;
  ambiguityThresholdMeters?: number;
}>;

export type ShapeSliceResult = Readonly<{
  state: "supported" | "limited" | "unavailable";
  coordinates: readonly GeoCoordinate[];
  limitation?: string;
}>;

type ShapeProjection = Readonly<{
  coordinate: GeoCoordinate;
  distanceMeters: number;
  position: number;
  exactVertex: boolean;
}>;

export function sliceShapeBetweenStops(
  input: ShapeSliceInput,
  options: ShapeSliceOptions = {},
): ShapeSliceResult {
  const points = [...input.points].sort(
    (left, right) => left.sequence - right.sequence,
  );
  if (!isUsableShape(points) || !isGeoCoordinate(input.fromStop)) {
    return unavailable("Transit geometry is unavailable for this leg.");
  }
  if (!isGeoCoordinate(input.toStop)) {
    return unavailable("Transit geometry is unavailable for this leg.");
  }

  const maxDistance =
    options.maxStopToShapeDistanceMeters ??
    DEFAULT_MAX_STOP_TO_SHAPE_DISTANCE_METERS;
  const ambiguityThreshold =
    options.ambiguityThresholdMeters ?? DEFAULT_AMBIGUITY_THRESHOLD_METERS;

  let fromProjection = projectStop(
    input.fromStop,
    points,
    maxDistance,
    ambiguityThreshold,
  );
  const toProjection = projectStop(
    input.toStop,
    points,
    maxDistance,
    ambiguityThreshold,
    fromProjection ? fromProjection.position - POSITION_EPSILON : undefined,
  );

  if (!fromProjection && toProjection) {
    fromProjection = projectStop(
      input.fromStop,
      points,
      maxDistance,
      ambiguityThreshold,
      undefined,
      toProjection.position + POSITION_EPSILON,
    );
  }
  if (!fromProjection || !toProjection) {
    return unavailable("Transit geometry could not be associated with stops.");
  }
  if (fromProjection.position > toProjection.position + POSITION_EPSILON) {
    return unavailable("Transit geometry direction is ambiguous for this leg.");
  }

  const coordinates: GeoCoordinate[] = [];
  appendCoordinate(coordinates, fromProjection.coordinate);
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point) {
      continue;
    }
    if (
      index > fromProjection.position + POSITION_EPSILON &&
      index < toProjection.position - POSITION_EPSILON
    ) {
      appendCoordinate(coordinates, point.coordinate);
    }
  }
  appendCoordinate(coordinates, toProjection.coordinate);

  if (coordinates.length < 2) {
    return unavailable("Transit geometry does not contain a usable leg span.");
  }

  const isSupported =
    fromProjection.exactVertex &&
    toProjection.exactVertex &&
    fromProjection.distanceMeters <= EXACT_VERTEX_DISTANCE_METERS &&
    toProjection.distanceMeters <= EXACT_VERTEX_DISTANCE_METERS;
  return isSupported
    ? { state: "supported", coordinates }
    : {
        state: "limited",
        coordinates,
        limitation:
          "Stop locations were projected onto existing shape geometry.",
      };
}

function isUsableShape(points: readonly ShapeSlicePoint[]): boolean {
  if (points.length < 2) {
    return false;
  }

  const sequences = new Set<number>();
  return points.every((point) => {
    if (
      !Number.isFinite(point.sequence) ||
      sequences.has(point.sequence) ||
      !isGeoCoordinate(point.coordinate)
    ) {
      return false;
    }
    sequences.add(point.sequence);
    return true;
  });
}

function projectStop(
  stop: GeoCoordinate,
  points: readonly ShapeSlicePoint[],
  maxDistanceMeters: number,
  ambiguityThresholdMeters: number,
  minPosition?: number,
  maxPosition?: number,
): ShapeProjection | undefined {
  let candidates: ShapeProjection[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point) {
      continue;
    }
    candidates.push({
      coordinate: point.coordinate,
      distanceMeters: distanceMeters(stop, point.coordinate),
      position: index,
      exactVertex: true,
    });

    const nextPoint = points[index + 1];
    if (!nextPoint) {
      continue;
    }
    const projection = projectOntoSegment(
      stop,
      point.coordinate,
      nextPoint.coordinate,
    );
    if (
      projection.positionAlongSegment <= POSITION_EPSILON ||
      projection.positionAlongSegment >= 1 - POSITION_EPSILON
    ) {
      continue;
    }
    candidates.push({
      coordinate:
        projection.distanceMeters <= 0.001 ? stop : projection.coordinate,
      distanceMeters: projection.distanceMeters,
      position: index + projection.positionAlongSegment,
      exactVertex: false,
    });
  }

  if (minPosition !== undefined) {
    candidates = candidates.filter(
      (candidate) => candidate.position >= minPosition - POSITION_EPSILON,
    );
  }
  if (maxPosition !== undefined) {
    candidates = candidates.filter(
      (candidate) => candidate.position <= maxPosition + POSITION_EPSILON,
    );
  }

  candidates.sort(
    (left, right) =>
      left.distanceMeters - right.distanceMeters ||
      left.position - right.position,
  );
  const best = candidates[0];
  if (!best || best.distanceMeters > maxDistanceMeters) {
    return undefined;
  }

  const competingCandidate = candidates.find((candidate) => {
    const dShape = distanceAlongShape(
      points,
      best.position,
      candidate.position,
    );
    return (
      dShape > Math.max(50, ambiguityThresholdMeters * 2) &&
      candidate.distanceMeters - best.distanceMeters <= ambiguityThresholdMeters
    );
  });
  if (competingCandidate) {
    return undefined;
  }
  return best;
}

function distanceAlongShape(
  points: readonly ShapeSlicePoint[],
  fromPos: number,
  toPos: number,
): number {
  const minPos = Math.min(fromPos, toPos);
  const maxPos = Math.max(fromPos, toPos);
  if (maxPos - minPos <= POSITION_EPSILON) {
    return 0;
  }
  let totalDistance = 0;
  const startIdx = Math.floor(minPos);
  const endIdx = Math.min(points.length - 1, Math.ceil(maxPos));
  for (let i = startIdx; i < endIdx; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (!p1 || !p2) continue;
    const segDist = distanceMeters(p1.coordinate, p2.coordinate);
    const segStart = Math.max(0, minPos - i);
    const segEnd = Math.min(1, maxPos - i);
    if (segEnd > segStart) {
      totalDistance += segDist * (segEnd - segStart);
    }
  }
  return totalDistance;
}

function projectOntoSegment(
  point: GeoCoordinate,
  start: GeoCoordinate,
  end: GeoCoordinate,
): Readonly<{
  coordinate: GeoCoordinate;
  distanceMeters: number;
  positionAlongSegment: number;
}> {
  const referenceLatitude = (point[1] + start[1] + end[1]) / 3;
  const longitudeScale = Math.cos((referenceLatitude * Math.PI) / 180);
  const startX = start[0] * longitudeScale;
  const startY = start[1];
  const deltaX = end[0] * longitudeScale - startX;
  const deltaY = end[1] - startY;
  const pointX = point[0] * longitudeScale;
  const pointY = point[1];
  const denominator = deltaX * deltaX + deltaY * deltaY;
  const rawPosition =
    denominator === 0
      ? 0
      : ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / denominator;
  const positionAlongSegment = Math.min(1, Math.max(0, rawPosition));
  const coordinate: GeoCoordinate = [
    start[0] + (end[0] - start[0]) * positionAlongSegment,
    start[1] + (end[1] - start[1]) * positionAlongSegment,
  ];
  return {
    coordinate,
    distanceMeters:
      Math.sqrt(
        (pointX - coordinate[0] * longitudeScale) ** 2 +
          (pointY - coordinate[1]) ** 2,
      ) * METERS_PER_DEGREE,
    positionAlongSegment,
  };
}

function distanceMeters(first: GeoCoordinate, second: GeoCoordinate): number {
  const longitudeScale = Math.cos(
    (((first[1] + second[1]) / 2) * Math.PI) / 180,
  );
  return (
    Math.sqrt(
      ((first[0] - second[0]) * longitudeScale) ** 2 +
        (first[1] - second[1]) ** 2,
    ) * METERS_PER_DEGREE
  );
}

function appendCoordinate(
  coordinates: GeoCoordinate[],
  coordinate: GeoCoordinate,
): void {
  const last = coordinates[coordinates.length - 1];
  if (last?.[0] === coordinate[0] && last?.[1] === coordinate[1]) {
    return;
  }
  coordinates.push(coordinate);
}

function unavailable(limitation: string): ShapeSliceResult {
  return { state: "unavailable", coordinates: [], limitation };
}
