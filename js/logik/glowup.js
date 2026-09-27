// Glow-up-Serie: Wochen verwalten und Transkripte auswerten.
//
// Die Folgen bis Woche 5 stehen fest in js/daten/glowup.js. Neue Wochen
// (6 bis 13) legt man in der App an; sie liegen in zustand.glowup.wochen.
// Wie ueberall in logik/ gilt: nichts wird veraendert, jede Funktion gibt
// einen neuen Zustand zurueck.

import { GLOWUP_WOCHEN, SERIE, FOKUS, FOKUS_WAEHLBAR } from '../daten/glowup.js';

// ---------------------------------------------------------------------------
// Wochen
// ---------------------------------------------------------------------------

/** Nur die selbst angelegten Wochen. */
export function eigeneWochen(zustand) {
  return Array.isArray(zustand?.glowup?.wochen) ? zustand.glowup.wochen : [];
}

/**
 * Alle Wochen, nach Nummer sortiert: feste und eigene zusammen.
 * Eigene Wochen laufen durch neueWoche(), damit auch halb kaputte Daten
 * (z. B. aus einem alten Backup) sicher angezeigt werden koennen.
 */
export function alleWochen(zustand) {
  return [
    ...GLOWUP_WOCHEN.map((w) => ({ ...w, eigene: false })),
    ...eigeneWochen(zustand)
      .filter((w) => w && typeof w === 'object')
      .map((w) => ({ ...neueWoche(w), eigene: true })),
  ].sort((a, b) => a.nr - b.nr);
}

/** Welche Wochennummern sind noch frei? (1 bis 13) */
export function freieWochen(zustand, ausser = null) {
  const belegt = new Set(alleWochen(zustand).filter((w) => w.id !== ausser).map((w) => w.nr));
  const frei = [];
  for (let nr = 1; nr <= SERIE.wochenGesamt; nr += 1) if (!belegt.has(nr)) frei.push(nr);
  return frei;
}

/** Die neueste veroeffentlichte Woche (hoechste Nummer). */
export function neuesteWoche(zustand) {
  const liste = alleWochen(zustand);
  return liste[liste.length - 1] ?? null;
}

/** Bis zu welcher Woche ist die Serie da? 0 = nur der Prolog. */
export function stand(zustand) {
  return neuesteWoche(zustand)?.nr ?? 0;
}

/** Laufkilometer pro Woche fuer das Diagramm (Woche 1 bis 13, null = offen). */
export function kilometerProWoche(zustand) {
  const nachNummer = new Map(alleWochen(zustand).map((w) => [w.nr, w]));
  const liste = [];
  for (let nr = 1; nr <= SERIE.wochenGesamt; nr += 1) {
    const w = nachNummer.get(nr);
    liste.push({ nr, km: typeof w?.laufenKm === 'number' ? w.laufenKm : null, woche: w ?? null });
  }
  return liste;
}

/** Baut eine vollstaendige Woche mit sinnvollen Standardwerten. */
export function neueWoche(teil = {}) {
  const zahl = (wert) => (typeof wert === 'number' && Number.isFinite(wert) ? wert : null);
  const liste = (wert) =>
    (Array.isArray(wert) ? wert : String(wert ?? '').split('\n'))
      .map((z) => String(z).replace(/^\s*[-•*]\s*/, '').trim())
      .filter(Boolean);

  return {
    id: teil.id ?? `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    nr: Number(teil.nr) || 0,
    titel: String(teil.titel ?? '').trim(),
    datum: /^\d{4}-\d{2}-\d{2}$/.test(teil.datum ?? '') ? teil.datum : '',
    link: String(teil.link ?? '').trim(),
    fokus: FOKUS_WAEHLBAR.includes(teil.fokus) ? teil.fokus : 'sonst',
    kurz: String(teil.kurz ?? '').trim(),
    gemacht: liste(teil.gemacht),
    laufenKm: zahl(teil.laufenKm),
    radH: zahl(teil.radH),
    cardioH: zahl(teil.cardioH),
    gewichtKg: zahl(teil.gewichtKg),
    extra: Array.isArray(teil.extra) ? teil.extra : [],
    aufgabe: liste(teil.aufgabe),
    deineVersion: String(teil.deineVersion ?? '').trim(),
    warnung: String(teil.warnung ?? '').trim(),
    transkript: String(teil.transkript ?? ''),
  };
}

/**
 * Prueft eine Woche vor dem Speichern.
 * @returns {string|null} Fehlermeldung oder null, wenn alles passt
 */
export function pruefeWoche(zustand, woche) {
  const nr = Number(woche.nr);
  if (!Number.isInteger(nr) || nr < 1 || nr > SERIE.wochenGesamt) {
    return `Die Woche muss zwischen 1 und ${SERIE.wochenGesamt} liegen.`;
  }
  if (!freieWochen(zustand, woche.id).includes(nr)) {
    return `Woche ${nr} gibt es schon.`;
  }
  const hatInhalt =
    woche.gemacht.length > 0 ||
    woche.link ||
    woche.transkript.trim() ||
    woche.titel ||
    woche.laufenKm !== null;
  if (!hatInhalt) {
    return 'Trag wenigstens etwas ein – einen Link, das Transkript oder was er gemacht hat.';
  }
  for (const [name, wert] of [['Kilometer', woche.laufenKm], ['Rad-Stunden', woche.radH], ['Cardio-Stunden', woche.cardioH]]) {
    if (wert !== null && (wert < 0 || wert > 500)) return `${name}: Das sieht nach einem Tippfehler aus.`;
  }
  return null;
}

/** Speichert eine eigene Woche (neu oder geaendert). */
export function speichereWoche(zustand, woche) {
  const liste = eigeneWochen(zustand);
  const neu = liste.some((w) => w.id === woche.id)
    ? liste.map((w) => (w.id === woche.id ? woche : w))
    : [...liste, woche];
  return { ...zustand, glowup: { ...(zustand.glowup ?? {}), wochen: neu } };
}

/** Loescht eine eigene Woche. Die festen Wochen lassen sich nicht loeschen. */
export function loescheWoche(zustand, id) {
  const liste = eigeneWochen(zustand);
  return { ...zustand, glowup: { ...(zustand.glowup ?? {}), wochen: liste.filter((w) => w.id !== id) } };
}

// ---------------------------------------------------------------------------
// YouTube-Links
// ---------------------------------------------------------------------------

/** Holt die 11-stellige Video-Kennung aus allen gaengigen Link-Formen. */
export function youtubeId(text) {
  const t = String(text ?? '').trim();
  const muster = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const m of muster) {
    const treffer = t.match(m);
    if (treffer) return treffer[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(t) ? t : null;
}

/** Ein sauberer Link zum Video. */
export function youtubeLink(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Seine Videotitel tragen das Thema in Sternchen: "WEEK 5 *GROOMING*".
 * Daraus machen wir einen Fokus.
 */
export function fokusAusTitel(titel) {
  const treffer = String(titel ?? '').match(/\*([^*]+)\*/);
  if (!treffer) return null;
  const wort = treffer[1].toLowerCase();
  const zuordnung = [
    [/groom|hair|brow|shav/, 'groom'],
    [/gym|lift|strength|muscle/, 'gym'],
    [/skin|acne/, 'haut'],
    [/fashion|style|fit|drip|cloth/, 'mode'],
    [/nutri|diet|food|eat|sleep|recover/, 'essen'],
    [/run|cardio|marathon|race/, 'cardio'],
    [/progress|mind|mental|discipline|reveal/, 'mind'],
  ];
  for (const [muster, fokus] of zuordnung) if (muster.test(wort)) return fokus;
  return null;
}

// ---------------------------------------------------------------------------
// Transkript auswerten
// ---------------------------------------------------------------------------

const ZAHLWOERTER = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};
const ZAHL = `(\\d{1,3}(?:[.,]\\d)?|${Object.keys(ZAHLWOERTER).join('|')})`;

function alsZahl(text) {
  const t = String(text).toLowerCase();
  if (t in ZAHLWOERTER) return ZAHLWOERTER[t];
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Entfernt die Zeitstempel, die YouTube in kopierte Transkripte schreibt:
 * "18:1518 Minuten, 15 Sekunden" oder "0:06" auf einer eigenen Zeile.
 */
export function entferneZeitstempel(text) {
  return String(text ?? '')
    .replace(
      /\d{1,2}:\d{2}(?::\d{2})?(?:\d+\s*(?:Stunden?|Minuten?|Sekunden?|hours?|minutes?|seconds?)(?:,\s*\d+\s*(?:Minuten?|Sekunden?|minutes?|seconds?))*)?/gi,
      ' ',
    )
    .replace(/\[(?:music|musik|applause|laughter|cheering|snorts|sighs|singing[^\]]*|__)\]/gi, ' ')
    .replace(/[ \t]+/g, ' ');
}

/** Zerlegt einen Text in Saetze - grob, aber fuer unsere Zwecke genau genug. */
function saetze(text) {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Sucht in allen Saetzen nach einem Muster und bewertet jeden Treffer nach
 * den Worten direkt drumherum: "diese Woche", "insgesamt", "wir sind
 * gelaufen" zaehlen mehr, Anweisungen an die Zuschauer ("you", "if you
 * pick") und Rueckblicke zaehlen weniger. Bei Gleichstand gewinnt der
 * spaetere Treffer - der Wochenrueckblick steht meistens am Ende des Videos.
 */
function besterTreffer(saetzeListe, muster, wocheNr) {
  let bester = null;
  saetzeListe.forEach((satz, index) => {
    for (const treffer of satz.matchAll(muster)) {
      const wert = alsZahl(treffer[1]);
      if (wert === null) continue;
      // Nur die Umgebung des Treffers zaehlt, nicht der ganze Satz - in
      // "we ran 50 km ... a total of 280 km in the past 5 weeks" soll der
      // Rueckblick hinten nicht die 50 vorne abwerten.
      const fenster = satz.slice(Math.max(0, treffer.index - 60), treffer.index + treffer[0].length + 30);
      let punkte = index / saetzeListe.length;
      if (/this week|total|we did|i did|we ran|i ran/i.test(fenster)) punkte += 2;
      if (/\byou\b|\byour\b|\bif\b|\bpick\b|next week|peak|double|past \d+ weeks/i.test(fenster)) punkte -= 3;
      const genannt = fenster.match(new RegExp(`week ${ZAHL}\\b`, 'i'));
      if (genannt && wocheNr !== null) punkte += alsZahl(genannt[1]) === wocheNr ? 2 : -2;
      if (!bester || punkte >= bester.punkte) bester = { wert, punkte };
    }
  });
  return bester?.wert ?? null;
}

/** Die Wochennummer, die im Text am haeufigsten vorkommt ("week five"). */
function haeufigsteWoche(text) {
  const zaehler = new Map();
  for (const t of text.matchAll(new RegExp(`\\bweek ${ZAHL}\\b`, 'gi'))) {
    const nr = alsZahl(t[1]);
    if (nr >= 1 && nr <= SERIE.wochenGesamt) zaehler.set(nr, (zaehler.get(nr) ?? 0) + 1);
  }
  let beste = null;
  for (const [nr, anzahl] of zaehler) if (!beste || anzahl > beste.anzahl) beste = { nr, anzahl };
  return beste?.nr ?? null;
}

const FOKUS_WOERTER = {
  cardio: /\b(run|ran|running|runs|cardio|marathon|pace|km|ks)\b/gi,
  essen: /\b(protein|carbs?|fats?|macros?|nutrition|diet|sleep|recovery|recover|magnesium|calories|glycogen|eat)\b/gi,
  gym: /\b(gym|weights?|overload|bench|curls?|reps?|sets?|muscles?|machine|lifting|physique)\b/gi,
  mind: /\b(mental|mentality|mindset|discipline|motivation|challenge|greatness|ego|lock in)\b/gi,
  groom: /\b(shave|shaving|eyebrows?|brows?|haircut|hair|beard|mustache|grooming|perm|wax)\b/gi,
  haut: /\b(skin|skincare|acne|cleanse|cleanser|sunscreen|moisturi[sz]er|retinol|salicylic)\b/gi,
  mode: /\b(fashion|outfits?|clothes|clothing|drip|wardrobe|style|stylish)\b/gi,
};

/** Welches Thema passt am besten? Kapitelueberschriften zaehlen vierfach. */
function rateFokus(text, kapitel) {
  const kapitelText = kapitel.join(' ');
  let bester = null;
  for (const [fokus, muster] of Object.entries(FOKUS_WOERTER)) {
    let punkte = (text.match(muster)?.length ?? 0) + 4 * (kapitelText.match(muster)?.length ?? 0);
    // Gelaufen wird in jeder Folge - Laufen gewinnt nur, wenn es wirklich Thema ist.
    if (fokus === 'cardio') punkte *= 0.5;
    if (!bester || punkte > bester.punkte) bester = { fokus, punkte };
  }
  return bester && bester.punkte >= 3 ? bester.fokus : null;
}

/**
 * Wertet ein eingefuegtes Transkript aus und macht Vorschlaege.
 * Alles ist nur ein Vorschlag - die Nutzerin oder der Nutzer kann es aendern.
 */
export function werteTranskriptAus(roh) {
  const original = String(roh ?? '');
  const kapitel = [...original.matchAll(/^\s*(?:Kapitel|Chapter)\s*\d+\s*[:.\-–]\s*(.+?)\s*$/gim)]
    .map((t) => t[1])
    .filter((t) => !/^(intro|introduction)$/i.test(t));

  const text = entferneZeitstempel(original);
  const liste = saetze(text);
  const woche = haeufigsteWoche(text);

  const km = besterTreffer(
    liste,
    new RegExp(`\\b(?:ran|run|running|did|doing)\\s+(?:a\\s+)?(?:total\\s+of\\s+|humble\\s+|over\\s+)?${ZAHL}\\s*(?:km|ks|k|kilometers?|kilometres?)\\b`, 'gi'),
    woche,
  );
  const rad = besterTreffer(
    liste,
    new RegExp(`${ZAHL}\\s+hours?\\s+on\\s+(?:the|a)\\s+(?:indoor\\s+)?(?:cardio\\s+)?(?:bike|cycle)`, 'gi'),
    woche,
  );
  const cardio = besterTreffer(liste, new RegExp(`${ZAHL}\\s+hours?\\s+of\\s+cardio`, 'gi'), woche);
  const abgenommen = besterTreffer(liste, new RegExp(`\\blost\\s+${ZAHL}\\s*(?:kg|kilos?|kilograms?)\\b`, 'gi'), woche);

  return {
    woche,
    kapitel,
    fokus: rateFokus(text, kapitel),
    laufenKm: km,
    radH: rad,
    cardioH: cardio,
    gewichtKg: abgenommen === null ? null : -abgenommen,
    woerter: text.split(/\s+/).filter(Boolean).length,
  };
}

/** Lesbarer Name eines Fokus. */
export function fokusName(schluessel) {
  return FOKUS[schluessel]?.name ?? FOKUS.sonst.name;
}
