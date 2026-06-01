import { format, isPast, isToday } from "date-fns";

export function formatDate(value: Date | null): string {
  if (!value) {
    return "";
  }

  if (isToday(value)) {
    return `Today ${format(value, "p")}`;
  }

  return format(value, "MMM d, p");
}

export function formatDateOnly(value: Date | null): string {
  return value ? format(value, "MMM d, yyyy") : "";
}

export function formatDateTimeInput(value: Date | null): string {
  return value ? format(value, "yyyy-MM-dd'T'HH:mm") : "";
}

export function parseDateTimeInput(value: string): Date | null {
  return value ? new Date(value) : null;
}

export function isOverdue(value: Date | null): boolean {
  return Boolean(value && isPast(value) && !isToday(value));
}
