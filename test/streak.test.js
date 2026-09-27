import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tagesQuote,
  tagGeschafft,
  aktuelleStreak,
  laengsteStreak,
  berechneTagesStreak,
  berechneHabitStreak,
} from '../js/logik/streak.js';
import { neuerBlock } from '../js/logik/plan.js';
import { tagVerschieben } from '../js/logik/zeit.js';

const HEUTE = '2026-09-21';

/** Kleiner Baukasten: 5 abhakbare Bloecke plus ein nicht abhakbarer. */
function testTag(prefix) {
  return [
    neuerBlock({ id: `${prefix}-1`, start: '06:00', ende: '07:00', kategorie: 'sport', titel: 'Morgensport' }),
    neuerBlock({ id: `${prefix}-2`, start: '07:00', ende: '08:00', kategorie: 'schule', titel: 'Hausaufgaben' }),
    neuerBlock({ id: `${prefix}-3`, start: '08:00', ende: '09:00', kategorie: 'essen', titel: 'Fruehstueck' }),
    neuerBlock({ id: `${prefix}-4`, start: '09:00', ende: '10:00', kategorie: 'routine', titel: 'Bad' }),
    neuerBlock({ id: `${prefix}-5`, start: '10:00', ende: '11:00', kategorie: 'kurs', titel: 'Cello' }),
    neuerBlock({ id: `${prefix}-6`, start: '11:00', ende: '12:00', kategorie: 'frei', titel: 'Freizeit' }),
  ];
}

/** Hakt die ersten n Bloecke ab. */
function erledigeN(prefix, n) {
  const erledigt = {};
  for (let i = 1; i <= n; i += 1) erledigt[`${prefix}-${i}`] = true;
  return erledigt;
}

test('tagesQuote zaehlt nur abhakbare Bloecke', () => {
  const bloecke = testTag('a');
  assert.deepEqual(tagesQuote(bloecke, {}), { gesamt: 5, fertig: 0, prozent: 0 });
  assert.deepEqual(tagesQuote(bloecke, erledigeN('a', 4)), { gesamt: 5, fertig: 4, prozent: 80 });
  assert.deepEqual(tagesQuote(bloecke, erledigeN('a', 5)), { gesamt: 5, fertig: 5, prozent: 100 });
  // Ein Haekchen an einem nicht abhakbaren Block zaehlt nicht mit.
  assert.equal(tagesQuote(bloecke, { 'a-6': true }).fertig, 0);
});

test('tagGeschafft haengt an der Schwelle', () => {
  const bloecke = testTag('a');
  assert.equal(tagGeschafft(bloecke, erledigeN('a', 4), 80), 'ja');
  assert.equal(tagGeschafft(bloecke, erledigeN('a', 3), 80), 'nein');
  assert.equal(tagGeschafft(bloecke, erledigeN('a', 3), 60), 'ja');
  // Ein Tag ohne abhakbare Bloecke bricht die Streak nicht.
  assert.equal(tagGeschafft([neuerBlock({ kategorie: 'frei', titel: 'X' })], {}, 80), 'egal');
});

test('Die aktuelle Streak laesst den heutigen Tag noch offen', () => {
  // gestern und vorgestern geschafft, heute noch nicht
  const werte = { [HEUTE]: 'nein', [tagVerschieben(HEUTE, -1)]: 'ja', [tagVerschieben(HEUTE, -2)]: 'ja' };
  const bewerte = (iso) => werte[iso] ?? 'nein';
  assert.equal(aktuelleStreak(bewerte, HEUTE), 2, 'heute zieht die Streak nicht runter');

  // sobald heute geschafft ist, zaehlt heute mit
  werte[HEUTE] = 'ja';
  assert.equal(aktuelleStreak(bewerte, HEUTE), 3);
});

test('"egal"-Tage unterbrechen die Streak nicht', () => {
  const werte = {
    [HEUTE]: 'ja',
    [tagVerschieben(HEUTE, -1)]: 'egal',
    [tagVerschieben(HEUTE, -2)]: 'ja',
    [tagVerschieben(HEUTE, -3)]: 'nein',
  };
  const bewerte = (iso) => werte[iso] ?? 'nein';
  assert.equal(aktuelleStreak(bewerte, HEUTE), 2);
});

test('laengsteStreak findet die beste Serie in der Vergangenheit', () => {
  const muster = ['ja', 'nein', 'ja', 'ja', 'ja', 'nein', 'ja']; // Index 0 = heute
  const bewerte = (iso) => {
    const abstand = -Math.round((new Date(iso) - new Date(HEUTE)) / 86400000);
    return muster[abstand] ?? 'nein';
  };
  assert.equal(laengsteStreak(bewerte, HEUTE, 7), 3);
  assert.equal(aktuelleStreak(bewerte, HEUTE, 7), 1);
});

test('berechneTagesStreak ueber echte Tagesdaten', () => {
  // Die letzten 4 Tage jeweils 100 % erledigt, davor nichts.
  const daten = {};
  for (let i = 0; i < 4; i += 1) {
    const iso = tagVerschieben(HEUTE, -i);
    daten[iso] = { bloecke: testTag(iso), erledigt: erledigeN(iso, 5) };
  }
  const holeTag = (iso) => daten[iso] ?? { bloecke: testTag(iso), erledigt: {} };

  const streak = berechneTagesStreak(holeTag, HEUTE, 80, 20);
  assert.equal(streak.aktuell, 4);
  assert.equal(streak.laengste, 4);
});

test('Habit-Streak zaehlt nur Tage, an denen der Block im Plan steht', () => {
  // Joggen gibt es nur an geraden Abstaenden (0, 2, 4 Tage zurueck).
  const holeTag = (iso) => {
    const abstand = -Math.round((new Date(iso) - new Date(HEUTE)) / 86400000);
    if (abstand % 2 !== 0) {
      return { bloecke: [neuerBlock({ id: `x${iso}`, kategorie: 'schule', titel: 'Schule' })], erledigt: {} };
    }
    const joggen = neuerBlock({ id: `j${iso}`, start: '16:00', ende: '16:30', kategorie: 'sport', titel: 'Joggen' });
    return { bloecke: [joggen], erledigt: abstand <= 4 ? { [joggen.id]: true } : {} };
  };

  const streak = berechneHabitStreak(holeTag, HEUTE, 'Joggen', 10);
  // Tage 0, 2, 4 sind abgehakt -> 3 Termine in Folge; Tag 6 nicht mehr.
  assert.equal(streak.aktuell, 3);
});

test('Habit-Streak: heute noch offen bricht die Serie nicht', () => {
  const holeTag = (iso) => {
    const joggen = neuerBlock({ id: `j${iso}`, start: '16:00', ende: '16:30', kategorie: 'sport', titel: 'Joggen' });
    const abstand = -Math.round((new Date(iso) - new Date(HEUTE)) / 86400000);
    // heute (Abstand 0) noch nicht abgehakt, die zwei Tage davor schon
    return { bloecke: [joggen], erledigt: abstand >= 1 && abstand <= 2 ? { [joggen.id]: true } : {} };
  };
  assert.equal(berechneHabitStreak(holeTag, HEUTE, 'Joggen', 10).aktuell, 2);
});

test('Ohne Daten ist die Streak 0', () => {
  const holeTag = (iso) => ({ bloecke: testTag(iso), erledigt: {} });
  const streak = berechneTagesStreak(holeTag, HEUTE, 80, 30);
  assert.equal(streak.aktuell, 0);
  assert.equal(streak.laengste, 0);
});
