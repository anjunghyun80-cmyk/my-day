// Mein Trainingsplan.
//
// Ein Workout ist etwas, das sich woechentlich wiederholt: "Krafttraining,
// Mo/Mi/Fr, 16:00-16:45, 3 Saetze a 12". Anders als ein Block im Tagesplan
// steht es nicht im Stundenplan, sondern hat eine eigene Liste - so kann ich
// meinen Sport getrennt planen und auswerten.
//
// Gespeichert wird:
//   workouts:    [ {id, name, art, tage, start, ende, saetze, wiederholungen, notiz} ]
//   workoutLog:  { "2026-09-21": { workoutId: true } }
//
// Reine Funktionen - kein DOM, in Node testbar.

import { neueId } from './plan.js';
import { zuMinuten, wochentagVonIso, tagVerschieben, PLAN_START_MIN } from './zeit.js';
import { WOCHENTAGE } from '../daten/standardplan.js';

/** Die Trainingsarten mit eigener Akzentfarbe - dieselben Farben wie im Glow-up-Bereich. */
export const WORKOUT_ARTEN = {
  kraft: { name: 'Kraft', akzent: { dunkel: '#3987E5', hell: '#2A78D6' } },
  cardio: { name: 'Ausdauer', akzent: { dunkel: '#D95926', hell: '#D0521F' } },
  beweglich: { name: 'Beweglichkeit', akzent: { dunkel: '#9085E9', hell: '#4A3AA7' } },
  verein: { name: 'Verein & Kurs', akzent: { dunkel: '#199E70', hell: '#138A60' } },
};

export const ARTEN_SCHLUESSEL = Object.keys(WORKOUT_ARTEN);

/** Name einer Art, faellt auf den Schluessel zurueck. */
export function artName(schluessel) {
  return WORKOUT_ARTEN[schluessel]?.name ?? schluessel;
}

/** Baut ein vollstaendiges Workout. */
export function neuesWorkout(teil = {}) {
  return {
    id: teil.id ?? neueId(),
    name: teil.name ?? '',
    art: teil.art ?? 'kraft',
    tage: Array.isArray(teil.tage) ? [...teil.tage] : [],
    start: teil.start ?? '16:00',
    ende: teil.ende ?? '17:00',
    saetze: Number.isFinite(teil.saetze) ? teil.saetze : 0,
    wiederholungen: Number.isFinite(teil.wiederholungen) ? teil.wiederholungen : 0,
    notiz: teil.notiz ?? '',
  };
}

/**
 * Prueft ein Workout.
 * @returns {string|null} Fehlertext auf Deutsch, oder null wenn alles passt.
 */
export function pruefeWorkout(workout) {
  if (!workout.name || !workout.name.trim()) return 'Gib deinem Training einen Namen.';
  if (!WORKOUT_ARTEN[workout.art]) return 'Diese Trainingsart kenne ich nicht.';
  if (!Array.isArray(workout.tage) || workout.tage.length === 0) {
    return 'Wähle mindestens einen Wochentag.';
  }
  if (workout.tage.some((t) => !WOCHENTAGE.includes(t))) return 'Unbekannter Wochentag.';

  let start;
  let ende;
  try {
    start = zuMinuten(workout.start);
    ende = zuMinuten(workout.ende);
  } catch {
    return 'Die Uhrzeit muss im Format HH:MM stehen, z. B. 16:00.';
  }
  if (ende <= start) return 'Das Ende muss nach dem Start liegen.';
  if (start < PLAN_START_MIN) return 'Der Tag beginnt frühestens um 05:00.';
  if (workout.saetze < 0 || workout.wiederholungen < 0) return 'Sätze und Wiederholungen dürfen nicht negativ sein.';

  return null;
}

/** Wie lange dauert das Training? (in Minuten) */
export function workoutDauer(workout) {
  return zuMinuten(workout.ende) - zuMinuten(workout.start);
}

/** Alle gespeicherten Workouts (nie undefined). */
export function alleWorkouts(zustand) {
  return Array.isArray(zustand.workouts) ? zustand.workouts : [];
}

/** Sortiert nach Startzeit. */
export function sortiereWorkouts(liste) {
  return [...liste].sort((a, b) => zuMinuten(a.start) - zuMinuten(b.start));
}

/** Welche Workouts stehen an diesem Datum an? */
export function workoutsFuerTag(zustand, iso) {
  const tag = wochentagVonIso(iso);
  return sortiereWorkouts(alleWorkouts(zustand).filter((w) => w.tage.includes(tag)));
}

/** Legt ein Workout an oder ersetzt es. */
export function speichereWorkout(zustand, workout) {
  const liste = alleWorkouts(zustand);
  const gibtEsSchon = liste.some((w) => w.id === workout.id);
  return {
    ...zustand,
    workouts: gibtEsSchon
      ? liste.map((w) => (w.id === workout.id ? workout : w))
      : [...liste, workout],
  };
}

/** Loescht ein Workout. Die alten Haken im Log bleiben stehen - sie schaden
 *  nicht und die Statistik vergangener Wochen bleibt damit richtig. */
export function loescheWorkout(zustand, id) {
  return { ...zustand, workouts: alleWorkouts(zustand).filter((w) => w.id !== id) };
}

// ---------------------------------------------------------------------------
// Abhaken
// ---------------------------------------------------------------------------

/** Haken eines Tages (nie undefined). */
export function logFuer(zustand, iso) {
  return zustand.workoutLog?.[iso] ?? {};
}

/** Ist dieses Training an diesem Tag abgehakt? */
export function istWorkoutErledigt(zustand, iso, id) {
  return Boolean(logFuer(zustand, iso)[id]);
}

/** Dreht den Haken um. */
export function schalteWorkout(zustand, iso, id) {
  const tag = { ...logFuer(zustand, iso) };
  if (tag[id]) delete tag[id];
  else tag[id] = true;
  return { ...zustand, workoutLog: { ...(zustand.workoutLog ?? {}), [iso]: tag } };
}

/**
 * Die Workouts eines Tages in der Form, die Fortschritt und Feier brauchen:
 * eine Liste aus { id, text, erledigt }.
 */
export function workoutsAlsAufgaben(zustand, iso) {
  return workoutsFuerTag(zustand, iso).map((w) => ({
    id: w.id,
    text: w.name,
    erledigt: istWorkoutErledigt(zustand, iso, w.id),
  }));
}

// ---------------------------------------------------------------------------
// Auswertung
// ---------------------------------------------------------------------------

/** Wie oft pro Woche ist dieses Training eingeplant? */
export function malProWoche(workout) {
  return workout.tage.length;
}

/** Wie viele Minuten Training stehen pro Woche im Plan? */
export function minutenProWoche(zustand) {
  return alleWorkouts(zustand).reduce((summe, w) => summe + workoutDauer(w) * w.tage.length, 0);
}

/**
 * Bilanz eines Zeitraums: Wie oft war jedes Training geplant, wie oft gemacht?
 * @param {number} anzahlTage  Rueckblick ab heute (heute mitgezaehlt)
 * @returns {{proWorkout: Array, geplant:number, gemacht:number, prozent:number, minutenGemacht:number}}
 */
export function workoutBilanz(zustand, heuteIso, anzahlTage = 7) {
  const proWorkout = new Map();
  for (const w of alleWorkouts(zustand)) {
    proWorkout.set(w.id, { workout: w, geplant: 0, gemacht: 0 });
  }

  let geplant = 0;
  let gemacht = 0;
  let minutenGemacht = 0;

  for (let i = 0; i < anzahlTage; i += 1) {
    const iso = tagVerschieben(heuteIso, -i);
    for (const w of workoutsFuerTag(zustand, iso)) {
      const eintrag = proWorkout.get(w.id);
      if (!eintrag) continue;
      eintrag.geplant += 1;
      geplant += 1;
      if (istWorkoutErledigt(zustand, iso, w.id)) {
        eintrag.gemacht += 1;
        gemacht += 1;
        minutenGemacht += workoutDauer(w);
      }
    }
  }

  return {
    proWorkout: [...proWorkout.values()].filter((e) => e.geplant > 0),
    geplant,
    gemacht,
    prozent: geplant === 0 ? 0 : Math.round((gemacht / geplant) * 100),
    minutenGemacht,
  };
}

/**
 * Streak eines einzelnen Trainings: wie viele geplante Termine in Folge
 * wurden gemacht? Tage ohne diesen Termin werden uebersprungen.
 */
export function workoutStreak(zustand, heuteIso, id, maxTage = 180) {
  const workout = alleWorkouts(zustand).find((w) => w.id === id);
  if (!workout) return 0;

  let serie = 0;
  let start = 0;

  // Heute darf noch offen sein.
  const heuteGeplant = workout.tage.includes(wochentagVonIso(heuteIso));
  if (heuteGeplant && !istWorkoutErledigt(zustand, heuteIso, id)) start = 1;

  for (let i = start; i < maxTage; i += 1) {
    const iso = tagVerschieben(heuteIso, -i);
    if (!workout.tage.includes(wochentagVonIso(iso))) continue;
    if (istWorkoutErledigt(zustand, iso, id)) serie += 1;
    else break;
  }
  return serie;
}

/** Wirft Log-Eintraege weg, die aelter als `tage` Tage sind. */
export function raeumeWorkoutLogAuf(zustand, heuteIso, tage = 400) {
  const behalten = {};
  for (const [iso, eintrag] of Object.entries(zustand.workoutLog ?? {})) {
    if (!eintrag || Object.keys(eintrag).length === 0) continue;
    const alter = Math.round((new Date(heuteIso) - new Date(iso)) / 86400000);
    if (alter <= tage) behalten[iso] = eintrag;
  }
  return { ...zustand, workoutLog: behalten };
}

/**
 * Ein Startvorschlag: die Sportblöcke, die schon im Wochenplan stehen,
 * als Workouts. So ist die Liste nicht leer, wenn man sie zum ersten Mal
 * oeffnet.
 */
export function vorschlaegeAusPlan(plan) {
  const nachName = new Map();

  for (const tag of WOCHENTAGE) {
    for (const block of plan[tag] ?? []) {
      if (block.kategorie !== 'sport' && block.kategorie !== 'kurs') continue;
      const schluessel = `${block.titel}|${block.start}|${block.ende}`;
      if (nachName.has(schluessel)) {
        nachName.get(schluessel).tage.push(tag);
      } else {
        nachName.set(
          schluessel,
          neuesWorkout({
            name: block.titel,
            art: block.kategorie === 'kurs' ? 'verein' : 'kraft',
            tage: [tag],
            start: block.start,
            ende: block.ende,
            notiz: block.notiz ?? '',
          }),
        );
      }
    }
  }

  return sortiereWorkouts([...nachName.values()]);
}
