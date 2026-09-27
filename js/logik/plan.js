// Alles rund um den Wochenplan: Standardplan aufbauen, Bloecke pruefen,
// Ueberschneidungen und Luecken finden, Bloecke auf andere Tage kopieren.
// Reine Funktionen - kein DOM, in Node testbar.

import {
  ROHPLAN,
  WOCHENTAGE,
  STANDARD_ERINNERUNGEN,
  HABITS,
} from '../daten/standardplan.js';
import { KATEGORIEN, kategorieAbhakbar } from '../daten/kategorien.js';
import {
  zuMinuten,
  blockStart,
  blockEnde,
  PLAN_START_MIN,
} from './zeit.js';

/** Ende des Planbereichs: "29:00" = 05:00 am naechsten Morgen. */
export const PLAN_ENDE_MIN = 29 * 60;

let zaehler = 0;

/** Erzeugt eine neue, eindeutige Block-Kennung. */
export function neueId() {
  zaehler += 1;
  return `b${Date.now().toString(36)}${zaehler.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/**
 * Baut einen vollstaendigen Block. Fehlende Angaben werden sinnvoll ergaenzt:
 * "abhakbar" kommt aus der Kategorie, kann aber ueberschrieben werden.
 */
export function neuerBlock(teil = {}) {
  const kategorie = teil.kategorie ?? 'frei';
  return {
    id: teil.id ?? neueId(),
    start: teil.start ?? '00:00',
    ende: teil.ende ?? '00:00',
    kategorie,
    titel: teil.titel ?? '',
    notiz: teil.notiz ?? '',
    abhakbar: teil.abhakbar ?? kategorieAbhakbar(kategorie),
    erinnerung: teil.erinnerung ?? false,
  };
}

/** Sortiert Bloecke nach Startzeit (verändert das Original nicht). */
export function sortiereBloecke(bloecke) {
  return [...bloecke].sort((a, b) => blockStart(a) - blockStart(b));
}

/**
 * Loest die Vorlagen ("@schulmorgen") auf und macht aus den Rohdaten
 * einen vollstaendigen Plan: { mo: Block[], di: Block[], ... }
 */
export function baueStandardplan(roh = ROHPLAN) {
  const plan = {};

  for (const tag of WOCHENTAGE) {
    const eintraege = roh.tage[tag] ?? [];
    const zeilen = [];

    for (const eintrag of eintraege) {
      if (typeof eintrag === 'string' && eintrag.startsWith('@')) {
        const vorlage = roh.vorlagen[eintrag.slice(1)];
        if (!vorlage) throw new Error(`Unbekannte Vorlage: ${eintrag}`);
        zeilen.push(...vorlage);
      } else {
        zeilen.push(eintrag);
      }
    }

    plan[tag] = sortiereBloecke(
      zeilen.map(([start, ende, kategorie, titel, notiz]) =>
        neuerBlock({
          start,
          ende,
          kategorie,
          titel,
          notiz,
          erinnerung: istStandardErinnerung(tag, start),
        }),
      ),
    );
  }

  return plan;
}

/** Steht dieser Block (Tag + Startzeit) in der Liste der Standard-Erinnerungen? */
export function istStandardErinnerung(tag, start) {
  return STANDARD_ERINNERUNGEN.some((e) => e.tag === tag && e.start === start);
}

/** Zu welcher Gewohnheit gehoert dieser Blocktitel? Sonst null. */
export function habitVonTitel(titel) {
  return HABITS.find((h) => h.titel === titel)?.schluessel ?? null;
}

/** Alle Bloecke eines Tages, die man abhaken kann. */
export function abhakbareBloecke(bloecke) {
  return bloecke.filter((b) => b.abhakbar);
}

// ---------------------------------------------------------------------------
// Pruefungen
// ---------------------------------------------------------------------------

/**
 * Prueft einen Block gegen die uebrigen Bloecke des Tages.
 * @returns {string|null} Fehlertext auf Deutsch, oder null wenn alles passt.
 */
export function pruefeBlock(block, andereBloecke) {
  if (!block.titel || !block.titel.trim()) return 'Bitte gib dem Block einen Titel.';
  if (!KATEGORIEN[block.kategorie]) return 'Diese Kategorie kenne ich nicht.';

  let start;
  let ende;
  try {
    start = zuMinuten(block.start);
    ende = zuMinuten(block.ende);
  } catch {
    return 'Die Uhrzeit muss im Format HH:MM stehen, z. B. 07:15.';
  }

  if (ende <= start) return 'Das Ende muss nach dem Start liegen.';
  if (start < PLAN_START_MIN) return 'Der Tag beginnt frühestens um 05:00.';
  if (ende > PLAN_ENDE_MIN) return 'Der Tag endet spätestens um 29:00 (05:00 am Morgen).';

  const kollision = andereBloecke
    .filter((b) => b.id !== block.id)
    .find((b) => start < blockEnde(b) && ende > blockStart(b));

  if (kollision) {
    return `Das überschneidet sich mit "${kollision.titel}" (${kollision.start}-${kollision.ende}).`;
  }

  return null;
}

/** Findet alle Paare von Bloecken, die sich zeitlich ueberschneiden. */
export function findeUeberschneidungen(bloecke) {
  const sortiert = sortiereBloecke(bloecke);
  const treffer = [];
  for (let i = 0; i < sortiert.length - 1; i += 1) {
    for (let j = i + 1; j < sortiert.length; j += 1) {
      const a = sortiert[i];
      const b = sortiert[j];
      if (blockStart(b) >= blockEnde(a)) break; // weiter hinten kann nichts mehr kollidieren
      treffer.push([a, b]);
    }
  }
  return treffer;
}

/**
 * Findet Luecken im Tag - also Zeitraeume zwischen 05:00 und 29:00,
 * in denen nichts eingetragen ist.
 * @returns {Array<{vonMin:number, bisMin:number}>}
 */
export function findeLuecken(bloecke) {
  const sortiert = sortiereBloecke(bloecke);
  const luecken = [];
  let zeiger = PLAN_START_MIN;

  for (const b of sortiert) {
    const start = blockStart(b);
    if (start > zeiger) luecken.push({ vonMin: zeiger, bisMin: start });
    zeiger = Math.max(zeiger, blockEnde(b));
  }

  if (zeiger < PLAN_ENDE_MIN) luecken.push({ vonMin: zeiger, bisMin: PLAN_ENDE_MIN });
  return luecken;
}

// ---------------------------------------------------------------------------
// Bearbeiten
// ---------------------------------------------------------------------------

/**
 * Kopiert Bloecke auf andere Wochentage.
 * Bloecke im Zieltag, die sich mit den neuen ueberschneiden, werden ersetzt.
 * Gibt einen neuen Plan zurueck, der alte bleibt unveraendert.
 */
export function kopiereAufTage(plan, bloecke, zieltage) {
  const neu = { ...plan };

  for (const tag of zieltage) {
    const vorhanden = (neu[tag] ?? []).filter(
      (b) =>
        !bloecke.some(
          (k) => blockStart(k) < blockEnde(b) && blockEnde(k) > blockStart(b),
        ),
    );
    const kopien = bloecke.map((b) => neuerBlock({ ...b, id: neueId() }));
    neu[tag] = sortiereBloecke([...vorhanden, ...kopien]);
  }

  return neu;
}

/** Ersetzt oder ergaenzt einen Block in einem Tag. Gibt einen neuen Plan zurueck. */
export function speichereBlock(plan, tag, block) {
  const alt = plan[tag] ?? [];
  const gibtEsSchon = alt.some((b) => b.id === block.id);
  const neu = gibtEsSchon
    ? alt.map((b) => (b.id === block.id ? block : b))
    : [...alt, block];
  return { ...plan, [tag]: sortiereBloecke(neu) };
}

/** Loescht einen Block. Gibt einen neuen Plan zurueck. */
export function loescheBlock(plan, tag, blockId) {
  return { ...plan, [tag]: (plan[tag] ?? []).filter((b) => b.id !== blockId) };
}
