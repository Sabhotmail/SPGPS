const DEFAULT_TIMEZONE = "Asia/Bangkok";

function readTimezoneEnv(): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim() ||
      process.env.APP_TIMEZONE?.trim()
    );
  }
  return undefined;
}

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Application timezone for daily GPS grouping (default Asia/Bangkok). */
export function getAppTimezone(): string {
  const candidate = readTimezoneEnv() || DEFAULT_TIMEZONE;
  return isValidTimeZone(candidate) ? candidate : DEFAULT_TIMEZONE;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function parseYmd(dateStr: string): { year: number; month: number; day: number } {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function zonedTimeToUtc(
  dateStr: string,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): Date {
  const { year, month, day } = parseYmd(dateStr);
  let utc = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  for (let i = 0; i < 3; i++) {
    const parts = getZonedParts(new Date(utc), timeZone);
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    const actual = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    utc += target - actual;
  }

  return new Date(utc);
}

/** Format a Date as YYYY-MM-DD in the application timezone. */
export function formatYmdInAppTz(date: Date, timeZone = getAppTimezone()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's date (YYYY-MM-DD) in the application timezone. */
export function todayYmdInAppTz(timeZone = getAppTimezone()): string {
  return formatYmdInAppTz(new Date(), timeZone);
}

function nextCalendarYmd(dateStr: string): string {
  const { year, month, day } = parseYmd(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** UTC instants for [start, end] of a calendar day in the application timezone. */
export function appDayRange(
  dateStr: string,
  timeZone = getAppTimezone()
): { start: Date; end: Date } {
  const start = zonedTimeToUtc(dateStr, 0, 0, 0, 0, timeZone);
  const nextStart = zonedTimeToUtc(
    nextCalendarYmd(dateStr),
    0,
    0,
    0,
    0,
    timeZone
  );
  const end = new Date(nextStart.getTime() - 1);
  return { start, end };
}

/** Add days to a YYYY-MM-DD string in the application timezone. */
export function addDaysToYmd(
  dateStr: string,
  days: number,
  timeZone = getAppTimezone()
): string {
  const { start } = appDayRange(dateStr, timeZone);
  return formatYmdInAppTz(
    new Date(start.getTime() + days * 86_400_000),
    timeZone
  );
}

/** YYYY-MM-DD for N days before today in the application timezone. */
export function daysAgoYmdInAppTz(
  days: number,
  timeZone = getAppTimezone()
): string {
  return addDaysToYmd(todayYmdInAppTz(timeZone), -days, timeZone);
}

/** Dates from `days` ago through today (app TZ), oldest first. */
export function buildBackfillDates(
  days: number,
  until = new Date(),
  timeZone = getAppTimezone()
): string[] {
  const n = Math.max(1, Math.min(days, 90));
  const endDate = formatYmdInAppTz(until, timeZone);
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    dates.push(addDaysToYmd(endDate, -i, timeZone));
  }
  return dates;
}
