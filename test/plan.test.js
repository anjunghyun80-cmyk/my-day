import test from 'node:test';
import assert from 'node:assert/strict';

import {
  baueStandardplan,
  neuerBlock,
  pruefeBlock,
  findeUeberschneidungen,
  findeLuecken,
  kopiereAufTage,
  speichereBlock,
  loescheBlock,
  abhakbareBloecke,
  habitVonTitel,
  PLAN_ENDE_MIN,
} from '../js/logik/plan.js';
import { blockStart, blockEnde, PLAN_START_MIN, zuMinuten } from '../js/logik/zeit.js';
import { WOCHENTAGE } from '../js/daten/standardplan.js';

test('Der Standardplan hat alle sieben Tage', () => {
  const plan = baueStandardplan();
  assert.deepEqual(Object.keys(plan).sort(), [...WOCHENTAGE].sort());
  for (const tag of WOCHENTAGE) assert.ok(plan[tag].length > 0, `${tag} ist leer`);
});

test('Vorlagen werden eingesetzt - jeder Tag ist eine vollstaendige Liste', () => {
  const plan = baueStandardplan();
  // "@schulmorgen" bringt 11 Bloecke mit, der erste ist "Aufwachen & Bett machen".
  assert.equal(plan.mo[0].titel, 'Aufwachen & Bett machen');
  assert.equal(plan.mo[0].start, '05:00');
  // "@abend" bringt den Schlafblock bis 29:00 mit.
  assert.equal(plan.mo.at(-1).titel, 'Schlafen');
  assert.equal(plan.mo.at(-1).ende, '29:00');
  // Es steht kein "@..." mehr im fertigen Plan.
  for (const tag of WOCHENTAGE) {
    for (const b of plan[tag]) assert.equal(typeof b, 'object');
  }
});

test('Jeder Block hat eine eigene Kennung', () => {
  const plan = baueStandardplan();
  const alle = WOCHENTAGE.flatMap((t) => plan[t].map((b) => b.id));
  assert.equal(new Set(alle).size, alle.length);
});

test('"abhakbar" kommt aus der Kategorie', () => {
  const plan = baueStandardplan();
  const joggen = plan.mo.find((b) => b.titel === 'Joggen');
  const freizeit = plan.mo.find((b) => b.kategorie === 'frei');
  const schlafen = plan.mo.find((b) => b.kategorie === 'schlaf');
  const weg = plan.mo.find((b) => b.kategorie === 'weg');
  assert.equal(joggen.abhakbar, true);
  assert.equal(freizeit.abhakbar, false);
  assert.equal(schlafen.abhakbar, false);
  assert.equal(weg.abhakbar, false);
});

test('Die Standard-Erinnerungen sitzen an den richtigen Bloecken', () => {
  const plan = baueStandardplan();
  const mitErinnerung = (tag) =>
    plan[tag].filter((b) => b.erinnerung).map((b) => `${b.start} ${b.titel}`);

  assert.deepEqual(mitErinnerung('mo'), [
    '14:00 Hausaufgaben',
    '16:00 Joggen',
    '17:00 Fahrt zum Orchester',
    '20:30 Bettfertig machen',
  ]);
  assert.deepEqual(mitErinnerung('mi'), [
    '14:00 Hausaufgaben',
    '15:25 Weg zum Cello',
    '20:30 Bettfertig machen',
  ]);
  assert.deepEqual(mitErinnerung('sa'), [
    '09:00 Fahrt nach Düsseldorf',
    '21:30 Bettfertig machen',
  ]);
  assert.deepEqual(mitErinnerung('so'), ['20:30 Bettfertig machen']);
  // Mittwoch hat kein Joggen
  assert.ok(!plan.mi.some((b) => b.titel === 'Joggen'));
});

test('Der Standardplan hat keine Luecken und keine Ueberschneidungen', () => {
  const plan = baueStandardplan();
  for (const tag of WOCHENTAGE) {
    assert.deepEqual(findeUeberschneidungen(plan[tag]), [], `Ueberschneidung am ${tag}`);
    assert.deepEqual(findeLuecken(plan[tag]), [], `Luecke am ${tag}`);
    assert.equal(blockStart(plan[tag][0]), PLAN_START_MIN);
    assert.equal(blockEnde(plan[tag].at(-1)), PLAN_ENDE_MIN);
  }
});

test('findeLuecken meldet fehlende Zeitraeume', () => {
  const bloecke = [
    neuerBlock({ start: '06:00', ende: '07:00', kategorie: 'schule', titel: 'A' }),
    neuerBlock({ start: '08:00', ende: '09:00', kategorie: 'schule', titel: 'B' }),
  ];
  assert.deepEqual(findeLuecken(bloecke), [
    { vonMin: zuMinuten('05:00'), bisMin: zuMinuten('06:00') },
    { vonMin: zuMinuten('07:00'), bisMin: zuMinuten('08:00') },
    { vonMin: zuMinuten('09:00'), bisMin: zuMinuten('29:00') },
  ]);
});

test('pruefeBlock verhindert Unsinn', () => {
  const andere = [neuerBlock({ start: '14:00', ende: '15:00', kategorie: 'schule', titel: 'HA' })];

  const ok = neuerBlock({ start: '15:00', ende: '16:00', kategorie: 'sport', titel: 'Sport' });
  assert.equal(pruefeBlock(ok, andere), null);

  const ohneTitel = neuerBlock({ start: '15:00', ende: '16:00', kategorie: 'sport', titel: ' ' });
  assert.match(pruefeBlock(ohneTitel, andere), /Titel/);

  const verdreht = neuerBlock({ start: '16:00', ende: '15:00', kategorie: 'sport', titel: 'X' });
  assert.match(pruefeBlock(verdreht, andere), /Ende muss nach dem Start/);

  const zuFrueh = neuerBlock({ start: '04:30', ende: '05:30', kategorie: 'sport', titel: 'X' });
  assert.match(pruefeBlock(zuFrueh, andere), /05:00/);

  const zuSpaet = neuerBlock({ start: '28:00', ende: '30:00', kategorie: 'sport', titel: 'X' });
  assert.match(pruefeBlock(zuSpaet, andere), /29:00/);

  const kollision = neuerBlock({ start: '14:30', ende: '15:30', kategorie: 'sport', titel: 'X' });
  assert.match(pruefeBlock(kollision, andere), /überschneidet sich mit "HA"/);

  // Sich selbst darf ein Block nicht blockieren.
  assert.equal(pruefeBlock(andere[0], andere), null);
});

test('kopiereAufTage ersetzt ueberlappende Bloecke im Zieltag', () => {
  const plan = {
    mo: [neuerBlock({ start: '05:00', ende: '06:00', kategorie: 'sport', titel: 'Morgensport' })],
    di: [neuerBlock({ start: '05:30', ende: '06:30', kategorie: 'frei', titel: 'Doesen' })],
    mi: [],
  };
  const neu = kopiereAufTage(plan, plan.mo, ['di', 'mi']);

  assert.equal(neu.di.length, 1);
  assert.equal(neu.di[0].titel, 'Morgensport');
  assert.equal(neu.mi[0].titel, 'Morgensport');
  // Kopien bekommen eigene Kennungen
  assert.notEqual(neu.di[0].id, plan.mo[0].id);
  assert.notEqual(neu.di[0].id, neu.mi[0].id);
  // Der Ausgangstag bleibt unveraendert
  assert.equal(plan.di[0].titel, 'Doesen');
});

test('speichereBlock und loescheBlock arbeiten ohne Seiteneffekte', () => {
  const a = neuerBlock({ start: '14:00', ende: '15:00', kategorie: 'schule', titel: 'A' });
  const plan = { mo: [a] };

  const b = neuerBlock({ start: '10:00', ende: '11:00', kategorie: 'schule', titel: 'B' });
  const mitB = speichereBlock(plan, 'mo', b);
  assert.equal(mitB.mo.length, 2);
  assert.equal(mitB.mo[0].titel, 'B', 'wird nach Startzeit sortiert');
  assert.equal(plan.mo.length, 1, 'Original unveraendert');

  const geaendert = speichereBlock(mitB, 'mo', { ...a, titel: 'A neu' });
  assert.equal(geaendert.mo.length, 2);
  assert.equal(geaendert.mo.find((x) => x.id === a.id).titel, 'A neu');

  const ohneA = loescheBlock(geaendert, 'mo', a.id);
  assert.equal(ohneA.mo.length, 1);
});

test('abhakbareBloecke und habitVonTitel', () => {
  const plan = baueStandardplan();
  assert.ok(abhakbareBloecke(plan.mo).length > 0);
  assert.ok(abhakbareBloecke(plan.mo).every((b) => b.abhakbar));
  assert.equal(habitVonTitel('Joggen'), 'joggen');
  assert.equal(habitVonTitel('3 Tagesziele aufschreiben'), 'tagesziele');
  assert.equal(habitVonTitel('Irgendwas'), null);
});
