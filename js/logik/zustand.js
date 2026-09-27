// Der gesamte gespeicherte Zustand der App - als einfaches Objekt.
// Alle Funktionen hier veraendern nichts, sondern geben einen NEUEN Zustand
// zurueck. Das macht Fehler unwahrscheinlicher und die Tests einfach.
//
// Aufbau:
// {
//   version: 1,
//   plan:        { mo: Block[], di: Block[], ... }      aktueller Wochenplan
//   snapshots:   { "2026-09-20": Block[] }              eingefrorene Tage
//   erledigt:    { "2026-09-20": { blockId: true } }    Haekchen
//   ziele:       { "2026-09-20": [{text, erledigt}] }   3 Tagesziele
//   aufgaben:    { "2026-09-20": [{id,text,erledigt}] } eigene Aufgaben
//   workouts:    [ {id,name,art,tage,start,ende,...} ]  mein Trainingsplan
//   workoutLog:  { "2026-09-20": { workoutId: true } }  abgehakte Trainings
//   gefeiert:    { "2026-09-20": true }                 Feier schon gezeigt?
//   glowup:      { wochen: [ {id,nr,fokus,...} ] }      selbst angelegte Glow-up-Wochen
//   einstellungen: { ... }
//   planGeaendertAm / kalenderExportAm                  fuer den Export-Hinweis
// }

import { baueStandardplan } from './plan.js';
import { ZIELE_BLOCK_TITEL } from '../daten/standardplan.js';

export const ZUSTAND_VERSION = 1;

export const STANDARD_EINSTELLUNGEN = {
  /** Ab wie viel Prozent gilt ein Tag als geschafft? */
  streakSchwelle: 80,
  /** Wie viele Minuten vorher soll der Kalender erinnern? */
  vorlaufMinuten: 5,
  /** Banner "Jetzt: ..." anzeigen, solange die App offen ist. */
  bannerAn: true,
};

/** Frischer Zustand mit dem Standardplan. */
export function leererZustand() {
  return {
    version: ZUSTAND_VERSION,
    plan: baueStandardplan(),
    snapshots: {},
    erledigt: {},
    ziele: {},
    aufgaben: {},
    workouts: [],
    workoutLog: {},
    gefeiert: {},
    glowup: { wochen: [] },
    einstellungen: { ...STANDARD_EINSTELLUNGEN },
    planGeaendertAm: null,
    kalenderExportAm: null,
  };
}

/** Ergaenzt fehlende Felder, damit aeltere oder kaputte Daten nicht stoeren. */
export function normalisiere(roh) {
  const basis = leererZustand();
  if (!roh || typeof roh !== 'object') return basis;

  return {
    version: ZUSTAND_VERSION,
    plan: roh.plan && typeof roh.plan === 'object' ? roh.plan : basis.plan,
    snapshots: roh.snapshots && typeof roh.snapshots === 'object' ? roh.snapshots : {},
    erledigt: roh.erledigt && typeof roh.erledigt === 'object' ? roh.erledigt : {},
    ziele: roh.ziele && typeof roh.ziele === 'object' ? roh.ziele : {},
    aufgaben: roh.aufgaben && typeof roh.aufgaben === 'object' ? roh.aufgaben : {},
    workouts: Array.isArray(roh.workouts) ? roh.workouts : [],
    workoutLog: roh.workoutLog && typeof roh.workoutLog === 'object' ? roh.workoutLog : {},
    gefeiert: roh.gefeiert && typeof roh.gefeiert === 'object' ? roh.gefeiert : {},
    glowup: { wochen: Array.isArray(roh.glowup?.wochen) ? roh.glowup.wochen : [] },
    einstellungen: { ...STANDARD_EINSTELLUNGEN, ...(roh.einstellungen ?? {}) },
    planGeaendertAm: roh.planGeaendertAm ?? null,
    kalenderExportAm: roh.kalenderExportAm ?? null,
  };
}

// ---------------------------------------------------------------------------
// Haekchen
// ---------------------------------------------------------------------------

/** Ist dieser Block an diesem Tag abgehakt? */
export function istErledigt(zustand, iso, blockId) {
  return Boolean(zustand.erledigt?.[iso]?.[blockId]);
}

/** Alle Haekchen eines Tages (nie undefined). */
export function erledigtFuer(zustand, iso) {
  return zustand.erledigt?.[iso] ?? {};
}

/** Setzt oder entfernt ein Haekchen. */
export function setzeErledigt(zustand, iso, blockId, wert) {
  const tag = { ...erledigtFuer(zustand, iso) };
  if (wert) tag[blockId] = true;
  else delete tag[blockId];
  return { ...zustand, erledigt: { ...(zustand.erledigt ?? {}), [iso]: tag } };
}

/** Dreht ein Haekchen um. */
export function schalteErledigt(zustand, iso, blockId) {
  return setzeErledigt(zustand, iso, blockId, !istErledigt(zustand, iso, blockId));
}

// ---------------------------------------------------------------------------
// Die 3 Tagesziele
// ---------------------------------------------------------------------------

const LEERES_ZIEL = { text: '', erledigt: false };

/** Immer genau 3 Ziele fuer diesen Tag. */
export function zieleFuer(zustand, iso) {
  const gespeichert = zustand.ziele?.[iso] ?? [];
  const liste = [];
  for (let i = 0; i < 3; i += 1) {
    const z = gespeichert[i];
    liste.push({
      text: typeof z?.text === 'string' ? z.text : '',
      erledigt: Boolean(z?.erledigt),
    });
  }
  return liste;
}

/** Aendert ein einzelnes Ziel (Text und/oder Haekchen). */
export function setzeZiel(zustand, iso, index, teil) {
  const liste = zieleFuer(zustand, iso);
  liste[index] = { ...liste[index], ...teil };
  return { ...zustand, ziele: { ...(zustand.ziele ?? {}), [iso]: liste } };
}

/** Sind alle 3 Ziele ausgefuellt? */
export function alleZieleGesetzt(zustand, iso) {
  return zieleFuer(zustand, iso).every((z) => z.text.trim().length > 0);
}

/**
 * Hakt den Block "3 Tagesziele aufschreiben" automatisch ab, sobald alle drei
 * Ziele eingetragen sind. Das Haekchen wird nie von allein wieder entfernt.
 */
export function autoAbhakenZieleBlock(zustand, iso, bloecke) {
  if (!alleZieleGesetzt(zustand, iso)) return zustand;
  const block = bloecke.find((b) => b.titel === ZIELE_BLOCK_TITEL && b.abhakbar);
  if (!block || istErledigt(zustand, iso, block.id)) return zustand;
  return setzeErledigt(zustand, iso, block.id, true);
}

/**
 * Holt die unerledigten Ziele von `vonIso` in den Tag `nachIso`.
 * Bereits vorhandene Ziele des Zieltages bleiben stehen; aufgefuellt wird nur,
 * wo noch nichts steht.
 */
export function uebernehmeOffeneZiele(zustand, vonIso, nachIso) {
  const offen = zieleFuer(zustand, vonIso).filter((z) => z.text.trim() && !z.erledigt);
  if (offen.length === 0) return { zustand, uebernommen: 0 };

  const ziel = zieleFuer(zustand, nachIso);
  const schonDa = new Set(ziel.map((z) => z.text.trim()).filter(Boolean));
  let anzahl = 0;

  for (const quelle of offen) {
    if (schonDa.has(quelle.text.trim())) continue;
    const platz = ziel.findIndex((z) => !z.text.trim());
    if (platz === -1) break;
    ziel[platz] = { text: quelle.text, erledigt: false };
    schonDa.add(quelle.text.trim());
    anzahl += 1;
  }

  if (anzahl === 0) return { zustand, uebernommen: 0 };
  return {
    zustand: { ...zustand, ziele: { ...(zustand.ziele ?? {}), [nachIso]: ziel } },
    uebernommen: anzahl,
  };
}

// ---------------------------------------------------------------------------
// Die Feier am Ende eines komplett erledigten Tages
// ---------------------------------------------------------------------------

/** Wurde an diesem Tag schon gefeiert? */
export function schonGefeiert(zustand, iso) {
  return Boolean(zustand.gefeiert?.[iso]);
}

/** Merkt sich, dass die Feier gezeigt wurde - sie kommt pro Tag nur einmal. */
export function markiereGefeiert(zustand, iso) {
  return { ...zustand, gefeiert: { ...(zustand.gefeiert ?? {}), [iso]: true } };
}

// ---------------------------------------------------------------------------
// Einstellungen und Planaenderungen
// ---------------------------------------------------------------------------

/** Aendert eine Einstellung. */
export function setzeEinstellung(zustand, schluessel, wert) {
  return { ...zustand, einstellungen: { ...zustand.einstellungen, [schluessel]: wert } };
}

/** Merkt sich, dass der Plan geaendert wurde (fuer den Kalender-Hinweis). */
export function merkePlanAenderung(zustand, zeitpunkt = new Date()) {
  return { ...zustand, planGeaendertAm: zeitpunkt.toISOString() };
}

/** Merkt sich, dass der Kalender exportiert wurde. */
export function merkeKalenderExport(zustand, zeitpunkt = new Date()) {
  return { ...zustand, kalenderExportAm: zeitpunkt.toISOString() };
}

/** Soll der Hinweis "Kalender neu exportieren" erscheinen? */
export function kalenderVeraltet(zustand) {
  if (!zustand.planGeaendertAm) return false;
  if (!zustand.kalenderExportAm) return true;
  return new Date(zustand.planGeaendertAm) > new Date(zustand.kalenderExportAm);
}
