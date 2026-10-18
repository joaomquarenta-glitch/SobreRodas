// SobreRodas: funciona offline e abre depressa como app instalada.
// Código do site: rede primeiro (para receber logo as novidades), cache se não houver rede.
// Dados: rede primeiro, cache como reserva. Fotos, camisolas e letras: cache primeiro.
const VERSION = "sr-1";
const SHELL = ["./", "index.html", "app.js", "styles.css", "config.js", "legends.js", "icon.svg", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(`${VERSION}-shell`).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (/\/(photos|shirts)\/[^/]+\.(jpg|png)$/.test(url.pathname) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(cacheFirst(req, `${VERSION}-media`));
  } else if (url.pathname.endsWith(".json")) {
    e.respondWith(networkFirst(req, `${VERSION}-data`));
  } else if (url.origin === location.origin) {
    e.respondWith(networkFirst(req, `${VERSION}-shell`));
  }
});
