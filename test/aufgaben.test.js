import test from 'node:test';
import assert from 'node:assert/strict';

import {
  neueAufgabe,
  aufgabenFuer,
  fuegeAufgabeHinzu,
  schalteAufgabe,
  benenneAufgabeUm,
  loescheAufgabe,
  loescheErledigte,
  uebernimmOffeneAufgaben,
  offeneVonGestern,
  raeumeAufgabenAuf,
  MAX_LAENGE,
} from '../js/logik/aufgaben.js';
import { leererZustand } from '../js/logik/zustand.js';

const HEUTE = '2026-09-21';
const GESTERN = '2026-09-20';

test('Eine neue Aufgabe ist offen und hat eine Kennung', () => {
  const a = neueAufgabe('  Bibliotheksbuch zurückbringen  ');
  assert.equal(a.text, 'Bibliotheksbuch zurückbringen', 'Leerzeichen werden entfernt');
  assert.equal(a.erledigt, false);
  assert.ok(a.id);
});

test('Sehr lange Texte werden gekürzt', () => {
  const a = neueAufgabe('x'.repeat(500));
  assert.equal(a.text.length, MAX_LAENGE);
});

test('Aufgabe hinzufügen', () => {
  let z = leererZustand();
  assert.deepEqual(aufgabenFuer(z, HEUTE), []);

  const ergebnis = fuegeAufgabeHinzu(z, HEUTE, 'Mathe abgeben');
  assert.equal(ergebnis.fehler, null);
  assert.equal(ergebnis.aufgabe.text, 'Mathe abgeben');
  assert.equal(aufgabenFuer(ergebnis.zustand, HEUTE).length, 1);
  assert.deepEqual(aufgabenFuer(z, HEUTE), [], 'Original bleibt unverändert');

  // Mehrere hintereinander behalten ihre Reihenfolge.
  z = ergebnis.zustand;
  z = fuegeAufgabeHinzu(z, HEUTE, 'Cello üben').zustand;
  assert.deepEqual(
    aufgabenFuer(z, HEUTE).map((a) => a.text),
    ['Mathe abgeben', 'Cello üben'],
  );
});

test('Leerer Text wird abgelehnt', () => {
  const z = leererZustand();
  const ergebnis = fuegeAufgabeHinzu(z, HEUTE, '   ');
  assert.equal(ergebnis.aufgabe, null);
  assert.match(ergebnis.fehler, /Schreib/);
  assert.equal(ergebnis.zustand, z, 'Zustand bleibt derselbe');
});

test('Aufgabe abhaken und wieder freigeben', () => {
  let z = leererZustand();
  const { zustand, aufgabe } = fuegeAufgabeHinzu(z, HEUTE, 'Zimmer aufräumen');
  z = zustand;

  z = schalteAufgabe(z, HEUTE, aufgabe.id);
  assert.equal(aufgabenFuer(z, HEUTE)[0].erledigt, true);

  z = schalteAufgabe(z, HEUTE, aufgabe.id);
  assert.equal(aufgabenFuer(z, HEUTE)[0].erledigt, false);
});

test('Aufgabe umbenennen - leerer Text ändert nichts', () => {
  let z = leererZustand();
  const { zustand, aufgabe } = fuegeAufgabeHinzu(z, HEUTE, 'Alt');
  z = zustand;

  z = benenneAufgabeUm(z, HEUTE, aufgabe.id, 'Neu');
  assert.equal(aufgabenFuer(z, HEUTE)[0].text, 'Neu');

  z = benenneAufgabeUm(z, HEUTE, aufgabe.id, '   ');
  assert.equal(aufgabenFuer(z, HEUTE)[0].text, 'Neu', 'bleibt stehen');
});

test('Aufgabe löschen', () => {
  let z = leererZustand();
  const eins = fuegeAufgabeHinzu(z, HEUTE, 'Eins');
  const zwei = fuegeAufgabeHinzu(eins.zustand, HEUTE, 'Zwei');
  z = zwei.zustand;

  z = loescheAufgabe(z, HEUTE, eins.aufgabe.id);
  assert.deepEqual(aufgabenFuer(z, HEUTE).map((a) => a.text), ['Zwei']);

  // Eine unbekannte Kennung tut nichts.
  z = loescheAufgabe(z, HEUTE, 'gibtesnicht');
  assert.equal(aufgabenFuer(z, HEUTE).length, 1);
});

test('Erledigte auf einmal aufräumen', () => {
  let z = leererZustand();
  const a = fuegeAufgabeHinzu(z, HEUTE, 'A');
  const b = fuegeAufgabeHinzu(a.zustand, HEUTE, 'B');
  const c = fuegeAufgabeHinzu(b.zustand, HEUTE, 'C');
  z = c.zustand;

  z = schalteAufgabe(z, HEUTE, a.aufgabe.id);
  z = schalteAufgabe(z, HEUTE, c.aufgabe.id);

  const ergebnis = loescheErledigte(z, HEUTE);
  assert.equal(ergebnis.entfernt, 2);
  assert.deepEqual(aufgabenFuer(ergebnis.zustand, HEUTE).map((x) => x.text), ['B']);
});

test('Offene Aufgaben von gestern holen - sie werden verschoben, nicht kopiert', () => {
  let z = leererZustand();
  const a = fuegeAufgabeHinzu(z, GESTERN, 'Offen geblieben');
  const b = fuegeAufgabeHinzu(a.zustand, GESTERN, 'Schon fertig');
  z = schalteAufgabe(b.zustand, GESTERN, b.aufgabe.id);

  assert.equal(offeneVonGestern(z, HEUTE).length, 1);

  const ergebnis = uebernimmOffeneAufgaben(z, GESTERN, HEUTE);
  assert.equal(ergebnis.uebernommen, 1);
  assert.deepEqual(aufgabenFuer(ergebnis.zustand, HEUTE).map((x) => x.text), ['Offen geblieben']);
  assert.deepEqual(
    aufgabenFuer(ergebnis.zustand, GESTERN).map((x) => x.text),
    ['Schon fertig'],
    'die offene Aufgabe steht nicht mehr bei gestern',
  );
  assert.equal(aufgabenFuer(ergebnis.zustand, HEUTE)[0].erledigt, false);
});

test('Beim Holen entstehen keine Doppelten', () => {
  let z = leererZustand();
  z = fuegeAufgabeHinzu(z, GESTERN, 'Cello üben').zustand;
  z = fuegeAufgabeHinzu(z, GESTERN, 'Lesen').zustand;
  z = fuegeAufgabeHinzu(z, HEUTE, 'cello üben').zustand; // andere Schreibweise

  const ergebnis = uebernimmOffeneAufgaben(z, GESTERN, HEUTE);
  assert.equal(ergebnis.uebernommen, 1);
  assert.deepEqual(aufgabenFuer(ergebnis.zustand, HEUTE).map((x) => x.text), ['cello üben', 'Lesen']);
});

test('Nichts zu holen ändert nichts', () => {
  const z = leererZustand();
  const ergebnis = uebernimmOffeneAufgaben(z, GESTERN, HEUTE);
  assert.equal(ergebnis.uebernommen, 0);
  assert.equal(ergebnis.zustand, z);
});

test('Aufräumen wirft alte und leere Listen weg', () => {
  const z = {
    ...leererZustand(),
    aufgaben: {
      '2024-01-01': [{ id: 'a', text: 'uralt', erledigt: true }],
      '2026-09-20': [{ id: 'b', text: 'gestern', erledigt: false }],
      '2026-09-21': [],
    },
  };
  const aufgeraeumt = raeumeAufgabenAuf(z, HEUTE, 30);
  assert.deepEqual(Object.keys(aufgeraeumt.aufgaben), ['2026-09-20']);
});
