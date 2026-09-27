import test from 'node:test';
import assert from 'node:assert/strict';

import {
  leererZustand,
  normalisiere,
  setzeErledigt,
  schalteErledigt,
  istErledigt,
  zieleFuer,
  setzeZiel,
  alleZieleGesetzt,
  autoAbhakenZieleBlock,
  uebernehmeOffeneZiele,
  setzeEinstellung,
  merkePlanAenderung,
  merkeKalenderExport,
  kalenderVeraltet,
  STANDARD_EINSTELLUNGEN,
} from '../js/logik/zustand.js';
import { erzeugeBackup, leseBackup } from '../js/logik/backup.js';
import { oeffneTag } from '../js/logik/snapshot.js';
import { ZIELE_BLOCK_TITEL } from '../js/daten/standardplan.js';

const HEUTE = '2026-09-21'; // Montag
const GESTERN = '2026-09-20';

test('Der leere Zustand hat Plan und Standardeinstellungen', () => {
  const z = leererZustand();
  assert.equal(z.einstellungen.streakSchwelle, 80);
  assert.equal(z.einstellungen.vorlaufMinuten, 5);
  assert.ok(z.plan.mo.length > 0);
});

test('normalisiere repariert kaputte Daten', () => {
  assert.deepEqual(normalisiere(null).einstellungen, STANDARD_EINSTELLUNGEN);
  assert.deepEqual(normalisiere({ einstellungen: { streakSchwelle: 50 } }).einstellungen, {
    ...STANDARD_EINSTELLUNGEN,
    streakSchwelle: 50,
  });
  assert.deepEqual(normalisiere({ erledigt: 'kaputt' }).erledigt, {});
});

test('Haekchen setzen und wieder wegnehmen', () => {
  let z = leererZustand();
  assert.equal(istErledigt(z, HEUTE, 'b1'), false);

  z = setzeErledigt(z, HEUTE, 'b1', true);
  assert.equal(istErledigt(z, HEUTE, 'b1'), true);

  z = schalteErledigt(z, HEUTE, 'b1');
  assert.equal(istErledigt(z, HEUTE, 'b1'), false);
  assert.deepEqual(z.erledigt[HEUTE], {}, 'entfernte Haekchen bleiben nicht als false liegen');

  // Andere Tage bleiben unberuehrt
  z = setzeErledigt(z, HEUTE, 'b1', true);
  assert.equal(istErledigt(z, GESTERN, 'b1'), false);
});

test('Es gibt immer genau 3 Tagesziele', () => {
  const z = leererZustand();
  const ziele = zieleFuer(z, HEUTE);
  assert.equal(ziele.length, 3);
  assert.deepEqual(ziele[0], { text: '', erledigt: false });
});

test('Ziele schreiben und abhaken', () => {
  let z = leererZustand();
  z = setzeZiel(z, HEUTE, 0, { text: 'Mathe üben' });
  assert.equal(zieleFuer(z, HEUTE)[0].text, 'Mathe üben');
  assert.equal(alleZieleGesetzt(z, HEUTE), false);

  z = setzeZiel(z, HEUTE, 1, { text: 'Cello üben' });
  z = setzeZiel(z, HEUTE, 2, { text: 'Zimmer aufräumen' });
  assert.equal(alleZieleGesetzt(z, HEUTE), true);

  z = setzeZiel(z, HEUTE, 0, { erledigt: true });
  assert.equal(zieleFuer(z, HEUTE)[0].erledigt, true);
  assert.equal(zieleFuer(z, HEUTE)[0].text, 'Mathe üben', 'Text bleibt erhalten');
});

test('Der Block "3 Tagesziele aufschreiben" hakt sich selbst ab', () => {
  let z = leererZustand();
  let bloecke;
  ({ zustand: z, bloecke } = oeffneTag(z, HEUTE, HEUTE));
  const zielBlock = bloecke.find((b) => b.titel === ZIELE_BLOCK_TITEL);
  assert.ok(zielBlock);

  // Nur zwei Ziele -> noch kein Haekchen
  z = setzeZiel(z, HEUTE, 0, { text: 'A' });
  z = setzeZiel(z, HEUTE, 1, { text: 'B' });
  z = autoAbhakenZieleBlock(z, HEUTE, bloecke);
  assert.equal(istErledigt(z, HEUTE, zielBlock.id), false);

  // Das dritte Ziel loest es aus
  z = setzeZiel(z, HEUTE, 2, { text: 'C' });
  z = autoAbhakenZieleBlock(z, HEUTE, bloecke);
  assert.equal(istErledigt(z, HEUTE, zielBlock.id), true);

  // Nimmt man ein Ziel wieder weg, bleibt das Haekchen (man hat es ja getan).
  z = setzeZiel(z, HEUTE, 2, { text: '' });
  z = autoAbhakenZieleBlock(z, HEUTE, bloecke);
  assert.equal(istErledigt(z, HEUTE, zielBlock.id), true);
});

test('Offene Ziele von gestern uebernehmen', () => {
  let z = leererZustand();
  z = setzeZiel(z, GESTERN, 0, { text: 'Mathe', erledigt: true });
  z = setzeZiel(z, GESTERN, 1, { text: 'Cello' });
  z = setzeZiel(z, GESTERN, 2, { text: 'Lesen' });

  const { zustand: neu, uebernommen } = uebernehmeOffeneZiele(z, GESTERN, HEUTE);
  assert.equal(uebernommen, 2);
  assert.deepEqual(
    zieleFuer(neu, HEUTE).map((x) => x.text),
    ['Cello', 'Lesen', ''],
  );
  assert.ok(zieleFuer(neu, HEUTE).every((x) => !x.erledigt));
});

test('Uebernehmen fuellt nur freie Plaetze und vermeidet Doppelte', () => {
  let z = leererZustand();
  z = setzeZiel(z, GESTERN, 0, { text: 'Cello' });
  z = setzeZiel(z, GESTERN, 1, { text: 'Lesen' });
  z = setzeZiel(z, HEUTE, 0, { text: 'Cello' }); // steht schon da
  z = setzeZiel(z, HEUTE, 1, { text: 'Joggen' });

  const { zustand: neu, uebernommen } = uebernehmeOffeneZiele(z, GESTERN, HEUTE);
  assert.equal(uebernommen, 1);
  assert.deepEqual(
    zieleFuer(neu, HEUTE).map((x) => x.text),
    ['Cello', 'Joggen', 'Lesen'],
  );
});

test('Nichts zu uebernehmen aendert nichts', () => {
  const z = leererZustand();
  const { zustand, uebernommen } = uebernehmeOffeneZiele(z, GESTERN, HEUTE);
  assert.equal(uebernommen, 0);
  assert.equal(zustand, z);
});

test('Hinweis "Kalender neu exportieren"', () => {
  let z = leererZustand();
  assert.equal(kalenderVeraltet(z), false, 'am Anfang kein Hinweis');

  z = merkePlanAenderung(z, new Date('2026-09-21T10:00:00Z'));
  assert.equal(kalenderVeraltet(z), true);

  z = merkeKalenderExport(z, new Date('2026-09-21T11:00:00Z'));
  assert.equal(kalenderVeraltet(z), false);

  z = merkePlanAenderung(z, new Date('2026-09-21T12:00:00Z'));
  assert.equal(kalenderVeraltet(z), true);
});

test('Einstellungen aendern', () => {
  const z = setzeEinstellung(leererZustand(), 'streakSchwelle', 60);
  assert.equal(z.einstellungen.streakSchwelle, 60);
  assert.equal(z.einstellungen.vorlaufMinuten, 5, 'andere bleiben');
});

test('Backup schreiben und wieder einlesen', () => {
  let z = leererZustand();
  z = setzeErledigt(z, HEUTE, 'b1', true);
  z = setzeZiel(z, HEUTE, 0, { text: 'Mathe üben' });
  z = setzeEinstellung(z, 'streakSchwelle', 70);

  const text = erzeugeBackup(z, new Date('2026-09-21T12:00:00Z'));
  const gelesen = leseBackup(text);

  assert.equal(gelesen.ok, true);
  assert.equal(istErledigt(gelesen.zustand, HEUTE, 'b1'), true);
  assert.equal(zieleFuer(gelesen.zustand, HEUTE)[0].text, 'Mathe üben');
  assert.equal(gelesen.zustand.einstellungen.streakSchwelle, 70);
  assert.deepEqual(gelesen.zustand.plan.mo, z.plan.mo);
});

test('Backup erkennt kaputte Dateien', () => {
  assert.equal(leseBackup('kein json').ok, false);
  assert.match(leseBackup('kein json').fehler, /JSON/);
  assert.equal(leseBackup('{"app":"mein-tag","daten":{}}').ok, false);
  assert.match(leseBackup('{"app":"mein-tag","daten":{}}').fehler, /Wochenplan/);
  // Ein roher Zustand ohne Huelle wird auch akzeptiert
  assert.equal(leseBackup(JSON.stringify(leererZustand())).ok, true);
});
