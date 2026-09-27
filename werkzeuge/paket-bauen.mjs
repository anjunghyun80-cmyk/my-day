// Packt die App in eine ZIP-Datei zum Hochladen.
//
// Aufruf:  node werkzeuge/paket-bauen.mjs
//
// Warum nicht einfach PowerShells Compress-Archive?
// Weil das auf Windows Backslashes als Pfadtrenner in die ZIP schreibt
// ("js\app.js"). Der ZIP-Standard verlangt aber Schraegstriche ("js/app.js").
// Linux-Server - und darauf laeuft jeder Hoster - lesen so einen Eintrag als
// EINEN Dateinamen mit einem komischen Zeichen darin. Die Ordner existieren
// dort dann gar nicht, und die App laedt nur eine leere Seite.
//
// Deshalb schreiben wir die ZIP hier selbst. Das Format ist ueberschaubar:
// pro Datei ein kleiner Kopf, dann die gepackten Daten, am Ende ein
// Inhaltsverzeichnis.

import { deflateRawSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Was in die App gehoert. Tests und Werkzeuge bleiben draussen. */
const MITNEHMEN = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'README.md',
  'css',
  'js',
  'icons',
];

// ---------------------------------------------------------------------------
// Dateien einsammeln
// ---------------------------------------------------------------------------

/** Sammelt alle Dateien unter einem Pfad, mit Pfaden relativ zur Wurzel. */
function sammle(pfad, gesammelt = []) {
  const voll = join(WURZEL, pfad);
  if (statSync(voll).isDirectory()) {
    for (const eintrag of readdirSync(voll)) sammle(join(pfad, eintrag), gesammelt);
  } else {
    gesammelt.push({
      // Immer Schraegstriche - darauf kommt es hier an.
      name: relative(WURZEL, voll).split('\\').join('/'),
      inhalt: readFileSync(voll),
    });
  }
  return gesammelt;
}

const dateien = MITNEHMEN.flatMap((p) => sammle(p));

// ---------------------------------------------------------------------------
// ZIP schreiben
// ---------------------------------------------------------------------------

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

/** Datum und Uhrzeit im alten DOS-Format, das die ZIP erwartet. */
function dosZeit(d = new Date()) {
  const zeit = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const datum = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { zeit, datum };
}

const { zeit, datum } = dosZeit();
const teile = [];
const verzeichnis = [];
let versatz = 0;

for (const datei of dateien) {
  const name = Buffer.from(datei.name, 'utf8');
  const gepackt = deflateRawSync(datei.inhalt, { level: 9 });
  const pruefsumme = crc32(datei.inhalt);

  // --- Kopf direkt vor den Daten ---
  const kopf = Buffer.alloc(30);
  kopf.writeUInt32LE(0x04034b50, 0);  // Erkennungszeichen
  kopf.writeUInt16LE(20, 4);          // benoetigte Version
  kopf.writeUInt16LE(0x0800, 6);      // Bit 11: Dateiname ist UTF-8
  kopf.writeUInt16LE(8, 8);           // Verfahren 8 = deflate
  kopf.writeUInt16LE(zeit, 10);
  kopf.writeUInt16LE(datum, 12);
  kopf.writeUInt32LE(pruefsumme, 14);
  kopf.writeUInt32LE(gepackt.length, 18);
  kopf.writeUInt32LE(datei.inhalt.length, 22);
  kopf.writeUInt16LE(name.length, 26);
  kopf.writeUInt16LE(0, 28);          // keine Zusatzfelder

  teile.push(kopf, name, gepackt);

  // --- Eintrag fuers Inhaltsverzeichnis am Ende ---
  const eintrag = Buffer.alloc(46);
  eintrag.writeUInt32LE(0x02014b50, 0);
  eintrag.writeUInt16LE(20, 4);       // erstellt mit Version
  eintrag.writeUInt16LE(20, 6);       // benoetigte Version
  eintrag.writeUInt16LE(0x0800, 8);
  eintrag.writeUInt16LE(8, 10);
  eintrag.writeUInt16LE(zeit, 12);
  eintrag.writeUInt16LE(datum, 14);
  eintrag.writeUInt32LE(pruefsumme, 16);
  eintrag.writeUInt32LE(gepackt.length, 20);
  eintrag.writeUInt32LE(datei.inhalt.length, 24);
  eintrag.writeUInt16LE(name.length, 28);
  eintrag.writeUInt32LE(versatz, 42);  // wo die Datei in der ZIP liegt

  verzeichnis.push(eintrag, name);
  versatz += kopf.length + name.length + gepackt.length;
}

const verzeichnisTeil = Buffer.concat(verzeichnis);

// --- Abschluss: wo das Inhaltsverzeichnis steht ---
const ende = Buffer.alloc(22);
ende.writeUInt32LE(0x06054b50, 0);
ende.writeUInt16LE(dateien.length, 8);
ende.writeUInt16LE(dateien.length, 10);
ende.writeUInt32LE(verzeichnisTeil.length, 12);
ende.writeUInt32LE(versatz, 16);

const ziel = join(WURZEL, 'mein-tag-zum-hochladen.zip');
writeFileSync(ziel, Buffer.concat([...teile, verzeichnisTeil, ende]));

const groesse = Math.round(statSync(ziel).size / 1024);
console.log(`geschrieben: mein-tag-zum-hochladen.zip (${dateien.length} Dateien, ${groesse} KB)`);
for (const d of dateien.slice(0, 4)) console.log(`   ${d.name}`);
console.log(`   … und ${dateien.length - 4} weitere`);
