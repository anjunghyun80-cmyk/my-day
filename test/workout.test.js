import test from 'node:test';
import assert from 'node:assert/strict';

import {
  neuesWorkout,
  pruefeWorkout,
  workoutDauer,
  alleWorkouts,
  workoutsFuerTag,
  speichereWorkout,
  loescheWorkout,
  schalteWorkout,
  istWorkoutErledigt,
  workoutsAlsAufgaben,
  malProWoche,
  minutenProWoche,
  workoutBilanz,
  workoutStreak,
  raeumeWorkoutLogAuf,
  vorschlaegeAusPlan,
  artName,
} from '../js/logik/workout.js';
import { leererZustand } from '../js/logik/zustand.js';
import { baueStandardplan } from '../js/logik/plan.js';
import { tagesBilanz } from '../js/logik/tagesabschluss.js';

const HEUTE = '2026-09-21'; // Montag
const DIENSTAG = '2026-09-22';

function kraft(teil = {}) {
  return neuesWorkout({
    name: 'Krafttraining',
    art: 'kraft',
    tage: ['mo', 'mi', 'fr'],
    start: '16:00',
    ende: '16:45',
    saetze: 3,
    wiederholungen: 12,
    ...teil,
  });
}

test('Ein neues Training hat sinnvolle Vorgaben', () => {
  const w = neuesWorkout();
  assert.equal(w.art, 'kraft');
  assert.deepEqual(w.tage, []);
  assert.equal(w.saetze, 0);
  assert.ok(w.id);
  assert.equal(artName('cardio'), 'Ausdauer');
});

test('workoutDauer und Häufigkeit', () => {
  const w = kraft();
  assert.equal(workoutDauer(w), 45);
  assert.equal(malProWoche(w), 3);
});

test('pruefeWorkout fängt Unsinn ab', () => {
  assert.equal(pruefeWorkout(kraft()), null);

  assert.match(pruefeWorkout(kraft({ name: '  ' })), /Namen/);
  assert.match(pruefeWorkout(kraft({ art: 'quatsch' })), /Trainingsart/);
  assert.match(pruefeWorkout(kraft({ tage: [] })), /Wochentag/);
  assert.match(pruefeWorkout(kraft({ tage: ['xy'] })), /Unbekannter Wochentag/);
  assert.match(pruefeWorkout(kraft({ start: '17:00', ende: '16:00' })), /Ende muss nach dem Start/);
  assert.match(pruefeWorkout(kraft({ start: '04:00', ende: '05:00' })), /05:00/);
  assert.match(pruefeWorkout(kraft({ saetze: -1 })), /negativ/);
});

test('Trainings anlegen, ändern und löschen', () => {
  let z = leererZustand();
  assert.deepEqual(alleWorkouts(z), []);

  const w = kraft();
  z = speichereWorkout(z, w);
  assert.equal(alleWorkouts(z).length, 1);

  // Dieselbe Kennung ersetzt statt anzuhängen
  z = speichereWorkout(z, { ...w, name: 'Oberkörper' });
  assert.equal(alleWorkouts(z).length, 1);
  assert.equal(alleWorkouts(z)[0].name, 'Oberkörper');

  z = loescheWorkout(z, w.id);
  assert.deepEqual(alleWorkouts(z), []);
});

test('workoutsFuerTag liefert nur die Trainings des Wochentags, nach Zeit sortiert', () => {
  let z = leererZustand();
  const abends = kraft({ name: 'Abends', start: '19:00', ende: '20:00', tage: ['mo'] });
  const morgens = kraft({ name: 'Morgens', start: '06:00', ende: '06:30', tage: ['mo', 'di'] });
  z = speichereWorkout(speichereWorkout(z, abends), morgens);

  assert.deepEqual(
    workoutsFuerTag(z, HEUTE).map((w) => w.name),
    ['Morgens', 'Abends'],
  );
  assert.deepEqual(
    workoutsFuerTag(z, DIENSTAG).map((w) => w.name),
    ['Morgens'],
  );
});

test('Abhaken pro Tag', () => {
  let z = speichereWorkout(leererZustand(), kraft());
  const id = alleWorkouts(z)[0].id;

  assert.equal(istWorkoutErledigt(z, HEUTE, id), false);
  z = schalteWorkout(z, HEUTE, id);
  assert.equal(istWorkoutErledigt(z, HEUTE, id), true);
  assert.equal(istWorkoutErledigt(z, DIENSTAG, id), false, 'gilt nur für diesen Tag');

  z = schalteWorkout(z, HEUTE, id);
  assert.equal(istWorkoutErledigt(z, HEUTE, id), false);
  assert.deepEqual(z.workoutLog[HEUTE], {}, 'entfernte Haken bleiben nicht liegen');
});

test('minutenProWoche rechnet über alle Tage', () => {
  let z = leererZustand();
  z = speichereWorkout(z, kraft()); // 45 Min × 3 Tage
  z = speichereWorkout(z, kraft({ name: 'Joggen', start: '07:00', ende: '07:30', tage: ['di', 'do'] }));
  assert.equal(minutenProWoche(z), 45 * 3 + 30 * 2);
});

test('workoutBilanz zählt geplant und gemacht', () => {
  let z = speichereWorkout(leererZustand(), kraft()); // Mo, Mi, Fr
  const id = alleWorkouts(z)[0].id;

  // In den 7 Tagen bis Montag 21.09. liegen Mo 21., Fr 18., Mi 16.
  z = schalteWorkout(z, HEUTE, id);
  z = schalteWorkout(z, '2026-09-18', id);

  const b = workoutBilanz(z, HEUTE, 7);
  assert.equal(b.geplant, 3);
  assert.equal(b.gemacht, 2);
  assert.equal(b.prozent, 67);
  assert.equal(b.minutenGemacht, 90);
  assert.equal(b.proWorkout.length, 1);
  assert.equal(b.proWorkout[0].geplant, 3);
});

test('workoutStreak zählt nur geplante Termine, heute darf offen sein', () => {
  let z = speichereWorkout(leererZustand(), kraft()); // Mo, Mi, Fr
  const id = alleWorkouts(z)[0].id;

  // Fr 18.09. und Mi 16.09. gemacht, heute (Mo) noch offen
  z = schalteWorkout(z, '2026-09-18', id);
  z = schalteWorkout(z, '2026-09-16', id);
  assert.equal(workoutStreak(z, HEUTE, id), 2, 'heute bricht die Serie nicht');

  // Heute auch gemacht -> 3
  z = schalteWorkout(z, HEUTE, id);
  assert.equal(workoutStreak(z, HEUTE, id), 3);

  // Eine Lücke davor beendet die Serie
  assert.equal(workoutStreak(z, HEUTE, 'gibtesnicht'), 0);
});

test('Trainings zählen in die Tagesbilanz mit', () => {
  let z = speichereWorkout(leererZustand(), kraft({ tage: ['mo'] }));
  const id = alleWorkouts(z)[0].id;

  const ohne = tagesBilanz({ bloecke: [], erledigt: {}, aufgaben: [], ziele: [], workouts: workoutsAlsAufgaben(z, HEUTE) });
  assert.equal(ohne.gesamt, 1);
  assert.equal(ohne.fertig, 0);
  assert.equal(ohne.komplett, false);

  z = schalteWorkout(z, HEUTE, id);
  const mit = tagesBilanz({ bloecke: [], erledigt: {}, aufgaben: [], ziele: [], workouts: workoutsAlsAufgaben(z, HEUTE) });
  assert.equal(mit.fertig, 1);
  assert.equal(mit.komplett, true);
  assert.equal(mit.teile.workouts.gesamt, 1);
});

test('Aufräumen wirft alte Log-Einträge weg', () => {
  const z = {
    ...leererZustand(),
    workoutLog: { '2024-01-01': { a: true }, '2026-09-20': { b: true }, '2026-09-19': {} },
  };
  const auf = raeumeWorkoutLogAuf(z, HEUTE, 30);
  assert.deepEqual(Object.keys(auf.workoutLog), ['2026-09-20']);
});

test('Vorschläge aus dem Wochenplan fassen gleiche Termine zusammen', () => {
  const vorschlaege = vorschlaegeAusPlan(baueStandardplan());
  const namen = vorschlaege.map((w) => w.name);

  assert.ok(namen.includes('Morgensport'), 'Morgensport wird erkannt');
  assert.ok(namen.includes('Joggen'));
  assert.ok(namen.includes('Orchester'));

  // Morgensport steht Mo-Fr im Plan -> ein Eintrag mit fünf Tagen
  const morgensport = vorschlaege.find((w) => w.name === 'Morgensport');
  assert.deepEqual(morgensport.tage, ['mo', 'di', 'mi', 'do', 'fr']);
  assert.equal(morgensport.start, '05:20');

  // Joggen nur Mo, Di, Fr
  assert.deepEqual(vorschlaege.find((w) => w.name === 'Joggen').tage, ['mo', 'di', 'fr']);

  // Kurse bekommen die Art "verein"
  assert.equal(vorschlaege.find((w) => w.name === 'Orchester').art, 'verein');

  // Alle Vorschläge sind gültig
  for (const w of vorschlaege) assert.equal(pruefeWorkout(w), null, `${w.name} ist ungültig`);
});
