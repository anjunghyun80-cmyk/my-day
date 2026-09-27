import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tagesBilanz,
  istTagKomplett,
  sollFeiern,
  spruchFuer,
  SPRUECHE,
} from '../js/logik/tagesabschluss.js';
import { neuerBlock } from '../js/logik/plan.js';
import { tagesQuote, tagGeschafft } from '../js/logik/streak.js';

/** Ein Tag mit zwei abhakbaren Bloecken und einem, der nicht zaehlt. */
function testBloecke() {
  return [
    neuerBlock({ id: 'b1', start: '08:00', ende: '09:00', kategorie: 'schule', titel: 'Schule' }),
    neuerBlock({ id: 'b2', start: '16:00', ende: '17:00', kategorie: 'sport', titel: 'Joggen' }),
    neuerBlock({ id: 'b3', start: '18:00', ende: '19:00', kategorie: 'frei', titel: 'Freizeit' }),
  ];
}

test('Die Bilanz zählt Blöcke, Aufgaben und Ziele zusammen', () => {
  const b = tagesBilanz({
    bloecke: testBloecke(),
    erledigt: { b1: true },
    aufgaben: [
      { id: 'a1', text: 'Mathe', erledigt: true },
      { id: 'a2', text: 'Cello', erledigt: false },
    ],
    ziele: [
      { text: 'Ziel A', erledigt: true },
      { text: '', erledigt: false },
      { text: 'Ziel C', erledigt: false },
    ],
  });

  // 2 Blöcke + 2 Aufgaben + 2 Ziele (das leere zählt nicht) = 6
  assert.equal(b.gesamt, 6);
  assert.equal(b.fertig, 3);
  assert.equal(b.offen, 3);
  assert.equal(b.prozent, 50);
  assert.equal(b.komplett, false);

  assert.deepEqual(b.teile.bloecke, { gesamt: 2, fertig: 1 });
  assert.deepEqual(b.teile.aufgaben, { gesamt: 2, fertig: 1 });
  assert.deepEqual(b.teile.ziele, { gesamt: 2, fertig: 1 });
});

test('Komplett ist der Tag erst, wenn wirklich alles erledigt ist', () => {
  const bloecke = testBloecke();

  // Nur Blöcke fertig, Aufgabe offen
  assert.equal(
    istTagKomplett({
      bloecke,
      erledigt: { b1: true, b2: true },
      aufgaben: [{ id: 'a1', text: 'Mathe', erledigt: false }],
      ziele: [],
    }),
    false,
  );

  // Jetzt auch die Aufgabe
  assert.equal(
    istTagKomplett({
      bloecke,
      erledigt: { b1: true, b2: true },
      aufgaben: [{ id: 'a1', text: 'Mathe', erledigt: true }],
      ziele: [],
    }),
    true,
  );
});

test('Ein leeres Ziel blockiert den Tag nicht', () => {
  assert.equal(
    istTagKomplett({
      bloecke: [],
      erledigt: {},
      aufgaben: [{ id: 'a1', text: 'Mathe', erledigt: true }],
      ziele: [
        { text: '', erledigt: false },
        { text: '   ', erledigt: false },
        { text: '', erledigt: false },
      ],
    }),
    true,
  );
});

test('Ein Tag ohne alles ist nicht komplett', () => {
  assert.equal(istTagKomplett({ bloecke: [], erledigt: {}, aufgaben: [], ziele: [] }), false);
  // Auch ein Tag, an dem es nur nicht-abhakbare Blöcke gibt.
  assert.equal(
    istTagKomplett({
      bloecke: [neuerBlock({ id: 'x', kategorie: 'frei', titel: 'Freier Tag' })],
      erledigt: {},
      aufgaben: [],
      ziele: [],
    }),
    false,
  );
});

test('Gefeiert wird nur einmal pro Tag', () => {
  const tag = {
    bloecke: [],
    erledigt: {},
    aufgaben: [{ id: 'a1', text: 'Mathe', erledigt: true }],
    ziele: [],
  };
  assert.equal(sollFeiern(tag, false), true);
  assert.equal(sollFeiern(tag, true), false, 'schon gefeiert');
});

test('Derselbe Tag bekommt immer denselben Spruch', () => {
  const a = spruchFuer('2026-09-21');
  const b = spruchFuer('2026-09-21');
  assert.equal(a.titel, b.titel);
  assert.ok(SPRUECHE.includes(a));
  assert.ok(a.titel && a.text);

  // Über viele Tage kommen mehrere verschiedene Sprüche vor.
  const gesehen = new Set();
  for (let i = 1; i <= 28; i += 1) {
    gesehen.add(spruchFuer(`2026-09-${String(i).padStart(2, '0')}`).titel);
  }
  assert.ok(gesehen.size >= 4, `nur ${gesehen.size} verschiedene Sprüche`);
});

test('tagesQuote zählt Aufgaben und Ziele mit', () => {
  const bloecke = testBloecke();

  // Ohne Extras: nur die beiden abhakbaren Blöcke
  assert.deepEqual(tagesQuote(bloecke, { b1: true }), { gesamt: 2, fertig: 1, prozent: 50 });

  // Mit Extras
  assert.deepEqual(
    tagesQuote(bloecke, { b1: true, b2: true }, {
      aufgaben: [{ id: 'a1', text: 'X', erledigt: false }],
      ziele: [{ text: 'Y', erledigt: true }],
    }),
    { gesamt: 4, fertig: 3, prozent: 75 },
  );
});

test('tagGeschafft berücksichtigt Aufgaben und Ziele', () => {
  const bloecke = testBloecke();

  // Beide Blöcke fertig wären 100 % ...
  assert.equal(tagGeschafft(bloecke, { b1: true, b2: true }, 80), 'ja');

  // ... mit drei offenen Aufgaben aber nur noch 40 %.
  assert.equal(
    tagGeschafft(bloecke, { b1: true, b2: true }, 80, {
      aufgaben: [
        { id: 'a1', text: 'A', erledigt: false },
        { id: 'a2', text: 'B', erledigt: false },
        { id: 'a3', text: 'C', erledigt: false },
      ],
    }),
    'nein',
  );
});
