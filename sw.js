/* =========================================================
   sw.js — service worker: lets the app open with no signal.

   App files: network first (so edits show up right away),
   falling back to the cached copy when offline or when the
   network takes longer than NETWORK_TIMEOUT_MS.
   Chart.js and the Manrope font: cached once, then served from the cache (their URLs
   include the version, so they never change).

   Bump CACHE_VERSION if you add or rename app files.
   Your data is NOT stored here; it's in localStorage.
   ========================================================= */

const CACHE_VERSION = "tracker-v3";
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
    await cache.addAll(APP_FILES.map((url) => new Request(url, { cache: "reload" })));   // skip the browser's saved copies
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

  // Chart.js and the Manrope font never change at a given URL: cache once, reuse offline.
  if (req.url === CHART_URL || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
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
  // "opaque" = a cross-site response the page can use but not read (e.g. the font stylesheet).
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  // "no-cache" = always check with the server instead of reusing the browser's
  // saved copy (GitHub Pages lets browsers reuse files for 10 minutes), so a
  // new version shows up the first time the app is opened online.
  const fresh = req.mode === "navigate"
    ? new Request(req.url, { cache: "no-cache", credentials: "same-origin" })
    : new Request(req, { cache: "no-cache" });
  const network = fetch(fresh).then((res) => {
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
