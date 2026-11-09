/* Service worker PAS-SIAGA: halaman lapangan dan berkas statis tetap terbuka saat tanpa sinyal.
   Hanya halaman /lapangan yang disimpan; permintaan lain dan aksi server tidak pernah dicache. */
const VERSI = "pas-siaga-v1";
const SHELL = ["/lapangan", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "bersihkan") e.waitUntil(caches.delete(VERSI));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg") {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const salin = res.clone();
        caches.open(VERSI).then((c) => c.put(req, salin));
        return res;
      }))
    );
    return;
  }

  if (req.mode === "navigate" && url.pathname.startsWith("/lapangan")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const salin = res.clone();
            caches.open(VERSI).then((c) => c.put(req, salin));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/lapangan")))
    );
  }
});
