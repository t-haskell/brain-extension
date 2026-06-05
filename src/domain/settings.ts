export const APP_SETTINGS_ID = "app-settings";

export const themeModes = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof themeModes)[number];
export type ResolvedTheme = Exclude<ThemeMode, "system">;

export const accentColors = ["forest", "blue", "plum", "copper"] as const;
export type AccentColor = (typeof accentColors)[number];

export const focusTimerDurations = [15, 25, 45] as const;
export type FocusTimerMinutes = (typeof focusTimerDurations)[number];

export const supportedStartPagePaths = [
  "/command",
  "/inbox",
  "/work",
  "/personal",
  "/waiting",
  "/incubator",
  "/projects",
  "/reviews/weekly",
  "/reviews/incubator",
  "/explorer",
  "/settings"
] as const;
export type StartPagePath = (typeof supportedStartPagePaths)[number];

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  timeZone: string;
  defaultDueTime: string;
  activeWorkLimit: number;
  focusTimerMinutes: FocusTimerMinutes;
  startPagePath: StartPagePath;
}

export interface AppSettingsRow extends AppSettings {
  id: typeof APP_SETTINGS_ID;
  updatedAt: Date;
}

const themeModeSet = new Set<string>(themeModes);
const accentColorSet = new Set<string>(accentColors);
const focusTimerDurationSet = new Set<number>(focusTimerDurations);
const startPagePathSet = new Set<string>(supportedStartPagePaths);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const activeWorkMin = 1;
const activeWorkMax = 8;

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: "system",
  accentColor: "forest",
  timeZone: isValidTimeZone(getBrowserTimeZone()) ? getBrowserTimeZone() : "UTC",
  defaultDueTime: "09:00",
  activeWorkLimit: 3,
  focusTimerMinutes: 25,
  startPagePath: "/command"
};

function normalizeTime(value: unknown): string {
  return typeof value === "string" && timePattern.test(value) ? value : DEFAULT_APP_SETTINGS.defaultDueTime;
}

function normalizeActiveWorkLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_APP_SETTINGS.activeWorkLimit;
  }

  return value >= activeWorkMin && value <= activeWorkMax ? value : DEFAULT_APP_SETTINGS.activeWorkLimit;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    return DEFAULT_APP_SETTINGS;
  }

  return {
    themeMode:
      typeof value.themeMode === "string" && themeModeSet.has(value.themeMode)
        ? (value.themeMode as ThemeMode)
        : DEFAULT_APP_SETTINGS.themeMode,
    accentColor:
      typeof value.accentColor === "string" && accentColorSet.has(value.accentColor)
        ? (value.accentColor as AccentColor)
        : DEFAULT_APP_SETTINGS.accentColor,
    timeZone: isValidTimeZone(value.timeZone) ? value.timeZone : DEFAULT_APP_SETTINGS.timeZone,
    defaultDueTime: normalizeTime(value.defaultDueTime),
    activeWorkLimit: normalizeActiveWorkLimit(value.activeWorkLimit),
    focusTimerMinutes:
      typeof value.focusTimerMinutes === "number" && focusTimerDurationSet.has(value.focusTimerMinutes)
        ? (value.focusTimerMinutes as FocusTimerMinutes)
        : DEFAULT_APP_SETTINGS.focusTimerMinutes,
    startPagePath:
      typeof value.startPagePath === "string" && startPagePathSet.has(value.startPagePath)
        ? (value.startPagePath as StartPagePath)
        : DEFAULT_APP_SETTINGS.startPagePath
  };
}

export function createAppSettingsRow(settings: AppSettings, updatedAt = new Date()): AppSettingsRow {
  return {
    id: APP_SETTINGS_ID,
    ...normalizeAppSettings(settings),
    updatedAt
  };
}

export function resolveTheme(themeMode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (themeMode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return themeMode;
}

export function getSupportedTimeZones(currentTimeZone: string): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo"];
  const zones = new Set(["UTC", currentTimeZone, ...supported].filter(isValidTimeZone));
  return Array.from(zones).sort((left, right) => left.localeCompare(right));
}
