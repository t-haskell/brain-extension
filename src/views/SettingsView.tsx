import { Clock, Gauge, Palette, Timer, Waypoints } from "lucide-react";
import {
  accentColors,
  getSupportedTimeZones,
  focusTimerDurations,
  supportedStartPagePaths,
  themeModes,
  type AppSettings,
  type StartPagePath
} from "../domain/settings";
import { useSettings } from "../store/SettingsStore";

const startPageLabels = new Map<StartPagePath, string>([
  ["/command", "Command"],
  ["/inbox", "Inbox"],
  ["/work", "Work"],
  ["/personal", "Personal"],
  ["/waiting", "Waiting"],
  ["/incubator", "Incubator"],
  ["/projects", "Projects"],
  ["/reviews/weekly", "Weekly Review"],
  ["/reviews/incubator", "Monthly Incubator Review"],
  ["/explorer", "Explorer"],
  ["/settings", "Settings"]
]);

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SettingsView() {
  const { settings, updateSettings } = useSettings();
  const timeZones = getSupportedTimeZones(settings.timeZone);

  function save<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    void updateSettings({ [key]: value });
  }

  return (
    <div className="view-stack settings-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Settings</h2>
        </div>
        <p>Preferences sync with the signed-in account when Dexie Cloud is configured.</p>
      </header>

      <section className="settings-grid" aria-label="Application settings">
        <article className="settings-panel">
          <div className="settings-panel-heading">
            <Palette size={18} aria-hidden="true" />
            <div>
              <h3>Appearance</h3>
              <p>Choose the app theme and accent color.</p>
            </div>
          </div>
          <div className="settings-field-grid">
            <label>
              Theme
              <select
                value={settings.themeMode}
                onChange={(event) => save("themeMode", event.target.value as AppSettings["themeMode"])}
                data-testid="theme-mode"
              >
                {themeModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {titleCase(mode)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Accent
              <select
                value={settings.accentColor}
                onChange={(event) => save("accentColor", event.target.value as AppSettings["accentColor"])}
                data-testid="accent-color"
              >
                {accentColors.map((color) => (
                  <option key={color} value={color}>
                    {titleCase(color)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <article className="settings-panel">
          <div className="settings-panel-heading">
            <Clock size={18} aria-hidden="true" />
            <div>
              <h3>Date and time</h3>
              <p>Control how dates display and which time is used by quick presets.</p>
            </div>
          </div>
          <div className="settings-field-grid">
            <label>
              Time zone
              <select value={settings.timeZone} onChange={(event) => save("timeZone", event.target.value)} data-testid="time-zone">
                {timeZones.map((timeZone) => (
                  <option key={timeZone} value={timeZone}>
                    {timeZone}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Default due time
              <input
                type="time"
                value={settings.defaultDueTime}
                onChange={(event) => save("defaultDueTime", event.target.value)}
                data-testid="default-due-time"
              />
            </label>
          </div>
        </article>

        <article className="settings-panel">
          <div className="settings-panel-heading">
            <Gauge size={18} aria-hidden="true" />
            <div>
              <h3>Workflow</h3>
              <p>Set the active work capacity and where the app starts.</p>
            </div>
          </div>
          <div className="settings-field-grid">
            <label>
              Active WIP limit
              <select
                value={settings.activeWorkLimit}
                onChange={(event) => save("activeWorkLimit", Number(event.target.value))}
                data-testid="active-work-limit"
              >
                {Array.from({ length: 8 }, (_, index) => index + 1).map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start page
              <select
                value={settings.startPagePath}
                onChange={(event) => save("startPagePath", event.target.value as AppSettings["startPagePath"])}
                data-testid="start-page-path"
              >
                {supportedStartPagePaths.map((path) => (
                  <option key={path} value={path}>
                    {startPageLabels.get(path)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <article className="settings-panel">
          <div className="settings-panel-heading">
            <Timer size={18} aria-hidden="true" />
            <div>
              <h3>Focus timer</h3>
              <p>Pick the timer duration that should appear first.</p>
            </div>
          </div>
          <label>
            Default duration
            <select
              value={settings.focusTimerMinutes}
              onChange={(event) => save("focusTimerMinutes", Number(event.target.value) as AppSettings["focusTimerMinutes"])}
              data-testid="focus-timer-minutes"
            >
              {focusTimerDurations.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </label>
        </article>

        <article className="settings-panel settings-panel-wide">
          <div className="settings-panel-heading">
            <Waypoints size={18} aria-hidden="true" />
            <div>
              <h3>Sync behavior</h3>
              <p>Settings use one synced row and last-write-wins conflict behavior. Task import/export remains task-only.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
