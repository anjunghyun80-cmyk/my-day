// Streaks ("X Tage in Folge") fuer den ganzen Tag und fuer einzelne Gewohnheiten.
// Reine Funktionen: Sie bekommen eine Lesefunktion holeTag(iso) und wissen
// nichts ueber Speicher oder Oberflaeche.
//
// holeTag(iso) muss liefern: { bloecke: Block[], erledigt: { [blockId]: true } }

import { tagVerschieben } from './zeit.js';
import { abhakbareBloecke } from './plan.js';

/** Wie weit schauen wir maximal zurueck? */
export const MAX_RUECKBLICK = 400;

/**
 * Wie viel ist an diesem Tag erledigt?
 *
 * Gezaehlt wird alles, was man abhaken kann:
 *   - Bloecke aus dem Plan, deren Kategorie abhakbar ist
 *   - eigene Aufgaben des Tages
 *   - Trainings, die heute anstehen
 *   - Tagesziele, in denen etwas steht
 *
 * @param {Array} bloecke
 * @param {object} erledigt   { blockId: true }
 * @param {{aufgaben?:Array, workouts?:Array, ziele?:Array}} extras
 * @returns {{gesamt:number, fertig:number, prozent:number}}
 */
export function tagesQuote(bloecke, erledigt = {}, extras = {}) {
  const abhakbar = abhakbareBloecke(bloecke);
  let gesamt = abhakbar.length;
  let fertig = abhakbar.filter((b) => erledigt[b.id]).length;

  const aufgaben = extras.aufgaben ?? [];
  gesamt += aufgaben.length;
  fertig += aufgaben.filter((a) => a.erledigt).length;

  const workouts = extras.workouts ?? [];
  gesamt += workouts.length;
  fertig += workouts.filter((w) => w.erledigt).length;

  // Nur Ziele zaehlen, in denen wirklich etwas steht.
  const ziele = (extras.ziele ?? []).filter((z) => z.text && z.text.trim());
  gesamt += ziele.length;
  fertig += ziele.filter((z) => z.erledigt).length;

  const prozent = gesamt === 0 ? 0 : Math.round((fertig / gesamt) * 100);
  return { gesamt, fertig, prozent };
}

/**
 * Gilt der Tag als "geschafft"?
 * @returns {'ja'|'nein'|'egal'} - "egal" heisst: an dem Tag gab es nichts
 *   abzuhaken, der Tag bricht die Streak also nicht.
 */
export function tagGeschafft(bloecke, erledigt, schwelleProzent, extras = {}) {
  const { gesamt, prozent } = tagesQuote(bloecke, erledigt, extras);
  if (gesamt === 0) return 'egal';
  return prozent >= schwelleProzent ? 'ja' : 'nein';
}

/**
 * Laeuft vom heutigen Tag rueckwaerts und zaehlt die Serie.
 *
 * Besonderheit: Der heutige Tag darf noch offen sein. Ist er (noch) nicht
 * geschafft, beginnt die Zaehlung bei gestern - die Streak bricht also nicht
 * schon morgens um 6 Uhr zusammen.
 *
 * @param {(iso:string)=>'ja'|'nein'|'egal'} bewerte
 */
export function aktuelleStreak(bewerte, heuteIso, maxTage = MAX_RUECKBLICK) {
  let start = 0;
  if (bewerte(heuteIso) === 'nein') start = 1;

  let serie = 0;
  for (let i = start; i < maxTage; i += 1) {
    const wert = bewerte(tagVerschieben(heuteIso, -i));
    if (wert === 'egal') continue;
    if (wert === 'ja') serie += 1;
    else break;
  }
  return serie;
}

/** Die laengste jemals erreichte Serie im Rueckblickfenster. */
export function laengsteStreak(bewerte, heuteIso, maxTage = MAX_RUECKBLICK) {
  let beste = 0;
  let laufend = 0;

  // Von der Vergangenheit nach vorne laufen.
  for (let i = maxTage - 1; i >= 0; i -= 1) {
    const wert = bewerte(tagVerschieben(heuteIso, -i));
    if (wert === 'egal') continue;
    if (wert === 'ja') {
      laufend += 1;
      if (laufend > beste) beste = laufend;
    } else {
      laufend = 0;
    }
  }
  return beste;
}

/**
 * Tages-Streak: aktuelle und laengste Serie.
 * @param {(iso:string)=>{bloecke:Array, erledigt:object}} holeTag
 */
export function berechneTagesStreak(holeTag, heuteIso, schwelleProzent, maxTage = MAX_RUECKBLICK) {
  const bewerte = (iso) => {
    const { bloecke, erledigt, aufgaben, workouts, ziele } = holeTag(iso);
    return tagGeschafft(bloecke, erledigt, schwelleProzent, { aufgaben, workouts, ziele });
  };
  return {
    aktuell: aktuelleStreak(bewerte, heuteIso, maxTage),
    laengste: laengsteStreak(bewerte, heuteIso, maxTage),
  };
}

/**
 * Streak fuer eine einzelne Gewohnheit, erkannt am Blocktitel.
 * Tage, an denen der Block gar nicht im Plan steht, werden uebersprungen -
 * Joggen am Mittwoch fehlt also nicht, es ist dort einfach nicht vorgesehen.
 */
export function berechneHabitStreak(holeTag, heuteIso, titel, maxTage = MAX_RUECKBLICK) {
  const bewerte = (iso) => {
    const { bloecke, erledigt } = holeTag(iso);
    const treffer = bloecke.filter((b) => b.titel === titel && b.abhakbar);
    if (treffer.length === 0) return 'egal';
    return treffer.every((b) => erledigt[b.id]) ? 'ja' : 'nein';
  };
  return {
    aktuell: aktuelleStreak(bewerte, heuteIso, maxTage),
    laengste: laengsteStreak(bewerte, heuteIso, maxTage),
  };
}
