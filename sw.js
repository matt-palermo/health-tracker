/* =========================================================
   sw.js — service worker: lets the app open with no signal.

   App files: network first (so edits show up right away),
   falling back to the cached copy when offline or when the
   network takes longer than NETWORK_TIMEOUT_MS.
   Chart.js: cached once, then served from the cache (its URL
   includes the version, so it never changes).

   Bump CACHE_VERSION if you add or rename app files.
   Your data is NOT stored here; it's in localStorage.
   ========================================================= */

const CACHE_VERSION = "tracker-v1";
const NETWORK_TIMEOUT_MS = 3000;
const CHART_URL = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";

const APP_FILES = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "data.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png"
];

// Install: download everything needed to run offline.
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(APP_FILES);
    try { await cache.add(CHART_URL); } catch (_) { /* fetched again on first use */ }
    await self.skipWaiting();
  })());
});

// Activate: remove caches from older versions.
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.url === CHART_URL) {
    event.respondWith(cacheFirst(req));
  } else if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  network.catch(() => {});   // a late failure after the timeout is fine; don't log it
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));

  try {
    // Whichever comes first: a network response, or the timeout.
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch (_) { /* offline: fall through to the cache */ }

  const hit = await cache.match(req, { ignoreSearch: true }) ||
    (req.mode === "navigate" ? await cache.match("index.html") : null);
  if (hit) return hit;
  return network;   // nothing cached yet: keep waiting for the network
}
