const CACHE_NAME = "gym-tracker-v20";
const ASSETS = [
  "./",
  "./index.html",
  "./exercises.html",
  "./exercise-detail.html",
  "./stats.html",
  "./profile.html",
  "./programs.html",
  "./ai-coach.html",
  "./app-data.js",
  "./fonts.css",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./cairo-arabic-800.woff2",
  "./cairo-latin-800.woff2",
  "./cairo-arabic-900.woff2",
  "./cairo-latin-900.woff2",
  "./tajawal-arabic-400.woff2",
  "./tajawal-latin-400.woff2",
  "./tajawal-arabic-500.woff2",
  "./tajawal-latin-500.woff2",
  "./tajawal-arabic-700.woff2",
  "./tajawal-latin-700.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for our own files: try to get the latest version when
// online (so edits to index.html/app.bundle.js show up right away),
// and fall back to the cached copy when there's no connection.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // let external requests (e.g. fonts) pass through normally

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
