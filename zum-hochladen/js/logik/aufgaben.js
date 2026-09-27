// Eigene Aufgaben - die To-do-Liste fuer einen einzelnen Tag.
//
// Unterschied zu den Bloecken: Bloecke kommen aus dem Wochenplan und wiederholen
// sich jede Woche. Aufgaben legst du spontan fuer genau einen Tag an
// ("Mathehausaufgabe abgeben", "Bibliotheksbuch zurueckbringen").
//
// Wie ueberall hier: reine Funktionen, die einen NEUEN Zustand zurueckgeben.

import { neueId } from './plan.js';
import { tagVerschieben } from './zeit.js';

/** Laenger darf ein Aufgabentext nicht sein. */
export const MAX_LAENGE = 120;

/** Baut eine neue Aufgabe. */
export function neueAufgabe(text, id = neueId()) {
  return { id, text: String(text).trim().slice(0, MAX_LAENGE), erledigt: false };
}

/** Alle Aufgaben eines Tages (nie undefined). */
export function aufgabenFuer(zustand, iso) {
  const liste = zustand.aufgaben?.[iso];
  return Array.isArray(liste) ? liste : [];
}

/** Ersetzt die Aufgabenliste eines Tages. */
function mitListe(zustand, iso, liste) {
  return { ...zustand, aufgaben: { ...(zustand.aufgaben ?? {}), [iso]: liste } };
}

/**
 * Legt eine Aufgabe an.
 * @returns {{zustand:object, aufgabe:object|null, fehler:string|null}}
 */
export function fuegeAufgabeHinzu(zustand, iso, text) {
  const sauber = String(text ?? '').trim();
  if (!sauber) {
    return { zustand, aufgabe: null, fehler: 'Schreib erst, was du vorhast.' };
  }

  const aufgabe = neueAufgabe(sauber);
  return {
    zustand: mitListe(zustand, iso, [...aufgabenFuer(zustand, iso), aufgabe]),
    aufgabe,
    fehler: null,
  };
}

/** Dreht das Haekchen einer Aufgabe um. */
export function schalteAufgabe(zustand, iso, id) {
  const liste = aufgabenFuer(zustand, iso).map((a) =>
    a.id === id ? { ...a, erledigt: !a.erledigt } : a,
  );
  return mitListe(zustand, iso, liste);
}

/** Aendert den Text einer Aufgabe. Leerer Text loescht sie nicht - das macht
 *  loescheAufgabe, damit nichts aus Versehen verschwindet. */
export function benenneAufgabeUm(zustand, iso, id, text) {
  const sauber = String(text ?? '').trim().slice(0, MAX_LAENGE);
  if (!sauber) return zustand;
  const liste = aufgabenFuer(zustand, iso).map((a) =>
    a.id === id ? { ...a, text: sauber } : a,
  );
  return mitListe(zustand, iso, liste);
}

/** Loescht eine Aufgabe. */
export function loescheAufgabe(zustand, iso, id) {
  return mitListe(
    zustand,
    iso,
    aufgabenFuer(zustand, iso).filter((a) => a.id !== id),
  );
}

/** Loescht alle bereits erledigten Aufgaben eines Tages. */
export function loescheErledigte(zustand, iso) {
  const liste = aufgabenFuer(zustand, iso);
  const uebrig = liste.filter((a) => !a.erledigt);
  return { zustand: mitListe(zustand, iso, uebrig), entfernt: liste.length - uebrig.length };
}

/**
 * Holt die offenen Aufgaben von gestern in den heutigen Tag.
 * Sie werden verschoben, nicht kopiert - sonst stehen sie doppelt herum.
 * @returns {{zustand:object, uebernommen:number}}
 */
export function uebernimmOffeneAufgaben(zustand, vonIso, nachIso) {
  const quelle = aufgabenFuer(zustand, vonIso);
  const offen = quelle.filter((a) => !a.erledigt);
  if (offen.length === 0) return { zustand, uebernommen: 0 };

  const ziel = aufgabenFuer(zustand, nachIso);
  const schonDa = new Set(ziel.map((a) => a.text.toLowerCase()));
  const neue = offen.filter((a) => !schonDa.has(a.text.toLowerCase()));

  let neuerZustand = mitListe(zustand, vonIso, quelle.filter((a) => a.erledigt));
  neuerZustand = mitListe(neuerZustand, nachIso, [
    ...ziel,
    ...neue.map((a) => ({ ...a, id: neueId() })),
  ]);

  return { zustand: neuerZustand, uebernommen: neue.length };
}

/** Gibt es gestern noch offene Aufgaben? Praktisch fuer den Knopf im Heute-Bild. */
export function offeneVonGestern(zustand, iso) {
  return aufgabenFuer(zustand, tagVerschieben(iso, -1)).filter((a) => !a.erledigt);
}

/**
 * Entfernt Aufgabenlisten, die aelter als `tage` Tage sind und nichts mehr
 * enthalten - damit der Speicher nicht endlos waechst.
 */
export function raeumeAufgabenAuf(zustand, heuteIso, tage = 400) {
  const behalten = {};
  for (const [iso, liste] of Object.entries(zustand.aufgaben ?? {})) {
    if (!Array.isArray(liste) || liste.length === 0) continue;
    const alter = Math.round((new Date(heuteIso) - new Date(iso)) / 86400000);
    if (alter <= tage) behalten[iso] = liste;
  }
  return { ...zustand, aufgaben: behalten };
}
