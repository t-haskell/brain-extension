# Command Architecture

This document explains how Command is structured so future changes can be made without breaking the local-first model.

## Product Model

The app uses one canonical data model:

- `Area`: top-level separation between `Work` and `Personal`.
- `Project`: desired outcome.
- `Task`: concrete next action, reminder, waiting item, scheduled commitment, incubator idea, or reference.

All screens are derived from these entities. There are no separate Work and Personal databases.

## Data Flow

```text
UI interaction
  -> BrainStore action
  -> domain rule/selector if needed
  -> local React snapshot update
  -> Dexie row-level write
  -> optional Dexie Cloud sync
```

The important boundary is `BrainStore`. UI components should call `useBrain()` actions instead of mutating Dexie directly. This keeps WIP rules, focus rules, recurrence, and default dates centralized.

## Domain Layer

`src/domain` should stay mostly pure:

- `types.ts`: canonical entity shapes.
- `rules.ts`: task creation, open/done logic, WIP, focus, project health, rule warnings.
- `selectors.ts`: derived views such as Command, Weekly Review, and Monthly Incubator Review.
- `capture.ts`: natural-language quick capture parsing.
- `recurrence.ts`: recurring task expansion.
- `export.ts`: JSON and CSV import/export.
- `settings.ts`: settings defaults, allowed values, and field-by-field normalization.

When changing behavior, prefer adding or updating a domain test first.

## Persistence Layer

`src/persistence/db.ts` owns Dexie:

- Database name: `local-first-command`.
- Tables: `areas`, `projects`, `tasks`, `meta`, `appSettings`.
- `meta` is local-only and not synced to Dexie Cloud.
- `appSettings` contains one synced row for user preferences. It is not included in JSON import/export replacement.
- Normal app edits use row-level helpers:
  - `putTask`
  - `putTasks`
  - `putProject`
  - `putProjectWithTasks`
  - `putProjects`
- Settings edits use `putAppSettings` and the `SettingsStore` facade.
- Full replacement is reserved for:
  - JSON import
  - demo reset
  - initial seeding

This distinction matters because cloud sync tracks mutations. Replacing the whole snapshot for every edit would make sync noisy and harder to reason about.

## Cloud Sync Layer

`src/persistence/sync.ts` wraps Dexie Cloud behind small app-level functions:

- `isCloudEnabled()`
- `loginToCloud(email?: string)`
- `logoutFromCloud()`
- `syncCloudNow()`
- `useCloudAccount()`

`VITE_DEXIE_CLOUD_DB_URL` controls whether cloud sync exists in a build. If it is blank, the app runs in local-only mode and the same UI still works.

`loginToCloud` forces a pull after sign-in so a newly added device catches up before the user treats it as ready. `syncCloudNow` forces a push followed by a pull, which makes the top-bar button a real cross-device checkpoint instead of only an upload nudge.

Dexie Cloud configuration choices:

- `requireAuth: false`: local-first usage still works before sign-in.
- `nameSuffix: false`: preserves the existing IndexedDB database name for same-origin sign-in.
- `tryUseServiceWorker: false`: the existing service worker only caches the app shell.
- `unsyncedTables: ["meta"]`: local seed metadata does not sync.
- `appSettings` is intentionally not listed in `unsyncedTables`, so preferences can follow the signed-in Dexie Cloud user.
- `socialAuth: false`: v1 uses email OTP only.

## UI Layer

Route-level screens live in `src/views`. Shared controls live in `src/components`.

Key components:

- `Layout`: shell, sidebar, topbar, WIP meter, account chip, detail pane.
- `QuickCapture`: global capture input.
- `TaskCard`: card layout and workflow action menu.
- `DetailPane`: edit selected task.
- `CloudAccountChip`: local-only/signed-out/signed-in sync UI.
- `FocusTimer`: optional focus session timer.
- `SettingsView`: route-level settings page for theme, timezone, WIP limit, timer default, and start page.

The app uses a right detail pane instead of editing in every card. This keeps cards scannable while still making metadata editable.

## Offline Behavior

The app has two offline layers:

- IndexedDB keeps task/project data available locally.
- `public/sw.js` caches the production app shell plus built JS/CSS assets after first load.

The service worker does not sync data and should not be used for Dexie Cloud in v1. Dexie Cloud sync is expected while the app is open and online; background sync while the app is fully closed is outside the current scope.

`public/manifest.webmanifest`, PNG icons, and `apple-touch-icon.png` make the hosted app installable enough for normal desktop and phone home-screen use.

## Common Changes

### Add a task field

1. Add the field to `src/domain/types.ts`.
2. Add defaulting/normalization in `src/domain/rules.ts` or `BrainStore` if needed.
3. Update Dexie indexes only if the field needs querying/filtering.
4. Update JSON import/export tests.
5. Update `DetailPane` if users should edit it.

### Add a derived view

1. Add a selector in `src/domain/selectors.ts`.
2. Unit test the selector.
3. Build the route in `src/views`.
4. Wire it in `src/App.tsx` and navigation if needed.

### Change sync behavior

1. Keep local-only mode working.
2. Add or update tests around `mapCloudAccountState`.
3. Avoid direct cloud calls in views; use `src/persistence/sync.ts`.
4. Verify with a real Dexie Cloud database manually.

### Change app settings

1. Add allowed values and defaults in `src/domain/settings.ts`.
2. Keep invalid persisted values falling back field-by-field.
3. Persist through `src/persistence/settings.ts`; do not write the Dexie table directly from views.
4. Add store tests for default loading, row-level writes, and live subscription updates.

## Testing Strategy

- Domain tests prove methodology rules.
- Store tests prove app actions persist efficiently.
- Component tests prove card and account controls.
- Playwright tests prove end-to-end flows.

Run:

```bash
npm test
npm run build
npm run e2e
npm run smoke:production
```
