import { describe, expect, test } from "vitest";
import {
  formatDate,
  formatDateOnly,
  formatDateTimeInput,
  getDatePresetValue,
  parseDateTimeInput
} from "../../src/ui/date";

describe("timezone-aware date helpers", () => {
  test("formats the same instant in the selected timezone", () => {
    const value = new Date("2026-05-01T13:30:00Z");

    expect(formatDateTimeInput(value, "UTC")).toBe("2026-05-01T13:30");
    expect(formatDateTimeInput(value, "America/New_York")).toBe("2026-05-01T09:30");
  });

  test("parses timezone wall time into the matching instant", () => {
    expect(parseDateTimeInput("2026-05-01T09:30", "America/New_York")?.toISOString()).toBe("2026-05-01T13:30:00.000Z");
    expect(parseDateTimeInput("2026-05-01T13:30", "UTC")?.toISOString()).toBe("2026-05-01T13:30:00.000Z");
  });

  test("formats date labels using the selected timezone", () => {
    const value = new Date("2026-05-01T02:30:00Z");
    const now = new Date("2026-05-01T12:00:00Z");

    expect(formatDateOnly(value, "America/New_York")).toBe("Apr 30, 2026");
    expect(formatDate(value, "UTC", now)).toBe("Today 2:30 AM");
  });

  test("builds presets from the selected timezone date and default time", () => {
    const now = new Date("2026-05-01T02:30:00Z");

    expect(getDatePresetValue(0, "America/New_York", "13:15", now)).toBe("2026-04-30T13:15");
    expect(getDatePresetValue(1, "America/New_York", "13:15", now)).toBe("2026-05-01T13:15");
  });
});
