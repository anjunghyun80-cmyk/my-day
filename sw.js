// Service Worker - dafuer da, dass die App auch ohne Internet laeuft.
//
// Idee: Beim Installieren legen wir alle Dateien in einen Cache. Danach
// antworten wir sofort aus dem Cache - und holen die Datei gleichzeitig im
// Hintergrund neu, damit beim naechsten Start die frische Fassung da ist.
// Dieses Vorgehen heisst "stale while revalidate": immer schnell, nie
// dauerhaft veraltet.
//
// Tipp: Wenn du die App aenderst, erhoehe CACHE_NAME. Dann werden die alten
// Dateien sofort weggeworfen statt erst beim naechsten Start.

const CACHE_NAME = 'mein-tag-v6';

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/stil.css',

  './js/app.js',
  './js/konfiguration.js',
  './js/speicher.js',
  './js/dateien.js',

  './js/daten/kategorien.js',
  './js/daten/standardplan.js',
  './js/daten/glowup.js',

  './js/logik/zeit.js',
  './js/logik/plan.js',
  './js/logik/snapshot.js',
  './js/logik/streak.js',
  './js/logik/statistik.js',
  './js/logik/ics.js',
  './js/logik/backup.js',
  './js/logik/zustand.js',
  './js/logik/aufgaben.js',
  './js/logik/tagesabschluss.js',
  './js/logik/workout.js',
  './js/logik/farbe.js',
  './js/logik/glowup.js',

  './js/ui/dom.js',
  './js/ui/icons.js',
  './js/ui/thema.js',
  './js/ui/feier.js',
  './js/ui/heute.js',
  './js/ui/woche.js',
  './js/ui/sport.js',
  './js/ui/statistik.js',
  './js/ui/planEditor.js',
  './js/ui/glowup.js',
  './js/ui/einstellungen.js',

  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Installieren: alles in den Cache legen.
self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(DATEIEN)),
  );
  // Nicht auf das Schliessen alter Tabs warten.
  self.skipWaiting();
});

// Aktivieren: alte Caches wegwerfen.
self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches
      .keys()
      .then((namen) =>
        Promise.all(namen.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

// Anfragen beantworten.
self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;

  // Nur GET-Anfragen aus dem eigenen Ordner interessieren uns.
  if (anfrage.method !== 'GET') return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  ereignis.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const ausCache = await cache.match(anfrage, { ignoreSearch: true });

      // Im Hintergrund frisch holen und den Cache auffrischen.
      const ausNetz = fetch(anfrage)
        .then((antwort) => {
          if (antwort.ok && antwort.type === 'basic') cache.put(anfrage, antwort.clone());
          return antwort;
        })
        .catch(() => null);

      // Ist die Datei im Cache, antworten wir sofort damit.
      if (ausCache) return ausCache;

      const frisch = await ausNetz;
      if (frisch) return frisch;

      // Offline und nichts im Cache: bei Seitenaufrufen die Startseite zeigen.
      if (anfrage.mode === 'navigate') {
        const start = await cache.match('./index.html');
        if (start) return start;
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }),
  );
});
