import { parseIsoServiceDate } from "~/core/ingestion/gtfsCalendar";
import { parseGtfsTime, type GtfsTime } from "~/core/ingestion/gtfsTime";

export const DEFAULT_SERVICE_TIMEZONE = "Asia/Jakarta";
export const FIXED_SCORING_POLICY = "fixed-explainable-v1";

const EMPTY_DEPART_AT: DepartAtDraft = {
  localDate: "",
  localTime: "",
};

export type Clock = () => Date;
export type ServiceAvailability = "available" | "no-service";
export type TimingSemantics = "exact" | "interval" | "estimate" | "unavailable";
export type FareLimitationLabel = "Data terbatas" | "Perlu dicek";

export type DepartAtDraft = Readonly<{
  localDate: string;
  localTime: string;
}>;

export type DepartAtInput = DepartAtDraft &
  Readonly<{
    mode: "depart-at";
    timezone: string;
  }>;

type InvalidDepartAtReason =
  "invalid-input" | "invalid-timezone" | "clock-unavailable";

export type DepartAtValidation =
  | Readonly<{
      state: "valid";
      draft: DepartAtDraft;
      input: DepartAtInput;
    }>
  | Readonly<{
      state: "invalid";
      draft: DepartAtDraft;
      correction: "Pakai waktu sekarang";
      message: string;
      reason: InvalidDepartAtReason;
    }>
  | Readonly<{
      state: "past";
      draft: DepartAtDraft;
      correction: "Pakai waktu sekarang";
      message: string;
    }>
  | Readonly<{
      state: "no-service";
      draft: DepartAtDraft;
      correction: "Pilih waktu lain";
      message: string;
    }>;

export type NormalizeDepartAtOptions = Readonly<{
  draft: DepartAtDraft;
  timezone: string;
  now?: DepartAtDraft;
  clock?: Clock;
  serviceAvailability?: ServiceAvailability;
}>;

export type CreateDefaultDepartAtOptions = Readonly<{
  timezone?: string;
  clock?: Clock;
}>;

export type TimingFact =
  | Readonly<{
      semantics: "exact";
      departure: GtfsTime;
    }>
  | Readonly<{
      semantics: "interval";
      start: GtfsTime;
      end: GtfsTime;
      headwaySeconds: number;
    }>
  | Readonly<{
      semantics: "estimate";
      durationSeconds: number;
    }>
  | Readonly<{
      semantics: "unavailable";
      status: FareLimitationLabel;
    }>;

export type TimingDisplay = Readonly<{
  semantics: TimingSemantics;
  label: string;
  detail?: string;
  isExact: boolean;
}>;

export type FareInput = Readonly<{
  amount?: number;
  currency?: string;
  source?: string;
  basis?: string;
  calculationComplete: boolean;
  approved: boolean;
  limitation?: FareLimitationLabel;
}>;

export type FareStatus =
  | Readonly<{
      state: "estimate";
      label: "Perkiraan tarif";
      amount: number;
      currency: string;
      source: string;
      basis: string;
      displayAmount: string;
    }>
  | Readonly<{
      state: "limited";
      label: FareLimitationLabel;
      reason: string;
      source?: string;
    }>;

export type TripPlanningInput = Readonly<{
  originId: string;
  destinationId: string;
  departAt: DepartAtInput;
  scoringPolicy: typeof FIXED_SCORING_POLICY;
}>;

export function createDefaultDepartAt(
  options: CreateDefaultDepartAtOptions = {},
): DepartAtValidation {
  const timezone = options.timezone ?? DEFAULT_SERVICE_TIMEZONE;
  if (!isValidTimeZone(timezone)) {
    return invalidResult(EMPTY_DEPART_AT, "invalid-timezone");
  }

  const draft = getLocalDraft(options.clock ?? getSystemClock, timezone);
  if (!draft) {
    return invalidResult(EMPTY_DEPART_AT, "clock-unavailable");
  }

  return normalizeDepartAt({ draft, timezone, now: draft });
}

export function normalizeDepartAt(
  options: NormalizeDepartAtOptions,
): DepartAtValidation {
  const { draft, timezone } = options;
  if (!isValidTimeZone(timezone)) {
    return invalidResult(draft, "invalid-timezone");
  }

  if (!isValidDraft(draft)) {
    return invalidResult(draft, "invalid-input");
  }

  const now =
    options.now ?? getLocalDraft(options.clock ?? getSystemClock, timezone);
  if (!now || !isValidDraft(now)) {
    return invalidResult(draft, "clock-unavailable");
  }

  if (compareDrafts(draft, now) < 0) {
    return {
      state: "past",
      draft: copyDraft(draft),
      correction: "Pakai waktu sekarang",
      message: "Waktu keberangkatan sudah lewat.",
    };
  }

  if ((options.serviceAvailability ?? "available") === "no-service") {
    return {
      state: "no-service",
      draft: copyDraft(draft),
      correction: "Pilih waktu lain",
      message: "Tidak ada layanan yang didukung pada waktu ini.",
    };
  }

  return {
    state: "valid",
    draft: copyDraft(draft),
    input: {
      mode: "depart-at",
      localDate: draft.localDate,
      localTime: draft.localTime,
      timezone,
    },
  };
}

export function describeTimingFact(fact: TimingFact): TimingDisplay {
  switch (fact.semantics) {
    case "exact":
      return describeExactTiming(fact.departure);
    case "interval":
      return describeIntervalTiming(fact.start, fact.end, fact.headwaySeconds);
    case "estimate":
      return describeEstimateTiming(fact.durationSeconds);
    case "unavailable":
      return unavailableTimingDisplay(fact.status);
  }
}

export function resolveFareStatus(input: FareInput): FareStatus {
  const source = normalizeText(input.source);
  const basis = normalizeText(input.basis);
  const currency = normalizeCurrency(input.currency);

  if (
    source &&
    basis &&
    currency &&
    input.calculationComplete &&
    input.approved &&
    isValidFareAmount(input.amount)
  ) {
    return {
      state: "estimate",
      label: "Perkiraan tarif",
      amount: input.amount,
      currency,
      source,
      basis,
      displayAmount: formatFareAmount(input.amount, currency),
    };
  }

  const limited: FareStatus = {
    state: "limited",
    label: input.limitation ?? "Data terbatas",
    reason: getFareLimitationReason(input, source, basis, currency),
  };
  return source ? { ...limited, source } : limited;
}

export function createTripPlanningInput(input: {
  originId: string;
  destinationId: string;
  departAt: DepartAtInput;
}): TripPlanningInput {
  return {
    originId: input.originId,
    destinationId: input.destinationId,
    departAt: input.departAt,
    scoringPolicy: FIXED_SCORING_POLICY,
  };
}

function describeExactTiming(departure: GtfsTime): TimingDisplay {
  const formatted = formatGtfsTime(departure);
  return formatted
    ? {
        semantics: "exact",
        label: `Jadwal ${formatted}`,
        isExact: true,
      }
    : unavailableTimingDisplay("Data terbatas");
}

function describeIntervalTiming(
  start: GtfsTime,
  end: GtfsTime,
  headwaySeconds: number,
): TimingDisplay {
  const formattedStart = formatGtfsTime(start);
  const formattedEnd = formatGtfsTime(end);
  const headway = formatDuration(headwaySeconds);
  if (
    !formattedStart ||
    !formattedEnd ||
    !headway ||
    end.secondsSinceServiceDayStart < start.secondsSinceServiceDayStart
  ) {
    return unavailableTimingDisplay("Data terbatas");
  }

  return {
    semantics: "interval",
    label: `Tiap ${headway}`,
    detail: `Rentang layanan ${formattedStart}–${formattedEnd}`,
    isExact: false,
  };
}

function describeEstimateTiming(durationSeconds: number): TimingDisplay {
  const duration = formatDuration(durationSeconds);
  return duration
    ? {
        semantics: "estimate",
        label: `Perkiraan durasi ${duration}`,
        isExact: false,
      }
    : unavailableTimingDisplay("Data terbatas");
}

function unavailableTimingDisplay(status: FareLimitationLabel): TimingDisplay {
  return {
    semantics: "unavailable",
    label: status,
    detail: "Waktu layanan belum tersedia.",
    isExact: false,
  };
}

function formatGtfsTime(value: GtfsTime): string | undefined {
  if (!isValidGtfsTime(value)) {
    return undefined;
  }

  const dayOffset = Math.floor(value.secondsSinceServiceDayStart / 86_400);
  const secondsInDay = value.secondsSinceServiceDayStart % 86_400;
  const hours = Math.floor(secondsInDay / 3_600);
  const minutes = Math.floor((secondsInDay % 3_600) / 60);
  const seconds = secondsInDay % 60;
  const clock = `${pad(hours)}.${pad(minutes)}${
    seconds > 0 ? `.${pad(seconds)}` : ""
  }`;

  return dayOffset > 0 ? `${clock} (hari berikutnya)` : clock;
}

function isValidGtfsTime(value: GtfsTime): boolean {
  if (
    typeof value.raw !== "string" ||
    !Number.isInteger(value.secondsSinceServiceDayStart) ||
    value.secondsSinceServiceDayStart < 0
  ) {
    return false;
  }

  try {
    return (
      parseGtfsTime(value.raw).secondsSinceServiceDayStart ===
      value.secondsSinceServiceDayStart
    );
  } catch {
    return false;
  }
}

function formatDuration(seconds: number): string | undefined {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  return `${Math.ceil(seconds / 60)} mnt`;
}

function formatFareAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}

function getFareLimitationReason(
  input: FareInput,
  source: string | undefined,
  basis: string | undefined,
  currency: string | undefined,
): string {
  if (!source || !basis || !currency) {
    return "Sumber atau dasar perhitungan tarif belum lengkap.";
  }
  if (!isValidFareAmount(input.amount)) {
    return "Nominal tarif belum tersedia dengan lengkap.";
  }
  if (!input.calculationComplete) {
    return "Perhitungan tarif belum lengkap.";
  }
  return "Tarif belum disetujui untuk ditampilkan.";
}

function isValidFareAmount(amount: number | undefined): amount is number {
  return amount !== undefined && Number.isFinite(amount) && amount >= 0;
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized;
}

function normalizeCurrency(value: string | undefined): string | undefined {
  const normalized = normalizeText(value)?.toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
}

function getLocalDraft(
  clock: Clock,
  timezone: string,
): DepartAtDraft | undefined {
  let current: Date;
  try {
    current = clock();
  } catch {
    return undefined;
  }

  if (!(current instanceof Date) || Number.isNaN(current.getTime())) {
    return undefined;
  }

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(current);
    const values = new Map(
      parts
        .filter((part) =>
          ["year", "month", "day", "hour", "minute"].includes(part.type),
        )
        .map((part) => [part.type, part.value]),
    );
    const year = values.get("year");
    const month = values.get("month");
    const day = values.get("day");
    const hour = values.get("hour");
    const minute = values.get("minute");
    if (!year || !month || !day || !hour || !minute) {
      return undefined;
    }

    const draft = {
      localDate: `${year}-${month}-${day}`,
      localTime: `${hour}:${minute}`,
    };
    return isValidDraft(draft) ? draft : undefined;
  } catch {
    return undefined;
  }
}

function isValidTimeZone(timezone: string): boolean {
  if (!timezone.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidDraft(draft: DepartAtDraft): boolean {
  return (
    typeof draft.localDate === "string" &&
    parseIsoServiceDate(draft.localDate) !== undefined &&
    typeof draft.localTime === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.localTime)
  );
}

function compareDrafts(left: DepartAtDraft, right: DepartAtDraft): number {
  const leftValue = `${left.localDate}T${left.localTime}`;
  const rightValue = `${right.localDate}T${right.localTime}`;
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

function copyDraft(draft: DepartAtDraft): DepartAtDraft {
  return {
    localDate: draft.localDate,
    localTime: draft.localTime,
  };
}

function invalidResult(
  draft: DepartAtDraft,
  reason: InvalidDepartAtReason,
): DepartAtValidation {
  const message =
    reason === "invalid-input"
      ? "Masukkan tanggal dan waktu keberangkatan yang valid."
      : "Waktu lokal belum dapat ditentukan. Coba lagi.";
  return {
    state: "invalid",
    draft: copyDraft(draft),
    correction: "Pakai waktu sekarang",
    message,
    reason,
  };
}

function getSystemClock(): Date {
  return new Date();
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
