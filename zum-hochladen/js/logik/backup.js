// Backup: den kompletten Zustand als JSON-Datei sichern und wieder einlesen.

import { normalisiere, ZUSTAND_VERSION } from './zustand.js';

/** Erzeugt den Text der Backup-Datei (lesbar eingerueckt). */
export function erzeugeBackup(zustand, jetzt = new Date()) {
  return JSON.stringify(
    {
      app: 'mein-tag',
      version: ZUSTAND_VERSION,
      erstelltAm: jetzt.toISOString(),
      daten: zustand,
    },
    null,
    2,
  );
}

/** Dateiname mit Datum, z. B. "mein-tag-backup-2026-09-20.json". */
export function backupDateiname(jetzt = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `mein-tag-backup-${jetzt.getFullYear()}-${p(jetzt.getMonth() + 1)}-${p(jetzt.getDate())}.json`;
}

/**
 * Liest eine Backup-Datei ein.
 * @returns {{ok:true, zustand:object} | {ok:false, fehler:string}}
 */
export function leseBackup(text) {
  let roh;
  try {
    roh = JSON.parse(text);
  } catch {
    return { ok: false, fehler: 'Die Datei ist kein gültiges JSON.' };
  }

  if (!roh || typeof roh !== 'object') {
    return { ok: false, fehler: 'Die Datei hat nicht den erwarteten Aufbau.' };
  }

  // Wir akzeptieren beides: die Huelle mit "daten" oder direkt den Zustand.
  const daten = roh.app === 'mein-tag' ? roh.daten : roh;

  if (!daten || typeof daten !== 'object' || !daten.plan) {
    return { ok: false, fehler: 'In der Datei steckt kein Wochenplan.' };
  }

  return { ok: true, zustand: normalisiere(daten) };
}
