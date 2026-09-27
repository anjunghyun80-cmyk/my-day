// Auswertungen: Erledigt-Quoten, Aufteilung nach Kategorie und Wochentag,
// Heatmap der letzten Wochen und die Zaehlung der Tagesziele.
// Wieder alles rein rechnerisch, ohne Browser.

import { tagVerschieben, wochentagVonIso, montagDerWoche } from './zeit.js';
import { abhakbareBloecke } from './plan.js';
import { tagesQuote } from './streak.js';
import { WOCHENTAGE } from '../daten/standardplan.js';
import { KATEGORIE_SCHLUESSEL } from '../daten/kategorien.js';

/** Liste der letzten n ISO-Daten, heute zuerst. */
export function letzteTage(heuteIso, anzahl) {
  const tage = [];
  for (let i = 0; i < anzahl; i += 1) tage.push(tagVerschieben(heuteIso, -i));
  return tage;
}

/** Gesamtquote ueber die letzten n Tage. */
export function quoteZeitraum(holeTag, heuteIso, anzahlTage) {
  let gesamt = 0;
  let fertig = 0;
  for (const iso of letzteTage(heuteIso, anzahlTage)) {
    const { bloecke, erledigt } = holeTag(iso);
    const q = tagesQuote(bloecke, erledigt);
    gesamt += q.gesamt;
    fertig += q.fertig;
  }
  return { gesamt, fertig, prozent: gesamt === 0 ? 0 : Math.round((fertig / gesamt) * 100) };
}

/** Quote je Kategorie ueber die letzten n Tage. */
export function quoteNachKategorie(holeTag, heuteIso, anzahlTage) {
  const ergebnis = {};
  for (const k of KATEGORIE_SCHLUESSEL) ergebnis[k] = { gesamt: 0, fertig: 0, prozent: 0 };

  for (const iso of letzteTage(heuteIso, anzahlTage)) {
    const { bloecke, erledigt } = holeTag(iso);
    for (const b of abhakbareBloecke(bloecke)) {
      const eintrag = ergebnis[b.kategorie] ?? (ergebnis[b.kategorie] = { gesamt: 0, fertig: 0, prozent: 0 });
      eintrag.gesamt += 1;
      if (erledigt[b.id]) eintrag.fertig += 1;
    }
  }

  for (const eintrag of Object.values(ergebnis)) {
    eintrag.prozent = eintrag.gesamt === 0 ? 0 : Math.round((eintrag.fertig / eintrag.gesamt) * 100);
  }
  return ergebnis;
}

/** Quote je Wochentag ueber die letzten n Tage. */
export function quoteNachWochentag(holeTag, heuteIso, anzahlTage) {
  const ergebnis = {};
  for (const t of WOCHENTAGE) ergebnis[t] = { gesamt: 0, fertig: 0, prozent: 0 };

  for (const iso of letzteTage(heuteIso, anzahlTage)) {
    const { bloecke, erledigt } = holeTag(iso);
    const tag = wochentagVonIso(iso);
    const q = tagesQuote(bloecke, erledigt);
    ergebnis[tag].gesamt += q.gesamt;
    ergebnis[tag].fertig += q.fertig;
  }

  for (const eintrag of Object.values(ergebnis)) {
    eintrag.prozent = eintrag.gesamt === 0 ? 0 : Math.round((eintrag.fertig / eintrag.gesamt) * 100);
  }
  return ergebnis;
}

/**
 * Kalender-Heatmap der letzten Wochen.
 * Ergebnis: Array von Wochen (aelteste zuerst), jede Woche hat 7 Tage Mo..So.
 * Tage in der Zukunft bekommen `zukunft: true`.
 */
export function heatmap(holeTag, heuteIso, anzahlWochen = 12) {
  const letzterMontag = montagDerWoche(heuteIso);
  const ersterMontag = tagVerschieben(letzterMontag, -7 * (anzahlWochen - 1));
  const wochen = [];

  for (let w = 0; w < anzahlWochen; w += 1) {
    const tage = [];
    for (let d = 0; d < 7; d += 1) {
      const iso = tagVerschieben(ersterMontag, w * 7 + d);
      const zukunft = iso > heuteIso;
      if (zukunft) {
        tage.push({ iso, prozent: 0, gesamt: 0, fertig: 0, zukunft: true });
      } else {
        const { bloecke, erledigt } = holeTag(iso);
        const q = tagesQuote(bloecke, erledigt);
        tage.push({ iso, ...q, zukunft: false });
      }
    }
    wochen.push(tage);
  }
  return wochen;
}

/**
 * Tagesziele zaehlen.
 * @param {(iso:string)=>Array<{text:string, erledigt:boolean}>} holeZiele
 */
export function zieleStatistik(holeZiele, heuteIso, anzahlTage) {
  let erledigt = 0;
  let gesetzt = 0;
  let tageKomplett = 0;

  for (const iso of letzteTage(heuteIso, anzahlTage)) {
    const ziele = (holeZiele(iso) ?? []).filter((z) => z.text && z.text.trim());
    if (ziele.length === 0) continue;
    gesetzt += ziele.length;
    const fertig = ziele.filter((z) => z.erledigt).length;
    erledigt += fertig;
    if (ziele.length >= 3 && fertig === ziele.length) tageKomplett += 1;
  }

  return { erledigt, gesetzt, tageKomplett };
}

/** Gibt es ueberhaupt schon Daten? Fuer freundliche leere Zustaende. */
export function hatDaten(zustand) {
  const erledigt = Object.values(zustand.erledigt ?? {}).some(
    (tag) => Object.keys(tag ?? {}).length > 0,
  );
  const ziele = Object.values(zustand.ziele ?? {}).some((liste) =>
    (liste ?? []).some((z) => z.text && z.text.trim()),
  );
  return erledigt || ziele;
}
