// Die Glow-up-Serie von King Henry RN ("I try to glowup in 90 days") als Rohdaten.
//
// Hier stehen die Folgen, die es beim Bau der App schon gab (Prolog bis
// Woche 5). Neue Wochen legt man in der App selbst an - die landen im
// gespeicherten Zustand (zustand.glowup.wochen), nicht hier.
//
// Alle Zahlen sind seine eigenen Angaben aus den Videos. Stand: 26.09.2026.

export const SERIE = {
  titel: 'Lock-in',
  kanal: 'King Henry RN',
  kanalLink: 'https://www.youtube.com/@Kinghenryrn/videos',
  wochenGesamt: 13,
  tageGesamt: 90,
  stand: '2026-09-26',
};

/**
 * Die Themen einer Woche. Die Farben kommen aus einer auf Farbenblindheit
 * geprueften Palette; jede Farbe steht immer mit ihrem Namen daneben.
 */
export const FOKUS = {
  prolog: { name: 'Rückblick 60 Tage', kurz: 'Rückblick', akzent: { dunkel: '#6F7A89', hell: '#7D8898' } },
  cardio: { name: 'Cardio & Laufen', kurz: 'Cardio', akzent: { dunkel: '#D95926', hell: '#EB6834' } },
  essen: { name: 'Ernährung & Erholung', kurz: 'Ernährung', akzent: { dunkel: '#199E70', hell: '#1BAF7A' } },
  gym: { name: 'Gym & Kraft', kurz: 'Gym', akzent: { dunkel: '#3987E5', hell: '#2A78D6' } },
  mind: { name: 'Mentalität', kurz: 'Kopf', akzent: { dunkel: '#D55181', hell: '#E87BA4' } },
  groom: { name: 'Grooming', kurz: 'Grooming', akzent: { dunkel: '#C98500', hell: '#EDA100' } },
  haut: { name: 'Hautpflege', kurz: 'Haut', akzent: { dunkel: '#2E9B3E', hell: '#008300' } },
  mode: { name: 'Mode & Style', kurz: 'Mode', akzent: { dunkel: '#9085E9', hell: '#4A3AA7' } },
  sonst: { name: 'Sonstiges', kurz: 'Sonst', akzent: { dunkel: '#8A94A2', hell: '#727C8A' } },
};

/** Reihenfolge fuer Auswahllisten (ohne den Rueckblick). */
export const FOKUS_WAEHLBAR = ['cardio', 'essen', 'gym', 'mind', 'groom', 'haut', 'mode', 'sonst'];

/**
 * Ein Vorschlag fuer "Deine Version", wenn man eine neue Woche anlegt.
 * Man kann ihn jederzeit ueberschreiben.
 */
export const FOKUS_TIPPS = {
  cardio: 'Nimm etwa ein Drittel seiner Umfänge. Locker laufen, bis du dich dabei noch unterhalten kannst, und jede Woche höchstens 10 % mehr.',
  essen: 'Protein 1,6–2 g pro kg Körpergewicht, genug schlafen, viel Wasser. Nahrungsergänzungsmittel brauchst du dafür nicht.',
  gym: '2–3× pro Woche den ganzen Körper trainieren, das Gewicht langsam steigern, alles aufschreiben.',
  mind: 'Such dir eine Challenge passend zu deinem Level. Bei Schmerzen hörst du auf, anstatt dich durchzubeißen.',
  groom: 'Braucht wenig Aufwand, und man sieht es sofort: Rasur, Brauen säubern, ein Haarschnitt, der zu dir passt.',
  haut: 'Wenige Schritte, dafür jeden Tag: sanft reinigen, eincremen, morgens Sonnenschutz. Neue Produkte immer einzeln ausprobieren.',
  mode: 'Lieber wenige Teile, die gut sitzen, als viele Trends. Trag, worin du dich selbstbewusst fühlst.',
  sonst: '',
};

/**
 * Die Wochen, die beim Bau der App schon online waren.
 * nr 0 = Prolog (das Rueckblick-Video vor dem Start).
 */
export const GLOWUP_WOCHEN = [
  {
    id: 'henry-p',
    nr: 0,
    titel: 'I became ugly to prove that anyone can glowup in just 60 days…',
    datum: '2026-08-02',
    link: 'https://www.youtube.com/watch?v=nEe74Nlq5J0',
    aufrufe: '518k',
    dauer: '7:35',
    fokus: 'prolog',
    kurz: 'Blickt auf seinen 60-Tage-Glow-up von 2024 zurück.',
    gemacht: [
      'Fasst seinen 60-Tage-Glow-up von 2024 zusammen. Vorher hatte er sich absichtlich über 10 kg angefuttert.',
      'Körper: viel lockeres Cardio (Crosstrainer, Laufband mit Steigung) und weniger essen.',
      'Haut: Darm pflegen (Eier, Kimchi, Gemüse), 2× pro Woche Salicylsäure, jeden Abend doppelt reinigen.',
      'Haare: Schwachstellen kaschieren, z. B. Mullet gegen abstehende Ohren, Pony bei hoher Stirn, Dauerwelle bei ganz glatten Haaren.',
    ],
    laufenKm: null,
    radH: null,
    cardioH: null,
    gewichtKg: 10,
    extra: [{ name: 'Cardio', wert: '70+ h / 60 T' }],
    aufgabe: ['Glow Up University beitreten (Werbung). Er sagt aber selbst, dass man dafür nur „Mut und das Internet“ braucht.'],
    deineVersion: 'Merk dir die drei Hebel: Körperfett, Haut, Haare. Damit veränderst du dein Aussehen am meisten, und das ohne Geld auszugeben.',
    warnung: '',
  },
  {
    id: 'henry-1',
    nr: 1,
    titel: 'CAN I GLOWUP IN 90 DAYS? | WEEK 1',
    datum: '2026-08-10',
    link: 'https://www.youtube.com/watch?v=2W7JSHolYAw',
    aufrufe: '142k',
    dauer: '24:24',
    fokus: 'cardio',
    kurz: 'Startet mit extrem viel Laufen.',
    gemacht: [
      '5-km-Test mit voller Kraft als Fitness-Check: 4:29/km (früher 4:05/km).',
      'Am nächsten Tag 10 km, zwei Tage später 15 km (1:30 h), dazu Tempotraining und Sauna.',
      'Zeigt Samples seiner Klamottenmarke. Seine Mode-Regel: Trag, worin du dich selbstbewusst fühlst.',
      'Seine Idee: In der ersten Woche so hart starten, dass dein Gehirn „Beweise“ bekommt, dass du jetzt ein anderer Mensch bist.',
    ],
    laufenKm: 40,
    radH: 5,
    cardioH: 9,
    gewichtKg: -2,
    extra: [],
    aufgabe: [
      'Such dir eine Zahl von 5 bis 8 aus. So viele Stunden Cardio machst du diese Woche, und zwar nie weniger.',
      'Zum Start 5 km mit voller Kraft laufen.',
    ],
    deineVersion: 'Nimm eher 3–5 h. Zügiges Gehen, Radfahren und lockeres Joggen zählen alle. Den 5-km-Test machst du zügig, aber nicht bis zum Umfallen. Das Wichtigste ist, dass du deine Zahl auch wirklich schaffst.',
    warnung: '',
  },
  {
    id: 'henry-2',
    nr: 2,
    titel: 'I TRY TO GLOWUP IN 90 DAYS | WEEK 2',
    datum: '2026-08-17',
    link: 'https://www.youtube.com/watch?v=Ftp_QJvfLuY',
    aufrufe: '75k',
    dauer: '24:12',
    fokus: 'essen',
    kurz: 'Ernährung, Schlaf und ein Halbmarathon.',
    gemacht: [
      'Lockere Läufe (Zone 2), Intervalle knapp unter der Belastungsgrenze (≈4:20/km) und Laufband mit Steigung.',
      'Halbmarathon (21,1 km) verkatert und nach ≈3 h Schlaf, zusammen mit John und Jackson. Danach gab es KFC.',
      'Erklärt Makros und kocht ein Hähnchen-Gericht.',
      'Seine „Stat-Page“: jede Woche wie im Game prüfen, welche Werte gestiegen sind.',
    ],
    laufenKm: 75,
    radH: 5,
    cardioH: 13,
    gewichtKg: null,
    extra: [{ name: 'Verbrannt', wert: '≈3.800 kcal' }],
    aufgabe: [
      'Cardio-Zahl +1.',
      'Protein 0,8 g pro Pfund Körpergewicht (≈1,8 g/kg), Fett mind. 60–80 g, Kohlenhydrate 5–7 g/kg.',
      'Abends 300 mg Magnesiumglycinat + 4–5 g Glycin.',
      'Eine eigene Stat-Page anlegen.',
    ],
    deineVersion: 'Nur +1 h, wenn Woche 1 gut lief. Protein 1,6–2 g/kg ist solide. 5–7 g/kg Kohlenhydrate sind für Ausdauersportler mit viel Training gedacht, wenn du abnehmen willst, iss weniger. Die Stat-Page ist die beste Idee der ganzen Serie.',
    warnung: 'Nahrungsergänzungsmittel brauchst du nicht. Wenn du unter 18 bist, sprich vorher mit deinen Eltern oder einem Arzt.',
  },
  {
    id: 'henry-3',
    nr: 3,
    titel: 'I TRY TO GLOWUP IN 90 DAYS | WEEK 3 *GYM*',
    datum: '2026-08-25',
    link: 'https://www.youtube.com/watch?v=Tn3mlERp_Lo',
    aufrufe: '90k',
    dauer: '13:28',
    fokus: 'gym',
    kurz: 'Krafttraining erklärt, Erholungswoche.',
    gemacht: [
      'Seine Kraft-Regeln: jeder Muskel 2× pro Woche. Lieber stabile Maschinen als wackelige Kurzhanteln, weil du dann mehr Kraft auf den Muskel bringst.',
      'Steigerung: 2 Sätze mit 4–7 Wiederholungen. Im 1. Satz hörst du 2 Wiederholungen vor dem Muskelversagen auf, im 2. Satz 1 davor. Schaffst du in beiden Sätzen 7 → mehr Gewicht.',
      'Technik prüfen: sich selbst filmen und mit YouTube-Videos vergleichen. Er selbst trainiert 2× pro Woche den ganzen Körper.',
      'Laufen: 15 Bergsprints à 30 s und 5× 4 min (≈4:35/km).',
    ],
    laufenKm: 32,
    radH: 8,
    cardioH: 12,
    gewichtKg: null,
    extra: [],
    hinweis: 'Erholungswoche vor der „Hell Week“',
    aufgabe: [
      'Diese Woche nur die Hälfte an Cardio (Erholung).',
      'Makros treffen.',
      'Schlaf: Schlafmaske, Zimmer auf 18 °C, Magnesium, 100–200 mg L-Theanin und Melatonin.',
    ],
    deineVersion: 'Aus dieser Woche kannst du am meisten mitnehmen: 2–3× pro Woche den ganzen Körper trainieren, das Gewicht langsam steigern und alles aufschreiben. Schlafmaske und kühles Zimmer kosten fast nichts.',
    warnung: 'Er sagt „1 bis 5 g Melatonin“, gemeint sind Milligramm. In Deutschland gibt es Melatonin frei verkäuflich meist nur bis 1 mg. Lieber weglassen oder vorher mit einem Arzt sprechen.',
  },
  {
    id: 'henry-4',
    nr: 4,
    titel: 'I TRY TO GLOWUP IN 90 DAYS | WEEK 4 *PROGRESS*',
    datum: '2026-09-02',
    link: 'https://www.youtube.com/watch?v=R6t2vlg_aTo',
    aufrufe: '72k',
    dauer: '18:37',
    fokus: 'mind',
    kurz: 'Hell Week, 14-km-Rennen, erste Körper-Enthüllung.',
    gemacht: [
      '„Hell Week“: Er läuft doppelt so viel wie in seiner bisher stärksten Woche.',
      'City2Surf, 14 km: Nach 2 km hat er Schienbeinschmerzen, dazu Blasen und Schuhe in der falschen Größe. Er läuft trotzdem durch, mit 4:39/km (Ziel war 4:30).',
      'Philosophie-Teil: Sisyphos und die Frage, warum er das macht. Erst für Mädchen, dann für Anerkennung, am Ende für sich selbst.',
      'Erste Körper-Enthüllung: deutlich besser, „noch etwas Körperfett“. Er erwähnt, dass er seit 24 h nicht geraucht hat.',
    ],
    laufenKm: 90,
    radH: 4,
    cardioH: 13,
    gewichtKg: null,
    extra: [{ name: 'Rennen', wert: '14 km @ 4:39' }],
    aufgabe: [
      'Such dir eine Challenge aus, bei der du denkst: „Das schaffe ich niemals.“ Am besten einen Lauf über mehr als 10 km. Es soll mental wehtun, nicht nur 5 Sekunden lang wie beim Bankdrücken.',
    ],
    deineVersion: 'Die Idee ist gut, aber such dir die Challenge passend zu deinem Level aus: z. B. 5 km ohne Gehpause oder 10 km am Stück zügig gehen und joggen.',
    warnung: 'Schmerz am Schienbein oder Knie: aufhören, nicht durchbeißen. Er hat sich genau dabei verletzt.',
  },
  {
    id: 'henry-5',
    nr: 5,
    titel: 'I TRY TO GLOWUP IN 90 DAYS | WEEK 5 *GROOMING*',
    datum: '2026-09-21',
    link: 'https://www.youtube.com/watch?v=fioR4BUo3T4',
    aufrufe: '51k',
    dauer: '19:24',
    fokus: 'groom',
    kurz: 'Grooming und Vorbereitung auf den Sydney-Marathon.',
    gemacht: [
      'Rasur: erst in Wuchsrichtung, dann dagegen. Einzelne Haare an Wange, Kiefer und Nase findet er mit dem Handy-Blitz.',
      'Augenbrauen: mit Pinzette und Brauenrasierer nur säubern, die Form bleibt gleich. Oder ins Studio gehen.',
      'Haare: 3 Monate nicht geschnitten. Sein Freund John bekommt eine neue Frisur mit Dauerwelle.',
      'Neue Laufschuhe (sein rechter Fuß ist breiter, daher die Schienbeinprobleme). Intervalle auf der Bahn: 7× 3 min @ 4:00/km, dazu 10 km locker in Melbourne.',
    ],
    laufenKm: 50,
    radH: 11,
    cardioH: 16,
    cardioGeschaetzt: true,
    gewichtKg: null,
    extra: [{ name: 'Summe W1–5', wert: '≈280 km' }],
    hinweis: 'Cardio gesamt geschätzt, er nennt keine Gesamtzahl.',
    aufgabe: [
      'Einen Termin fürs Augenbrauen-Waxing buchen und sagen: „Nur säubern, Form lassen, Mitte und oberen Rand wachsen, Rest zupfen.“',
      'Zum Friseur. Wenn du unsicher bist: Low Taper Fade oder Buzz Cut.',
    ],
    deineVersion: 'Der schnellste und günstigste Glow-up überhaupt. Rasur-Routine, saubere Brauen und ein Haarschnitt, der zu deiner Kopfform passt. Das kannst du sofort machen, ganz ohne Risiko. Nimm am besten ein Foto als Vorlage mit zum Friseur.',
    warnung: '',
  },
];

/** Was er angekuendigt hat oder was noch zu erwarten ist. */
export const AUSBLICK = [
  {
    titel: 'Sydney-Marathon (42,2 km)',
    art: 'angekündigt',
    text: 'In Woche 5 sagt er „in ein paar Wochen“. Er hat Angst, mittendrin einzubrechen. Sein längster Lauf bisher: 21 km.',
  },
  {
    titel: 'Folge über Mode',
    art: 'Idee',
    text: 'Er fragt die Zuschauer, ob sie eine Glow-up-Folge nur zum Thema Mode wollen.',
  },
  {
    titel: 'Frisur nach Kopfform',
    art: 'Idee',
    text: 'Ein eigenes Video darüber, welche Frisur zu welcher Kopfform passt, wenn genug Leute danach fragen.',
  },
  {
    titel: 'Hautpflege',
    art: 'Idee',
    text: 'Hat er schon in Woche 1 als Thema genannt, bisher gab es noch keine Folge dazu.',
  },
  {
    titel: 'Zweiter Check-in & Finale',
    art: 'vermutet',
    text: 'Nach ≈2 Monaten ein weiterer Körper-Check, nach 90 Tagen (≈Woche 13) der große Vorher-Nachher-Vergleich.',
  },
];

export const UEBERNEHMEN = [
  ['Eine feste Wochenzahl und die hältst du.', 'So lernst du, dein Wort dir selbst gegenüber zu halten. Das ist der eigentliche Kern der Serie.'],
  ['Jede Woche einchecken.', 'Kilometer, Gewicht, Gym-Werte und Fotos aufschreiben.'],
  ['Krafttraining mit Steigerung.', '4–7 Wiederholungen, kurz vor dem Muskelversagen aufhören, dann mehr Gewicht.'],
  ['Genug Protein.', 'Und Kohlenhydrate nicht verteufeln, wenn du viel trainierst.'],
  ['Grooming:', 'Rasur, Brauen, Haarschnitt. Dafür brauchst du am wenigsten Aufwand und siehst den Unterschied am schnellsten.'],
  ['Mit Freunden trainieren.', 'So hältst du viel leichter durch.'],
];

export const NICHT_KOPIEREN = [
  ['Von 0 auf 9+ Stunden Cardio.', 'Er ist früher schon viel gelaufen und hat einen Coach. Trotzdem hatte er Schienbeinschmerzen und Blasen.'],
  ['Als Anfänger laufen, bis du fast umkippst.', 'Das bringt dir nichts, dafür verletzt du dich schneller.'],
  ['21 km laufen, verkatert und nach 3 h Schlaf.', 'Das ist Show, kein Training.'],
  ['Olivenöl-Shots trinken, um die Makros zu schaffen.', 'Er sagt selbst, dass das nach Essstörung klingt.'],
  ['Nahrungsergänzungsmittel nach Anleitung aus einem YouTube-Video,', 'vor allem Melatonin.'],
  ['Glauben, du brauchst sein bezahltes Programm.', 'Das sagt er selbst.'],
];

export const FAKTEN = [
  ['YouTube', '548.000 Abonnenten · 566 Videos'],
  ['TikTok / Instagram', '1,5 Mio / 660.000 (laut seiner Kanalbeschreibung)'],
  ['Bekannt geworden durch', 'Die 60-Tage-Glow-up-Serie Anfang 2024. Der Zusammenschnitt hat über 1,1 Mio. Aufrufe.'],
  ['Womit er Geld verdient', 'Eigene Klamottenmarke (laut ihm Millionen-Umsatz), „Glow Up University“ (3-Monats-Gruppencoaching über Discord) und bezahlte Look-Bewertungen.'],
  ['Hintergrund', 'Lebt in Sydney, hat Finance studiert, hat einen eigenen Laufcoach. Vor der Serie: ≈8 kg zugenommen durch Reisen, Alkohol und Rauchen.'],
  ['Was er selbst sagt', '„Du brauchst mein Coaching nicht“. Alles, was er verkauft, gibt es kostenlos im Netz.'],
];

export const QUELLEN = [
  ['Kanal: KING HENRY RN', 'https://www.youtube.com/@Kinghenryrn/videos'],
  ['Original-Serie 2024: „I tried to glow up in 60 days…“', 'https://www.youtube.com/watch?v=9PxHwRdlKnI'],
];
