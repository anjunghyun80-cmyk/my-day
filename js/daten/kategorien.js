// Alle Kategorien mit Namen, Akzentfarbe und der Frage "kann man das abhaken?".
//
// Farbidee: Die App ist schwarz/grau/weiss mit EINER frei waehlbaren
// Akzentfarbe. Bloecke bekommen deshalb KEINE bunten Flaechen, sondern eine
// einheitliche Zeile mit einem farbigen Strich links. Die Strichfarben
// stammen aus einer Palette, die auch fuer Farbenblinde unterscheidbar
// bleibt - und die Kategorie steht zusaetzlich immer als Wort daneben.
//
// Diese Datei ist die einzige Quelle fuer Farben. js/ui/thema.js baut daraus
// zur Laufzeit die CSS-Variablen.

export const KATEGORIEN = {
  schule: {
    name: 'Schule & Lernen',
    kurz: 'Schule',
    abhakbar: true,
    akzent: { dunkel: '#9085E9', hell: '#4A3AA7' },
  },
  kurs: {
    name: 'Kurse & Vereine',
    kurz: 'Kurs',
    abhakbar: true,
    akzent: { dunkel: '#D55181', hell: '#C23C72' },
  },
  sport: {
    name: 'Sport',
    kurz: 'Sport',
    abhakbar: true,
    akzent: { dunkel: '#D95926', hell: '#D0521F' },
  },
  essen: {
    name: 'Essen',
    kurz: 'Essen',
    abhakbar: true,
    akzent: { dunkel: '#199E70', hell: '#138A60' },
  },
  routine: {
    name: 'Routine & Bad',
    kurz: 'Routine',
    abhakbar: true,
    akzent: { dunkel: '#93A0B4', hell: '#5E6B7E' },
  },
  frei: {
    name: 'Freizeit',
    kurz: 'Frei',
    abhakbar: false,
    akzent: { dunkel: '#C98500', hell: '#B87A00' },
  },
  weg: {
    name: 'Unterwegs',
    kurz: 'Weg',
    abhakbar: false,
    // Unterwegs bekommt zusaetzlich ein feines Streifenmuster.
    gestreift: true,
    akzent: { dunkel: '#6E7A8C', hell: '#4B5666' },
  },
  schlaf: {
    name: 'Schlafen',
    kurz: 'Schlaf',
    abhakbar: false,
    akzent: { dunkel: '#4A5B85', hell: '#2F3F66' },
  },
};

/** Reihenfolge fuer Auswahllisten und Statistik-Balken. */
export const KATEGORIE_SCHLUESSEL = Object.keys(KATEGORIEN);

/** Ist diese Kategorie grundsaetzlich abhakbar? Unbekannte Kategorie = nein. */
export function kategorieAbhakbar(schluessel) {
  return KATEGORIEN[schluessel]?.abhakbar === true;
}

/** Lesbarer Name, faellt auf den Schluessel zurueck. */
export function kategorieName(schluessel) {
  return KATEGORIEN[schluessel]?.name ?? schluessel;
}

/** Kurzer Name fuer enge Stellen. */
export function kategorieKurz(schluessel) {
  return KATEGORIEN[schluessel]?.kurz ?? schluessel;
}
