import { isGeoCoordinate } from "~/core/geojson/geometry";
import type {
  CurrentLocationReading,
  SearchContext,
} from "~/core/search/search.types";

export type LocationRequestFailure =
  "denied" | "unavailable" | "timeout" | "invalid" | "error";

export type LocationRequestSuccess = (
  context: SearchContext,
  reading: CurrentLocationReading,
) => void;

export type LocationRequestError = (
  context: SearchContext,
  failure: LocationRequestFailure,
) => void;

export type LocationRequestController = {
  start: (
    context: SearchContext,
    onSuccess: LocationRequestSuccess,
    onError: LocationRequestError,
  ) => void;
  cancel: () => void;
};

export function createLocationRequestController(
  geolocation: Geolocation | undefined,
): LocationRequestController {
  let nextToken = 0;
  let activeToken: number | null = null;
  let settledToken: number | null = null;

  const cancel = () => {
    nextToken += 1;
    activeToken = null;
    settledToken = null;
  };

  const start = (
    context: SearchContext,
    onSuccess: LocationRequestSuccess,
    onError: LocationRequestError,
  ) => {
    const token = ++nextToken;
    activeToken = token;
    settledToken = null;

    if (!geolocation) {
      activeToken = null;
      settledToken = token;
      onError(context, "unavailable");
      return;
    }

    geolocation.getCurrentPosition(
      (position) => {
        if (!isActiveToken(token)) return;

        settle(token);
        const reading = parseGeolocationPosition(position);
        if (!reading) {
          onError(context, "invalid");
          return;
        }

        onSuccess(context, reading);
      },
      (error) => {
        if (!isActiveToken(token)) return;

        settle(token);
        onError(context, mapGeolocationError(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 0,
      },
    );
  };

  const isActiveToken = (token: number) =>
    activeToken === token && settledToken !== token;

  const settle = (token: number) => {
    settledToken = token;
    activeToken = null;
  };

  return { start, cancel };
}

export function parseGeolocationPosition(
  position: GeolocationPosition,
): CurrentLocationReading | undefined {
  const coordinates = [
    position.coords.longitude,
    position.coords.latitude,
  ] as const;
  const accuracyMeters = position.coords.accuracy;

  if (
    !isGeoCoordinate(coordinates) ||
    !Number.isFinite(accuracyMeters) ||
    accuracyMeters < 0
  ) {
    return undefined;
  }

  return { coordinates, accuracyMeters };
}

function mapGeolocationError(
  error: GeolocationPositionError,
): LocationRequestFailure {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "denied";
    case error.POSITION_UNAVAILABLE:
      return "unavailable";
    case error.TIMEOUT:
      return "timeout";
    default:
      return "error";
  }
}
