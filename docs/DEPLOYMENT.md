# Deployment And Sync Runbook

This app is designed to deploy as a static Vite/PWA app on Cloudflare Pages while using Dexie Cloud for optional account-backed sync.

## What Runs Where

```text
GitHub
  -> GitHub Actions: CI only

Cloudflare Pages
  -> Builds `npm run build`
  -> Serves `dist`
  -> Provides preview and production URLs

Dexie Cloud
  -> Authenticates by email OTP
  -> Syncs task/project data and the single settings row between signed-in browsers
```

There is no custom backend and no Cloudflare Worker in v1.

The production shape that supports computer and phone use is:

```text
One Cloudflare Pages HTTPS URL
  -> installed or opened on the computer
  -> installed or opened on the phone
  -> both signed in to the same Dexie Cloud database with the same email
```

## Runtime Prerequisites

- Node.js `20.19.x` is the pinned project runtime. The repo includes `.nvmrc`.
- npm `10` or newer.
- Cloudflare Pages should set `NODE_VERSION=20.19.4`.
- Dexie Cloud is optional. Without `VITE_DEXIE_CLOUD_DB_URL`, the app intentionally runs in local-only mode.

## One-Time Dexie Cloud Setup

Create the cloud database:

```bash
npx dexie-cloud create
```

Copy the database URL. It should look like:

```text
https://<your-db>.dexie.cloud
```

Do not commit generated keys or secret files. This repo ignores `.env.local`, `dexie-cloud.key`, and local Dexie Cloud JSON files.

Whitelist every origin that should sync:

```bash
npx dexie-cloud whitelist http://127.0.0.1:5173
npx dexie-cloud whitelist https://<your-project>.pages.dev
```

If you attach a custom domain later, whitelist that origin too:

```bash
npx dexie-cloud whitelist https://tasks.example.com
```

## Local Sync Testing

Create `.env.local`:

```bash
cp .env.example .env.local
```

Set:

```bash
VITE_DEXIE_CLOUD_DB_URL=https://<your-db>.dexie.cloud
```

Run:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`, use the top-bar account chip, and sign in with email.

The sign-in action forces an initial pull from Dexie Cloud after login. The `Sync now` button forces a push of local edits and then a pull of remote edits, which gives a concrete checkpoint when testing multiple devices.

Settings are stored in the synced `appSettings` table. Changing theme, timezone, active WIP limit, focus timer default, or start page on one signed-in browser should follow the same push/pull checkpoint as task edits. Without `VITE_DEXIE_CLOUD_DB_URL`, settings still persist in that browser only.

## Cloudflare Pages Setup

In Cloudflare:

1. Create a Pages project.
2. Connect the GitHub repository.
3. Use the React/Vite preset or set manually:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Production branch: `main`
4. Add environment variables for both Preview and Production:
   - `NODE_VERSION=20.19.4`
   - `VITE_DEXIE_CLOUD_DB_URL=https://<your-db>.dexie.cloud`
5. Deploy.

Cloudflare Pages Git integration will build pushed commits and pull-request previews.

The hosted URL must be HTTPS for service workers, installability, and reliable cross-device sync behavior. Cloudflare Pages provides HTTPS for the default `*.pages.dev` URL and any correctly configured custom domain.

## GitHub CI

`.github/workflows/ci.yml` runs:

```bash
npm ci
npx playwright install --with-deps chromium
npm test
npm run build
npm run e2e
npm run smoke:production
```

Recommended repository settings:

- Protect `main`.
- Require the `CI / test-build-e2e` check before merging.
- Let Cloudflare deploy only after changes reach `main`.

## Moving Data From Localhost To Hosted App

Browser storage is scoped by origin. `http://127.0.0.1:5173` and `https://<project>.pages.dev` do not share IndexedDB.

To migrate current local data:

1. Open local `Explorer`.
2. Click JSON export.
3. Open the Cloudflare Pages app.
4. Sign in.
5. Paste the JSON into `Explorer` import.
6. Click import.
7. Click `Sync now` in the account chip.

After that, future edits should sync through Dexie Cloud.

## Computer And Phone Acceptance Checklist

Run this after Cloudflare and Dexie Cloud are configured:

- Open the Cloudflare Pages production URL on the computer.
- Sign in with email and wait for the account chip to show the signed-in address.
- Open the same URL on the phone.
- Add it to the home screen if desired.
- Sign in with the same email on the phone.
- Create a task on the computer and click `Sync now`.
- Confirm the task appears on the phone.
- Edit that task on the phone and click `Sync now`.
- Confirm the edit appears on the computer.
- Change the active WIP limit or theme in `Settings`, click `Sync now`, and confirm the setting appears on the other signed-in device after sync.
- Put the phone offline, create a task, bring the phone online, click `Sync now`, and confirm the computer receives the task.
- Reload the installed phone app after one successful load while offline; the app shell should render and existing local task data should be visible from IndexedDB.

Current v1 scope: Dexie Cloud sync runs while the app is open. The app-shell service worker caches the UI for offline reloads, but it does not run Dexie Cloud background sync while the phone app is fully closed.

## Manual Acceptance Checklist

After first deployment:

- Production app loads on Cloudflare Pages.
- Top bar shows `Sign in to sync`, not `Local only`.
- Email OTP sign-in completes.
- Create a task on one browser.
- Open another browser or device and sign in with the same email.
- Confirm the new task appears.
- Change a setting such as active WIP limit and confirm it syncs to the other signed-in browser after `Sync now`.
- Turn network off, capture a task, turn network on, and click `Sync now`.
- Confirm the task appears on the other signed-in browser.
- JSON export still works.
- Reload after one successful production load while offline; the app shell should still render. Task data is read from IndexedDB, not the service worker cache.

Checks that require real accounts or credentials are manual: Dexie Cloud database creation, email OTP sign-in, cross-device sync, and Cloudflare Pages deployment.

## Troubleshooting

### Top bar says Local only on Cloudflare

`VITE_DEXIE_CLOUD_DB_URL` is missing from the Cloudflare Pages environment. Add it to both Preview and Production and redeploy.

### Cloudflare uses the wrong Node version

Set `NODE_VERSION=20.19.4` in the Pages environment variables and redeploy.

### Local data did not appear after deploy

This is expected because IndexedDB is origin-scoped. Use JSON export/import once.

### Sign-in code does not arrive

Check the email address, spam folder, and Dexie Cloud dashboard/user policy. Confirm `socialAuth: false` is expected for this app because v1 uses email OTP only.

### E2E fails in CI because the dev server port is busy

Playwright starts the Vite dev server through `playwright.config.ts` and reuses an existing server when present. Check the CI logs for the server startup section before changing tests.

### Offline reload fails after deploy

Run `npm run build` followed by `npm run smoke:production` locally. The smoke test starts a production preview, waits for the service worker, clears the browser HTTP cache, reloads offline, and verifies the app still renders.

### Computer and phone do not share updates

Confirm both devices are on the same Cloudflare Pages URL, both are signed in with the same email, and `VITE_DEXIE_CLOUD_DB_URL` is set in the deployed build. Use `Sync now` on both devices to force a push/pull checkpoint before investigating deeper.
