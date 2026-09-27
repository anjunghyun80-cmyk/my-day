// Farbrechnung - reine Funktionen, kein Browser noetig.
//
// Die App hat EINE Akzentfarbe, die man in den Einstellungen frei waehlen
// kann. Aus dieser einen Farbe leiten wir hier alles ab, was das CSS braucht:
//   - eine Fassung, die auf dem jeweiligen Grund gut sichtbar ist,
//   - eine Fassung fuer Schrift (strenger, weil kleine Schrift mehr Kontrast braucht),
//   - eine zarte Toenung fuer Hintergruende,
//   - die Schriftfarbe AUF der Farbe (schwarz oder weiss, je nachdem was besser lesbar ist),
//   - die drei Zwischenstufen der Heatmap.
//
// Warum hier rechnen und nicht im CSS mit color-mix()? Weil aeltere iPhones
// color-mix() nicht koennen - fertige Hex-Werte klappen ueberall.

/** Die Farbe, mit der die App startet. */
export const STANDARD_AKZENT = '#EB6834';

/** Die Vorschlaege in den Einstellungen. Jede andere Farbe geht auch. */
export const AKZENT_VORLAGEN = [
  { name: 'Orange', farbe: '#EB6834' },
  { name: 'Rot', farbe: '#E34948' },
  { name: 'Pink', farbe: '#E87BA4' },
  { name: 'Lila', farbe: '#8B6CF0' },
  { name: 'Blau', farbe: '#2A78D6' },
  { name: 'Türkis', farbe: '#14A3A3' },
  { name: 'Grün', farbe: '#2FA84F' },
  { name: 'Gelb', farbe: '#EDA100' },
  { name: 'Schwarz-Weiß', farbe: '#E8ECF1' },
];

/**
 * Die Flaechen, auf denen die Akzentfarbe liegt - dieselben Werte wie
 * --flaeche und --flaeche-2 in css/stil.css. Aendert man sie dort, auch hier.
 */
export const GRUENDE = {
  dunkel: { flaeche: '#161A20', flaeche2: '#1D222A' },
  hell: { flaeche: '#FFFFFF', flaeche2: '#EEF1F5' },
};

const DUNKLE_SCHRIFT = '#0E1116';
const HELLE_SCHRIFT = '#FFFFFF';

// ---------------------------------------------------------------------------
// Umrechnen
// ---------------------------------------------------------------------------

/**
 * Macht aus "#abc", "abc", "#AABBCC" immer "#AABBCC".
 * Gibt null zurueck, wenn es keine gueltige Farbe ist.
 */
export function normalisiereHex(wert) {
  if (typeof wert !== 'string') return null;
  let hex = wert.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((z) => z + z).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return `#${hex.toUpperCase()}`;
}

/** "#EB6834" -> [235, 104, 52] */
export function hexZuRgb(hex) {
  const sauber = normalisiereHex(hex);
  if (!sauber) throw new Error(`Keine gültige Farbe: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(sauber.slice(i, i + 2), 16));
}

/** [235, 104, 52] -> "#EB6834" */
export function rgbZuHex(rgb) {
  return `#${rgb
    .map((k) => Math.max(0, Math.min(255, Math.round(k))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/**
 * Mischt zwei Farben. anteil = 1 gibt a zurueck, anteil = 0 gibt b zurueck.
 */
export function mische(a, b, anteil) {
  const ra = hexZuRgb(a);
  const rb = hexZuRgb(b);
  return rgbZuHex(ra.map((k, i) => k * anteil + rb[i] * (1 - anteil)));
}

// ---------------------------------------------------------------------------
// Kontrast nach WCAG
// ---------------------------------------------------------------------------

/** Relative Helligkeit einer Farbe (0 = schwarz, 1 = weiss). */
export function luminanz(hex) {
  const [r, g, b] = hexZuRgb(hex).map((k) => {
    const c = k / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhaeltnis zweier Farben, von 1 (gleich) bis 21 (schwarz auf weiss). */
export function kontrast(a, b) {
  const la = luminanz(a);
  const lb = luminanz(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Schwarz oder weiss - je nachdem, was auf dieser Farbe besser lesbar ist. */
export function schriftAuf(hex) {
  return kontrast(hex, DUNKLE_SCHRIFT) >= kontrast(hex, HELLE_SCHRIFT)
    ? DUNKLE_SCHRIFT
    : HELLE_SCHRIFT;
}

/**
 * Hellt die Farbe auf (dunkler Grund) oder dunkelt sie ab (heller Grund),
 * bis sie mindestens den verlangten Kontrast zum Grund hat. Farben, die schon
 * reichen, bleiben unveraendert.
 */
export function mitKontrast(farbe, grund, mindest) {
  if (kontrast(farbe, grund) >= mindest) return normalisiereHex(farbe);
  const ziel = luminanz(grund) < 0.2 ? '#FFFFFF' : '#000000';
  for (let schritt = 1; schritt <= 20; schritt += 1) {
    const versuch = mische(ziel, farbe, schritt / 20);
    if (kontrast(versuch, grund) >= mindest) return versuch;
  }
  return ziel;
}

// ---------------------------------------------------------------------------
// Alles, was das CSS braucht
// ---------------------------------------------------------------------------

/**
 * Leitet aus einer Akzentfarbe alle Werte fuer ein Thema ab.
 * @param {string} farbe  beliebige Hex-Farbe; Unsinn faellt auf den Standard zurueck
 * @param {'dunkel'|'hell'} thema
 */
export function akzentPalette(farbe, thema) {
  const grund = GRUENDE[thema] ?? GRUENDE.dunkel;
  const basis = normalisiereHex(farbe) ?? STANDARD_AKZENT;

  // 3:1 reicht fuer Flaechen, Rahmen und grosse Zahlen,
  // 4.5:1 braucht normale Schrift.
  let akzent = mitKontrast(basis, grund.flaeche, 3);
  const akzentText = mitKontrast(basis, grund.flaeche, 4.5);

  // Mittelhelle Farben (z. B. ein kraeftiges Blau) sind ein Sonderfall:
  // Weder schwarze noch weisse Schrift darauf ist gut lesbar. Dann schieben
  // wir die Knopffarbe ein Stueck - im Dunkeln heller, im Hellen dunkler.
  let aufAkzent = schriftAuf(akzent);
  if (kontrast(akzent, aufAkzent) < 4.5) {
    aufAkzent = thema === 'hell' ? HELLE_SCHRIFT : DUNKLE_SCHRIFT;
    akzent = mitKontrast(akzent, aufAkzent, 4.5);
  }

  const tiefAnteil = thema === 'hell' ? 0.12 : 0.18;

  return {
    akzent,
    akzentText,
    akzentTief: mische(akzent, grund.flaeche, tiefAnteil),
    aufAkzent,
    heat1: mische(akzent, grund.flaeche2, 0.28),
    heat2: mische(akzent, grund.flaeche2, 0.52),
    heat3: mische(akzent, grund.flaeche2, 0.76),
  };
}

/** Eine zarte Toenung, z. B. fuer den Hintergrund eines Themen-Chips. */
export function toenung(farbe, thema) {
  const grund = GRUENDE[thema] ?? GRUENDE.dunkel;
  return mische(normalisiereHex(farbe) ?? STANDARD_AKZENT, grund.flaeche, thema === 'hell' ? 0.14 : 0.22);
}
