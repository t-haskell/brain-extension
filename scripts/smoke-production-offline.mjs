import http from "node:http";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = process.env.SMOKE_PORT ?? "4173";
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"],
  {
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

const serverOutput = [];

server.stdout.on("data", (chunk) => {
  serverOutput.push(chunk.toString());
});

server.stderr.on("data", (chunk) => {
  serverOutput.push(chunk.toString());
});

function stopServer() {
  if (!server.killed) {
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    const isReady = await new Promise((resolve) => {
      const request = http.get(baseUrl, (response) => {
        response.resume();
        resolve(response.statusCode && response.statusCode < 500);
      });

      request.on("error", () => resolve(false));
      request.setTimeout(500, () => {
        request.destroy();
        resolve(false);
      });
    });

    if (isReady) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Production preview did not start at ${baseUrl}.\n${serverOutput.join("")}`);
}

async function waitForServiceWorker(page) {
  const controlled = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return false;
    }

    await navigator.serviceWorker.ready;

    if (navigator.serviceWorker.controller) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(false), 5000);
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.clearTimeout(timeout);
          resolve(true);
        },
        { once: true }
      );
    });
  });

  if (!controlled) {
    throw new Error("Service worker did not control the production page after first load.");
  }
}

async function assertBuiltAssetsCached(page) {
  const cachedPaths = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const paths = [];

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      paths.push(...requests.map((request) => new URL(request.url).pathname));
    }

    return paths;
  });

  if (!cachedPaths.some((path) => /^\/assets\/.+\.js$/.test(path))) {
    throw new Error(`Service worker cache is missing built JS assets.\nCached paths:\n${cachedPaths.join("\n")}`);
  }

  if (!cachedPaths.some((path) => /^\/assets\/.+\.css$/.test(path))) {
    throw new Error(`Service worker cache is missing built CSS assets.\nCached paths:\n${cachedPaths.join("\n")}`);
  }
}

async function main() {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  const browserErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByTestId("quick-capture-input").waitFor({ timeout: 10_000 });
    await waitForServiceWorker(page);
    await assertBuiltAssetsCached(page);

    const devtools = await context.newCDPSession(page);
    await devtools.send("Network.clearBrowserCache");

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("quick-capture-input").waitFor({ timeout: 10_000 });

    if (browserErrors.length > 0) {
      throw new Error(`Browser errors during production/offline smoke:\n${browserErrors.join("\n")}`);
    }
  } finally {
    await browser.close();
  }
}

main()
  .then(() => {
    console.log("Production preview and offline reload smoke passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    stopServer();
  });
