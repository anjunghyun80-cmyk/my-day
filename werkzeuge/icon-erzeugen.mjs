// Erzeugt die App-Icons als PNG - ganz ohne fremde Bibliotheken.
//
// Aufruf:  node werkzeuge/icon-erzeugen.mjs
//
// Das Logo: ein fast geschlossener oranger Fortschrittsring auf dunklem Grund,
// darin ein weisser Haken. Genau das, was die App macht - und auf dem
// Home-Bildschirm faellt ein dunkles Icon zwischen lauter bunten auf.
//
// Wir rechnen das Bild Pixel fuer Pixel aus und schreiben es als PNG.
// PNG ist gut dokumentiert: ein paar "Chunks" mit Pruefsumme, die Bilddaten
// werden mit zlib gepackt - und genau das kann Node von Haus aus.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const ICON_ORDNER = join(HIER, '..', 'icons');

// --- Farben -----------------------------------------------------------------
const GRUND_OBEN = [26, 34, 48];   // #1A2230
const GRUND_UNTEN = [10, 13, 19];  // #0A0D13
const AKZENT = [235, 104, 52];     // #EB6834 - die Standard-Akzentfarbe der App
const WEISS = [255, 255, 255];

// --- Geometrie (alles als Anteil der Kantenlaenge) ---------------------------
const RING_RADIUS = 0.335;
const RING_DICKE = 0.072;
/** Der Ring beginnt oben und laeuft 298 Grad im Uhrzeigersinn - die Luecke
 *  oben rechts macht aus dem Kreis einen Fortschrittsring. */
const RING_START_GRAD = -90;
const RING_BOGEN_GRAD = 298;

const HAKEN_STRECKEN = [
  [0.352, 0.502, 0.452, 0.602],
  [0.452, 0.602, 0.660, 0.392],
];
const HAKEN_DICKE = 0.056;

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------

/** Kuerzester Abstand eines Punktes zu einer Strecke. */
function abstandZuStrecke(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const laengeQuadrat = dx * dx + dy * dy;
  let t = laengeQuadrat === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / laengeQuadrat;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Weicher Uebergang zwischen zwei Grenzen - unser Antialiasing. */
function weich(kante0, kante1, wert) {
  const t = Math.max(0, Math.min(1, (wert - kante0) / (kante1 - kante0)));
  return t * t * (3 - 2 * t);
}

/** Liegt dieser Winkel im gezeichneten Teil des Rings? */
function imBogen(grad) {
  return ((grad - RING_START_GRAD) % 360 + 360) % 360 <= RING_BOGEN_GRAD;
}

/**
 * Abstand zum Ring - inklusive runder Enden, damit der Bogen nicht
 * abgehackt aussieht.
 */
function abstandZuRing(u, v) {
  const dx = u - 0.5;
  const dy = v - 0.5;
  const grad = (Math.atan2(dy, dx) * 180) / Math.PI;

  if (imBogen(grad)) {
    return Math.abs(Math.hypot(dx, dy) - RING_RADIUS);
  }

  // Ausserhalb des Bogens zaehlt der Abstand zu den beiden Enden.
  const ende = (g) => {
    const b = (g * Math.PI) / 180;
    return [0.5 + Math.cos(b) * RING_RADIUS, 0.5 + Math.sin(b) * RING_RADIUS];
  };
  const [ax, ay] = ende(RING_START_GRAD);
  const [bx, by] = ende(RING_START_GRAD + RING_BOGEN_GRAD);
  return Math.min(Math.hypot(u - ax, v - ay), Math.hypot(u - bx, v - by));
}

/** Baut die Bilddaten (RGBA) fuer eine Kantenlaenge. */
function zeichneIcon(groesse) {
  const daten = new Uint8Array(groesse * groesse * 4);
  const weichzone = 1 / groesse; // etwa ein Pixel

  for (let y = 0; y < groesse; y += 1) {
    for (let x = 0; x < groesse; x += 1) {
      const u = (x + 0.5) / groesse;
      const v = (y + 0.5) / groesse;

      // 1. Hintergrund: sanfter Verlauf von oben nach unten
      const anteil = Math.max(0, Math.min(1, (u * 0.35 + v * 0.65)));
      let r = GRUND_OBEN[0] + (GRUND_UNTEN[0] - GRUND_OBEN[0]) * anteil;
      let g = GRUND_OBEN[1] + (GRUND_UNTEN[1] - GRUND_OBEN[1]) * anteil;
      let b = GRUND_OBEN[2] + (GRUND_UNTEN[2] - GRUND_OBEN[2]) * anteil;

      // 2. Der orange Ring
      const ringAbstand = abstandZuRing(u, v);
      const ringDeckung = 1 - weich(RING_DICKE / 2 - weichzone, RING_DICKE / 2 + weichzone, ringAbstand);
      r += (AKZENT[0] - r) * ringDeckung;
      g += (AKZENT[1] - g) * ringDeckung;
      b += (AKZENT[2] - b) * ringDeckung;

      // 3. Der weisse Haken
      let hakenAbstand = Infinity;
      for (const [x1, y1, x2, y2] of HAKEN_STRECKEN) {
        hakenAbstand = Math.min(hakenAbstand, abstandZuStrecke(u, v, x1, y1, x2, y2));
      }
      const hakenDeckung = 1 - weich(HAKEN_DICKE / 2 - weichzone, HAKEN_DICKE / 2 + weichzone, hakenAbstand);
      r += (WEISS[0] - r) * hakenDeckung;
      g += (WEISS[1] - g) * hakenDeckung;
      b += (WEISS[2] - b) * hakenDeckung;

      const pos = (y * groesse + x) * 4;
      daten[pos] = Math.round(r);
      daten[pos + 1] = Math.round(g);
      daten[pos + 2] = Math.round(b);
      daten[pos + 3] = 255; // deckend - iOS rundet die Ecken selbst
    }
  }

  return daten;
}

// ---------------------------------------------------------------------------
// PNG schreiben
// ---------------------------------------------------------------------------

const CRC_TABELLE = (() => {
  const tabelle = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabelle[n] = c >>> 0;
  }
  return tabelle;
})();

function crc32(puffer) {
  let c = 0xffffffff;
  for (const byte of puffer) c = CRC_TABELLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Ein PNG-Chunk: Laenge, Typ, Daten, Pruefsumme. */
function chunk(typ, daten) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length, 0);
  const koerper = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
  const pruef = Buffer.alloc(4);
  pruef.writeUInt32BE(crc32(koerper), 0);
  return Buffer.concat([laenge, koerper, pruef]);
}

function alsPng(breite, hoehe, rgba) {
  // Jede Bildzeile bekommt ein fuehrendes Filter-Byte (0 = kein Filter).
  const roh = Buffer.alloc(hoehe * (1 + breite * 4));
  for (let y = 0; y < hoehe; y += 1) {
    const ziel = y * (1 + breite * 4);
    roh[ziel] = 0;
    Buffer.from(rgba.buffer, y * breite * 4, breite * 4).copy(roh, ziel + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; // 8 Bit pro Kanal
  ihdr[9] = 6; // Farbtyp 6 = RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(roh, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Los
// ---------------------------------------------------------------------------

mkdirSync(ICON_ORDNER, { recursive: true });

for (const groesse of [180, 192, 512]) {
  const datei = join(ICON_ORDNER, `icon-${groesse}.png`);
  writeFileSync(datei, alsPng(groesse, groesse, zeichneIcon(groesse)));
  console.log(`geschrieben: icons/icon-${groesse}.png`);
}
