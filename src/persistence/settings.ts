import { liveQuery } from "dexie";
import { APP_SETTINGS_ID, createAppSettingsRow, normalizeAppSettings, type AppSettings } from "../domain/settings";
import { db } from "./db";

export function subscribeToAppSettings(onChange: (settings: AppSettings) => void, onError?: (error: unknown) => void): () => void {
  const subscription = liveQuery(async () => normalizeAppSettings(await db.appSettings.get(APP_SETTINGS_ID))).subscribe({
    next: onChange,
    error(error) {
      onError?.(error);
      onChange(normalizeAppSettings(null));
    }
  });

  return () => subscription.unsubscribe();
}

export async function putAppSettings(settings: AppSettings): Promise<void> {
  await db.appSettings.put(createAppSettingsRow(settings));
}
