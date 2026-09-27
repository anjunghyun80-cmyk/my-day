import test from 'node:test';
import assert from 'node:assert/strict';

import { leererZustand, normalisiere } from '../js/logik/zustand.js';
import {
  alleWochen,
  eigeneWochen,
  freieWochen,
  neuesteWoche,
  stand,
  kilometerProWoche,
  neueWoche,
  pruefeWoche,
  speichereWoche,
  loescheWoche,
  youtubeId,
  fokusAusTitel,
  entferneZeitstempel,
  werteTranskriptAus,
} from '../js/logik/glowup.js';
import { GLOWUP_WOCHEN, SERIE } from '../js/daten/glowup.js';

test('Die festen Wochen sind da und sortiert', () => {
  const z = leererZustand();
  const liste = alleWochen(z);
  assert.equal(liste.length, GLOWUP_WOCHEN.length);
  assert.deepEqual(liste.map((w) => w.nr), [0, 1, 2, 3, 4, 5]);
  assert.ok(liste.every((w) => w.eigene === false));
  assert.equal(stand(z), 5);
});

test('Frei sind die Wochen 6 bis 13', () => {
  assert.deepEqual(freieWochen(leererZustand()), [6, 7, 8, 9, 10, 11, 12, 13]);
});

test('Eine neue Woche anlegen, aendern und loeschen', () => {
  let z = leererZustand();
  const w = neueWoche({ nr: 6, fokus: 'haut', gemacht: '- Hautpflege\n\n• Marathon', laufenKm: 60 });
  assert.deepEqual(w.gemacht, ['Hautpflege', 'Marathon'], 'Aufzaehlungszeichen und Leerzeilen fallen weg');
  assert.equal(pruefeWoche(z, w), null);

  z = speichereWoche(z, w);
  assert.equal(eigeneWochen(z).length, 1);
  assert.equal(neuesteWoche(z).nr, 6);
  assert.equal(stand(z), 6);
  assert.ok(!freieWochen(z).includes(6));
  assert.ok(freieWochen(z, w.id).includes(6), 'die eigene Nummer bleibt beim Bearbeiten waehlbar');

  z = speichereWoche(z, { ...w, laufenKm: 42 });
  assert.equal(eigeneWochen(z).length, 1, 'Speichern mit gleicher id ersetzt');
  assert.equal(kilometerProWoche(z)[5].km, 42);

  z = loescheWoche(z, w.id);
  assert.equal(eigeneWochen(z).length, 0);
});

test('Pruefung verhindert doppelte und ungueltige Wochen', () => {
  const z = leererZustand();
  assert.match(pruefeWoche(z, neueWoche({ nr: 5, link: 'x' })), /gibt es schon/);
  assert.match(pruefeWoche(z, neueWoche({ nr: 14, link: 'x' })), /zwischen 1 und 13/);
  assert.match(pruefeWoche(z, neueWoche({ nr: 7 })), /wenigstens/);
  assert.match(pruefeWoche(z, neueWoche({ nr: 7, laufenKm: 9000 })), /Tippfehler/);
});

test('Unbekannter Fokus wird zu "Sonstiges"', () => {
  assert.equal(neueWoche({ fokus: 'quatsch' }).fokus, 'sonst');
  assert.equal(neueWoche({ fokus: 'prolog' }).fokus, 'sonst', 'Rueckblick ist nur fuer den Prolog');
});

test('Kilometer fuer das Diagramm: 13 Wochen, offene sind null', () => {
  const liste = kilometerProWoche(leererZustand());
  assert.equal(liste.length, SERIE.wochenGesamt);
  assert.deepEqual(liste.slice(0, 5).map((w) => w.km), [40, 75, 32, 90, 50]);
  assert.equal(liste[5].km, null);
});

test('Der Zustand merkt sich eigene Wochen - auch nach Backup', () => {
  const w = neueWoche({ nr: 6, link: 'https://youtu.be/abcdefghijk' });
  const z = speichereWoche(leererZustand(), w);
  assert.equal(normalisiere(JSON.parse(JSON.stringify(z))).glowup.wochen.length, 1);
  assert.deepEqual(normalisiere({ plan: z.plan, glowup: 'kaputt' }).glowup, { wochen: [] });
  assert.deepEqual(normalisiere(null).glowup, { wochen: [] });
});

test('YouTube-Kennung aus allen Link-Formen', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=fioR4BUo3T4'), 'fioR4BUo3T4');
  assert.equal(youtubeId('https://www.youtube.com/watch?feature=share&v=fioR4BUo3T4&t=12'), 'fioR4BUo3T4');
  assert.equal(youtubeId('https://youtu.be/fioR4BUo3T4?si=abc'), 'fioR4BUo3T4');
  assert.equal(youtubeId('https://youtube.com/shorts/2OIWZdCGB-s'), '2OIWZdCGB-s');
  assert.equal(youtubeId('fioR4BUo3T4'), 'fioR4BUo3T4');
  assert.equal(youtubeId('hallo'), null);
});

test('Das Thema steht im Titel in Sternchen', () => {
  assert.equal(fokusAusTitel('I TRY TO GLOWUP IN 90 DAYS | WEEK 5 *GROOMING*'), 'groom');
  assert.equal(fokusAusTitel('WEEK 3 *GYM*'), 'gym');
  assert.equal(fokusAusTitel('WEEK 8 *SKINCARE*'), 'haut');
  assert.equal(fokusAusTitel('WEEK 2'), null);
});

test('Zeitstempel aus kopierten Transkripten verschwinden', () => {
  const roh = '18:1518 Minuten, 15 SekundenClose enough. 0:077 SekundenThis was me\n0:06\nHello';
  const sauber = entferneZeitstempel(roh);
  assert.ok(!/\d:\d/.test(sauber));
  assert.ok(!/Minuten|Sekunden/.test(sauber));
  assert.match(sauber, /Close enough\. +This was me/);
});

test('Transkript: Zahlen aus dem Wochenrueckblick', () => {
  const t = [
    'Kapitel 1: Introduction to week five',
    '0:055 SekundenWelcome to week five. In week four, we ran a lot.',
    'Kapitel 2: Facial grooming guide',
    '1:151 Minute, 15 SekundenShave with the grain. Then shave against the grain. Your eyebrows matter.',
    'Kapitel 3: Eyebrow maintenance',
    '2:052 Minuten, 5 SekundenPluck the eyebrows. Keep the brows clean. A haircut helps. The hair matters.',
    '3:003 MinutenYou should run 5 km if you pick that.',
    '15:3415 Minuten, 34 SekundenIn week five, we ran a humble 50 km and we did 11 hours on the cardio bike, which brings us to a total of 280 km ran in the past 5 weeks.',
    'So we ran a total of 2 km and then we ate.',
  ].join('\n');

  const e = werteTranskriptAus(t);
  assert.equal(e.woche, 5);
  assert.equal(e.laufenKm, 50);
  assert.equal(e.radH, 11);
  assert.equal(e.fokus, 'groom');
  assert.deepEqual(e.kapitel, ['Introduction to week five', 'Facial grooming guide', 'Eyebrow maintenance']);
});

test('Transkript: Anweisungen an Zuschauer zaehlen nicht als seine Zahlen', () => {
  const t = [
    'So, I lost 2 kg. I ran 40 km, man. I did five hours on the',
    'indoor cycle. I did a total of nine hours of cardio for my first week.',
    'Pick a number from 5 to 8. If you pick six, that is 6 hours of cardio.',
    "You're going to run 5 km all out.",
  ].join('\n');

  const e = werteTranskriptAus(t);
  assert.equal(e.laufenKm, 40);
  assert.equal(e.radH, 5);
  assert.equal(e.cardioH, 9);
  assert.equal(e.gewichtKg, -2);
});

test('Transkript: Rueckblicke und Spitzenwerte werden uebergangen', () => {
  const t =
    'So, in week three, we did a humble 32 km of running. We did 8 hours on the cardio bike. ' +
    'So, we ran 45 km at our peak. We are going to do 90 km double next week.';
  assert.equal(werteTranskriptAus(t).laufenKm, 32);
});

test('Leeres Transkript liefert leere Vorschlaege', () => {
  const e = werteTranskriptAus('');
  assert.equal(e.laufenKm, null);
  assert.equal(e.fokus, null);
  assert.deepEqual(e.kapitel, []);
});
