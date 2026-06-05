import { getBrowserTimeZone, isValidTimeZone } from "../domain/settings";

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function safeTimeZone(timeZone?: string): string {
  if (isValidTimeZone(timeZone)) {
    return timeZone;
  }

  const browserTimeZone = getBrowserTimeZone();
  return isValidTimeZone(browserTimeZone) ? browserTimeZone : "UTC";
}

function getZonedParts(value: Date, timeZone?: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function zonedDateKey(value: Date, timeZone?: string): string {
  const parts = getZonedParts(value, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function formatTime(value: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export function formatDate(value: Date | null, timeZone?: string, now = new Date()): string {
  if (!value) {
    return "";
  }

  if (zonedDateKey(value, timeZone) === zonedDateKey(now, timeZone)) {
    return `Today ${formatTime(value, timeZone)}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export function formatDateOnly(value: Date | null, timeZone?: string): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export function formatDateTimeInput(value: Date | null, timeZone?: string): string {
  if (!value) {
    return "";
  }

  const parts = getZonedParts(value, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function parseDateTimeInput(value: string, timeZone?: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match;
  const desired = {
    year: Number(yearValue),
    month: Number(monthValue),
    day: Number(dayValue),
    hour: Number(hourValue),
    minute: Number(minuteValue)
  };
  const desiredAsUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute, 0);
  let timestamp = desiredAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedParts(new Date(timestamp), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0);
    const diff = desiredAsUtc - actualAsUtc;

    if (diff === 0) {
      break;
    }

    timestamp += diff;
  }

  return new Date(timestamp);
}

export function getDatePresetValue(daysFromToday: number, timeZone: string, defaultTime: string, now = new Date()): string {
  const parts = getZonedParts(now, timeZone);
  const presetDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysFromToday));
  return `${presetDate.getUTCFullYear()}-${pad(presetDate.getUTCMonth() + 1)}-${pad(presetDate.getUTCDate())}T${defaultTime}`;
}

export function isOverdue(value: Date | null, timeZone?: string, now = new Date()): boolean {
  if (!value) {
    return false;
  }

  return zonedDateKey(value, timeZone) < zonedDateKey(now, timeZone);
}
