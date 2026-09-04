export type GeoCoordinate = readonly [longitude: number, latitude: number];

export function isGeoCoordinate(value: unknown): value is GeoCoordinate {
  if (!isCoordinatePair(value)) {
    return false;
  }

  const [longitude, latitude] = value;

  return (
    typeof longitude === "number" &&
    typeof latitude === "number" &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function isCoordinatePair(
  value: unknown,
): value is readonly [unknown, unknown] {
  return Array.isArray(value) && value.length === 2;
}
