// Kalender-Export (.ics).
//
// Warum ueberhaupt? Eine Web-App kann auf dem iPhone keine Benachrichtigungen
// schicken, wenn sie geschlossen ist. Der Apple-Kalender kann das sehr wohl.
// Also erzeugen wir eine .ics-Datei mit woechentlich wiederkehrenden Terminen
// und einem Alarm - der Kalender uebernimmt das Erinnern.
//
// Format: RFC 5545. Wichtig sind CRLF-Zeilenenden, das Falten langer Zeilen
// und eine VTIMEZONE, damit die Sommerzeit stimmt.

import { WOCHENTAGE, WOCHENTAG_NAMEN } from '../daten/standardplan.js';
import { zuMinuten, zuText, ausIso, zuIso, tagVerschieben, TAG_MIN } from './zeit.js';

/** Zusatz im Termintitel, damit du die Termine leicht wiederfindest. */
export const KALENDER_MARKE = 'Mein Tag';

const BYDAY = { mo: 'MO', di: 'TU', mi: 'WE', do: 'TH', fr: 'FR', sa: 'SA', so: 'SU' };
const WOCHENTAG_INDEX = { so: 0, mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6 };

// ---------------------------------------------------------------------------
// Kleine Helfer fuers Dateiformat
// ---------------------------------------------------------------------------

/** Sonderzeichen in Texten maskieren (Backslash, Semikolon, Komma, Umbruch). */
export function maskiere(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Lange Zeilen falten: max. 75 Oktette pro Zeile, Fortsetzung beginnt mit
 * einem Leerzeichen. Gezaehlt wird in Bytes, nicht in Zeichen - Umlaute
 * brauchen 2 Bytes.
 */
export function falte(zeile) {
  const bytes = alsBytes(zeile);
  if (bytes.length <= 75) return zeile;

  const teile = [];
  let start = 0;
  let grenze = 75;

  while (start < bytes.length) {
    let ende = Math.min(start + grenze, bytes.length);
    // Nicht mitten in ein Mehrbyte-Zeichen schneiden.
    while (ende > start && ende < bytes.length && (bytes[ende] & 0xc0) === 0x80) ende -= 1;
    teile.push(alsText(bytes.slice(start, ende)));
    start = ende;
    grenze = 74; // Fortsetzungszeilen haben ein fuehrendes Leerzeichen
  }

  return teile[0] + teile.slice(1).map((t) => `\r\n ${t}`).join('');
}

// UTF-8 Umwandlung, die in Node und im Browser gleich funktioniert.
function alsBytes(text) {
  return new TextEncoder().encode(text);
}
function alsText(bytes) {
  return new TextDecoder().decode(bytes);
}

/** Date -> "20260920T143000" (lokale Wandzeit, ohne Zeitzonen-Kennung). */
export function alsLokaleZeit(iso, minutenImTag) {
  const m = ((minutenImTag % TAG_MIN) + TAG_MIN) % TAG_MIN;
  const datum = iso.replace(/-/g, '');
  const std = String(Math.floor(m / 60)).padStart(2, '0');
  const min = String(m % 60).padStart(2, '0');
  return `${datum}T${std}${min}00`;
}

/** Date -> "20260920T143000Z" (UTC, fuer DTSTAMP). */
export function alsUtcZeit(datum) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${datum.getUTCFullYear()}${p(datum.getUTCMonth() + 1)}${p(datum.getUTCDate())}` +
    `T${p(datum.getUTCHours())}${p(datum.getUTCMinutes())}${p(datum.getUTCSeconds())}Z`
  );
}

/** Erstes Datum ab `abIso`, das auf den gewuenschten Wochentag faellt. */
export function ersterWochentagAb(abIso, wochentag) {
  const ziel = WOCHENTAG_INDEX[wochentag];
  const start = ausIso(abIso);
  const abstand = (ziel - start.getDay() + 7) % 7;
  return tagVerschieben(zuIso(start), abstand);
}

/** Einfache, stabile Pruefsumme - damit die UID sich nicht staendig aendert. */
export function kurzHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

/** Alle Bloecke des Plans, bei denen "Erinnerung = ja" gesetzt ist. */
export function erinnerungsBloecke(plan) {
  const liste = [];
  for (const tag of WOCHENTAGE) {
    for (const block of plan[tag] ?? []) {
      if (block.erinnerung) liste.push({ tag, block });
    }
  }
  return liste;
}

/**
 * Erzeugt den kompletten Inhalt der .ics-Datei.
 *
 * @param {object} plan                Wochenplan { mo: Block[], ... }
 * @param {object} optionen
 * @param {number} optionen.vorlaufMinuten  Wie lange vorher der Alarm kommt (Standard 5)
 * @param {string} optionen.abIso      Ab welchem Datum die Serie startet (Standard: heute)
 * @param {Date}   optionen.jetzt      Nur fuer Tests, damit DTSTAMP fest ist
 * @returns {string}
 */
export function erzeugeIcs(plan, optionen = {}) {
  const vorlauf = Number.isFinite(optionen.vorlaufMinuten) ? optionen.vorlaufMinuten : 5;
  const jetzt = optionen.jetzt ?? new Date();
  const abIso = optionen.abIso ?? zuIso(jetzt);
  const dtstamp = alsUtcZeit(jetzt);

  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mein Tag//Tagesplan PWA//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${maskiere(KALENDER_MARKE)}`,
    ...VTIMEZONE_BERLIN,
  ];

  for (const { tag, block } of erinnerungsBloecke(plan)) {
    const startMin = zuMinuten(block.start);
    const endeMin = zuMinuten(block.ende);

    // Zeiten ueber 24:00 gehoeren auf den Folgetag.
    const versatzStart = Math.floor(startMin / TAG_MIN);
    const versatzEnde = Math.floor(endeMin / TAG_MIN);

    const basisDatum = ersterWochentagAb(abIso, tag);
    const startDatum = tagVerschieben(basisDatum, versatzStart);
    const endeDatum = tagVerschieben(basisDatum, versatzEnde);

    // Faellt der Start durch den Versatz auf einen anderen Wochentag,
    // muss auch die Wiederholungsregel diesen Tag nennen.
    const bydayTag = WOCHENTAGE[(WOCHENTAGE.indexOf(tag) + versatzStart) % 7];

    const uid = `meintag-${tag}-${block.start.replace(':', '')}-${kurzHash(block.titel)}@mein-tag.local`;
    const beschreibung = [
      block.notiz,
      `${WOCHENTAG_NAMEN[tag]} ${zuText(startMin)}-${zuText(endeMin)}`,
      'Aus der App "Mein Tag"',
    ]
      .filter(Boolean)
      .join('\n');

    zeilen.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${alsLokaleZeit(startDatum, startMin)}`,
      `DTEND;TZID=Europe/Berlin:${alsLokaleZeit(endeDatum, endeMin)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[bydayTag]}`,
      `SUMMARY:${maskiere(`${block.titel} · ${KALENDER_MARKE}`)}`,
      `DESCRIPTION:${maskiere(beschreibung)}`,
      `CATEGORIES:${maskiere(KALENDER_MARKE)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${Math.max(0, Math.round(vorlauf))}M`,
      `DESCRIPTION:${maskiere(`Gleich: ${block.titel}`)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  zeilen.push('END:VCALENDAR');
  return zeilen.map(falte).join('\r\n') + '\r\n';
}

/** Dateiname fuer den Download / das Teilen. */
export function icsDateiname() {
  return 'mein-tag-erinnerungen.ics';
}

// Zeitzone Europe/Berlin mit den EU-Regeln fuer Sommer- und Winterzeit.
const VTIMEZONE_BERLIN = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Berlin',
  'X-LIC-LOCATION:Europe/Berlin',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];
