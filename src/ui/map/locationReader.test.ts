import { describe, expect, it, vi } from "vitest";

import {
  createLocationRequestController,
  type LocationRequestFailure,
} from "./locationReader";

type PositionSuccess = (position: GeolocationPosition) => void;
type PositionFailure = (error: GeolocationPositionError) => void;

function makePosition(
  longitude: number,
  latitude: number,
  accuracy = 25,
): GeolocationPosition {
  return {
    coords: {
      longitude,
      latitude,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: 1,
    toJSON: () => ({}),
  };
}

function makeError(code: 1 | 2 | 3): GeolocationPositionError {
  return {
    code,
    message: "test",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

function makeGeolocation() {
  const requests: Array<{
    success: PositionSuccess;
    failure?: PositionFailure;
  }> = [];
  const getCurrentPosition = vi.fn(
    (onSuccess: PositionSuccess, onFailure?: PositionFailure) => {
      requests.push({ success: onSuccess, failure: onFailure });
    },
  );
  const watchPosition = vi.fn(() => 1);

  return {
    geolocation: {
      getCurrentPosition,
      watchPosition,
      clearWatch: vi.fn(),
    } as unknown as Geolocation,
    getCurrentPosition,
    watchPosition,
    emitSuccess(
      position: GeolocationPosition,
      requestIndex = requests.length - 1,
    ) {
      requests[requestIndex]?.success(position);
    },
    emitFailure(
      error: GeolocationPositionError,
      requestIndex = requests.length - 1,
    ) {
      requests[requestIndex]?.failure?.(error);
    },
  };
}

describe("createLocationRequestController", () => {
  it("requests one precise reading, forwards context and accuracy, and ignores duplicate settlement", () => {
    const fake = makeGeolocation();
    const onSuccess = vi.fn();
    const onFailure =
      vi.fn<(context: string, failure: LocationRequestFailure) => void>();
    const controller = createLocationRequestController(fake.geolocation);

    controller.start("origin", onSuccess, onFailure);

    expect(fake.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fake.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 0,
      }),
    );

    fake.emitSuccess(makePosition(106.8, -6.2, 40));
    fake.emitSuccess(makePosition(106.9, -6.3, 20));
    fake.emitFailure(makeError(2));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith("origin", {
      coordinates: [106.8, -6.2],
      accuracyMeters: 40,
    });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("maps permission, unavailable, timeout, and malformed readings to recoverable failures", () => {
    const fake = makeGeolocation();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const controller = createLocationRequestController(fake.geolocation);

    controller.start("destination", onSuccess, onFailure);
    fake.emitFailure(makeError(1));
    expect(onFailure).toHaveBeenLastCalledWith("destination", "denied");

    controller.start("destination", onSuccess, onFailure);
    fake.emitFailure(makeError(2));
    expect(onFailure).toHaveBeenLastCalledWith("destination", "unavailable");

    controller.start("destination", onSuccess, onFailure);
    fake.emitFailure(makeError(3));
    expect(onFailure).toHaveBeenLastCalledWith("destination", "timeout");

    controller.start("destination", onSuccess, onFailure);
    fake.emitSuccess(makePosition(999, -6.2));
    expect(onFailure).toHaveBeenLastCalledWith("destination", "invalid");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("ignores callbacks after cancellation or a newer request", () => {
    const fake = makeGeolocation();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const controller = createLocationRequestController(fake.geolocation);

    controller.start("origin", onSuccess, onFailure);
    controller.cancel();
    fake.emitSuccess(makePosition(106.8, -6.2), 0);
    expect(onSuccess).not.toHaveBeenCalled();

    controller.start("origin", onSuccess, onFailure);
    controller.start("destination", onSuccess, onFailure);
    fake.emitSuccess(makePosition(106.8, -6.2), 1);
    fake.emitSuccess(makePosition(106.9, -6.3));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith("destination", expect.anything());
  });

  it("fails synchronously when browser geolocation is unavailable and never uses a watch", () => {
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const controller = createLocationRequestController(undefined);

    controller.start("origin", onSuccess, onFailure);

    expect(onFailure).toHaveBeenCalledWith("origin", "unavailable");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not request continuous location updates", () => {
    const fake = makeGeolocation();
    const controller = createLocationRequestController(fake.geolocation);

    controller.start("origin", vi.fn(), vi.fn());

    expect(fake.watchPosition).not.toHaveBeenCalled();
  });
});
