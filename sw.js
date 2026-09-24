/* Balance Personal — service worker
   Guarda la app en el teléfono para que abra sin internet.
   VERSION la reemplaza el script de armado en cada publicación. */
const VERSION = "bp-20260924-190942";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "bp-fuentes").map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* la página: primero red (para recibir mejoras), si no hay señal la copia guardada */
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(req).then(r => {
        const copia = r.clone();
        caches.open(VERSION).then(c => c.put("./index.html", copia));
        return r;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* archivos propios: primero caché */
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const copia = r.clone();
        caches.open(VERSION).then(c => c.put(req, copia));
        return r;
      }))
    );
    return;
  }

  /* tipografías de Google: se sirven de caché y se renuevan de fondo */
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(
      caches.open("bp-fuentes").then(async c => {
        const hit = await c.match(req);
        const red = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || red;
      })
    );
  }
});
