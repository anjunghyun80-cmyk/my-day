import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalisiereHex,
  hexZuRgb,
  rgbZuHex,
  mische,
  kontrast,
  schriftAuf,
  mitKontrast,
  akzentPalette,
  toenung,
  GRUENDE,
  AKZENT_VORLAGEN,
  STANDARD_AKZENT,
} from '../js/logik/farbe.js';

test('Hex-Farben werden vereinheitlicht', () => {
  assert.equal(normalisiereHex('#abc'), '#AABBCC');
  assert.equal(normalisiereHex('eb6834'), '#EB6834');
  assert.equal(normalisiereHex('  #EB6834 '), '#EB6834');
  assert.equal(normalisiereHex('rot'), null);
  assert.equal(normalisiereHex('#12345'), null);
  assert.equal(normalisiereHex(null), null);
});

test('Umrechnen hin und zurueck', () => {
  assert.deepEqual(hexZuRgb('#EB6834'), [235, 104, 52]);
  assert.equal(rgbZuHex([235, 104, 52]), '#EB6834');
  assert.equal(rgbZuHex([300, -5, 12.6]), '#FF000D', 'Werte werden begrenzt und gerundet');
});

test('Mischen', () => {
  assert.equal(mische('#FFFFFF', '#000000', 1), '#FFFFFF');
  assert.equal(mische('#FFFFFF', '#000000', 0), '#000000');
  assert.equal(mische('#FFFFFF', '#000000', 0.5), '#808080');
});

test('Kontrast nach WCAG', () => {
  assert.equal(Math.round(kontrast('#000000', '#FFFFFF')), 21);
  assert.equal(kontrast('#EB6834', '#EB6834'), 1);
});

test('Schrift auf einer Farbe ist immer gut lesbar', () => {
  assert.equal(schriftAuf('#FFFF00'), '#0E1116', 'auf Gelb schwarz');
  assert.equal(schriftAuf('#1A237E'), '#FFFFFF', 'auf Dunkelblau weiss');
  for (const { farbe } of AKZENT_VORLAGEN) {
    const gewaehlt = schriftAuf(farbe);
    const andere = gewaehlt === '#FFFFFF' ? '#0E1116' : '#FFFFFF';
    assert.ok(kontrast(farbe, gewaehlt) >= kontrast(farbe, andere), `${farbe}: die bessere Schrift gewinnt`);
  }
});

test('Zu dunkle Farben werden auf dunklem Grund aufgehellt', () => {
  const grund = GRUENDE.dunkel.flaeche;
  const ergebnis = mitKontrast('#101828', grund, 3);
  assert.ok(kontrast(ergebnis, grund) >= 3);
  assert.equal(mitKontrast('#EB6834', grund, 3), '#EB6834', 'passende Farben bleiben, wie sie sind');
});

test('Zu helle Farben werden auf hellem Grund abgedunkelt', () => {
  const grund = GRUENDE.hell.flaeche;
  const ergebnis = mitKontrast('#FFF59D', grund, 4.5);
  assert.ok(kontrast(ergebnis, grund) >= 4.5);
});

test('Jede Vorlage ergibt in beiden Themen eine lesbare Palette', () => {
  for (const thema of ['dunkel', 'hell']) {
    const grund = GRUENDE[thema].flaeche;
    for (const { name, farbe } of AKZENT_VORLAGEN) {
      const p = akzentPalette(farbe, thema);
      assert.ok(kontrast(p.akzent, grund) >= 3, `${name}/${thema}: Flaeche sichtbar`);
      assert.ok(kontrast(p.akzentText, grund) >= 4.5, `${name}/${thema}: Schrift lesbar`);
      assert.ok(kontrast(p.aufAkzent, p.akzent) >= 4.5, `${name}/${thema}: Schrift auf Knopf lesbar`);
      for (const wert of Object.values(p)) assert.ok(normalisiereHex(wert), `${name}: ${wert}`);
    }
  }
});

test('Auch ausgefallene Farben funktionieren', () => {
  for (const farbe of ['#000000', '#FFFFFF', '#808080', '#00FF00', '#FF00FF']) {
    for (const thema of ['dunkel', 'hell']) {
      const p = akzentPalette(farbe, thema);
      assert.ok(kontrast(p.akzentText, GRUENDE[thema].flaeche) >= 4.5, `${farbe}/${thema}`);
    }
  }
});

test('Unsinn faellt auf die Standardfarbe zurueck', () => {
  assert.deepEqual(akzentPalette('quatsch', 'dunkel'), akzentPalette(STANDARD_AKZENT, 'dunkel'));
  assert.ok(normalisiereHex(toenung('quatsch', 'hell')));
});
