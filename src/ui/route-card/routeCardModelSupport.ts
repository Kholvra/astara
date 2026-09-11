import {
  describeTimingFact,
  type DepartAtInput,
  type FareStatus,
  type TimingDisplay,
} from "~/core/timing/tripTiming";

import type {
  JourneyRoute,
  JourneyTiming,
  RouteRankingCriterion,
  TransitRouteLeg,
  WalkingRouteLeg,
} from "~/core/routing/routingTypes";

import type {
  RouteCardMapState,
  RouteCardReason,
  RouteCardStatus,
  RouteCardStep,
  RouteCardTiming,
} from "./routeCardModel";

type StopLabel = Readonly<{
  value: string;
  missing: boolean;
}>;

export function createStep(
  leg: JourneyRoute["legs"][number],
  stopLabels: Readonly<Record<string, string>>,
  journey: JourneyRoute,
): RouteCardStep {
  if (leg.kind === "transit") {
    return createTransitStep(leg, stopLabels, journey);
  }
  return createWalkingStep(leg, stopLabels);
}

function createTransitStep(
  leg: TransitRouteLeg,
  stopLabels: Readonly<Record<string, string>>,
  journey: JourneyRoute,
): RouteCardStep {
  const from = getStopLabel(leg.fromStopId, stopLabels).value;
  const to = getStopLabel(leg.toStopId, stopLabels).value;
  const headsign = normalizeText(leg.headsign);
  const status = createTransitStatus(journey);

  return {
    id: leg.legId,
    kind: "transit",
    title: `Naik rute ${normalizeText(leg.routeShortName) ?? "belum tersedia"}`,
    detail: [
      `Dari ${from}`,
      headsign ? `Arah ${headsign}` : "Arah belum tersedia",
      `Turun di ${to}`,
    ].join(" • "),
    status: status.label,
    statusDetail: status.detail,
  };
}

function createWalkingStep(
  leg: WalkingRouteLeg,
  stopLabels: Readonly<Record<string, string>>,
): RouteCardStep {
  const from = getStopLabel(leg.fromStopId, stopLabels).value;
  const to = getStopLabel(leg.toStopId, stopLabels).value;
  const status = mapEvidenceState(leg.evidenceState);
  const details = ["Jalan kaki"];
  const distance = formatDistance(leg.distanceMeters);
  const duration = formatMinutes(leg.durationSeconds);
  if (distance) details.push(distance);
  if (duration) details.push(`Perkiraan ${duration}`);
  if (leg.coordinates.length === 0) {
    details.push(
      from === to ? "Area peron halte" : "Detail jalur belum tersedia",
    );
  }

  const title =
    from === to
      ? `Akses peron di ${from}`
      : `Pindah dari ${from} ke ${to}`;

  return {
    id: leg.legId,
    kind: "walking",
    title,
    detail: details.join(" • "),
    status: status.label,
    statusDetail:
      status.label === "Perlu dicek"
        ? "Detail perpindahan perlu dicek."
        : status.label === "Data terbatas"
          ? "Detail jalan kaki belum lengkap."
          : "Jalur memiliki bukti pendukung.",
  };
}

export function createTimingSummary(timing: JourneyTiming): RouteCardTiming {
  switch (timing.semantics) {
    case "exact":
      return toTimingSummary(
        describeTimingFact({
          semantics: "exact",
          departure: timing.departure,
        }),
      );
    case "interval":
      return toTimingSummary(
        describeTimingFact({
          semantics: "interval",
          start: timing.start,
          end: timing.end,
          headwaySeconds: timing.headwaySeconds,
        }),
      );
    case "estimate":
      return toTimingSummary(
        describeTimingFact({
          semantics: "estimate",
          durationSeconds: timing.expectedDurationSeconds ?? Number.NaN,
        }),
      );
    case "unavailable":
      return toTimingSummary(
        describeTimingFact({
          semantics: "unavailable",
          status: "Data terbatas",
        }),
      );
  }
}

function toTimingSummary(display: TimingDisplay): RouteCardTiming {
  return {
    label: display.label,
    ...(display.detail ? { detail: display.detail } : {}),
    isExact: display.isExact,
  };
}

export function createDurationLabel(timing: JourneyTiming): string {
  if (timing.semantics === "unavailable") {
    return "Data terbatas";
  }

  const duration = formatMinutes(timing.expectedDurationSeconds);
  if (!duration) {
    return "Data terbatas";
  }

  return timing.semantics === "exact" ? duration : `Perkiraan ${duration}`;
}

export function createServiceDirections(
  journey: JourneyRoute,
): readonly string[] {
  const values = (journey.serviceDirections ?? []).map((direction) => {
    const route = `Rute ${normalizeText(direction.routeShortName) ?? "belum tersedia"}`;
    const headsign = normalizeText(direction.headsign);
    return `${route} • ${headsign ? `Arah ${headsign}` : "Arah belum tersedia"}`;
  });

  if (values.length > 0) {
    return [...new Set(values)];
  }

  const fallback = journey.legs.find(
    (leg): leg is TransitRouteLeg => leg.kind === "transit",
  );
  return fallback
    ? [
        `Rute ${normalizeText(fallback.routeShortName) ?? "belum tersedia"} • ${
          normalizeText(fallback.headsign)
            ? `Arah ${normalizeText(fallback.headsign)}`
            : "Arah belum tersedia"
        }`,
      ]
    : ["Rute belum tersedia • Arah belum tersedia"];
}

export function createWalkingSummary(journey: JourneyRoute): string {
  if (journey.walking.legs.length === 0) {
    return "Jalan kaki: Data terbatas";
  }
  const distance = formatDistance(journey.walking.totalDistanceMeters);
  return distance ? `Jalan kaki: ${distance}` : "Jalan kaki: Data terbatas";
}

export function createFareLabel(fare: FareStatus | undefined): string {
  if (!fare || fare.state === "limited") {
    return fare?.label ?? "Data terbatas";
  }

  return `${fare.label}: ${fare.displayAmount}`;
}

export function createReason(
  criterion: RouteRankingCriterion,
  journey: JourneyRoute,
): RouteCardReason {
  const headline = {
    "transfer-count": "Jumlah pindah menjadi pembeda utama.",
    "decision-points": "Jumlah titik keputusan menjadi pembeda utama.",
    "walking-distance": "Jalan kaki yang didukung menjadi pembeda utama.",
    "expected-duration": "Perkiraan durasi menjadi pembeda utama.",
    "evidence-rank": "Kelengkapan data menjadi pembeda utama.",
    "route-id": "Fakta utama setara; hasil dibuat stabil.",
    "only-eligible": "Rute yang tersedia untuk pasangan halte ini.",
  }[criterion];

  return {
    headline,
    facts: [
      `${journey.transferCount} kali pindah`,
      `${journey.decisionPointCount} titik keputusan`,
      ...(journey.walking.totalDistanceMeters === undefined
        ? []
        : [
            `Jalan kaki didukung: ${formatDistance(journey.walking.totalDistanceMeters)}`,
          ]),
      `Status data: ${createJourneyStatus(journey, false).label}`,
    ],
  };
}

export function createJourneyStatus(
  journey: JourneyRoute,
  hasMissingLabels: boolean,
): RouteCardStatus {
  const hasReviewState =
    journey.accessEvidence === "Perlu dicek" ||
    journey.legs.some(
      (leg) => leg.kind === "walking" && leg.evidenceState === "Perlu dicek",
    );
  if (hasReviewState) {
    return {
      label: "Perlu dicek",
      detail: "Detail akses atau perpindahan perlu dicek.",
    };
  }

  if (
    !hasMissingLabels &&
    journey.status === "routed" &&
    journey.evidenceRank === "complete" &&
    journey.lineage.coverage === "complete" &&
    journey.lineage.freshness === "current" &&
    journey.geometry.state === "supported" &&
    journey.accessEvidence === "Terverifikasi" &&
    journey.legs.every(
      (leg) =>
        leg.kind !== "walking" ||
        (leg.connectionState === "routable" &&
          leg.evidenceState === "Terverifikasi"),
    )
  ) {
    return {
      label: "Terverifikasi",
      detail: "Fakta rute dan akses memiliki bukti pendukung.",
    };
  }

  return {
    label: "Data terbatas",
    detail:
      journey.lineage.staticDemoNote ??
      "Sebagian detail akses, data, atau jalur belum lengkap.",
  };
}

function createTransitStatus(journey: JourneyRoute): RouteCardStatus {
  const isVerified =
    journey.lineage.coverage === "complete" &&
    journey.lineage.freshness === "current" &&
    journey.geometry.state === "supported" &&
    journey.timing.semantics !== "unavailable";
  return isVerified
    ? {
        label: "Terverifikasi",
        detail: "Fakta layanan memiliki data pendukung.",
      }
    : {
        label: "Data terbatas",
        detail:
          journey.lineage.staticDemoNote ??
          "Sebagian detail layanan belum lengkap.",
      };
}

function mapEvidenceState(
  evidenceState: JourneyRoute["walking"]["label"],
): RouteCardStatus {
  switch (evidenceState) {
    case "Terverifikasi":
      return {
        label: "Terverifikasi",
        detail: "Jalur memiliki bukti pendukung.",
      };
    case "Perlu dicek":
      return {
        label: "Perlu dicek",
        detail: "Detail perpindahan perlu dicek.",
      };
    case "limited":
    case "Unknown":
      return {
        label: "Data terbatas",
        detail: "Detail jalan kaki belum lengkap.",
      };
  }
}

export function createMapNotice(
  mapState: RouteCardMapState | undefined,
): string | undefined {
  return mapState === "error" || mapState === "unconfigured"
    ? "Peta tidak tersedia. Langkah perjalanan tetap dapat diikuti."
    : undefined;
}

export function getStopLabel(
  stopId: string,
  stopLabels: Readonly<Record<string, string>>,
): StopLabel {
  const value = normalizeText(stopLabels[stopId]);
  return value
    ? { value, missing: false }
    : { value: "Halte belum tersedia", missing: true };
}

export function formatDepartAt(departAt: DepartAtInput): string {
  return `${departAt.localDate} • ${departAt.localTime} (${departAt.timezone})`;
}

function formatDistance(meters: number | undefined): string | undefined {
  if (meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return undefined;
  }
  if (meters < 1_000) {
    return `${Math.round(meters)} m`;
  }
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(meters / 1_000)} km`;
}

function formatMinutes(seconds: number | undefined): string | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }
  return `${Math.ceil(seconds / 60)} mnt`;
}

function normalizeText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}

export function isNonEmptyText(value: string | undefined): boolean {
  return normalizeText(value) !== undefined;
}
