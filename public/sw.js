const CACHE_NAME = "command-shell-v2";
const CORE_ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
const HTML_ASSET_PATTERN = /(?:src|href)="([^"]+\.(?:js|css|svg|png|webp|ico|json)(?:\?[^"]*)?)"/g;

function toSameOriginUrl(path) {
  const url = new URL(path, self.location.origin);
  return url.origin === self.location.origin ? url.toString() : null;
}

function collectAssetUrls(html) {
  const urls = new Set(CORE_ASSETS.map((path) => toSameOriginUrl(path)).filter(Boolean));
  let match = HTML_ASSET_PATTERN.exec(html);

  while (match) {
    const url = toSameOriginUrl(match[1]);
    if (url) {
      urls.add(url);
    }
    match = HTML_ASSET_PATTERN.exec(html);
  }

  return [...urls];
}

async function cacheResponse(cache, request, response) {
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheUrl(cache, url) {
  try {
    const request = new Request(url, { cache: "reload" });
    const response = await fetch(request);
    await cacheResponse(cache, request, response);
  } catch {
    // One optional shell asset should not prevent install; the fetch handler
    // still reports a real offline miss instead of serving HTML as JS/CSS.
  }
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const indexRequest = new Request("/", { cache: "reload" });
  const indexResponse = await fetch(indexRequest);
  const html = await indexResponse.clone().text();
  await cacheResponse(cache, indexRequest, indexResponse);
  await cache.put("/index.html", new Response(html, { headers: { "Content-Type": "text/html" } }));

  await Promise.all(collectAssetUrls(html).map((url) => cacheUrl(cache, url)));
}

function isAssetRequest(request) {
  const url = new URL(request.url);
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
      ["script", "style", "worker", "image", "manifest", "font"].includes(request.destination))
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreVary: true });

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    return cacheResponse(cache, request, response);
  } catch {
    return new Response("", { status: 504, statusText: "Offline asset unavailable" });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    return cacheResponse(cache, request, response);
  } catch {
    return (
      (await cache.match(request, { ignoreVary: true })) ||
      (await cache.match("/", { ignoreVary: true })) ||
      (await cache.match("/index.html", { ignoreVary: true }))
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isAssetRequest(event.request)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
