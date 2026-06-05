import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings, resolveTheme, type AppSettings } from "../domain/settings";
import { putAppSettings, subscribeToAppSettings } from "../persistence/settings";

interface SettingsContextValue {
  settings: AppSettings;
  isLoaded: boolean;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function systemPrefersDark(): boolean {
  return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);
}

function applyTheme(settings: AppSettings): void {
  const resolvedTheme = resolveTheme(settings.themeMode, systemPrefersDark());
  const root = document.documentElement;

  root.dataset.themeMode = settings.themeMode;
  root.dataset.theme = resolvedTheme;
  root.dataset.accent = settings.accentColor;
  root.style.colorScheme = resolvedTheme;
}

function subscribeToSystemTheme(settings: AppSettings): () => void {
  applyTheme(settings);

  if (settings.themeMode !== "system" || !window.matchMedia) {
    return () => undefined;
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => applyTheme(settings);

  media.addEventListener?.("change", onChange);
  return () => media.removeEventListener?.("change", onChange);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const settingsRef = useRef(settings);

  const publishSettings = useCallback((next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  useEffect(() => {
    return subscribeToAppSettings(
      (next) => {
        publishSettings(next);
        setIsLoaded(true);
      },
      (error) => {
        console.error("Failed to load app settings", error);
        publishSettings(DEFAULT_APP_SETTINGS);
        setIsLoaded(true);
      }
    );
  }, [publishSettings]);

  useEffect(() => subscribeToSystemTheme(settings), [settings]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = normalizeAppSettings({ ...settingsRef.current, ...patch });
      publishSettings(next);
      await putAppSettings(next);
    },
    [publishSettings]
  );

  const value = useMemo<SettingsContextValue>(() => ({ settings, isLoaded, updateSettings }), [isLoaded, settings, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider.");
  }

  return context;
}
