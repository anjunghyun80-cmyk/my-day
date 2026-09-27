// Alle Symbole als Inline-SVG. Keine Icon-Schrift, kein CDN -
// so bleibt die App auch offline vollstaendig.
//
// Regeln, damit alles wie aus einem Guss aussieht:
//   - 24x24 Raster, alle Formen auf halben Pixeln ausgerichtet
//   - eine Strichstaerke fuer alle (1.75), runde Enden
//   - keine Form kleiner als 3px im Raster - das verschmiert bei 20px Anzeige

import { svgEl } from './dom.js';

const PFADE = {
  // --- Tab-Leiste ---------------------------------------------------------
  // Ein offener Ring mit Haken: Fortschritt plus Abhaken in einem Bild.
  heute: ['M20.5 12a8.5 8.5 0 1 1-4.2-7.3', 'M8.8 12.2l2.9 2.9L21 6.2'],
  woche: ['M4 6.5h16v14H4z', 'M4 10.5h16', 'M8.5 3.5v4', 'M15.5 3.5v4'],
  sport: ['M6.5 8.5v7', 'M3.5 10.5v3', 'M17.5 8.5v7', 'M20.5 10.5v3', 'M6.5 12h11'],
  statistik: ['M5.5 20v-7.5', 'M12 20V4.5', 'M18.5 20v-4.5'],
  plan: ['M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4z', 'M13.5 7l3.5 3.5'],
  // Glow-up: ein grosser und ein kleiner Funke.
  glowup: [
    'M10 3.5c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z',
    'M18.5 14.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8z',
  ],

  // --- Einstellungen ------------------------------------------------------
  // Bewusst kein Zahnrad: zwei Schieberegler bleiben auch bei 20px scharf.
  einstellungen: [
    'M4 8h8', 'M17 8h3',
    'M4 16h3', 'M12 16h8',
    'M14.5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M9.5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ],

  // --- Richtungen ---------------------------------------------------------
  links: ['M14.5 5.5L8 12l6.5 6.5'],
  rechts: ['M9.5 5.5L16 12l-6.5 6.5'],
  runter: ['M5.5 9.5L12 16l6.5-6.5'],

  // --- Aktionen -----------------------------------------------------------
  haken: ['M5 12.5l4.5 4.5L19 7'],
  plus: ['M12 5.5v13', 'M5.5 12h13'],
  kreuz: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  stift: ['M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4z', 'M13.5 7l3.5 3.5'],
  muell: ['M4.5 7h15', 'M9.5 7V4.5h5V7', 'M6.5 7l1 13h9l1-13', 'M10.5 11v5', 'M13.5 11v5'],
  kopieren: ['M9.5 9.5h10v10h-10z', 'M15 5.5H4.5v10H8'],
  teilen: ['M12 16V4.5', 'M8 8.5l4-4 4 4', 'M4.5 14v5.5h15V14'],
  extern: ['M13.5 4.5h6v6', 'M19.5 4.5L11 13', 'M17.5 14v5.5h-13v-13H10'],
  zauberstab: ['M4.5 19.5l10-10', 'M13 8l3 3', 'M17.5 3.5v3', 'M16 5h3', 'M20 10v2', 'M19 11h2', 'M9.5 3.5v2', 'M8.5 4.5h2'],

  // --- Hinweise -----------------------------------------------------------
  info: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z', 'M12 11.5V16', 'M12 8h.01'],
  warnung: ['M12 4l8.5 15h-17L12 4z', 'M12 10v4', 'M12 16.5h.01'],
  glocke: ['M18 9.5a6 6 0 1 0-12 0c0 4.5-2 5.5-2 5.5h16s-2-1-2-5.5', 'M13.7 19a2 2 0 0 1-3.4 0'],
  uhr: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z', 'M12 7.5V12l3 1.8'],
  flamme: [
    'M12 21.5c3.7 0 6-2.4 6-5.6 0-4.2-3.7-5.6-3.7-9.4-1.9.9-2.8 2.4-2.8 4.2C10.2 9 8.8 7.6 8.3 6.2 6.8 8 6 9.9 6 12.3c0 3.4 2.3 9.2 6 9.2z',
  ],
  liste: ['M9.5 6.5h10', 'M9.5 12h10', 'M9.5 17.5h10', 'M4.5 6.5h.01', 'M4.5 12h.01', 'M4.5 17.5h.01'],
  ziel: [
    'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z',
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M12 12.9a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z',
  ],
  wiederholen: ['M4 9.5A8 8 0 0 1 19 8', 'M20 4.5V9h-4.5', 'M20 14.5A8 8 0 0 1 5 16', 'M4 19.5V15h4.5'],

  // --- Aussehen -----------------------------------------------------------
  mond: ['M20 14.7A8.5 8.5 0 0 1 9.3 4a8.5 8.5 0 1 0 10.7 10.7z'],
  sonne: [
    'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
    'M12 2.5v2', 'M12 19.5v2', 'M5.2 5.2l1.4 1.4', 'M17.4 17.4l1.4 1.4',
    'M2.5 12h2', 'M19.5 12h2', 'M5.2 18.8l1.4-1.4', 'M17.4 6.6l1.4-1.4',
  ],
  bildschirm: ['M3.5 5h17v11h-17z', 'M8.5 20h7', 'M12 16v4'],
};

/**
 * Baut ein Symbol.
 * @param {string} name     Schluessel aus PFADE
 * @param {number} groesse  Kantenlaenge in px
 */
export function icon(name, groesse = 20) {
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    width: groesse,
    height: groesse,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.75,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  });

  for (const d of PFADE[name] ?? []) svg.append(svgEl('path', { d }));
  return svg;
}

/** Gefuelltes Symbol (z. B. die Flamme der Streak). */
export function iconGefuellt(name, groesse = 16) {
  const svg = icon(name, groesse);
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('stroke', 'none');
  return svg;
}
