// Farbthema.
//
// Drei Aufgaben:
// 1. Aus js/daten/kategorien.js (und den Glow-up-Themen) die Farben als
//    CSS-Variablen erzeugen, damit es nur eine Quelle fuer Farben gibt.
// 2. Zwischen dunkel, hell und "wie das System" umschalten.
// 3. Die frei waehlbare Akzentfarbe: Aus EINER Farbe rechnet
//    js/logik/farbe.js alle Werte aus, hier landen sie im CSS.
//
// Die App ist bewusst dunkel voreingestellt. Gewaehlt wird ueber das Attribut
// data-thema am <html>-Element; das CSS reagiert darauf.
//
// Thema und Akzentfarbe sind Einstellungen dieses Geraets. Sie liegen
// getrennt vom uebrigen Zustand, damit das Inline-Skript in index.html sie
// ohne Module lesen kann - und sie stecken bewusst nicht im Backup.

import { KATEGORIEN } from '../daten/kategorien.js';
import { WORKOUT_ARTEN } from '../logik/workout.js';
import { FOKUS } from '../daten/glowup.js';
import { akzentPalette, toenung, normalisiereHex, STANDARD_AKZENT } from '../logik/farbe.js';

export const THEMA_SCHLUESSEL = 'mein-tag/thema';
export const AKZENT_SCHLUESSEL = 'mein-tag/akzent';

export const THEMEN = [
  { wert: 'dunkel', name: 'Dunkel' },
  { wert: 'hell', name: 'Hell' },
  { wert: 'system', name: 'System' },
];

/** Liest die gespeicherte Wahl. Standard: dunkel. */
export function gespeichertesThema() {
  try {
    const wert = localStorage.getItem(THEMA_SCHLUESSEL);
    return THEMEN.some((t) => t.wert === wert) ? wert : 'dunkel';
  } catch {
    return 'dunkel';
  }
}

/** Setzt das Thema und merkt es sich. */
export function setzeThema(wert) {
  document.documentElement.dataset.thema = wert;
  try {
    localStorage.setItem(THEMA_SCHLUESSEL, wert);
  } catch {
    /* Privater Modus - dann gilt die Wahl nur bis zum Schliessen. */
  }
  aktualisiereStatusleiste();
}

/**
 * Faerbt die iOS-Statusleiste passend ein. Ohne das blitzt oben ein
 * andersfarbiger Streifen auf, wenn man das Thema wechselt.
 */
export function aktualisiereStatusleiste() {
  const farbe = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim();
  for (const tag of document.querySelectorAll('meta[name="theme-color"]')) {
    tag.remove();
  }
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = farbe || '#0E1116';
  document.head.append(meta);
}

// ---------------------------------------------------------------------------
// Akzentfarbe
// ---------------------------------------------------------------------------

/** Die gewaehlte Akzentfarbe als "#RRGGBB". Standard: Orange. */
export function gespeicherterAkzent() {
  try {
    return normalisiereHex(localStorage.getItem(AKZENT_SCHLUESSEL)) ?? STANDARD_AKZENT;
  } catch {
    return STANDARD_AKZENT;
  }
}

/** Waehlt eine neue Akzentfarbe, merkt sie sich und faerbt die App sofort um. */
export function setzeAkzent(farbe) {
  const hex = normalisiereHex(farbe) ?? STANDARD_AKZENT;
  try {
    localStorage.setItem(AKZENT_SCHLUESSEL, hex);
  } catch {
    /* Privater Modus - dann gilt die Wahl nur bis zum Schliessen. */
  }
  wendeAkzentAn(hex);
  return hex;
}

/**
 * Schreibt die aus der Akzentfarbe abgeleiteten Werte als Stylesheet.
 * Fuer dunkel und hell getrennt, weil dieselbe Farbe auf hellem Grund oft
 * abgedunkelt werden muss, damit Schrift darin lesbar bleibt.
 */
export function wendeAkzentAn(farbe = gespeicherterAkzent()) {
  const alsCss = (p) =>
    [
      `--akzent:${p.akzent}`,
      `--akzent-text:${p.akzentText}`,
      `--akzent-tief:${p.akzentTief}`,
      `--auf-akzent:${p.aufAkzent}`,
      `--heat-1:${p.heat1}`,
      `--heat-2:${p.heat2}`,
      `--heat-3:${p.heat3}`,
    ].join(';');

  const dunkel = alsCss(akzentPalette(farbe, 'dunkel'));
  const hell = alsCss(akzentPalette(farbe, 'hell'));

  schreibeStil(
    'akzent-farben',
    [
      `:root,:root[data-thema="dunkel"]{${dunkel}}`,
      `:root[data-thema="hell"]{${hell}}`,
      `@media (prefers-color-scheme: light){:root[data-thema="system"]{${hell}}}`,
    ].join(''),
  );

  // index.html setzt die Farbe beim Start kurz direkt am <html>-Element,
  // damit nichts in der falschen Farbe aufblitzt. Ab jetzt uebernimmt das
  // Stylesheet - sonst wuerde der direkte Wert das Stylesheet ueberstimmen.
  document.documentElement.style.removeProperty('--akzent');
}

// ---------------------------------------------------------------------------
// Kategorien, Trainingsarten, Glow-up-Themen
// ---------------------------------------------------------------------------

/** Baut das Stylesheet mit allen festen Farben. */
export function setzeKategorieFarben() {
  const dunkel = [];
  const hell = [];
  const zuordnung = [];

  for (const [schluessel, k] of Object.entries(KATEGORIEN)) {
    dunkel.push(`--kat-${schluessel}:${k.akzent.dunkel}`);
    hell.push(`--kat-${schluessel}:${k.akzent.hell}`);
    zuordnung.push(`[data-kat="${schluessel}"]{--akzent-kat:var(--kat-${schluessel});}`);
  }

  // Dasselbe fuer die Trainingsarten im Sport-Bereich.
  for (const [schluessel, a] of Object.entries(WORKOUT_ARTEN)) {
    dunkel.push(`--art-${schluessel}:${a.akzent.dunkel}`);
    hell.push(`--art-${schluessel}:${a.akzent.hell}`);
    zuordnung.push(`[data-art="${schluessel}"]{--akzent-kat:var(--art-${schluessel});}`);
  }

  // Und fuer die Themen der Glow-up-Wochen - hier mit zarter Toenung
  // fuer die Hintergruende der Themen-Chips.
  for (const [schluessel, f] of Object.entries(FOKUS)) {
    dunkel.push(`--fokus-${schluessel}:${f.akzent.dunkel}`, `--fokus-${schluessel}-tief:${toenung(f.akzent.dunkel, 'dunkel')}`);
    hell.push(`--fokus-${schluessel}:${f.akzent.hell}`, `--fokus-${schluessel}-tief:${toenung(f.akzent.hell, 'hell')}`);
    zuordnung.push(
      `[data-fokus="${schluessel}"]{--fc:var(--fokus-${schluessel});--fc-tief:var(--fokus-${schluessel}-tief);}`,
    );
  }

  schreibeStil(
    'kategorie-farben',
    [
      // Standard und ausdruecklich dunkel
      `:root,:root[data-thema="dunkel"]{${dunkel.join(';')}}`,
      // Ausdruecklich hell
      `:root[data-thema="hell"]{${hell.join(';')}}`,
      // Systemwahl: nur dann hell, wenn das System hell steht
      `@media (prefers-color-scheme: light){:root[data-thema="system"]{${hell.join(';')}}}`,
      zuordnung.join(''),
    ].join(''),
  );
}

/** Legt ein <style> mit dieser id an oder ersetzt dessen Inhalt. */
function schreibeStil(kennung, css) {
  let stil = document.getElementById(kennung);
  if (!stil) {
    stil = document.createElement('style');
    stil.id = kennung;
    document.head.append(stil);
  }
  stil.textContent = css;
}
