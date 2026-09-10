import { isGeoCoordinate } from "~/core/geojson/geometry";

import { MOCK_SEARCH_ITEMS } from "./mockSearchData";
import type {
  PlatformChoice,
  SearchResolutionOutcome,
  SearchResultItem,
} from "./search.types";
import {
  isNonEmptyString,
  isPlatformChoice,
  isSearchResultItem,
} from "./searchValidation";

export {
  calculateDistanceMeters,
  MAX_CURRENT_LOCATION_ACCURACY_METERS,
  MAX_CURRENT_LOCATION_DISTANCE_METERS,
  resolveCurrentLocation,
} from "./currentLocationResolution";
export type { CurrentLocationResolutionOptions } from "./currentLocationResolution";

type NotRoutableReason =
  | "invalid_identity"
  | "invalid_coordinates"
  | "invalid_platform"
  | "place_conversion_unavailable";

export type SearchResolutionOptions = {
  catalog?: readonly SearchResultItem[];
  platformId?: string;
  conversionStopId?: string;
  confirmLowConfidence?: boolean;
};

export function resolveSearchResult(
  value: unknown,
  options: SearchResolutionOptions = {},
): SearchResolutionOutcome {
  if (!isSearchResultItem(value)) {
    return notRoutable(undefined, "invalid_identity");
  }

  if (value.type === "place_or_address") {
    return resolvePlace(value, options);
  }

  if (value.type !== "stop_or_route") {
    return notRoutable(value, "invalid_identity");
  }

  return resolveStop(value, options);
}

function resolvePlace(
  item: SearchResultItem,
  options: SearchResolutionOptions,
): SearchResolutionOutcome {
  const conversion = item.placeConversion;
  if (
    !conversion ||
    !isNonEmptyString(conversion.stopId) ||
    !Number.isFinite(conversion.distanceMeters) ||
    conversion.distanceMeters < 0 ||
    (conversion.walkingEvidence !== "supported" &&
      conversion.walkingEvidence !== "unverified")
  ) {
    return notRoutable(item, "place_conversion_unavailable");
  }

  const catalog = options.catalog ?? MOCK_SEARCH_ITEMS;
  const suggestedStop = catalog.find(
    (candidate) => candidate.id === conversion.stopId,
  );
  if (
    !suggestedStop ||
    !isSearchResultItem(suggestedStop) ||
    suggestedStop.type !== "stop_or_route"
  ) {
    return notRoutable(item, "place_conversion_unavailable");
  }

  if (options.conversionStopId !== conversion.stopId) {
    return {
      state: "place_conversion_required",
      item,
      suggestedStop,
      distanceMeters: conversion.distanceMeters,
      walkingEvidence: conversion.walkingEvidence,
    };
  }

  const resolved = resolveStop(suggestedStop, {
    ...options,
    conversionStopId: undefined,
  });
  if (resolved.state !== "selected") {
    return resolved;
  }

  return {
    state: "selected",
    location: {
      ...resolved.location,
      convertedFromId: item.id,
    },
  };
}

function resolveStop(
  item: SearchResultItem,
  options: SearchResolutionOptions,
): SearchResolutionOutcome {
  const platforms = item.platforms ?? [];
  const needsPlatform =
    item.requiresPlatformChoice === true || platforms.length > 1;

  if (needsPlatform) {
    if (!options.platformId) {
      return { state: "platform_confirmation", item };
    }

    const platform = platforms.find(
      (candidate) => candidate.id === options.platformId,
    );
    if (!platform || !isPlatformChoice(platform)) {
      return notRoutable(item, "invalid_platform");
    }

    if (item.confidence === "low" && !options.confirmLowConfidence) {
      return { state: "low_confidence_confirmation", item };
    }

    return selectedLocation(item, platform);
  }

  if (item.confidence === "low" && !options.confirmLowConfidence) {
    return { state: "low_confidence_confirmation", item };
  }

  return selectedLocation(item);
}

function selectedLocation(
  item: SearchResultItem,
  platform?: PlatformChoice,
): SearchResolutionOutcome {
  const coordinates = platform?.coordinates ?? item.coordinates;
  if (!isGeoCoordinate(coordinates)) {
    return notRoutable(item, "invalid_coordinates");
  }

  return {
    state: "selected",
    location: {
      id: platform?.id ?? item.id,
      name: platform ? `${item.title} — ${platform.label}` : item.title,
      type: item.type,
      coordinates,
      source: item.source,
      confidence: item.confidence,
      verification: item.verification,
      ...(platform?.code ? { platformCode: platform.code } : {}),
    },
  };
}

function notRoutable(
  item: SearchResultItem | undefined,
  reason: NotRoutableReason,
): SearchResolutionOutcome {
  const messageByReason = {
    invalid_identity:
      "Lokasi ini belum bisa dipakai untuk rute. Pilih halte yang disarankan atau ubah pencarian.",
    invalid_coordinates:
      "Lokasi ini belum bisa dipakai untuk rute karena titiknya tidak valid.",
    invalid_platform:
      "Arah peron tidak ditemukan. Pilih arah peron yang tersedia.",
    place_conversion_unavailable:
      "Tempat ini belum memiliki halte lokal yang bisa dipakai. Pilih halte atau ubah pencarian.",
  } as const;

  return {
    state: "not_routable",
    ...(item ? { item } : {}),
    reason,
    message: messageByReason[reason],
  };
}
