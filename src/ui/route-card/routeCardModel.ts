import type {
  JourneyRoute,
  RouteSelectionFailure,
  RouteSelectionResult,
} from "~/core/routing/routingTypes";
import type { DepartAtInput, FareStatus } from "~/core/timing/tripTiming";

import {
  createDurationLabel,
  createFareLabel,
  createJourneyStatus,
  createMapNotice,
  createReason,
  createServiceDirections,
  createStep,
  createTimingSummary,
  createWalkingSummary,
  formatDepartAt,
  getStopLabel,
  isNonEmptyText,
} from "./routeCardModelSupport";

export const ROUTE_CARD_STATUS_LABELS = [
  "Terverifikasi",
  "Data terbatas",
  "Perlu dicek",
] as const;

export type RouteCardStatusLabel = (typeof ROUTE_CARD_STATUS_LABELS)[number];

export type RouteCardMapState = "available" | "error" | "unconfigured";

export type RouteCardInput = Readonly<{
  result: RouteSelectionResult;
  stopLabels: Readonly<Record<string, string>>;
  departAt: DepartAtInput;
  fare?: FareStatus;
  mapState?: RouteCardMapState;
}>;

export type RouteCardStep = Readonly<{
  id: string;
  kind: "transit" | "walking";
  title: string;
  detail: string;
  status: RouteCardStatusLabel;
  statusDetail: string;
}>;

export type RouteCardTiming = Readonly<{
  label: string;
  detail?: string;
  isExact: boolean;
}>;

export type RouteCardSummary = Readonly<{
  origin: string;
  destination: string;
  serviceDirections: readonly string[];
  departAt: string;
  timing: RouteCardTiming;
  duration: string;
  transfers: string;
  walking: string;
  fare: string;
}>;

export type RouteCardReason = Readonly<{
  headline: string;
  facts: readonly string[];
}>;

export type RouteCardStatus = Readonly<{
  label: RouteCardStatusLabel;
  detail: string;
}>;

export type RouteCardSelectedViewModel = Readonly<{
  state: "selected";
  summary: RouteCardSummary;
  reason: RouteCardReason;
  status: RouteCardStatus;
  steps: readonly RouteCardStep[];
  mapNotice?: string;
}>;

export type RouteCardRecoveryViewModel = Readonly<{
  state: "recovery";
  title: string;
  detail: string;
  action: string;
}>;

export type RouteCardViewModel =
  RouteCardSelectedViewModel | RouteCardRecoveryViewModel;

export function createRouteCardViewModel(
  input: RouteCardInput,
): RouteCardViewModel {
  if (input.result.state !== "selected") {
    return createFailureViewModel(input.result);
  }

  const invalidReason = validateJourney(input.result.primary);
  if (invalidReason) {
    return {
      state: "recovery",
      title: "Perlu dicek",
      detail: invalidReason,
      action: "Coba lagi",
    };
  }

  const journey = input.result.primary;
  const origin = getStopLabel(journey.originStopId, input.stopLabels);
  const destination = getStopLabel(journey.destinationStopId, input.stopLabels);
  const steps = journey.legs.map((leg) =>
    createStep(leg, input.stopLabels, journey),
  );
  const status = createJourneyStatus(
    journey,
    origin.missing || destination.missing,
  );
  const mapNotice = createMapNotice(input.mapState);

  return {
    state: "selected",
    summary: {
      origin: origin.value,
      destination: destination.value,
      serviceDirections: createServiceDirections(journey),
      departAt: formatDepartAt(input.departAt),
      timing: createTimingSummary(journey.timing),
      duration: createDurationLabel(journey.timing),
      transfers: `${journey.transferCount} kali pindah`,
      walking: createWalkingSummary(journey),
      fare: createFareLabel(input.fare),
    },
    reason: createReason(input.result.reason.decidingCriterion, journey),
    status,
    steps,
    ...(mapNotice ? { mapNotice } : {}),
  };
}

function validateJourney(journey: JourneyRoute): string | undefined {
  if (
    !isNonEmptyText(journey.routeId) ||
    !isNonEmptyText(journey.originStopId) ||
    !isNonEmptyText(journey.destinationStopId)
  ) {
    return "Identitas rute atau halte belum lengkap. Pilih rute lain atau coba lagi.";
  }

  if (journey.legs.length === 0) {
    return "Langkah perjalanan belum tersedia. Coba hitung ulang rute ini.";
  }

  const legIds = new Set<string>();
  let transitLegCount = 0;
  for (const leg of journey.legs) {
    if (
      !isNonEmptyText(leg.legId) ||
      !isNonEmptyText(leg.fromStopId) ||
      !isNonEmptyText(leg.toStopId) ||
      legIds.has(leg.legId)
    ) {
      return "Urutan langkah perjalanan belum dapat dipastikan. Coba lagi.";
    }
    legIds.add(leg.legId);

    if (leg.kind === "transit") {
      transitLegCount += 1;
      if (!isNonEmptyText(leg.routeShortName)) {
        return "Layanan transit belum dapat dipastikan. Pilih rute lain atau coba lagi.";
      }
      continue;
    }

    if (leg.connectionState !== "routable") {
      return "Detail perpindahan belum memiliki bukti koneksi yang cukup. Pilih rute lain atau coba lagi.";
    }
  }

  return transitLegCount === 0
    ? "Layanan transit belum tersedia untuk perjalanan ini. Pilih rute lain atau coba lagi."
    : undefined;
}

function createFailureViewModel(
  failure: RouteSelectionFailure,
): RouteCardRecoveryViewModel {
  switch (failure.state) {
    case "invalid-input":
      return {
        state: "recovery",
        title: "Periksa pilihan perjalanan",
        detail: "Pilih asal, tujuan, dan waktu keberangkatan yang valid.",
        action: "Ubah pilihan",
      };
    case "unavailable":
      return {
        state: "recovery",
        title: "Rute belum tersedia",
        detail: "Data transit belum siap. Coba lagi atau pilih waktu lain.",
        action: "Coba lagi",
      };
    case "unsupported":
      return {
        state: "recovery",
        title: "Layanan belum didukung",
        detail: "Pilih halte atau layanan TransJakarta yang tersedia.",
        action: "Ubah pilihan",
      };
    case "no-route":
      return {
        state: "recovery",
        title: "Tidak ada rute",
        detail: "Coba halte atau waktu keberangkatan lain.",
        action: "Ubah pilihan",
      };
    case "limited-data":
      return {
        state: "recovery",
        title: "Data terbatas",
        detail:
          "Rute belum dapat dipastikan karena data perjalanan belum lengkap.",
        action: "Coba lagi",
      };
  }
}
