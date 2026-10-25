/**
 * Service Worker der KickTime-Team-App – Mitteilungen ans Team und Offline-Reserve.
 *
 * Offline: Netz zuerst. Jede erfolgreiche Antwort (gleiche Herkunft) landet
 * im Zwischenspeicher und wird NUR genutzt, wenn das Netz fehlt oder hängt.
 * So bleibt nie eine veraltete Version hängen, im Funkloch öffnet die App
 * aber trotzdem. Registrierung nur im Produktions-Build (siehe src/lib/push.ts).
 */

const CACHE = "kicktime-team-offline-v1";
const MAX_ENTRIES = 150;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const navigate = request.mode === "navigate";
  try {
    // Bei schwachem Netz nicht ewig warten – dann lieber den gespeicherten Stand.
    const response = await withTimeout(fetch(request), navigate ? 5000 : 10000);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      void trim(cache);
    }
    return response;
  } catch (err) {
    const hit = (await cache.match(request)) || (navigate ? await cache.match("/") : undefined);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Versionsabfrage (Update-Hinweis) nie zwischenspeichern – sie soll den
  // Offline-Speicher nicht füllen und immer den echten Stand liefern.
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  if (url.pathname === "/version.json") return;
  event.respondWith(networkFirst(request));
});

/**
 * Die Mitteilungen sind für die KickTime-App gedacht und nennen deren Seiten
 * (z. B. /einstellungen). Hier öffnen sie den passenden Bereich der Team-App.
 */
function teamUrl(payload) {
  const tag = String(payload.tag || "");
  const body = `${payload.title || ""} ${payload.body || ""}`;
  if (tag.startsWith("alert-") || /Problem|in Ordnung|Test/i.test(body)) return "/live";
  if (/Entsperr|Antrag/i.test(body)) return "/antraege";
  return "/";
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "KickTime-Team", {
      body: payload.body || "",
      tag: payload.tag || "kicktime-team",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: teamUrl(payload) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          // navigate() schlägt bei nicht gesteuerten Fenstern fehl – dann reicht der Fokus.
          return client
            .focus()
            .then((c) => (c && "navigate" in c ? c.navigate(url) : undefined))
            .catch(() => undefined);
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    }),
  );
});
