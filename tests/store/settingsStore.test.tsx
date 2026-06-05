import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "../../src/domain/settings";
import { SettingsProvider, useSettings } from "../../src/store/SettingsStore";
import { putAppSettings, subscribeToAppSettings } from "../../src/persistence/settings";

const settingsMocks = vi.hoisted(() => ({
  listener: null as ((settings: AppSettings) => void) | null,
  unsubscribe: vi.fn(),
  putAppSettings: vi.fn(),
  subscribeToAppSettings: vi.fn()
}));

vi.mock("../../src/persistence/settings", () => ({
  putAppSettings: settingsMocks.putAppSettings,
  subscribeToAppSettings: settingsMocks.subscribeToAppSettings
}));

function SettingsHarness() {
  const { settings, isLoaded, updateSettings } = useSettings();

  if (!isLoaded) {
    return <div>Loading settings</div>;
  }

  return (
    <div>
      <span data-testid="theme-mode">{settings.themeMode}</span>
      <span data-testid="wip-limit">{settings.activeWorkLimit}</span>
      <button type="button" onClick={() => updateSettings({ themeMode: "dark", activeWorkLimit: 5 })}>
        Update settings
      </button>
    </div>
  );
}

function renderSettings() {
  render(
    <SettingsProvider>
      <SettingsHarness />
    </SettingsProvider>
  );
}

describe("SettingsStore", () => {
  beforeEach(() => {
    settingsMocks.listener = null;
    settingsMocks.unsubscribe.mockClear();
    settingsMocks.putAppSettings.mockResolvedValue(undefined);
    settingsMocks.putAppSettings.mockClear();
    settingsMocks.subscribeToAppSettings.mockImplementation((listener: (settings: AppSettings) => void) => {
      settingsMocks.listener = listener;
      listener(DEFAULT_APP_SETTINGS);
      return settingsMocks.unsubscribe;
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.removeAttribute("data-accent");
  });

  test("loads default settings without writing a default row", async () => {
    renderSettings();

    await screen.findByTestId("theme-mode");

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
    expect(screen.getByTestId("wip-limit")).toHaveTextContent("3");
    expect(putAppSettings).not.toHaveBeenCalled();
  });

  test("persists a row-level settings update", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(await screen.findByRole("button", { name: "Update settings" }));

    await waitFor(() =>
      expect(putAppSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          themeMode: "dark",
          activeWorkLimit: 5
        })
      )
    );
  });

  test("applies theme attributes to the document element", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(await screen.findByRole("button", { name: "Update settings" }));

    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "dark"));
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
    expect(document.documentElement).toHaveAttribute("data-accent", "forest");
  });

  test("updates rendered settings when the subscription receives a remote row", async () => {
    renderSettings();

    await screen.findByTestId("wip-limit");
    act(() => {
      settingsMocks.listener?.({ ...DEFAULT_APP_SETTINGS, activeWorkLimit: 7 });
    });

    await waitFor(() => expect(screen.getByTestId("wip-limit")).toHaveTextContent("7"));
  });
});
