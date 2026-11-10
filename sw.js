/* Вістовий — service worker: network-first для сторінки й app assets; Google/Drive лише мережа. */
var CACHE = "vistovyi-v59";
var PRECACHE = [
  "./zvitnist.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./sw.js"
];

function sameOrigin(url) {
  try {
    return new URL(url, self.location.href).origin === self.location.origin;
  } catch (err) {
    return false;
  }
}

function isExternalApi(url) {
  try {
    var host = new URL(url, self.location.href).hostname;
    return (
      host === "accounts.google.com" ||
      host.endsWith(".googleapis.com") ||
      host === "googleapis.com" ||
      host.endsWith(".gstatic.com") ||
      host === "www.google.com" ||
      host === "google.com"
    );
  } catch (err) {
    return false;
  }
}

function isAppAsset(url) {
  if (!sameOrigin(url)) return false;
  var path = new URL(url, self.location.href).pathname;
  return (
    /\/zvitnist\.html$/i.test(path) ||
    /\/manifest\.webmanifest$/i.test(path) ||
    /\/sw\.js$/i.test(path) ||
    /\/icon-\d+\.png$/i.test(path) ||
    /\/zvit-[^/]+\.json$/i.test(path)
  );
}

function isHtmlOrShell(url) {
  if (!sameOrigin(url)) return false;
  var path = new URL(url, self.location.href).pathname;
  return /\/zvitnist\.html$/i.test(path) || /\/sw\.js$/i.test(path);
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = request.url;
  if (isExternalApi(url)) {
    // Google OAuth / Drive / GIS — тільки мережа, без кешу.
    event.respondWith(fetch(request));
    return;
  }

  if (!isAppAsset(url)) {
    // Інші запити не перехоплюємо агресивно.
    return;
  }

  // HTML / sw.js і решта app assets — network-first: свіже з мережі, офлайн з кешу.
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function () {
        return cache.match(request).then(function (cached) {
          if (cached) return cached;
          if (
            isHtmlOrShell(url) ||
            request.mode === "navigate" ||
            (request.headers.get("accept") || "").indexOf("text/html") !== -1
          ) {
            return cache.match("./zvitnist.html");
          }
          return cached;
        });
      });
    })
  );
});
