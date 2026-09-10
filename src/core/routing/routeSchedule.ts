import { parseIsoServiceDate } from "~/core/ingestion/gtfsCalendar";
import { parseGtfsTime, type GtfsTime } from "~/core/ingestion/gtfsTime";
import type { GtfsFrequency } from "~/core/ingestion/gtfsTypes";

const SECONDS_PER_DAY = 86_400;
const PLANNING_HORIZON_SECONDS = SECONDS_PER_DAY;

export type ServiceDateCandidate = Readonly<{
  serviceDate: string;
  dayOffsetFromRequestedDate: number;
}>;

export type FindNextTripRideOptions = Readonly<{
  requestedDate: string;
  requestedTime: string;
  requestedSeconds?: number;
  serviceDate: string;
  boardingDeparture: GtfsTime;
  alightingArrival: GtfsTime;
  firstStopDeparture: GtfsTime;
  frequency?: GtfsFrequency;
}>;

export type ScheduledTripRide =
  | Readonly<{
      semantics: "exact";
      serviceDate: string;
      departure: GtfsTime;
      arrival: GtfsTime;
      actualDepartureSeconds: number;
      actualArrivalSeconds: number;
    }>
  | Readonly<{
      semantics: "interval";
      serviceDate: string;
      start: GtfsTime;
      end: GtfsTime;
      headwaySeconds: number;
      actualDepartureSeconds: number;
      actualArrivalSeconds: number;
    }>;

export function getServiceDateCandidates(
  requestedDate: string,
  requestedTime: string,
): readonly ServiceDateCandidate[] {
  const requestedSeconds = parseLocalTime(requestedTime);
  if (
    parseIsoServiceDate(requestedDate) === undefined ||
    requestedSeconds === undefined
  ) {
    return [];
  }

  const previousDate = shiftDate(requestedDate, -1);
  if (!previousDate) {
    return [];
  }

  return [
    { serviceDate: requestedDate, dayOffsetFromRequestedDate: 0 },
    { serviceDate: previousDate, dayOffsetFromRequestedDate: -1 },
  ];
}

export function findNextTripRide(
  options: FindNextTripRideOptions,
): ScheduledTripRide | undefined {
  const requestedSeconds =
    options.requestedSeconds ?? parseLocalTime(options.requestedTime);
  const serviceDayOffset = getServiceDayOffset(
    options.serviceDate,
    options.requestedDate,
  );
  if (
    requestedSeconds === undefined ||
    serviceDayOffset === undefined ||
    !isValidTime(options.boardingDeparture) ||
    !isValidTime(options.alightingArrival) ||
    !isValidTime(options.firstStopDeparture)
  ) {
    return undefined;
  }

  if (options.frequency) {
    return findFrequencyRide(options, requestedSeconds, serviceDayOffset);
  }

  return findExactRide(options, requestedSeconds, serviceDayOffset);
}

function findExactRide(
  options: FindNextTripRideOptions,
  requestedSeconds: number,
  serviceDayOffset: number,
): ScheduledTripRide | undefined {
  const actualDepartureSeconds =
    options.boardingDeparture.secondsSinceServiceDayStart -
    serviceDayOffset * SECONDS_PER_DAY;
  const actualArrivalSeconds =
    options.alightingArrival.secondsSinceServiceDayStart -
    serviceDayOffset * SECONDS_PER_DAY;

  if (
    actualArrivalSeconds < actualDepartureSeconds ||
    actualDepartureSeconds < requestedSeconds ||
    actualDepartureSeconds > requestedSeconds + PLANNING_HORIZON_SECONDS
  ) {
    return undefined;
  }

  return {
    semantics: "exact",
    serviceDate: options.serviceDate,
    departure: options.boardingDeparture,
    arrival: options.alightingArrival,
    actualDepartureSeconds,
    actualArrivalSeconds,
  };
}

function findFrequencyRide(
  options: FindNextTripRideOptions,
  requestedSeconds: number,
  serviceDayOffset: number,
): ScheduledTripRide | undefined {
  const frequency = options.frequency;
  if (!frequency || frequency.headwaySeconds <= 0) {
    return undefined;
  }

  const boardingOffset =
    options.boardingDeparture.secondsSinceServiceDayStart -
    options.firstStopDeparture.secondsSinceServiceDayStart;
  const travelSeconds =
    options.alightingArrival.secondsSinceServiceDayStart -
    options.boardingDeparture.secondsSinceServiceDayStart;
  if (boardingOffset < 0 || travelSeconds < 0) {
    return undefined;
  }

  const windowStart =
    frequency.startTime.secondsSinceServiceDayStart + boardingOffset;
  const windowEnd =
    frequency.endTime.secondsSinceServiceDayStart + boardingOffset;
  if (windowEnd < windowStart) {
    return undefined;
  }

  const actualWindowStart = windowStart - serviceDayOffset * SECONDS_PER_DAY;
  const actualWindowEnd = windowEnd - serviceDayOffset * SECONDS_PER_DAY;
  if (
    actualWindowEnd < requestedSeconds ||
    actualWindowStart > requestedSeconds + PLANNING_HORIZON_SECONDS
  ) {
    return undefined;
  }

  if (frequency.timingSemantics === "interval") {
    return createIntervalRide(
      options,
      requestedSeconds,
      actualWindowStart,
      actualWindowEnd,
      windowStart,
      windowEnd,
      travelSeconds,
    );
  }

  const occurrence = getNextFrequencyOccurrence(
    requestedSeconds,
    actualWindowStart,
    actualWindowEnd,
    frequency.headwaySeconds,
  );
  if (occurrence === undefined) {
    return undefined;
  }

  const occurrenceOffset = occurrence - actualWindowStart;
  return {
    semantics: "exact",
    serviceDate: options.serviceDate,
    departure: shiftGtfsTime(options.boardingDeparture, occurrenceOffset),
    arrival: shiftGtfsTime(options.alightingArrival, occurrenceOffset),
    actualDepartureSeconds: occurrence,
    actualArrivalSeconds: occurrence + travelSeconds,
  };
}

function createIntervalRide(
  options: FindNextTripRideOptions,
  requestedSeconds: number,
  actualWindowStart: number,
  actualWindowEnd: number,
  windowStart: number,
  windowEnd: number,
  travelSeconds: number,
): ScheduledTripRide | undefined {
  const frequency = options.frequency;
  if (!frequency) {
    return undefined;
  }

  const expectedDeparture = Math.min(
    actualWindowEnd,
    Math.max(requestedSeconds, actualWindowStart) +
      Math.floor(frequency.headwaySeconds / 2),
  );
  if (expectedDeparture < requestedSeconds) {
    return undefined;
  }

  return {
    semantics: "interval",
    serviceDate: options.serviceDate,
    start: shiftGtfsTime(
      options.boardingDeparture,
      windowStart - options.boardingDeparture.secondsSinceServiceDayStart,
    ),
    end: shiftGtfsTime(
      options.boardingDeparture,
      windowEnd - options.boardingDeparture.secondsSinceServiceDayStart,
    ),
    headwaySeconds: frequency.headwaySeconds,
    actualDepartureSeconds: expectedDeparture,
    actualArrivalSeconds: expectedDeparture + travelSeconds,
  };
}

function getNextFrequencyOccurrence(
  requestedSeconds: number,
  windowStart: number,
  windowEnd: number,
  headwaySeconds: number,
): number | undefined {
  const steps = Math.max(
    0,
    Math.ceil((requestedSeconds - windowStart) / headwaySeconds),
  );
  const occurrence = windowStart + steps * headwaySeconds;
  return occurrence <= windowEnd &&
    occurrence <= requestedSeconds + PLANNING_HORIZON_SECONDS
    ? occurrence
    : undefined;
}

function parseLocalTime(value: string): number | undefined {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value);
  if (!match) {
    return undefined;
  }

  const [hourText, minuteText] = value.split(":");
  if (hourText === undefined || minuteText === undefined) {
    return undefined;
  }
  return Number(hourText) * 3_600 + Number(minuteText) * 60;
}

function getServiceDayOffset(
  serviceDate: string,
  requestedDate: string,
): number | undefined {
  if (
    parseIsoServiceDate(serviceDate) === undefined ||
    parseIsoServiceDate(requestedDate) === undefined
  ) {
    return undefined;
  }

  const serviceMillis = dateToUtcMillis(serviceDate);
  const requestedMillis = dateToUtcMillis(requestedDate);
  if (serviceMillis === undefined || requestedMillis === undefined) {
    return undefined;
  }

  return Math.round((requestedMillis - serviceMillis) / 86_400_000);
}

function shiftDate(value: string, dayDelta: number): string | undefined {
  const millis = dateToUtcMillis(value);
  if (millis === undefined) {
    return undefined;
  }

  const date = new Date(millis + dayDelta * 86_400_000);
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(
    date.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function dateToUtcMillis(value: string): number | undefined {
  const parsed = parseIsoServiceDate(value);
  if (parsed === undefined) {
    return undefined;
  }

  const [yearText, monthText, dayText] = parsed.split("-");
  if (!yearText || !monthText || !dayText) {
    return undefined;
  }
  return Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function isValidTime(value: GtfsTime): boolean {
  try {
    return (
      parseGtfsTime(value.raw).secondsSinceServiceDayStart ===
      value.secondsSinceServiceDayStart
    );
  } catch {
    return false;
  }
}

function shiftGtfsTime(value: GtfsTime, seconds: number): GtfsTime {
  const total = value.secondsSinceServiceDayStart + seconds;
  return {
    raw: formatGtfsTime(total),
    secondsSinceServiceDayStart: total,
  };
}

function formatGtfsTime(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}
