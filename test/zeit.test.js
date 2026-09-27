import test from 'node:test';
import assert from 'node:assert/strict';

import {
  zuMinuten,
  zuText,
  zuRohText,
  logischerTag,
  minutenImLogischenTag,
  findeAktuellenBlock,
  findeNaechstenBlock,
  findeJetztUndNaechstes,
  restzeitMinuten,
  formatiereDauer,
  wochentagVonIso,
  tagVerschieben,
  tageDazwischen,
  montagDerWoche,
} from '../js/logik/zeit.js';
import { baueStandardplan } from '../js/logik/plan.js';

// 2026-09-14 ist ein Montag, 2026-09-19 ein Samstag, 2026-09-20 ein Sonntag.
const plan = baueStandardplan();
const holeBloecke = (iso) => plan[wochentagVonIso(iso)] ?? [];

test('zuMinuten rechnet HH:MM um - auch ueber 24 Uhr hinaus', () => {
  assert.equal(zuMinuten('00:00'), 0);
  assert.equal(zuMinuten('07:15'), 435);
  assert.equal(zuMinuten('29:00'), 1740);
  assert.throws(() => zuMinuten('7:75'));
  assert.throws(() => zuMinuten('Quatsch'));
});

test('zuText zeigt Zeiten nach Mitternacht als normale Uhrzeit', () => {
  assert.equal(zuText(435), '07:15');
  assert.equal(zuText(1740), '05:00');
  assert.equal(zuRohText(1740), '29:00');
});

test('Datumsrechnung', () => {
  assert.equal(wochentagVonIso('2026-09-14'), 'mo');
  assert.equal(wochentagVonIso('2026-09-20'), 'so');
  assert.equal(tagVerschieben('2026-09-30', 1), '2026-10-01');
  assert.equal(tagVerschieben('2026-01-01', -1), '2025-12-31');
  assert.equal(tageDazwischen('2026-09-14', '2026-09-20'), 6);
  assert.equal(montagDerWoche('2026-09-20'), '2026-09-14', 'Sonntag gehoert zur Woche davor');
  assert.equal(montagDerWoche('2026-09-21'), '2026-09-21');
});

test('Der neue Tag beginnt erst um 04:00 Uhr', () => {
  // Montag, 14.09.2026
  assert.equal(logischerTag(new Date(2026, 8, 14, 14, 30)), '2026-09-14');
  // Dienstag 01:30 Uhr zaehlt noch zum Montag
  assert.equal(logischerTag(new Date(2026, 8, 15, 1, 30)), '2026-09-14');
  // Dienstag 03:59 Uhr immer noch Montag
  assert.equal(logischerTag(new Date(2026, 8, 15, 3, 59)), '2026-09-14');
  // Dienstag 04:00 Uhr - jetzt kippt es
  assert.equal(logischerTag(new Date(2026, 8, 15, 4, 0)), '2026-09-15');
});

test('Minuten im logischen Tag laufen ueber 24:00 weiter', () => {
  assert.equal(minutenImLogischenTag(new Date(2026, 8, 14, 14, 30)), 870);
  assert.equal(minutenImLogischenTag(new Date(2026, 8, 15, 1, 30)), 1530); // 25:30
  assert.equal(minutenImLogischenTag(new Date(2026, 8, 15, 3, 59)), 1679);
  assert.equal(minutenImLogischenTag(new Date(2026, 8, 15, 4, 0)), 240);
});

test('aktueller und naechster Block am Montagnachmittag', () => {
  const montag = plan.mo;
  const aktuell = findeAktuellenBlock(montag, zuMinuten('16:10'));
  assert.equal(aktuell.titel, 'Joggen');

  const naechster = findeNaechstenBlock(montag, zuMinuten('16:10'));
  assert.equal(naechster.titel, 'Duschen');

  assert.equal(restzeitMinuten(aktuell, zuMinuten('16:10')), 20);
});

test('Blockgrenzen: Start zaehlt dazu, Ende nicht', () => {
  assert.equal(findeAktuellenBlock(plan.mo, zuMinuten('16:00')).titel, 'Joggen');
  assert.equal(findeAktuellenBlock(plan.mo, zuMinuten('16:30')).titel, 'Duschen');
});

test('findeJetztUndNaechstes am Montag um 17:10', () => {
  const { tag, aktuell, naechster } = findeJetztUndNaechstes(
    holeBloecke,
    new Date(2026, 8, 14, 17, 10),
  );
  assert.equal(tag, '2026-09-14');
  assert.equal(aktuell.titel, 'Fahrt zum Orchester');
  assert.equal(naechster.titel, 'Orchester');
});

test('findeJetztUndNaechstes nach Mitternacht - gehoert noch zum Vortag', () => {
  // Dienstag 00:30 Uhr -> logisch noch Montag, Block "Schlafen"
  const ergebnis = findeJetztUndNaechstes(holeBloecke, new Date(2026, 8, 15, 0, 30));
  assert.equal(ergebnis.tag, '2026-09-14');
  assert.equal(ergebnis.aktuell.titel, 'Schlafen');
  assert.equal(ergebnis.naechster.titel, 'Aufwachen & Bett machen');
  assert.equal(ergebnis.naechsterTag, '2026-09-15');
});

test('findeJetztUndNaechstes zwischen 04:00 und 05:00 - der Schlafblock laeuft weiter', () => {
  // Dienstag 04:30: logischer Tag ist schon Dienstag, aber der Plan beginnt
  // erst um 05:00. Der Schlafblock von Montag (21:00-29:00) laeuft noch.
  const ergebnis = findeJetztUndNaechstes(holeBloecke, new Date(2026, 8, 15, 4, 30));
  assert.equal(ergebnis.tag, '2026-09-15');
  assert.equal(ergebnis.aktuell.titel, 'Schlafen');
  assert.equal(ergebnis.aktuellTag, '2026-09-14');
  assert.equal(ergebnis.naechster.titel, 'Aufwachen & Bett machen');
  assert.equal(ergebnis.naechsterTag, '2026-09-15');
});

test('findeJetztUndNaechstes am Wochenende', () => {
  // Samstag, 19.09.2026 um 10:30 -> Koreanische Schule
  const sa = findeJetztUndNaechstes(holeBloecke, new Date(2026, 8, 19, 10, 30));
  assert.equal(sa.aktuell.titel, 'Koreanische Schule');
  assert.equal(sa.naechster.titel, 'Heimfahrt');

  // Sonntag, 20.09.2026 um 12:00 -> Freier Tag
  const so = findeJetztUndNaechstes(holeBloecke, new Date(2026, 8, 20, 12, 0));
  assert.equal(so.aktuell.titel, 'Freier Tag');
  assert.equal(so.naechster.titel, 'Bettfertig machen');
});

test('letzter Block des Tages: der naechste kommt aus dem Folgetag', () => {
  // Sonntag 22:00 -> Schlafen; danach der erste Block am Montag
  const ergebnis = findeJetztUndNaechstes(holeBloecke, new Date(2026, 8, 20, 22, 0));
  assert.equal(ergebnis.aktuell.titel, 'Schlafen');
  assert.equal(ergebnis.naechster.titel, 'Aufwachen & Bett machen');
  assert.equal(ergebnis.naechsterTag, '2026-09-21');
});

test('formatiereDauer', () => {
  assert.equal(formatiereDauer(25), '25 Min');
  assert.equal(formatiereDauer(60), '1 Std');
  assert.equal(formatiereDauer(85), '1 Std 25 Min');
  assert.equal(formatiereDauer(-5), '0 Min');
});
