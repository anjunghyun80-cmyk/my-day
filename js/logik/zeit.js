// Zeitrechnung fuer "Mein Tag".
// Dieses Modul kennt kein DOM und keinen Browser - es besteht nur aus reinen
// Funktionen und laesst sich deshalb mit `node --test` pruefen.
//
// Zwei Ideen muss man kennen:
//
// 1. "Minuten seit Mitternacht": "07:15" -> 435. Zeiten duerfen ueber 24:00
//    hinausgehen: "29:00" -> 1740 bedeutet 05:00 Uhr am naechsten Morgen.
//
// 2. "Logischer Tag": Der neue Tag beginnt erst um 04:00 Uhr. Wer um 00:30 Uhr
//    noch etwas abhakt, hakt es fuer den Vortag ab.

/** Ab dieser Uhrzeit (in Minuten) beginnt der neue logische Tag: 04:00. */
export const TAGESGRENZE_MIN = 4 * 60;

/** Frueheste Startzeit im Plan: 05:00. */
export const PLAN_START_MIN = 5 * 60;

/** Ein voller Tag in Minuten. */
export const TAG_MIN = 24 * 60;

// ---------------------------------------------------------------------------
// Zeitstrings
// ---------------------------------------------------------------------------

/**
 * "07:15" -> 435, "29:00" -> 1740.
 * Wirft einen Fehler bei unbrauchbaren Eingaben, damit Tippfehler auffallen.
 */
export function zuMinuten(text) {
  const treffer = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!treffer) throw new Error(`Ungültige Zeit: ${text}`);
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (minuten > 59) throw new Error(`Ungültige Minuten: ${text}`);
  if (stunden > 47) throw new Error(`Ungültige Stunde: ${text}`);
  return stunden * 60 + minuten;
}

/**
 * 435 -> "07:15". Zeiten ueber 24:00 werden fuer die Anzeige umgerechnet:
 * 1740 -> "05:00".
 */
export function zuText(minuten) {
  const m = ((minuten % TAG_MIN) + TAG_MIN) % TAG_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 1740 -> "29:00". Wird im Plan-Editor gebraucht, wo 29:00 erlaubt ist. */
export function zuRohText(minuten) {
  const m = Math.max(0, Math.round(minuten));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Startminute eines Blocks. */
export function blockStart(block) {
  return zuMinuten(block.start);
}

/** Endminute eines Blocks. */
export function blockEnde(block) {
  return zuMinuten(block.ende);
}

/** Dauer eines Blocks in Minuten. */
export function blockDauer(block) {
  return blockEnde(block) - blockStart(block);
}

// ---------------------------------------------------------------------------
// Datum als ISO-Text ("2026-09-20")
// ---------------------------------------------------------------------------

/** Date -> "2026-09-20" (lokale Zeit, nicht UTC!). */
export function zuIso(datum) {
  const j = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, '0');
  const t = String(datum.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

/** "2026-09-20" -> Date (lokal, 00:00 Uhr). */
export function ausIso(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return new Date(j, m - 1, t);
}

/** Verschiebt ein ISO-Datum um n Tage: ("2026-09-20", 1) -> "2026-09-21". */
export function tagVerschieben(iso, n) {
  const d = ausIso(iso);
  d.setDate(d.getDate() + n);
  return zuIso(d);
}

/** Wie viele Tage liegen zwischen zwei ISO-Daten? (b - a) */
export function tageDazwischen(isoA, isoB) {
  // Ueber UTC rechnen, damit die Sommerzeit-Umstellung nicht stoert.
  const [ja, ma, ta] = isoA.split('-').map(Number);
  const [jb, mb, tb] = isoB.split('-').map(Number);
  const a = Date.UTC(ja, ma - 1, ta);
  const b = Date.UTC(jb, mb - 1, tb);
  return Math.round((b - a) / 86400000);
}

const KUERZEL = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];

/** "2026-09-20" -> "sa" */
export function wochentagVonIso(iso) {
  return KUERZEL[ausIso(iso).getDay()];
}

/** Montag der Woche, in der dieses Datum liegt. */
export function montagDerWoche(iso) {
  const d = ausIso(iso);
  const tag = d.getDay(); // 0 = Sonntag
  const abstand = tag === 0 ? -6 : 1 - tag;
  return tagVerschieben(iso, abstand);
}

// ---------------------------------------------------------------------------
// Logischer Tag (Tageswechsel um 04:00)
// ---------------------------------------------------------------------------

/**
 * Zu welchem logischen Tag gehoert dieser Zeitpunkt?
 * 20.09. um 01:30 Uhr gehoert noch zum 19.09.
 */
export function logischerTag(jetzt = new Date()) {
  const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
  const iso = zuIso(jetzt);
  return minuten < TAGESGRENZE_MIN ? tagVerschieben(iso, -1) : iso;
}

/**
 * Wie viele Minuten ist der logische Tag schon alt - gemessen ab 00:00 Uhr
 * seines Datums. Um 01:30 Uhr am Folgetag sind das 1530 Minuten ("25:30").
 */
export function minutenImLogischenTag(jetzt = new Date()) {
  const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
  return minuten < TAGESGRENZE_MIN ? minuten + TAG_MIN : minuten;
}

// ---------------------------------------------------------------------------
// Aktueller und naechster Block
// ---------------------------------------------------------------------------

/** Liegt die Minute innerhalb des Blocks? Start zaehlt dazu, Ende nicht. */
export function istInBlock(block, minuten) {
  return minuten >= blockStart(block) && minuten < blockEnde(block);
}

/** Der Block, der zu dieser Minute laeuft - oder null. */
export function findeAktuellenBlock(bloecke, minuten) {
  return bloecke.find((b) => istInBlock(b, minuten)) ?? null;
}

/** Der erste Block, der spaeter beginnt - oder null. */
export function findeNaechstenBlock(bloecke, minuten) {
  const spaeter = bloecke
    .filter((b) => blockStart(b) > minuten)
    .sort((a, b) => blockStart(a) - blockStart(b));
  return spaeter[0] ?? null;
}

/**
 * Findet aktuellen und naechsten Block - auch ueber die Tagesgrenze hinweg.
 *
 * Warum das noetig ist: Der logische Tag beginnt um 04:00, der Plan aber erst
 * um 05:00. Zwischen 04:00 und 05:00 laeuft noch der Schlafblock des Vortags
 * (der bis "29:00" = 05:00 geht). Genau diese Stunde faengt die Funktion ab.
 *
 * @param {(iso:string)=>Array} holeBloecke  liefert die Bloecke eines Tages
 * @param {Date} jetzt
 * @returns {{tag, minuten, aktuell, aktuellTag, naechster, naechsterTag}}
 */
export function findeJetztUndNaechstes(holeBloecke, jetzt = new Date()) {
  const tag = logischerTag(jetzt);
  const minuten = minutenImLogischenTag(jetzt);

  // Kandidaten in der Reihenfolge, in der wir sie pruefen.
  const kandidaten = [];
  if (minuten < PLAN_START_MIN) {
    // 04:00 - 04:59: erst im Vortag nachsehen, dort laeuft "Schlafen".
    kandidaten.push({ tagIso: tagVerschieben(tag, -1), min: minuten + TAG_MIN });
  }
  kandidaten.push({ tagIso: tag, min: minuten });

  let aktuell = null;
  let aktuellTag = tag;
  let trefferMin = minuten;

  for (const k of kandidaten) {
    const gefunden = findeAktuellenBlock(holeBloecke(k.tagIso), k.min);
    if (gefunden) {
      aktuell = gefunden;
      aktuellTag = k.tagIso;
      trefferMin = k.min;
      break;
    }
  }

  // Der naechste Block: zuerst im selben Tag suchen, sonst im Folgetag.
  const basisTag = aktuell ? aktuellTag : tag;
  const basisMin = aktuell ? trefferMin : minuten;
  let naechster = findeNaechstenBlock(holeBloecke(basisTag), basisMin);
  let naechsterTag = basisTag;

  if (!naechster) {
    const folgetag = tagVerschieben(basisTag, 1);
    const bloecke = [...holeBloecke(folgetag)].sort((a, b) => blockStart(a) - blockStart(b));
    naechster = bloecke[0] ?? null;
    naechsterTag = folgetag;
  }

  return { tag, minuten, aktuell, aktuellTag, naechster, naechsterTag };
}

/** Restzeit des Blocks in Minuten (nie negativ). */
export function restzeitMinuten(block, minuten) {
  return Math.max(0, blockEnde(block) - minuten);
}

// ---------------------------------------------------------------------------
// Anzeige-Hilfen
// ---------------------------------------------------------------------------

/** 85 -> "1 Std 25 Min", 25 -> "25 Min", 60 -> "1 Std" */
export function formatiereDauer(minuten) {
  const m = Math.max(0, Math.round(minuten));
  const std = Math.floor(m / 60);
  const rest = m % 60;
  if (std === 0) return `${rest} Min`;
  if (rest === 0) return `${std} Std`;
  return `${std} Std ${rest} Min`;
}

/** "2026-09-20" -> "Samstag, 20. September" */
export function formatiereDatumLang(iso) {
  return ausIso(iso).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** "2026-09-20" -> "20.09." */
export function formatiereDatumKurz(iso) {
  const d = ausIso(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}
