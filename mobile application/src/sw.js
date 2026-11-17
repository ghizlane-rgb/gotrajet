/* GOTRAJET offline service worker (browser / installed web app only; the native app ships its files).
   VERSION and FILES are filled in by scripts/build-www.mjs. */
const VERSION = "__VERSION__";
const FILES = __FILES__;
const CACHE = "gotrajet-" + VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("gotrajet-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Other sites (Google Maps) and the API always go to the network.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  // Video is streamed with Range requests: leave it to the network.
  if (req.headers.has("range") || url.pathname.includes("/assets/video/")) return;

  // Page loads: the app shell, served from the cache so the app opens offline.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html", { ignoreSearch: true }).then(
        (cached) =>
          cached ||
          fetch(req).catch(() => new Response("GOTRAJET: offline", { status: 503, headers: { "Content-Type": "text/plain" } })),
      ),
    );
    return;
  }

  // Files: cache first, then the network (and keep a copy for next time).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
