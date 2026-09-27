import test from 'node:test';
import assert from 'node:assert/strict';

import {
  erzeugeIcs,
  erinnerungsBloecke,
  maskiere,
  falte,
  ersterWochentagAb,
  alsLokaleZeit,
  icsDateiname,
  KALENDER_MARKE,
} from '../js/logik/ics.js';
import { baueStandardplan, neuerBlock } from '../js/logik/plan.js';

const JETZT = new Date(Date.UTC(2026, 8, 21, 8, 0, 0)); // Montag, 21.09.2026
const AB = '2026-09-21';

function zeilen(text) {
  // Gefaltete Zeilen wieder zusammensetzen, dann aufteilen.
  return text.replace(/\r\n /g, '').split('\r\n');
}

test('Maskierung von Sonderzeichen', () => {
  assert.equal(maskiere('a,b;c\\d'), 'a\\,b\\;c\\\\d');
  assert.equal(maskiere('Zeile1\nZeile2'), 'Zeile1\\nZeile2');
});

test('Lange Zeilen werden auf 75 Oktette gefaltet', () => {
  const lang = `DESCRIPTION:${'x'.repeat(200)}`;
  const gefaltet = falte(lang);
  for (const teil of gefaltet.split('\r\n')) {
    assert.ok(new TextEncoder().encode(teil).length <= 75, `zu lang: ${teil.length}`);
  }
  // Rueckwaerts wieder dasselbe
  assert.equal(gefaltet.replace(/\r\n /g, ''), lang);

  // Umlaute duerfen nicht zerschnitten werden
  const mitUmlaut = `SUMMARY:${'ü'.repeat(60)}`;
  const g2 = falte(mitUmlaut);
  assert.equal(g2.replace(/\r\n /g, ''), mitUmlaut);
});

test('ersterWochentagAb findet den passenden Tag', () => {
  assert.equal(ersterWochentagAb('2026-09-21', 'mo'), '2026-09-21'); // ist selbst Montag
  assert.equal(ersterWochentagAb('2026-09-21', 'di'), '2026-09-22');
  assert.equal(ersterWochentagAb('2026-09-21', 'so'), '2026-09-27');
});

test('alsLokaleZeit rechnet Zeiten ueber 24:00 richtig', () => {
  assert.equal(alsLokaleZeit('2026-09-21', 14 * 60), '20260921T140000');
  assert.equal(alsLokaleZeit('2026-09-22', 29 * 60), '20260922T050000');
});

test('Nur Bloecke mit "Erinnerung = ja" kommen in den Kalender', () => {
  const plan = baueStandardplan();
  const liste = erinnerungsBloecke(plan);
  // 5x Hausaufgaben + 3x Joggen + 6x Wege + 7x Bettfertig = 21
  assert.equal(liste.length, 21);
  assert.ok(liste.every(({ block }) => block.erinnerung));
});

test('Die .ics-Datei hat Kopf, Zeitzone und CRLF-Zeilenenden', () => {
  const text = erzeugeIcs(baueStandardplan(), { jetzt: JETZT, abIso: AB });

  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  assert.ok(text.includes('VERSION:2.0'));
  assert.ok(text.includes('TZID:Europe/Berlin'));
  assert.ok(text.includes('BEGIN:DAYLIGHT'));
  assert.ok(text.includes('TZOFFSETTO:+0200'));
  assert.ok(text.includes('BEGIN:STANDARD'));
  assert.ok(text.includes('TZOFFSETTO:+0100'));

  // Kein einzelnes \n ohne \r davor
  assert.equal(/[^\r]\n/.test(text), false);
});

test('Jeder Termin hat Serie, Alarm und die Marke im Titel', () => {
  const text = erzeugeIcs(baueStandardplan(), { jetzt: JETZT, abIso: AB });
  const z = zeilen(text);

  const anzahlEvents = z.filter((l) => l === 'BEGIN:VEVENT').length;
  assert.equal(anzahlEvents, 21);
  assert.equal(z.filter((l) => l === 'BEGIN:VALARM').length, 21);
  assert.equal(z.filter((l) => l.startsWith('RRULE:FREQ=WEEKLY')).length, 21);
  assert.equal(z.filter((l) => l.startsWith('SUMMARY:')).every((l) => l.includes(KALENDER_MARKE)), true);
  assert.equal(z.filter((l) => l.startsWith('UID:')).length, 21);

  // Kennungen sind eindeutig - sonst ueberschreiben sich Termine im Kalender
  const uids = z.filter((l) => l.startsWith('UID:'));
  assert.equal(new Set(uids).size, uids.length);
});

test('Joggen am Montag steht korrekt in der Datei', () => {
  const text = erzeugeIcs(baueStandardplan(), { jetzt: JETZT, abIso: AB });
  const z = zeilen(text);

  const start = z.indexOf('DTSTART;TZID=Europe/Berlin:20260921T160000');
  assert.ok(start > -1, 'Joggen startet Montag 16:00');

  const block = z.slice(start - 3, start + 12).join('\n');
  assert.match(block, /DTEND;TZID=Europe\/Berlin:20260921T163000/);
  assert.match(block, /RRULE:FREQ=WEEKLY;BYDAY=MO/);
  assert.match(block, /SUMMARY:Joggen · Mein Tag/);
  assert.match(block, /TRIGGER:-PT5M/);
});

test('Die Vorlaufzeit ist einstellbar', () => {
  const text = erzeugeIcs(baueStandardplan(), { jetzt: JETZT, abIso: AB, vorlaufMinuten: 15 });
  assert.ok(text.includes('TRIGGER:-PT15M'));
  assert.equal(text.includes('TRIGGER:-PT5M'), false);

  const ohne = erzeugeIcs(baueStandardplan(), { jetzt: JETZT, abIso: AB, vorlaufMinuten: 0 });
  assert.ok(ohne.includes('TRIGGER:-PT0M'));
});

test('Samstag: Fahrt nach Duesseldorf landet auf dem Samstag', () => {
  const text = erzeugeIcs(baueStandardplan(), { jetzt: JETZT, abIso: AB });
  const z = zeilen(text);
  const start = z.indexOf('DTSTART;TZID=Europe/Berlin:20260926T090000'); // Sa, 26.09.
  assert.ok(start > -1);
  assert.ok(z.slice(start, start + 6).some((l) => l === 'RRULE:FREQ=WEEKLY;BYDAY=SA'));
});

test('Ein Block nach Mitternacht wandert auf den Folgetag', () => {
  const plan = { mo: [], di: [], mi: [], do: [], fr: [], sa: [], so: [] };
  plan.mo = [
    neuerBlock({
      start: '25:00', // = 01:00 in der Nacht auf Dienstag
      ende: '25:30',
      kategorie: 'routine',
      titel: 'Nachtschicht',
      erinnerung: true,
    }),
  ];
  const z = zeilen(erzeugeIcs(plan, { jetzt: JETZT, abIso: AB }));
  assert.ok(z.includes('DTSTART;TZID=Europe/Berlin:20260922T010000'), 'Dienstag 01:00');
  assert.ok(z.includes('RRULE:FREQ=WEEKLY;BYDAY=TU'), 'Serie liegt auf Dienstag');
});

test('Umlaute im Titel bleiben erhalten', () => {
  const text = erzeugeIcs(baueStandardplan(), { jetzt: JETZT, abIso: AB });
  assert.ok(text.replace(/\r\n /g, '').includes('Fahrt nach Düsseldorf'));
});

test('Dateiname', () => {
  assert.equal(icsDateiname(), 'mein-tag-erinnerungen.ics');
});
