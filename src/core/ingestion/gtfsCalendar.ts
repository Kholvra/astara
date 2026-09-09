import type { GtfsCalendar, GtfsCalendarDate, GtfsWeekday } from "./gtfsTypes";

const WEEKDAYS: readonly GtfsWeekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function parseGtfsDate(value: string): string | undefined {
  if (!/^\d{8}$/.test(value)) {
    return undefined;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));

  if (!isCalendarDate(year, month, day)) {
    return undefined;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function parseIsoServiceDate(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const yearText = match[1];
  const monthText = match[2];
  const dayText = match[3];

  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined
  ) {
    return undefined;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  return isCalendarDate(year, month, day) ? value : undefined;
}

export function getActiveServiceIds(
  calendars: readonly GtfsCalendar[],
  calendarDates: readonly GtfsCalendarDate[],
  serviceDate: string,
): ReadonlySet<string> {
  const activeServiceIds = new Set<string>();
  const weekday = getWeekday(serviceDate);

  if (!weekday) {
    return activeServiceIds;
  }

  for (const calendar of calendars) {
    if (
      calendar.startDate <= serviceDate &&
      serviceDate <= calendar.endDate &&
      calendar.weekdays[weekday]
    ) {
      activeServiceIds.add(calendar.serviceId);
    }
  }

  for (const calendarDate of calendarDates) {
    if (calendarDate.date !== serviceDate) {
      continue;
    }

    if (calendarDate.exceptionType === 1) {
      activeServiceIds.add(calendarDate.serviceId);
    } else {
      activeServiceIds.delete(calendarDate.serviceId);
    }
  }

  return activeServiceIds;
}

function getWeekday(value: string): GtfsWeekday | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const yearText = match[1];
  const monthText = match[2];
  const dayText = match[3];

  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined
  ) {
    return undefined;
  }

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(Number(yearText), Number(monthText) - 1, Number(dayText));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return WEEKDAYS[date.getUTCDay()];
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const monthDays = daysInMonth[month - 1];

  return (
    month >= 1 &&
    month <= 12 &&
    monthDays !== undefined &&
    day >= 1 &&
    day <= monthDays
  );
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
