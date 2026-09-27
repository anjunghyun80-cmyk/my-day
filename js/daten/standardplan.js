// Der Standard-Wochenplan als Rohdaten.
// Ein Block ist: [Start, Ende, Kategorie, Titel, Notiz]
// Zeiten im Format "HH:MM". "29:00" bedeutet 05:00 Uhr am naechsten Morgen.
// "@name" verweist auf eine Vorlage. Beim Aufbauen wird jede Vorlage eingesetzt,
// damit am Ende jeder Tag eine eigene, vollstaendige Liste ist.

export const WOCHENTAGE = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];

export const WOCHENTAG_NAMEN = {
  mo: 'Montag',
  di: 'Dienstag',
  mi: 'Mittwoch',
  do: 'Donnerstag',
  fr: 'Freitag',
  sa: 'Samstag',
  so: 'Sonntag',
};

export const WOCHENTAG_KURZ = {
  mo: 'Mo', di: 'Di', mi: 'Mi', do: 'Do', fr: 'Fr', sa: 'Sa', so: 'So',
};

export const ROHPLAN = {
  vorlagen: {
    schulmorgen: [
      ['05:00', '05:10', 'routine', 'Aufwachen & Bett machen', 'Zimmer frisch machen'],
      ['05:10', '05:20', 'routine', 'Duschen & Zähne putzen', ''],
      ['05:20', '06:10', 'sport', 'Morgensport', 'Arme, Bauch, Cardio'],
      ['06:10', '06:30', 'routine', 'Bad, frisch machen', ''],
      ['06:30', '06:45', 'essen', 'Frühstück', ''],
      ['06:45', '07:00', 'schule', '3 Tagesziele aufschreiben', ''],
      ['07:00', '07:15', 'routine', 'Für die Schule fertig machen', ''],
      ['07:15', '07:35', 'weg', 'Schulweg', ''],
      ['07:35', '07:55', 'frei', 'Mit Freunden chillen', ''],
      ['07:55', '13:15', 'schule', 'Schule', ''],
      ['13:15', '14:00', 'weg', 'Heimweg', ''],
    ],
    abend: [
      ['19:30', '20:00', 'essen', 'Abendessen', ''],
      ['20:00', '20:30', 'frei', 'Freizeit', ''],
      ['20:30', '21:00', 'routine', 'Bettfertig machen', ''],
      ['21:00', '29:00', 'schlaf', 'Schlafen', ''],
    ],
  },
  tage: {
    mo: [
      '@schulmorgen',
      ['14:00', '14:45', 'schule', 'Hausaufgaben', ''],
      ['14:45', '15:05', 'essen', 'Mittagessen', 'kochen & essen'],
      ['15:05', '16:00', 'frei', 'Skill / Freizeit', ''],
      ['16:00', '16:30', 'sport', 'Joggen', ''],
      ['16:30', '16:40', 'routine', 'Duschen', ''],
      ['16:40', '17:00', 'frei', 'Freizeit', ''],
      ['17:00', '17:30', 'weg', 'Fahrt zum Orchester', ''],
      ['17:30', '19:00', 'kurs', 'Orchester', ''],
      ['19:00', '19:30', 'weg', 'Heimweg', ''],
      '@abend',
    ],
    di: [
      '@schulmorgen',
      ['14:00', '14:45', 'schule', 'Hausaufgaben', ''],
      ['14:45', '15:05', 'essen', 'Mittagessen', 'kochen & essen'],
      ['15:05', '16:00', 'frei', 'Skill / Freizeit', ''],
      ['16:00', '16:30', 'sport', 'Joggen', ''],
      ['16:30', '16:40', 'routine', 'Duschen', ''],
      ['16:40', '17:00', 'frei', 'Freizeit', ''],
      ['17:00', '17:30', 'weg', 'Fahrt zum Badminton', ''],
      ['17:30', '19:00', 'kurs', 'Badminton', ''],
      ['19:00', '19:30', 'weg', 'Heimweg', ''],
      '@abend',
    ],
    mi: [
      '@schulmorgen',
      ['14:00', '14:45', 'schule', 'Hausaufgaben', ''],
      ['14:45', '15:00', 'essen', 'Schnell essen', ''],
      ['15:00', '15:25', 'frei', 'Freizeit', ''],
      ['15:25', '15:30', 'weg', 'Weg zum Cello', ''],
      ['15:30', '16:00', 'kurs', 'Cello', ''],
      ['16:00', '16:05', 'weg', 'Heimweg', ''],
      ['16:05', '19:30', 'frei', 'Freizeit', 'z. B. Buch lesen'],
      '@abend',
    ],
    do: [
      '@schulmorgen',
      ['14:00', '14:45', 'schule', 'Hausaufgaben', ''],
      ['14:45', '15:00', 'essen', 'Schnell essen', ''],
      ['15:00', '15:30', 'frei', 'Freizeit', ''],
      ['15:30', '16:00', 'weg', 'Fahrt zur Programmierschule', ''],
      ['16:00', '18:00', 'kurs', 'Programmierschule', ''],
      ['18:00', '18:30', 'weg', 'Heimweg', ''],
      ['18:30', '18:40', 'routine', 'Duschen', ''],
      ['18:40', '19:30', 'frei', 'Skill / Freizeit', ''],
      '@abend',
    ],
    fr: [
      '@schulmorgen',
      ['14:00', '14:45', 'schule', 'Hausaufgaben', ''],
      ['14:45', '15:05', 'essen', 'Mittagessen', 'kochen & essen'],
      ['15:05', '16:00', 'frei', 'Skill / Freizeit', ''],
      ['16:00', '16:30', 'sport', 'Joggen', ''],
      ['16:30', '16:40', 'routine', 'Duschen', ''],
      ['16:40', '17:00', 'frei', 'Freizeit', ''],
      ['17:00', '17:30', 'weg', 'Fahrt zur Leichtathletik', ''],
      ['17:30', '19:00', 'kurs', 'Leichtathletik', ''],
      ['19:00', '19:30', 'weg', 'Heimweg', ''],
      '@abend',
    ],
    sa: [
      ['05:00', '08:00', 'schlaf', 'Ausschlafen', 'aufwachen ca. 08:00'],
      ['08:00', '09:00', 'routine', 'Aufstehen, frühstücken, fertig machen', ''],
      ['09:00', '10:00', 'weg', 'Fahrt nach Düsseldorf', ''],
      ['10:00', '12:50', 'schule', 'Koreanische Schule', 'Düsseldorf'],
      ['12:50', '14:00', 'weg', 'Heimfahrt', ''],
      ['14:00', '21:30', 'frei', 'Freizeit', ''],
      ['21:30', '22:00', 'routine', 'Bettfertig machen', ''],
      ['22:00', '29:00', 'schlaf', 'Schlafen', 'ca. 22 Uhr, kein festes Limit'],
    ],
    so: [
      ['05:00', '20:30', 'frei', 'Freier Tag', 'Aufwachen, wann du willst'],
      ['20:30', '21:00', 'routine', 'Bettfertig machen', ''],
      ['21:00', '29:00', 'schlaf', 'Schlafen', ''],
    ],
  },
};

// Diese Bloecke bekommen beim Aufbau "Erinnerung = ja".
// Angabe als Wochentag + Startzeit, damit die Zuordnung eindeutig ist.
export const STANDARD_ERINNERUNGEN = [
  // Hausaufgaben (Mo-Fr)
  { tag: 'mo', start: '14:00' },
  { tag: 'di', start: '14:00' },
  { tag: 'mi', start: '14:00' },
  { tag: 'do', start: '14:00' },
  { tag: 'fr', start: '14:00' },
  // Joggen (Mo, Di, Fr)
  { tag: 'mo', start: '16:00' },
  { tag: 'di', start: '16:00' },
  { tag: 'fr', start: '16:00' },
  // Wege zu den Kursen
  { tag: 'mo', start: '17:00' }, // Fahrt zum Orchester
  { tag: 'di', start: '17:00' }, // Fahrt zum Badminton
  { tag: 'mi', start: '15:25' }, // Weg zum Cello
  { tag: 'do', start: '15:30' }, // Fahrt zur Programmierschule
  { tag: 'fr', start: '17:00' }, // Fahrt zur Leichtathletik
  { tag: 'sa', start: '09:00' }, // Fahrt nach Düsseldorf
  // Bettfertig machen
  { tag: 'mo', start: '20:30' },
  { tag: 'di', start: '20:30' },
  { tag: 'mi', start: '20:30' },
  { tag: 'do', start: '20:30' },
  { tag: 'fr', start: '20:30' },
  { tag: 'sa', start: '21:30' },
  { tag: 'so', start: '20:30' },
];

// Gewohnheiten, fuer die es eine eigene Streak gibt.
// "titel" muss exakt dem Blocktitel entsprechen.
export const HABITS = [
  { schluessel: 'morgensport', titel: 'Morgensport', name: 'Morgensport' },
  { schluessel: 'joggen', titel: 'Joggen', name: 'Joggen' },
  { schluessel: 'hausaufgaben', titel: 'Hausaufgaben', name: 'Hausaufgaben' },
  { schluessel: 'tagesziele', titel: '3 Tagesziele aufschreiben', name: '3 Tagesziele' },
  { schluessel: 'bettfertig', titel: 'Bettfertig machen', name: 'Bettfertig machen' },
];

/** Titel des Blocks, der automatisch abgehakt wird, sobald alle 3 Ziele stehen. */
export const ZIELE_BLOCK_TITEL = '3 Tagesziele aufschreiben';
