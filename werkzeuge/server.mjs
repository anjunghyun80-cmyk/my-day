// Ein winziger Webserver zum Ausprobieren auf dem eigenen Rechner.
//
//   node werkzeuge/server.mjs        -> http://localhost:8080
//   node werkzeuge/server.mjs 3000   -> anderer Port
//
// Warum ueberhaupt ein Server? ES-Module und der Service Worker laufen nicht,
// wenn man die index.html direkt per Doppelklick oeffnet (file://).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8080;

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ics': 'text/calendar; charset=utf-8',
  '.zip': 'application/zip',
};

const server = createServer(async (anfrage, antwort) => {
  try {
    const pfad = decodeURIComponent(new URL(anfrage.url, 'http://x').pathname);
    let datei = normalize(join(WURZEL, pfad));

    // Niemand soll aus dem Projektordner herausklettern koennen.
    if (!datei.startsWith(WURZEL + sep) && datei !== WURZEL) {
      antwort.writeHead(403).end('Verboten');
      return;
    }

    const info = await stat(datei).catch(() => null);
    if (info?.isDirectory()) datei = join(datei, 'index.html');

    const inhalt = await readFile(datei);
    antwort.writeHead(200, {
      'Content-Type': TYPEN[extname(datei)] ?? 'application/octet-stream',
      // Beim Entwickeln wollen wir immer die frischen Dateien sehen.
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/',
      // Erlaubt, die Dateien von einer anderen Seite aus zu holen -
      // gebraucht beim Hochladen zu einem Hoster. Nur lokal, harmlos.
      'Access-Control-Allow-Origin': '*',
    });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nicht gefunden');
  }
});

server.listen(PORT, () => {
  console.log(`Mein Tag laeuft auf http://localhost:${PORT}`);
  console.log('Zum Beenden: Strg + C');
});
