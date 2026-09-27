// Speichern auf dem Geraet - mehr passiert nicht. Kein Server, kein Login,
// kein Tracking. Alles liegt im localStorage des Browsers.

import { normalisiere, leererZustand } from './logik/zustand.js';

const SCHLUESSEL = 'mein-tag/zustand/v1';

/** Laedt den Zustand. Bei Problemen gibt es einen frischen Zustand. */
export function ladeZustand() {
  try {
    const text = localStorage.getItem(SCHLUESSEL);
    if (!text) return leererZustand();
    return normalisiere(JSON.parse(text));
  } catch (fehler) {
    console.warn('Konnte den Zustand nicht laden:', fehler);
    return leererZustand();
  }
}

/** Speichert den Zustand. Gibt zurueck, ob es geklappt hat. */
export function speichereZustand(zustand) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(zustand));
    return true;
  } catch (fehler) {
    console.warn('Konnte den Zustand nicht speichern:', fehler);
    return false;
  }
}

/** Loescht alles. */
export function loescheAlles() {
  try {
    localStorage.removeItem(SCHLUESSEL);
  } catch (fehler) {
    console.warn('Konnte nicht löschen:', fehler);
  }
}

/**
 * Bittet den Browser, den Speicher dauerhaft zu behalten - damit iOS die
 * Daten nicht bei Platzmangel wegraeumt. Schlaegt still fehl, wenn der
 * Browser das nicht kann.
 */
export async function bitteUmDauerhaftenSpeicher() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
