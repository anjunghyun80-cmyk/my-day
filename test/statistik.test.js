import test from 'node:test';
import assert from 'node:assert/strict';

import {
  letzteTage,
  quoteZeitraum,
  quoteNachKategorie,
  quoteNachWochentag,
  heatmap,
  zieleStatistik,
  hatDaten,
} from '../js/logik/statistik.js';
import { neuerBlock } from '../js/logik/plan.js';
import { leererZustand, setzeErledigt, setzeZiel } from '../js/logik/zustand.js';

const HEUTE = '2026-09-21'; // Montag

function tagMit(prefix) {
  return [
    neuerBlock({ id: `${prefix}-s`, start: '08:00', ende: '09:00', kategorie: 'schule', titel: 'Schule' }),
    neuerBlock({ id: `${prefix}-p`, start: '16:00', ende: '17:00', kategorie: 'sport', titel: 'Joggen' }),
    neuerBlock({ id: `${prefix}-f`, start: '18:00', ende: '19:00', kategorie: 'frei', titel: 'Freizeit' }),
  ];
}

test('letzteTage zaehlt rueckwaerts, heute zuerst', () => {
  assert.deepEqual(letzteTage(HEUTE, 3), ['2026-09-21', '2026-09-20', '2026-09-19']);
});

test('quoteZeitraum summiert ueber mehrere Tage', () => {
  // An jedem der 4 Tage ist genau der Schulblock erledigt (1 von 2).
  const holeTag = (iso) => ({ bloecke: tagMit(iso), erledigt: { [`${iso}-s`]: true } });
  assert.deepEqual(quoteZeitraum(holeTag, HEUTE, 4), { gesamt: 8, fertig: 4, prozent: 50 });
});

test('quoteNachKategorie trennt die Kategorien', () => {
  const holeTag = (iso) => ({ bloecke: tagMit(iso), erledigt: { [`${iso}-s`]: true } });
  const q = quoteNachKategorie(holeTag, HEUTE, 7);
  assert.deepEqual(q.schule, { gesamt: 7, fertig: 7, prozent: 100 });
  assert.deepEqual(q.sport, { gesamt: 7, fertig: 0, prozent: 0 });
  assert.deepEqual(q.frei, { gesamt: 0, fertig: 0, prozent: 0 }, 'Freizeit ist nicht abhakbar');
});

test('quoteNachWochentag ordnet richtig zu', () => {
  // Nur am Montag (= heute) ist etwas erledigt.
  const holeTag = (iso) => ({
    bloecke: tagMit(iso),
    erledigt: iso === HEUTE ? { [`${iso}-s`]: true, [`${iso}-p`]: true } : {},
  });
  const q = quoteNachWochentag(holeTag, HEUTE, 7);
  assert.equal(q.mo.prozent, 100);
  assert.equal(q.di.prozent, 0);
  assert.equal(q.so.gesamt, 2);
});

test('Heatmap liefert 12 Wochen zu 7 Tagen, Montag zuerst', () => {
  const holeTag = (iso) => ({ bloecke: tagMit(iso), erledigt: { [`${iso}-s`]: true } });
  const wochen = heatmap(holeTag, HEUTE, 12);

  assert.equal(wochen.length, 12);
  assert.ok(wochen.every((w) => w.length === 7));
  // Letzte Woche beginnt am Montag, dem 21.09.2026 (= heute)
  assert.equal(wochen.at(-1)[0].iso, '2026-09-21');
  assert.equal(wochen.at(-1)[0].prozent, 50);
  // Der Rest dieser Woche liegt in der Zukunft
  assert.equal(wochen.at(-1)[1].zukunft, true);
  assert.equal(wochen.at(-1)[1].prozent, 0);
  // Die erste Woche liegt 11 Wochen zurueck
  assert.equal(wochen[0][0].iso, '2026-07-06');
});

test('Tagesziele zaehlen', () => {
  const daten = {
    [HEUTE]: [
      { text: 'A', erledigt: true },
      { text: 'B', erledigt: true },
      { text: 'C', erledigt: true },
    ],
    '2026-09-20': [
      { text: 'D', erledigt: true },
      { text: 'E', erledigt: false },
      { text: '', erledigt: false },
    ],
  };
  const s = zieleStatistik((iso) => daten[iso], HEUTE, 7);
  assert.equal(s.erledigt, 4);
  assert.equal(s.gesetzt, 5);
  assert.equal(s.tageKomplett, 1);
});

test('hatDaten erkennt den ersten Start', () => {
  let z = leererZustand();
  assert.equal(hatDaten(z), false);

  z = setzeErledigt(z, HEUTE, 'b1', true);
  assert.equal(hatDaten(z), true);

  let z2 = setzeZiel(leererZustand(), HEUTE, 0, { text: 'Mathe' });
  assert.equal(hatDaten(z2), true);

  let z3 = setzeZiel(leererZustand(), HEUTE, 0, { text: '   ' });
  assert.equal(hatDaten(z3), false, 'Leerzeichen zaehlen nicht');
});
