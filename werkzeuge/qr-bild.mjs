// Macht aus einer QR-Matrix ein PNG - mit demselben kleinen PNG-Schreiber
// wie der Icon-Generator, also ohne fremde Bibliotheken.
//
// Aufruf:  node werkzeuge/qr-bild.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));

// Die Matrix: eine Zeile je Modulreihe, 1 = dunkel.
const MATRIX = `
11111110111111100100001111111
10000010101010001001001000001
10111010111101011011001011101
10111010011001011111101011101
10111010110001001011001011101
10000010010010001100101000001
11111110101010101010101111111
00000000001111001001000000000
10011111111110001111110010111
11011000100011110001010110110
10010010100101010000011010100
00100001110110000101001111001
10001110011110010001101100001
11100001101101111010001111111
00100110101111010111101010101
11011101000100000001111100101
01000110001011010010000101000
11001101010000110101100010110
11011010011101111011001011001
11011101111011111011100111100
11011110101010101100111111110
00000000111000010010100011000
11111110111110110111101011000
10000010111010010101100010000
10111010100111101011111111010
10111010101011110001000000001
10111010001100110001010110111
10000010000110111010010001101
11111110101010111011100111000
`.trim().split('\n').map((z) => z.trim());

const ZELLE = 16;   // Pixel je Modul
const RAND = 4;     // Ruhezone in Modulen (Norm: mindestens 4)

const DUNKEL = [11, 14, 19];    // #0B0E13
const HELL = [255, 255, 255];

const module = MATRIX.length;
const kante = (module + RAND * 2) * ZELLE;

// --- Bild zeichnen ----------------------------------------------------------
const daten = new Uint8Array(kante * kante * 4);

for (let y = 0; y < kante; y += 1) {
  for (let x = 0; x < kante; x += 1) {
    const spalte = Math.floor(x / ZELLE) - RAND;
    const zeile = Math.floor(y / ZELLE) - RAND;

    const dunkel =
      zeile >= 0 && zeile < module && spalte >= 0 && spalte < module &&
      MATRIX[zeile][spalte] === '1';

    const farbe = dunkel ? DUNKEL : HELL;
    const pos = (y * kante + x) * 4;
    daten[pos] = farbe[0];
    daten[pos + 1] = farbe[1];
    daten[pos + 2] = farbe[2];
    daten[pos + 3] = 255;
  }
}

// --- PNG schreiben ----------------------------------------------------------

const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(puffer) {
  let c = 0xffffffff;
  for (const byte of puffer) c = CRC_TABELLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(typ, inhalt) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(inhalt.length, 0);
  const koerper = Buffer.concat([Buffer.from(typ, 'ascii'), inhalt]);
  const pruef = Buffer.alloc(4);
  pruef.writeUInt32BE(crc32(koerper), 0);
  return Buffer.concat([laenge, koerper, pruef]);
}

function alsPng(breite, hoehe, rgba) {
  const roh = Buffer.alloc(hoehe * (1 + breite * 4));
  for (let y = 0; y < hoehe; y += 1) {
    const ziel = y * (1 + breite * 4);
    roh[ziel] = 0;
    Buffer.from(rgba.buffer, y * breite * 4, breite * 4).copy(roh, ziel + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(roh, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const datei = join(HIER, '..', '..', 'mein-tag-qr.png');
writeFileSync(datei, alsPng(kante, kante, daten));
console.log(`geschrieben: mein-tag-qr.png (${kante}x${kante}, ${module} Module)`);
