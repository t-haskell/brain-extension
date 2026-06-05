import { describe, expect, test } from "vitest";
import {
  APP_SETTINGS_ID,
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  resolveTheme,
  supportedStartPagePaths
} from "../../src/domain/settings";

describe("app settings", () => {
  test("uses safe defaults without requiring a persisted row", () => {
    expect(normalizeAppSettings(null)).toEqual(DEFAULT_APP_SETTINGS);
  });

  test("normalizes a valid persisted row", () => {
    expect(
      normalizeAppSettings({
        id: APP_SETTINGS_ID,
        themeMode: "dark",
        accentColor: "blue",
        timeZone: "America/New_York",
        defaultDueTime: "13:30",
        activeWorkLimit: 5,
        focusTimerMinutes: 45,
        startPagePath: "/inbox",
        updatedAt: new Date("2026-05-01T12:00:00Z")
      })
    ).toEqual({
      themeMode: "dark",
      accentColor: "blue",
      timeZone: "America/New_York",
      defaultDueTime: "13:30",
      activeWorkLimit: 5,
      focusTimerMinutes: 45,
      startPagePath: "/inbox"
    });
  });

  test("falls back field-by-field for invalid persisted values", () => {
    expect(
      normalizeAppSettings({
        id: APP_SETTINGS_ID,
        themeMode: "sepia",
        accentColor: "neon",
        timeZone: "Not/AZone",
        defaultDueTime: "25:99",
        activeWorkLimit: 0,
        focusTimerMinutes: 60,
        startPagePath: "/missing",
        updatedAt: new Date("2026-05-01T12:00:00Z")
      })
    ).toEqual(DEFAULT_APP_SETTINGS);
  });

  test("keeps start page choices limited to real app routes", () => {
    expect(supportedStartPagePaths).toContain("/command");
    expect(supportedStartPagePaths).toContain("/settings");
    expect(supportedStartPagePaths).not.toContain("/");
  });

  test("resolves system theme from the current media preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
