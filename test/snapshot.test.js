import test from 'node:test';
import assert from 'node:assert/strict';

import {
  oeffneTag,
  holeTagesplan,
  istZukunft,
  raeumeSnapshotsAuf,
  frischeHeuteAuf,
} from '../js/logik/snapshot.js';
import { neuerBlock, speichereBlock, loescheBlock } from '../js/logik/plan.js';
import { leererZustand, setzeErledigt, istErledigt } from '../js/logik/zustand.js';

const HEUTE = '2026-09-21'; // Montag
const GESTERN = '2026-09-20'; // Sonntag
const MORGEN = '2026-09-22'; // Dienstag

test('Beim ersten Oeffnen wird der Tag eingefroren', () => {
  const zustand = leererZustand();
  assert.equal(zustand.snapshots['2026-09-21'], undefined);

  const { zustand: neu, bloecke, neuAngelegt } = oeffneTag(zustand, HEUTE, HEUTE);
  assert.equal(neuAngelegt, true);
  assert.ok(neu.snapshots[HEUTE]);
  assert.equal(neu.snapshots[HEUTE].length, bloecke.length);
  assert.equal(zustand.snapshots[HEUTE], undefined, 'Original bleibt unveraendert');
});

test('Ein zweites Oeffnen legt keinen neuen Snapshot an', () => {
  let zustand = leererZustand();
  ({ zustand } = oeffneTag(zustand, HEUTE, HEUTE));
  const ersterSnapshot = zustand.snapshots[HEUTE];

  const zweites = oeffneTag(zustand, HEUTE, HEUTE);
  assert.equal(zweites.neuAngelegt, false);
  assert.equal(zweites.bloecke, ersterSnapshot);
});

test('Zukuenftige Tage werden NICHT eingefroren', () => {
  const zustand = leererZustand();
  const { zustand: neu, neuAngelegt, bloecke } = oeffneTag(zustand, MORGEN, HEUTE);
  assert.equal(neuAngelegt, false);
  assert.equal(neu.snapshots[MORGEN], undefined);
  assert.ok(bloecke.length > 0, 'trotzdem bekommt man die Bloecke aus dem Plan');
  assert.equal(istZukunft(MORGEN, HEUTE), true);
  assert.equal(istZukunft(HEUTE, HEUTE), false);
  assert.equal(istZukunft(GESTERN, HEUTE), false);
});

test('Planaenderungen veraendern vergangene Tage nicht', () => {
  let zustand = leererZustand();

  // Montag und Sonntag oeffnen -> beide werden eingefroren
  ({ zustand } = oeffneTag(zustand, GESTERN, HEUTE));
  ({ zustand } = oeffneTag(zustand, HEUTE, HEUTE));

  const vorher = holeTagesplan(zustand, HEUTE).length;
  const sonntagVorher = holeTagesplan(zustand, GESTERN).map((b) => b.titel);

  // Jetzt den Wochenplan kraeftig aendern: Montag komplett neu
  const neuerMontag = [
    neuerBlock({ start: '05:00', ende: '29:00', kategorie: 'frei', titel: 'Nichtstun' }),
  ];
  zustand = { ...zustand, plan: { ...zustand.plan, mo: neuerMontag } };
  // ... und am Sonntag einen Block loeschen
  const sonntagsBlock = zustand.plan.so[0];
  zustand = { ...zustand, plan: loescheBlock(zustand.plan, 'so', sonntagsBlock.id) };

  // Die eingefrorenen Tage bleiben, wie sie waren.
  assert.equal(holeTagesplan(zustand, HEUTE).length, vorher);
  assert.notEqual(holeTagesplan(zustand, HEUTE)[0].titel, 'Nichtstun');
  assert.deepEqual(holeTagesplan(zustand, GESTERN).map((b) => b.titel), sonntagVorher);

  // Ein noch nicht geoeffneter Montag in der Zukunft bekommt den neuen Plan.
  assert.equal(holeTagesplan(zustand, '2026-09-28')[0].titel, 'Nichtstun');
});

test('Ein Haekchen bleibt gueltig, auch wenn der Block aus dem Plan fliegt', () => {
  let zustand = leererZustand();
  let bloecke;
  ({ zustand, bloecke } = oeffneTag(zustand, HEUTE, HEUTE));

  const joggen = bloecke.find((b) => b.titel === 'Joggen');
  assert.ok(joggen, 'Montag hat Joggen');

  // Block aus dem aktuellen Plan entfernen
  const imPlan = zustand.plan.mo.find((b) => b.titel === 'Joggen');
  zustand = { ...zustand, plan: loescheBlock(zustand.plan, 'mo', imPlan.id) };

  // Im Snapshot ist er noch da - das Haekchen zaehlt weiter.
  assert.ok(holeTagesplan(zustand, HEUTE).some((b) => b.id === joggen.id));
});

test('Ein neuer Block wirkt ab heute, wenn der Tag noch nicht geoeffnet wurde', () => {
  let zustand = leererZustand();
  const extra = neuerBlock({ start: '04:59', ende: '05:00', kategorie: 'frei', titel: 'Egal' });
  // bewusst ausserhalb der Pruefung eingefuegt - hier geht es nur um Snapshots
  zustand = { ...zustand, plan: speichereBlock(zustand.plan, 'mo', extra) };

  const { bloecke } = oeffneTag(zustand, HEUTE, HEUTE);
  assert.ok(bloecke.some((b) => b.titel === 'Egal'));
});

test('frischeHeuteAuf laesst eine Planaenderung schon heute wirken', () => {
  let zustand = leererZustand();
  ({ zustand } = oeffneTag(zustand, GESTERN, HEUTE));
  ({ zustand } = oeffneTag(zustand, HEUTE, HEUTE));

  const gesternVorher = holeTagesplan(zustand, GESTERN).map((b) => b.titel);

  // Am Montag einen neuen Block anlegen
  const neu = neuerBlock({ start: '14:00', ende: '14:30', kategorie: 'sport', titel: 'Liegestuetze' });
  zustand = { ...zustand, plan: speichereBlock(zustand.plan, 'mo', neu) };

  // Ohne Auffrischen wuerde der Block heute noch fehlen ...
  assert.ok(!holeTagesplan(zustand, HEUTE).some((b) => b.titel === 'Liegestuetze'));

  // ... danach ist er da.
  zustand = frischeHeuteAuf(zustand, HEUTE);
  assert.ok(holeTagesplan(zustand, HEUTE).some((b) => b.titel === 'Liegestuetze'));

  // Gestern bleibt unangetastet.
  assert.deepEqual(holeTagesplan(zustand, GESTERN).map((b) => b.titel), gesternVorher);
});

test('Auffrischen behaelt die Haekchen von heute', () => {
  let zustand = leererZustand();
  let bloecke;
  ({ zustand, bloecke } = oeffneTag(zustand, HEUTE, HEUTE));

  const joggen = bloecke.find((b) => b.titel === 'Joggen');
  zustand = setzeErledigt(zustand, HEUTE, joggen.id, true);

  // Einen anderen Block umbenennen - Joggen bleibt unveraendert.
  const hausaufgaben = zustand.plan.mo.find((b) => b.titel === 'Hausaufgaben');
  zustand = {
    ...zustand,
    plan: speichereBlock(zustand.plan, 'mo', { ...hausaufgaben, titel: 'HA machen' }),
  };
  zustand = frischeHeuteAuf(zustand, HEUTE);

  assert.equal(istErledigt(zustand, HEUTE, joggen.id), true, 'Haekchen ueberlebt');
  assert.ok(holeTagesplan(zustand, HEUTE).some((b) => b.titel === 'HA machen'));
});

test('Auffrischen tut nichts, wenn es noch keinen Snapshot gibt', () => {
  const zustand = leererZustand();
  assert.equal(frischeHeuteAuf(zustand, HEUTE), zustand);
});

test('raeumeSnapshotsAuf wirft alte Tage weg', () => {
  const zustand = {
    ...leererZustand(),
    snapshots: { '2024-01-01': [], '2026-09-20': [], '2026-09-21': [] },
  };
  const aufgeraeumt = raeumeSnapshotsAuf(zustand, HEUTE, 30);
  assert.deepEqual(Object.keys(aufgeraeumt.snapshots).sort(), ['2026-09-20', '2026-09-21']);
});
