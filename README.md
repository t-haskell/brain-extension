# Command

Command is a local-first task-management app for one canonical life system. It has one inbox, two areas (`Work` and `Personal`), one curated all-life dashboard (`Command`), and an incubator for ideas that matter but should not crowd active work.

This app is intentionally not a gamified checklist. It is built to act like an external brain: fast capture, clear triage, low active work in progress, concrete next actions, reliable resurfacing, offline ownership, and exportable data.

## How To Use The App Daily

1. Capture anything quickly in the top bar or with `Cmd/Ctrl+K`.
2. Triage the Inbox into `Work` or `Personal`.
3. Choose the correct workflow state:
   - `next` for concrete actions that are ready.
   - `active` for the tiny set of work currently occupying attention.
   - `waiting` for something blocked by another person or external event.
   - `scheduled` only for date/time-bound commitments.
   - `incubator` for important not-now ideas.
   - `reference` for non-actionable information.
4. Pick one focus item only when you want to lock into a task.
5. Keep active work to three tasks or fewer.
6. Use `Command` to resume after interruptions.

## Work, Personal, And Command

Work and Personal are areas inside one system because the user has one attention budget. They remain visually separated by badges, filters, area pages, and project ownership, but they share the same inbox, reviews, search, import/export, and storage model.

`Command` is not an everything list. It intentionally shows only:

- Focus
- Due today / overdue
- Scheduled soon
- Work next actions
- Personal next actions
- Waiting follow-ups due
- Incubator items ready for review

Use `Explorer` when you need the true all-items audit view.

## Active Work vs Incubator

Active work is for items that are actionable now. The app enforces the method with a visible warning when more than three tasks are active, and only one task can be marked as focus.

Incubator is for ideas that matter but should not consume daily execution space. Incubator items require a review date. They resurface in Command and Monthly Incubator Review only when that review date arrives.

## Reviews

Weekly Review covers:

- Clearing Inbox.
- Reviewing active projects.
- Ensuring every active project has a next action.
- Inspecting waiting items.
- Inspecting scheduled commitments in the next two weeks.
- Cleaning stale open tasks.

Monthly Incubator Review covers:

- Promoting an incubator item to a project.
- Creating a concrete next action.
- Snoozing the idea to a later review date.
- Archiving/canceling ideas that no longer matter.

## Local-First Storage And Sync

The canonical data model lives in the browser first:

- Dexie stores data in IndexedDB.
- The app works offline after first production load.
- The service worker caches the app shell and built JS/CSS assets; task data stays in IndexedDB.
- `Explorer` can export the complete model as JSON or CSV.
- JSON import replaces the local model intentionally.

Cloud sync is optional. If `VITE_DEXIE_CLOUD_DB_URL` is not set, the app runs as `Local only`. If the variable is set, Dexie Cloud is configured with Email OTP sign-in and the top-bar account chip can sign in, sync now, and sign out.

## Computer And Phone Access

To use the same task database from a computer and phone:

1. Deploy the app to an HTTPS origin such as Cloudflare Pages.
2. Configure `VITE_DEXIE_CLOUD_DB_URL` in that hosted build.
3. Open the hosted URL on each device.
4. Sign in with the same email in the top-bar account chip.
5. Use `Sync now` when you want an explicit push/pull sync checkpoint.

The hosted app can be installed to a phone home screen because it has a web app manifest, PNG app icons, an Apple touch icon, and a production service worker. Task edits are kept in IndexedDB when offline and sync through Dexie Cloud when the device is online and the app is open. Background sync while the app is fully closed is not claimed in v1.

Important migration note: browser storage is origin-scoped. Data created at `http://127.0.0.1:5173` is not automatically visible at a Cloudflare Pages URL. To move local dev data to the hosted app, export JSON from local `Explorer`, open the hosted app, and import that JSON once.

## Architecture Map

- `src/domain`: Pure domain types, rules, selectors, recurrence, capture parsing, import/export.
- `src/persistence/db.ts`: Dexie database, optional Dexie Cloud configuration, local table helpers.
- `src/persistence/sync.ts`: Cloud account state, login/logout/sync wrappers, local-only fallback.
- `src/store/BrainStore.tsx`: React state facade over the canonical model and persistence helpers.
- `src/components`: Shared UI, including task cards, detail pane, quick capture, focus timer, and cloud account chip.
- `src/views`: Route-level workflow screens.
- `public/sw.js`: Production service worker for app-shell and built-asset caching.
- `scripts/generate-pwa-icons.mjs`: Regenerates the PNG and Apple touch icons from the same simple app mark.
- `.github/workflows/ci.yml`: CI for unit tests, production build, Playwright e2e, and production offline smoke.

More implementation detail is in `docs/ARCHITECTURE.md`.

## Prerequisites

- Node.js `20.19.x` is recommended. This repo includes `.nvmrc`.
- npm `10` or newer.
- Chromium dependencies for Playwright. Locally, `npx playwright install chromium` is usually enough; CI uses `npx playwright install --with-deps chromium`.

## Fresh Checkout

```bash
nvm use
npm ci
npm run dev
```

Then open `http://127.0.0.1:5173`.

For a local-only run, leave `VITE_DEXIE_CLOUD_DB_URL` empty or unset. The top bar should show `Local only`, and all task data stays in that browser's IndexedDB.

Use these checks before shipping a change:

```bash
npm test
npm run build
npm run e2e
npm run smoke:production
npm audit --audit-level=moderate
```

`npm run preview` serves the current `dist/` build at `http://127.0.0.1:4173` by default. Run `npm run build` first if you want to preview the latest source.

Generated output such as `node_modules/`, `dist/`, `test-results/`, Playwright reports, coverage, `.DS_Store`, and TypeScript build info is ignored by Git.

## Local Development

Common commands:

```bash
npm ci
npm run dev
npm test
npm run build
npm run e2e
npm run preview
npm run smoke:production
```

## Optional Dexie Cloud Setup

1. Create a Dexie Cloud database:

   ```bash
   npx dexie-cloud create
   ```

2. Whitelist every origin that will use sync:

   ```bash
   npx dexie-cloud whitelist http://127.0.0.1:5173
   npx dexie-cloud whitelist https://<your-project>.pages.dev
   ```

3. Copy `.env.example` to `.env.local`.
4. Set:

   ```bash
   VITE_DEXIE_CLOUD_DB_URL=https://<your-db>.dexie.cloud
   ```

5. Restart the dev server.
6. Use the top-bar account chip to sign in with email.

Do not commit `.env.local`, Dexie Cloud keys, or local CLI secret files.

## Cloudflare Pages Deployment

Use Cloudflare Pages Git integration:

- Framework preset: React/Vite
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Environment variables:
  - `NODE_VERSION=20.19.4`
  - `VITE_DEXIE_CLOUD_DB_URL=https://<your-db>.dexie.cloud` when cloud sync should be enabled

GitHub Actions runs CI only. Cloudflare Pages performs the actual deployment.

Detailed deployment steps are in `docs/DEPLOYMENT.md`.

Manual cross-device acceptance after deployment:

- Sign in on the computer and phone with the same email.
- Create a task on the computer and verify it appears on the phone.
- Edit the task on the phone and verify the change appears on the computer.
- Turn one device offline, create a task, reconnect, click `Sync now`, and verify the other device receives it.

## Troubleshooting

- `npm ci` fails with a Node engine error: switch to Node `20.19.x` with `nvm use`.
- Playwright cannot find Chromium: run `npx playwright install chromium`.
- The top bar says `Local only`: `VITE_DEXIE_CLOUD_DB_URL` is not set in the build environment. This is expected for local-only use.
- Local data is missing on the hosted URL: IndexedDB is origin-scoped. Export JSON from the old origin, import it on the new origin, then sync.
- Offline reload fails in production preview: run `npm run build` and then `npm run smoke:production`; the smoke test verifies first-load cache population and offline reload.
- Phone home-screen icon looks wrong: run `node scripts/generate-pwa-icons.mjs`, rebuild, redeploy, and clear the old installed shortcut.

## How To Make Changes Safely

- Change domain behavior in `src/domain` first and add unit tests.
- Change persistence through `src/persistence/db.ts` helpers instead of writing directly to Dexie tables from UI code.
- Change app workflows in `BrainStore` so every view stays derived from the same model.
- Keep normal edits row-level. Use full database replacement only for JSON import and demo reset.
- Keep hosted/cloud behavior optional. The app must still work when `VITE_DEXIE_CLOUD_DB_URL` is empty.

## Test Coverage

Current coverage includes:

- Domain rules and selectors.
- Project health.
- WIP enforcement.
- Recurring tasks.
- Review resurfacing.
- Import/export.
- Import validation and destructive import/reset confirmation.
- Task card workflow actions.
- Row-level persistence calls.
- Basic accessibility behavior for collapsible sections, dialogs, and capture announcements.
- Cloud account state and top-bar account UI.
- Cloud sync actions that pull after login and push/pull on manual sync.
- Playwright flows for capture, triage, menus, details, focus timer, projects, reviews, export controls, local-only cloud status, and mobile navigation.
- Production offline smoke for first-load service-worker caching and offline reload.
