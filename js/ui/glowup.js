// Der Glow-up-Bildschirm: King Henrys 90-Tage-Lock-in, Woche fuer Woche.
//
// Von oben nach unten:
//   1. Kopf mit Startnummer ("05 / 13") und was er gerade macht
//   2. Streifen ueber alle 13 Wochen - offene Felder oeffnen "Woche hinzufuegen"
//   3. Die Wochen als aufklappbare Karten, die neueste zuerst
//   4. Laufkilometer pro Woche als Diagramm
//   5. Ausblick, "Uebernehmen oder lassen?", Hintergrund zu ihm, Quellen
//
// Neue Wochen legt man ueber einen Dialog an: YouTube-Link und Transkript
// einfuegen, die App schlaegt Zahlen und Thema vor (js/logik/glowup.js).

import { el, svgEl, leere } from './dom.js';
import { icon } from './icons.js';

import {
  SERIE,
  FOKUS,
  FOKUS_WAEHLBAR,
  FOKUS_TIPPS,
  AUSBLICK,
  UEBERNEHMEN,
  NICHT_KOPIEREN,
  FAKTEN,
  QUELLEN,
} from '../daten/glowup.js';
import {
  alleWochen,
  freieWochen,
  neuesteWoche,
  stand,
  kilometerProWoche,
  neueWoche,
  pruefeWoche,
  speichereWoche,
  loescheWoche,
  youtubeId,
  youtubeLink,
  fokusAusTitel,
  werteTranskriptAus,
  fokusName,
} from '../logik/glowup.js';
import { ausIso } from '../logik/zeit.js';

export function rendereGlowup(app) {
  const wurzel = document.createDocumentFragment();
  const wochen = alleWochen(app.zustand);
  const neueste = neuesteWoche(app.zustand);
  const bisWoche = stand(app.zustand);
  const frei = freieWochen(app.zustand);

  // Beim ersten Oeffnen ist die neueste Woche aufgeklappt.
  if (app.glowupOffen === undefined) app.glowupOffen = neueste?.id ?? null;

  // ------------------------------------------------------------------ Kopf
  wurzel.append(
    el('header', { class: 'kopf' }, [
      el('div', { class: 'gl-kopf-links' }, [
        el('span', { class: 'etikett', text: `${SERIE.kanal} · ${SERIE.tageGesamt} Tage` }),
        el('h1', { class: 'gl-titel', text: SERIE.titel }),
      ]),
      el(
        'button',
        { class: 'rund', 'aria-label': 'Einstellungen', onclick: () => app.oeffneEinstellungen() },
        [icon('einstellungen', 21)],
      ),
    ]),
  );

  // --------------------------------------------- Startnummer + genau jetzt
  wurzel.append(
    el('section', { class: 'gl-kopf', 'aria-label': 'Stand der Serie' }, [
      el('div', { class: 'gl-kopf-links' }, [
        el('span', { class: 'etikett', text: 'Genau jetzt' }),
        neueste
          ? el('div', { dataset: { fokus: neueste.fokus }, style: { display: 'grid', gap: '6px', justifyItems: 'start' } }, [
              el('strong', {
                style: { fontSize: '17px', lineHeight: '1.25' },
                text: neueste.nr === 0 ? 'Prolog' : `Woche ${neueste.nr} · ${fokusName(neueste.fokus)}`,
              }),
              neueste.kurz ? el('span', { class: 'gl-kurz', text: neueste.kurz }) : null,
              el('span', { class: 'gl-meta', text: metaText(neueste) }),
            ])
          : null,
      ]),
      el('div', { class: 'gl-bib', role: 'img', 'aria-label': `Woche ${bisWoche} von ${SERIE.wochenGesamt} online` }, [
        el('div', { class: 'gl-bib-band', text: 'Lock-in' }),
        el('div', { class: 'gl-bib-zahl' }, [
          String(bisWoche).padStart(2, '0'),
          el('small', { text: `/${SERIE.wochenGesamt}` }),
        ]),
        el('div', { class: 'gl-bib-fuss', text: `Tag ≈${Math.min(SERIE.tageGesamt, bisWoche * 7)} von ${SERIE.tageGesamt}` }),
      ]),
    ]),
  );

  // --------------------------------------------------------------- Streifen
  wurzel.append(baueStreifen(app, wochen, neueste));

  if (AUSBLICK.length > 0) {
    wurzel.append(
      el('div', { class: 'hinweis ruhig', style: { marginTop: '14px' } }, [
        icon('ziel', 17),
        el('div', {}, [
          el('b', { style: { color: 'var(--text)' }, text: 'Als Nächstes: ' }),
          el('span', { text: `${AUSBLICK[0].titel} (${AUSBLICK[0].art})` }),
        ]),
      ]),
    );
  }

  // ------------------------------------------------------------ Die Wochen
  wurzel.append(
    el('div', { class: 'gl-abschnitt' }, [
      el('span', { class: 'etikett', text: 'Woche für Woche' }),
      el('h2', { text: 'Die Übersicht' }),
      el('p', { text: 'Was er gemacht hat, seine Zahlen, seine Aufgabe für dich – und eine realistische Version zum Nachmachen.' }),
    ]),
  );

  if (frei.length > 0) {
    wurzel.append(
      el('section', { class: 'gl-offen-karte' }, [
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          el('span', { class: 'gl-nr', style: { '--fc': 'var(--linie-stark)' }, text: bereichText(frei) }),
          el('span', { class: 'gl-chip offen', text: 'kommt noch' }),
        ]),
        el('p', {
          text: 'Neue Folge online? Füg den YouTube-Link und das Transkript ein. Die App schlägt dir dann Zahlen und das Thema vor.',
        }),
        el(
          'button',
          { class: 'knopf akzent', onclick: () => oeffneWochenDialog(app, null, frei[0]) },
          [icon('plus', 18), el('span', { text: `Woche ${frei[0]} hinzufügen` })],
        ),
      ]),
    );
  }

  for (const woche of [...wochen].reverse()) {
    wurzel.append(baueWoche(app, woche, woche.id === app.glowupOffen));
  }

  // ------------------------------------------------------------ Diagramm
  wurzel.append(
    el('div', { class: 'gl-abschnitt' }, [
      el('span', { class: 'etikett', text: 'Laufumfang' }),
      el('h2', { text: 'Kilometer pro Woche' }),
      el('p', { text: 'Nur Laufen, ohne Rad. Tipp auf eine Säule, um die Woche zu öffnen.' }),
    ]),
    el('section', { class: 'karte gl-diagramm' }, [
      baueDiagramm(app),
      el('div', {
        class: 'feld-hilfe',
        text: 'Zum Vergleich: Anfänger laufen am Anfang oft 10–20 km pro Woche.',
      }),
    ]),
  );

  // ------------------------------------------------------------- Ausblick
  wurzel.append(
    el('div', { class: 'gl-abschnitt' }, [
      el('span', { class: 'etikett', text: 'Ausblick' }),
      el('h2', { text: 'Was noch kommt' }),
    ]),
    el('section', { class: 'karte' }, [
      el(
        'ul',
        { class: 'gl-liste' },
        AUSBLICK.map((a) =>
          el('li', {}, [
            el('h3', { text: a.titel }),
            el('span', {
              class: `gl-chip${a.art === 'angekündigt' ? '' : ' offen'}`,
              dataset: a.art === 'angekündigt' ? { fokus: 'cardio' } : {},
              text: a.art,
            }),
            el('p', { text: a.text }),
          ]),
        ),
      ),
    ]),
  );

  // ---------------------------------------------------- Uebernehmen/lassen
  wurzel.append(
    el('div', { class: 'gl-abschnitt' }, [
      el('span', { class: 'etikett', text: 'Ehrlich sortiert' }),
      el('h2', { text: 'Übernehmen oder lassen?' }),
    ]),
    el('section', { class: 'karte' }, [
      el('div', { class: 'gl-ta-titel', text: 'Übernehmen' }),
      baueTaListe(UEBERNEHMEN, 'ja'),
      el('div', { class: 'gl-ta-titel', style: { marginTop: '14px' }, text: 'Lieber nicht kopieren' }),
      baueTaListe(NICHT_KOPIEREN, 'nein'),
    ]),
  );

  // --------------------------------------------------------- Wer ist das?
  wurzel.append(
    el('details', { class: 'karte gl-aufklapp', style: { marginTop: '24px' } }, [
      el('summary', {}, [
        el('span', { class: 'etikett', text: `Wer ist ${SERIE.kanal}?` }),
        icon('runter', 20),
      ]),
      el(
        'dl',
        { class: 'gl-fakten', style: { marginTop: '8px' } },
        FAKTEN.map(([name, wert]) =>
          el('div', {}, [el('dt', { class: 'etikett', text: name }), el('dd', { text: wert })]),
        ),
      ),
    ]),
  );

  // --------------------------------------------------------------- Quellen
  wurzel.append(
    el('div', { class: 'gl-quellen', style: { marginTop: '8px' } }, [
      el('span', { class: 'etikett', text: 'Quellen' }),
      ...QUELLEN.map(([name, link]) =>
        el('a', { href: link, target: '_blank', rel: 'noopener', text: name }),
      ),
      el('span', {
        text: 'Die Zahlen aus den Videos sind seine eigenen Angaben. Die Wochen 0–5 wurden am 26.09.2026 zusammengefasst.',
      }),
    ]),
  );

  return wurzel;
}

// ===========================================================================
// Bausteine
// ===========================================================================

/** "21.09.2026 · 51k Aufrufe · 19:24" */
function metaText(w) {
  const teile = [];
  if (w.datum) {
    const d = ausIso(w.datum);
    teile.push(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`);
  }
  if (w.aufrufe) teile.push(`${w.aufrufe} Aufrufe`);
  if (w.dauer) teile.push(w.dauer);
  if (w.eigene) teile.push('selbst eingetragen');
  return teile.join(' · ');
}

/** [6,7,8,...,13] -> "W6–13", [9] -> "W9" */
function bereichText(frei) {
  if (frei.length === 1) return `W${frei[0]}`;
  return `W${frei[0]}–${frei[frei.length - 1]}`;
}

/** Der Streifen ueber alle Wochen: Prolog plus 1 bis 13. */
function baueStreifen(app, wochen, neueste) {
  const nachNummer = new Map(wochen.map((w) => [w.nr, w]));
  const streifen = el('div', { class: 'gl-streifen' });

  for (let nr = 0; nr <= SERIE.wochenGesamt; nr += 1) {
    const w = nachNummer.get(nr);
    const beschriftung = nr === 0 ? 'P' : String(nr);

    if (w) {
      streifen.append(
        el(
          'button',
          {
            class: `gl-seg${w.id === neueste?.id ? ' neueste' : ''}`,
            dataset: { fokus: w.fokus },
            'aria-label': `${nr === 0 ? 'Prolog' : `Woche ${nr}`}: ${fokusName(w.fokus)} – öffnen`,
            onclick: () => zeigeWoche(app, w.id),
          },
          [el('b', {}), el('span', { text: beschriftung })],
        ),
      );
    } else {
      streifen.append(
        el(
          'button',
          {
            class: 'gl-seg offen',
            'aria-label': `Woche ${nr} ist noch offen – hinzufügen`,
            onclick: () => oeffneWochenDialog(app, null, nr),
          },
          [el('b', {}), el('span', { text: beschriftung })],
        ),
      );
    }
  }

  // Legende: nur die Themen, die wirklich vorkommen - plus "kommt noch".
  const benutzt = [...new Set(wochen.map((w) => w.fokus))];
  const legende = el('div', { class: 'gl-legende' }, [
    ...benutzt.map((f) => el('span', { class: 'gl-chip', dataset: { fokus: f }, text: fokusName(f) })),
    el('span', { class: 'gl-chip offen', text: 'kommt noch' }),
  ]);

  return el('div', {}, [streifen, legende]);
}

/** Klappt eine Woche auf und scrollt zu ihr. */
function zeigeWoche(app, id) {
  app.glowupOffen = id;
  app.rendere();
  requestAnimationFrame(() => {
    document.getElementById(`woche-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}

/** Eine Woche als aufklappbare Karte. */
function baueWoche(app, w, offen) {
  const karte = el('section', {
    class: `gl-woche${offen ? ' offen' : ''}`,
    id: `woche-${w.id}`,
    dataset: { fokus: w.fokus },
  });
  const inhalt = el('div', { class: 'gl-woche-inhalt', hidden: !offen });
  let gebaut = false;

  const kopf = el(
    'button',
    {
      class: 'gl-woche-kopf',
      'aria-expanded': offen ? 'true' : 'false',
      onclick: () => setzeOffen(!karte.classList.contains('offen')),
    },
    [
      el('span', { class: 'gl-nr', text: w.nr === 0 ? 'P' : `W${w.nr}` }),
      el('span', { class: 'gl-woche-info' }, [
        el('span', { class: 'gl-chip', text: fokusName(w.fokus) }),
        el('span', { class: 'gl-meta', text: metaText(w) }),
        w.kurz ? el('span', { class: 'gl-kurz', text: w.kurz }) : null,
      ]),
      el('span', { class: 'gl-auf' }, [icon('runter', 20)]),
    ],
  );

  function setzeOffen(auf) {
    karte.classList.toggle('offen', auf);
    kopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    if (auf && !gebaut) {
      inhalt.append(...baueWochenInhalt(app, w));
      gebaut = true;
    }
    inhalt.hidden = !auf;
    if (auf) app.glowupOffen = w.id;
    else if (app.glowupOffen === w.id) app.glowupOffen = null;
  }

  karte.append(kopf, inhalt);
  if (offen) setzeOffen(true);
  return karte;
}

/** Der aufgeklappte Teil einer Woche. */
function baueWochenInhalt(app, w) {
  const teile = [];

  if (w.gemacht.length > 0) {
    teile.push(
      el('div', { class: 'gl-teil' }, [
        el('span', { class: 'etikett', text: 'Was er gemacht hat' }),
        el('ul', {}, w.gemacht.map((t) => el('li', { text: t }))),
      ]),
    );
  }

  const zahlen = zahlenZeilen(w);
  if (zahlen.length > 0) {
    teile.push(
      el('div', { class: 'gl-teil' }, [
        el('span', { class: 'etikett', text: 'Zahlen' }),
        el(
          'dl',
          { class: 'gl-zahlen' },
          zahlen.map(([name, wert]) => el('div', {}, [el('dt', { text: name }), el('dd', { text: wert })])),
        ),
        w.hinweis ? el('span', { class: 'gl-notiz', text: w.hinweis }) : null,
      ]),
    );
  }

  if (w.aufgabe.length > 0) {
    teile.push(
      el('div', { class: 'gl-teil' }, [
        el('span', { class: 'etikett', text: 'Seine Aufgabe für dich' }),
        el('ul', {}, w.aufgabe.map((t) => el('li', { text: t }))),
      ]),
    );
  }

  if (w.deineVersion) {
    teile.push(
      el('div', { class: 'gl-du' }, [
        el('span', { class: 'etikett', text: 'Deine realistische Version' }),
        el('p', { text: w.deineVersion }),
      ]),
    );
  }

  if (w.warnung) {
    teile.push(el('div', { class: 'gl-warn' }, [el('b', { text: 'Achtung: ' }), w.warnung]));
  }

  if (w.eigene && w.transkript?.trim()) {
    teile.push(
      el('details', { class: 'gl-transkript' }, [
        el('summary', { text: `Transkript (${w.transkript.trim().split(/\s+/).length} Wörter)` }),
        el('pre', { text: w.transkript }),
      ]),
    );
  }

  const knoepfe = [];
  if (w.link) {
    knoepfe.push(
      el(
        'a',
        { class: 'knopf rand klein', href: w.link, target: '_blank', rel: 'noopener' },
        [icon('extern', 16), el('span', { text: 'Video ansehen' })],
      ),
    );
  }
  if (w.eigene) {
    knoepfe.push(
      el(
        'button',
        { class: 'knopf rand klein', onclick: () => oeffneWochenDialog(app, w) },
        [icon('stift', 16), el('span', { text: 'Bearbeiten' })],
      ),
    );
  }
  if (knoepfe.length > 0) {
    teile.push(el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } }, knoepfe));
  }

  return teile;
}

/** Die Zahlen einer Woche als [Name, Wert]-Paare. */
function zahlenZeilen(w) {
  const zeilen = [];
  const zahl = (n) => String(n).replace('.', ',');
  if (w.laufenKm !== null && w.laufenKm !== undefined) zeilen.push(['Laufen', `${zahl(w.laufenKm)} km`]);
  if (w.radH !== null && w.radH !== undefined) zeilen.push(['Rad', `${zahl(w.radH)} h`]);
  if (w.cardioH !== null && w.cardioH !== undefined) {
    zeilen.push(['Cardio ges.', `${w.cardioGeschaetzt ? '≈' : ''}${zahl(w.cardioH)} h`]);
  }
  if (w.gewichtKg !== null && w.gewichtKg !== undefined) {
    const vorzeichen = w.gewichtKg > 0 ? '+' : w.gewichtKg < 0 ? '−' : '±';
    zeilen.push([w.nr === 0 ? 'Vorher zugenommen' : 'Gewicht', `${vorzeichen}${zahl(Math.abs(w.gewichtKg))} kg`]);
  }
  for (const e of w.extra ?? []) zeilen.push([e.name, e.wert]);
  return zeilen;
}

/** Eine Liste mit Haken oder Kreuzen. */
function baueTaListe(eintraege, art) {
  return el(
    'ul',
    { class: `gl-ta ${art}` },
    eintraege.map(([fett, rest]) =>
      el('li', {}, [
        el('span', { class: 'gl-marke', 'aria-hidden': 'true' }, [icon(art === 'ja' ? 'haken' : 'kreuz', 14)]),
        el('span', {}, [el('strong', { text: fett }), ` ${rest}`]),
      ]),
    ),
  );
}

// ===========================================================================
// Diagramm: Laufkilometer pro Woche
// ===========================================================================

function baueDiagramm(app) {
  const daten = kilometerProWoche(app.zustand);
  const hoechster = Math.max(0, ...daten.map((d) => d.km ?? 0));
  const max = Math.max(100, Math.ceil(hoechster / 25) * 25);
  const neuesteNr = stand(app.zustand);

  const B = 340;
  const H = 196;
  const links = 30;
  const rechts = 336;
  const oben = 18;
  const unten = 166;
  const spalte = (rechts - links) / daten.length;
  const breite = Math.min(16, spalte * 0.62);
  const y = (wert) => unten - (wert / max) * (unten - oben);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${B} ${H}`,
    role: 'img',
    'aria-label': `Laufkilometer pro Woche: ${daten
      .filter((d) => d.km !== null)
      .map((d) => `Woche ${d.nr} ${d.km} km`)
      .join(', ')}`,
  });

  const text = (inhalt, attribute) => {
    const t = svgEl('text', attribute);
    t.textContent = inhalt;
    return t;
  };

  // Gitter und Skala
  for (let wert = 0; wert <= max; wert += 25) {
    if (wert > 0) svg.append(svgEl('line', { class: 'gitter', x1: links, x2: rechts, y1: y(wert), y2: y(wert) }));
    svg.append(text(String(wert), { x: links - 6, y: y(wert) + 3.5, 'text-anchor': 'end' }));
  }
  svg.append(svgEl('line', { class: 'grundlinie', x1: links, x2: rechts, y1: unten, y2: unten }));

  daten.forEach((d, i) => {
    const mitte = links + spalte * (i + 0.5);
    const x = mitte - breite / 2;

    if (d.km !== null) {
      // Bewusst eckige Saeulen - passend zum Rest der App.
      svg.append(svgEl('rect', { class: 'saeule', x, y: y(d.km), width: breite, height: Math.max(1, unten - y(d.km)) }));
      svg.append(text(String(d.km), { class: 'wert', x: mitte, y: y(d.km) - 5, 'text-anchor': 'middle' }));
      const treffer = svgEl('rect', {
        class: 'treffer',
        x: links + spalte * i,
        y: oben,
        width: spalte,
        height: unten - oben,
        tabindex: '0',
        role: 'button',
        'aria-label': `Woche ${d.nr}: ${d.km} km – öffnen`,
      });
      const oeffnen = () => zeigeWoche(app, d.woche.id);
      treffer.addEventListener('click', oeffnen);
      treffer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oeffnen(); }
      });
      svg.append(treffer);
    } else {
      svg.append(svgEl('rect', { class: 'geist', x, y: unten - 14, width: breite, height: 14 }));
    }

    svg.append(
      text(`W${d.nr}`, {
        class: d.nr === neuesteNr ? 'neueste' : null,
        x: mitte,
        y: unten + 16,
        'text-anchor': 'middle',
      }),
    );
  });

  svg.append(text('km', { x: links - 6, y: H - 4, 'text-anchor': 'end' }));
  return svg;
}

// ===========================================================================
// Woche hinzufuegen / bearbeiten
// ===========================================================================

/**
 * @param {object} app
 * @param {object|null} woche   eigene Woche zum Bearbeiten, null = neu
 * @param {number} [vorgabeNr]  vorausgewaehlte Wochennummer bei neuen Wochen
 */
function oeffneWochenDialog(app, woche, vorgabeNr) {
  const istNeu = !woche;
  const frei = freieWochen(app.zustand, woche?.id);

  if (istNeu && frei.length === 0) {
    app.toast('Alle 13 Wochen sind schon eingetragen.');
    return;
  }

  const vorlage = woche
    ? neueWoche(woche)
    : neueWoche({ nr: frei.includes(vorgabeNr) ? vorgabeNr : frei[0], datum: app.heute(), fokus: 'sonst' });

  app.dialog(istNeu ? `Woche ${vorlage.nr} hinzufügen` : `Woche ${vorlage.nr} bearbeiten`, (schliessen) => {
    const form = el('div', {});
    const fehlerZeile = el('div', { class: 'fehler', hidden: true });

    // Merkt sich, welche Felder man selbst angefasst hat - die ueberschreiben
    // die Vorschlaege aus Link und Transkript nie.
    const angefasst = new Set();
    const merke = (name, feld) => {
      feld.addEventListener('input', () => angefasst.add(name));
      return feld;
    };
    const setzeVorschlag = (name, feld, wert) => {
      if (wert === null || wert === undefined || wert === '') return false;
      if (angefasst.has(name) || String(feld.value).trim() !== '') return false;
      feld.value = String(wert);
      return true;
    };

    // ----------------------------------------------------------- Felder
    const nrFeld = merke('nr', el('select', { 'aria-label': 'Welche Woche?' }));
    for (const nr of frei) {
      nrFeld.append(el('option', { value: String(nr), text: `Woche ${nr}`, selected: nr === vorlage.nr }));
    }

    const linkFeld = merke('link', el('input', {
      type: 'url',
      value: vorlage.link,
      placeholder: 'https://youtu.be/…',
      inputmode: 'url',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
    }));
    const videoStelle = el('div', {});

    const transkriptFeld = el('textarea', {
      class: 'gl-transkript-feld',
      placeholder: 'Transkript hier einfügen. Auf YouTube unter dem Video: „…mehr“ → „Transkript anzeigen“ → alles markieren und kopieren.',
    });
    transkriptFeld.value = vorlage.transkript;
    const erkanntStelle = el('div', { class: 'gl-erkannt', hidden: true });

    const titelFeld = merke('titel', el('input', { type: 'text', value: vorlage.titel, placeholder: 'z. B. I TRY TO GLOWUP IN 90 DAYS | WEEK 6' }));
    const datumFeld = merke('datum', el('input', { type: 'date', value: vorlage.datum }));

    const fokusFeld = merke('fokus', el('select', {}));
    for (const f of FOKUS_WAEHLBAR) {
      fokusFeld.append(el('option', { value: f, text: FOKUS[f].name, selected: f === vorlage.fokus }));
    }

    const kurzFeld = merke('kurz', el('input', { type: 'text', value: vorlage.kurz, placeholder: 'z. B. Sydney-Marathon gelaufen', maxlength: '80' }));
    const gemachtFeld = merke('gemacht', el('textarea', { placeholder: 'Ein Punkt pro Zeile' }));
    gemachtFeld.value = vorlage.gemacht.join('\n');

    const zahlFeld = (name, wert, platzhalter) =>
      merke(name, el('input', {
        type: 'text',
        inputmode: 'decimal',
        value: wert === null ? '' : String(wert).replace('.', ','),
        placeholder: platzhalter,
      }));
    const kmFeld = zahlFeld('km', vorlage.laufenKm, '–');
    const radFeld = zahlFeld('rad', vorlage.radH, '–');
    const cardioFeld = zahlFeld('cardio', vorlage.cardioH, '–');
    const gewichtFeld = zahlFeld('gewicht', vorlage.gewichtKg, 'z. B. -1,5');

    const aufgabeFeld = merke('aufgabe', el('textarea', { placeholder: 'Was er den Zuschauern aufgibt – ein Punkt pro Zeile' }));
    aufgabeFeld.value = vorlage.aufgabe.join('\n');

    const duFeld = merke('du', el('textarea', { placeholder: 'Wie du es realistisch umsetzt' }));
    duFeld.value = vorlage.deineVersion || (istNeu ? FOKUS_TIPPS[vorlage.fokus] ?? '' : '');

    // Wechselt man das Thema, passt sich der Vorschlag fuer "Deine Version"
    // an - aber nur, solange man dort nichts Eigenes geschrieben hat.
    let letzterTipp = duFeld.value;
    const passeTippAn = () => {
      if (duFeld.value.trim() !== '' && duFeld.value !== letzterTipp) return;
      duFeld.value = FOKUS_TIPPS[fokusFeld.value] ?? '';
      letzterTipp = duFeld.value;
    };
    fokusFeld.addEventListener('change', passeTippAn);

    // ------------------------------------------------- Link auswerten
    let geladenFuer = null;

    const pruefeLink = async () => {
      leere(videoStelle);
      const kennung = youtubeId(linkFeld.value);
      if (!linkFeld.value.trim()) return;
      if (!kennung) {
        videoStelle.append(el('div', { class: 'feld-hilfe', text: 'Das sieht nicht nach einem YouTube-Link aus.' }));
        return;
      }

      const status = el('span', { text: 'Video erkannt – lade Titel …' });
      videoStelle.append(
        el('div', { class: 'gl-video' }, [
          el('img', { src: `https://i.ytimg.com/vi/${kennung}/mqdefault.jpg`, alt: '', loading: 'lazy' }),
          status,
        ]),
      );

      if (geladenFuer === kennung) { status.textContent = 'Video erkannt'; return; }
      geladenFuer = kennung;

      try {
        const antwort = await fetch(
          `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeLink(kennung))}`,
        );
        if (!antwort.ok) throw new Error(String(antwort.status));
        const info = await antwort.json();
        status.textContent = info.title ? `„${info.title}“` : 'Video erkannt';
        uebernimmTitel(info.title);
      } catch {
        status.textContent = 'Video erkannt. Den Titel konnte die App nicht laden – trag ihn bei Bedarf selbst ein.';
      }
    };

    /** Aus dem Videotitel: Titel, Wochennummer und Thema ("*GROOMING*"). */
    const uebernimmTitel = (titel) => {
      if (!titel) return;
      setzeVorschlag('titel', titelFeld, titel);
      const nr = Number(titel.match(/WEEK\s*(\d{1,2})/i)?.[1]);
      if (istNeu && !angefasst.has('nr') && frei.includes(nr)) nrFeld.value = String(nr);
      const fokus = fokusAusTitel(titel);
      if (fokus && !angefasst.has('fokus')) {
        fokusFeld.value = fokus;
        passeTippAn();
      }
    };

    linkFeld.addEventListener('change', pruefeLink);
    linkFeld.addEventListener('paste', () => setTimeout(pruefeLink, 0));

    // -------------------------------------------- Transkript auswerten
    const werteAus = (ausdruecklich) => {
      const text = transkriptFeld.value;
      if (text.trim().length < 40) {
        if (ausdruecklich) app.toast('Füg zuerst ein Transkript ein.');
        return;
      }
      const e = werteTranskriptAus(text);
      const gefunden = [];

      if (e.woche && istNeu && !angefasst.has('nr') && frei.includes(e.woche)) {
        nrFeld.value = String(e.woche);
      }
      if (e.woche) gefunden.push(`Woche ${e.woche}`);

      if (e.fokus && !angefasst.has('fokus')) {
        fokusFeld.value = e.fokus;
        passeTippAn();
      }
      if (e.fokus) gefunden.push(`Thema: ${FOKUS[e.fokus].kurz}`);

      const komma = (n) => String(n).replace('.', ',');
      if (e.laufenKm !== null) { setzeVorschlag('km', kmFeld, komma(e.laufenKm)); gefunden.push(`${komma(e.laufenKm)} km`); }
      if (e.radH !== null) { setzeVorschlag('rad', radFeld, komma(e.radH)); gefunden.push(`${komma(e.radH)} h Rad`); }
      if (e.cardioH !== null) { setzeVorschlag('cardio', cardioFeld, komma(e.cardioH)); gefunden.push(`${komma(e.cardioH)} h Cardio`); }
      if (e.gewichtKg !== null) { setzeVorschlag('gewicht', gewichtFeld, komma(e.gewichtKg)); gefunden.push(`${komma(e.gewichtKg)} kg`); }
      if (e.kapitel.length > 0) {
        setzeVorschlag('gemacht', gemachtFeld, e.kapitel.join('\n'));
        gefunden.push(`${e.kapitel.length} Kapitel`);
      }

      leere(erkanntStelle);
      erkanntStelle.append(
        el('div', {}, [
          el('b', { style: { color: 'var(--text)' }, text: gefunden.length ? 'Erkannt:' : 'Nichts Eindeutiges gefunden.' }),
          ` ${e.woerter} Wörter ausgewertet.`,
        ]),
        gefunden.length ? el('div', { class: 'gl-erkannt-werte' }, gefunden.map((g) => el('span', { text: g }))) : null,
        el('div', {
          text: 'Leere Felder sind jetzt vorausgefüllt. Was du selbst schon eingetragen hast, bleibt stehen. Prüf die Zahlen kurz – das ist nur eine Schätzung.',
        }),
      );
      erkanntStelle.hidden = false;
    };

    transkriptFeld.addEventListener('paste', () => setTimeout(() => werteAus(false), 0));

    // ------------------------------------------------------ Aufbau
    const feld = (name, eingabe, hilfe) =>
      el('div', { class: 'feld' }, [
        el('label', { text: name }),
        eingabe,
        hilfe ? el('div', { class: 'feld-hilfe', text: hilfe }) : null,
      ]);

    form.append(
      fehlerZeile,
      el('div', { class: 'hinweis ruhig' }, [
        icon('info', 17),
        el('div', {
          text: 'Füg den YouTube-Link und das Transkript ein. Die App schlägt dann Zahlen und das Thema vor. Du kannst danach noch alles ändern.',
        }),
      ]),
      feld('Welche Woche?', nrFeld),
      el('div', { class: 'feld' }, [el('label', { text: 'YouTube-Link' }), linkFeld, videoStelle]),
      feld('Transkript', transkriptFeld),
      el(
        'button',
        { class: 'knopf rand', style: { marginBottom: '14px' }, onclick: () => werteAus(true) },
        [icon('zauberstab', 18), el('span', { text: 'Vorschläge aus dem Transkript holen' })],
      ),
      erkanntStelle,
      feld('Videotitel', titelFeld),
      el('div', { class: 'feld-paar' }, [feld('Datum', datumFeld), feld('Thema', fokusFeld)]),
      feld('Kurz: Was macht er gerade?', kurzFeld),
      feld('Was er gemacht hat', gemachtFeld),
      el('div', { class: 'feld-paar' }, [feld('Laufen (km)', kmFeld), feld('Rad (h)', radFeld)]),
      el('div', { class: 'feld-paar' }, [feld('Cardio ges. (h)', cardioFeld), feld('Gewicht (kg)', gewichtFeld)]),
      feld('Seine Aufgabe für dich', aufgabeFeld),
      feld('Deine realistische Version', duFeld, 'Wird je nach Thema vorgeschlagen. Schreib gern deine eigene Version.'),
    );

    // Beim Bearbeiten gleich das Video anzeigen.
    if (vorlage.link) pruefeLink();

    // --------------------------------------------------- Speichern
    const alsZahl = (feld) => {
      const t = feld.value.trim().replace(',', '.').replace('−', '-');
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : NaN;
    };

    const speichern = () => {
      const zahlen = { laufenKm: alsZahl(kmFeld), radH: alsZahl(radFeld), cardioH: alsZahl(cardioFeld), gewichtKg: alsZahl(gewichtFeld) };
      if (Object.values(zahlen).some((n) => Number.isNaN(n))) {
        zeigeFehler(fehlerZeile, 'Bei den Zahlen steht etwas, das keine Zahl ist.');
        return;
      }
      const kennung = youtubeId(linkFeld.value);
      const entwurf = neueWoche({
        ...vorlage,
        ...zahlen,
        nr: Number(nrFeld.value),
        link: kennung ? youtubeLink(kennung) : linkFeld.value.trim(),
        titel: titelFeld.value,
        datum: datumFeld.value,
        fokus: fokusFeld.value,
        kurz: kurzFeld.value,
        gemacht: gemachtFeld.value,
        aufgabe: aufgabeFeld.value,
        deineVersion: duFeld.value,
        transkript: transkriptFeld.value,
      });

      const fehler = pruefeWoche(app.zustand, entwurf);
      if (fehler) { zeigeFehler(fehlerZeile, fehler); return; }

      app.glowupOffen = entwurf.id;
      app.aktualisiere(speichereWoche(app.zustand, entwurf));
      schliessen();
      app.toast(istNeu ? `Woche ${entwurf.nr} hinzugefügt` : `Woche ${entwurf.nr} gespeichert`);
    };

    form.append(
      el('button', { class: 'knopf akzent gross', style: { marginTop: '8px' }, text: 'Speichern', onclick: speichern }),
    );

    if (!istNeu) {
      // Loeschen braucht zwei Tipps - einmal zum Scharfmachen, einmal zum Loeschen.
      let scharf = false;
      const loeschKnopf = el(
        'button',
        {
          class: 'knopf gefahr',
          style: { marginTop: '8px' },
          onclick: () => {
            if (!scharf) {
              scharf = true;
              loeschKnopf.lastChild.textContent = 'Nochmal tippen zum Löschen';
              return;
            }
            app.aktualisiere(loescheWoche(app.zustand, vorlage.id));
            schliessen();
            app.toast(`Woche ${vorlage.nr} gelöscht`);
          },
        },
        [icon('muell', 18), el('span', { text: 'Diese Woche löschen' })],
      );
      form.append(loeschKnopf);
    }

    return form;
  });
}

function zeigeFehler(knoten, text) {
  leere(knoten);
  knoten.append(icon('warnung', 17), el('div', { text }));
  knoten.hidden = false;
  knoten.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
