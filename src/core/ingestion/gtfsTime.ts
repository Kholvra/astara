export type GtfsTime = Readonly<{
  raw: string;
  secondsSinceServiceDayStart: number;
}>;

export class GtfsTimeParseError extends Error {
  public readonly value: string;

  public constructor(value: string) {
    super(`Invalid GTFS service-day time '${value}'`);
    this.name = "GtfsTimeParseError";
    this.value = value;
  }
}

export function parseGtfsTime(value: string): GtfsTime {
  const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new GtfsTimeParseError(value);
  }

  const hoursText = match[1];
  const minutesText = match[2];
  const secondsText = match[3];

  if (
    hoursText === undefined ||
    minutesText === undefined ||
    secondsText === undefined
  ) {
    throw new GtfsTimeParseError(value);
  }

  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);
  const totalSeconds = hours * 3_600 + minutes * 60 + seconds;

  if (!Number.isSafeInteger(hours) || !Number.isSafeInteger(totalSeconds)) {
    throw new GtfsTimeParseError(value);
  }

  return {
    raw: value,
    secondsSinceServiceDayStart: totalSeconds,
  };
}
