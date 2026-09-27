// Der Statistik-Bildschirm: Streaks, Quoten, Heatmap und Tagesziele.

import { el } from './dom.js';
import { icon } from './icons.js';

import { berechneTagesStreak, berechneHabitStreak } from '../logik/streak.js';
import {
  quoteZeitraum,
  quoteNachKategorie,
  quoteNachWochentag,
  heatmap,
  zieleStatistik,
  hatDaten,
} from '../logik/statistik.js';
import { formatiereDatumKurz } from '../logik/zeit.js';
import { HABITS, WOCHENTAGE, WOCHENTAG_KURZ } from '../daten/standardplan.js';
import { KATEGORIEN, KATEGORIE_SCHLUESSEL } from '../daten/kategorien.js';
import { RUECKBLICK_TAGE, HEATMAP_WOCHEN } from '../konfiguration.js';

export function rendereStatistik(app) {
  const heuteIso = app.heute();
  const holeTag = (iso) => app.tagDaten(iso);
  const wurzel = document.createDocumentFragment();

  wurzel.append(
    el('header', { class: 'kopf' }, [
      el('div', {}, [
        el('h1', { class: 'kopf-titel', text: 'Statistik' }),
        el('div', { class: 'kopf-unter', text: 'Was du schon geschafft hast' }),
      ]),
      el(
        'button',
        { class: 'rund', 'aria-label': 'Einstellungen', onclick: () => app.oeffneEinstellungen() },
        [icon('einstellungen', 21)],
      ),
    ]),
  );

  // Am allerersten Tag gibt es noch nichts zu zeigen.
  if (!hatDaten(app.zustand)) {
    wurzel.append(
      el('section', { class: 'karte' }, [
        el('div', { class: 'leer' }, [
          el('div', { class: 'leer-zeichen' }, [icon('statistik', 22)]),
          el('div', { class: 'leer-titel', text: 'Noch keine Daten' }),
          el('div', { text: 'Hak deinen ersten Block ab – danach wird es hier interessant.' }),
        ]),
        el('button', {
          class: 'knopf akzent',
          text: 'Zu Heute',
          onclick: () => app.geheZu('heute'),
        }),
      ]),
    );
    return wurzel;
  }

  // ----------------------------------------------------------- Tages-Streak
  const schwelle = app.zustand.einstellungen.streakSchwelle;
  const streak = berechneTagesStreak(holeTag, heuteIso, schwelle, RUECKBLICK_TAGE);
  const ziele = zieleStatistik((iso) => app.ziele(iso), heuteIso, RUECKBLICK_TAGE);

  wurzel.append(
    el('section', { class: 'karte' }, [
      el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Tages-Streak' })]),
      el('div', { class: 'kacheln' }, [
        el('div', { class: 'kachel' }, [
          el('div', { class: 'kachel-wert akzent' }, [
            icon('flamme', 21),
            el('span', { text: String(streak.aktuell) }),
          ]),
          el('div', { class: 'kachel-name', text: 'Tage in Folge' }),
        ]),
        el('div', { class: 'kachel' }, [
          el('div', { class: 'kachel-wert' }, [el('span', { text: String(streak.laengste) })]),
          el('div', { class: 'kachel-name', text: 'Beste Serie' }),
        ]),
      ]),
      el('div', { class: 'hinweis ruhig', style: { marginTop: '12px', marginBottom: '0' } }, [
        icon('info', 16),
        el('div', {
          text: `Ein Tag zählt ab ${schwelle} % – gerechnet über Blöcke, Aufgaben und Ziele zusammen. Die Schwelle änderst du in den Einstellungen.`,
        }),
      ]),
    ]),
  );

  // ---------------------------------------------------------- Gewohnheiten
  const habitKarte = el('section', { class: 'karte' }, [
    el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Gewohnheiten' })]),
  ]);

  for (const habit of HABITS) {
    const h = berechneHabitStreak(holeTag, heuteIso, habit.titel, RUECKBLICK_TAGE);
    habitKarte.append(
      el('div', { class: 'habit' }, [
        el('span', { class: 'habit-name', text: habit.name }),
        el('span', { class: 'habit-wert' }, [
          el('b', { class: `habit-zahl${h.aktuell === 0 ? ' aus' : ''}`, text: String(h.aktuell) }),
          el('span', { text: h.aktuell === 1 ? 'Tag' : 'Tage' }),
          h.laengste > h.aktuell ? el('span', { text: `· best. ${h.laengste}` }) : null,
        ]),
      ]),
    );
  }
  wurzel.append(habitKarte);

  // -------------------------------------------------------- Erledigt-Quote
  const zeitraum = app.statistikZeitraum ?? 7;
  const quoteKarte = el('section', { class: 'karte' });

  quoteKarte.append(
    el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Erledigt-Quote' })]),
    el('div', { class: 'segmente' }, [
      baueZeitraumKnopf(app, 7, zeitraum),
      baueZeitraumKnopf(app, 30, zeitraum),
    ]),
  );

  const gesamt = quoteZeitraum(holeTag, heuteIso, zeitraum);
  quoteKarte.append(
    el('div', { class: 'kacheln', style: { marginBottom: '18px' } }, [
      el('div', { class: 'kachel' }, [
        el('div', { class: 'kachel-wert akzent', text: `${gesamt.prozent} %` }),
        el('div', { class: 'kachel-name', text: `Letzte ${zeitraum} Tage` }),
      ]),
      el('div', { class: 'kachel' }, [
        el('div', { class: 'kachel-wert', text: String(gesamt.fertig) }),
        el('div', { class: 'kachel-name', text: `von ${gesamt.gesamt} abgehakt` }),
      ]),
    ]),
  );

  // nach Kategorie
  const nachKategorie = quoteNachKategorie(holeTag, heuteIso, zeitraum);
  quoteKarte.append(
    el('div', { class: 'karte-titel', style: { marginBottom: '10px' }, text: 'Nach Kategorie' }),
  );
  let hatKategorie = false;
  for (const schluessel of KATEGORIE_SCHLUESSEL) {
    const q = nachKategorie[schluessel];
    if (!q || q.gesamt === 0) continue;
    hatKategorie = true;
    quoteKarte.append(baueBalken(KATEGORIEN[schluessel].name, q.prozent, `${q.fertig}/${q.gesamt}`));
  }
  if (!hatKategorie) {
    quoteKarte.append(el('div', { class: 'kachel-name', text: 'Noch keine Daten.' }));
  }

  // nach Wochentag
  const nachTag = quoteNachWochentag(holeTag, heuteIso, zeitraum);
  quoteKarte.append(
    el('div', {
      class: 'karte-titel',
      style: { marginTop: '18px', marginBottom: '10px' },
      text: 'Nach Wochentag',
    }),
  );
  for (const tag of WOCHENTAGE) {
    const q = nachTag[tag];
    quoteKarte.append(
      baueBalken(WOCHENTAG_KURZ[tag], q.prozent, q.gesamt === 0 ? '–' : `${q.fertig}/${q.gesamt}`),
    );
  }

  wurzel.append(quoteKarte);

  // ---------------------------------------------------------------- Heatmap
  const wochen = heatmap(holeTag, heuteIso, HEATMAP_WOCHEN);
  const gitter = el('div', { class: 'heatmap' });

  for (const woche of wochen) {
    for (const tag of woche) {
      gitter.append(
        el('div', {
          class: 'heat',
          dataset: { stufe: String(stufeVon(tag)), zukunft: tag.zukunft ? 'ja' : 'nein' },
          title: `${formatiereDatumKurz(tag.iso)} – ${
            tag.gesamt === 0 ? 'nichts geplant' : `${tag.prozent} %`
          }`,
        }),
      );
    }
  }

  wurzel.append(
    el('section', { class: 'karte' }, [
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: `Die letzten ${HEATMAP_WOCHEN} Wochen` }),
      ]),
      el('div', { class: 'heat-huelle' }, [gitter]),
      el('div', { class: 'legende' }, [
        el('span', { text: 'wenig' }),
        ...[0, 1, 2, 3, 4].map((s) => el('span', { class: 'heat', dataset: { stufe: String(s) } })),
        el('span', { text: 'viel' }),
      ]),
    ]),
  );

  // ------------------------------------------------------------- Tagesziele
  wurzel.append(
    el('section', { class: 'karte' }, [
      el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Tagesziele' })]),
      el('div', { class: 'kacheln' }, [
        el('div', { class: 'kachel' }, [
          el('div', { class: 'kachel-wert akzent', text: String(ziele.erledigt) }),
          el('div', { class: 'kachel-name', text: `erreicht (von ${ziele.gesetzt})` }),
        ]),
        el('div', { class: 'kachel' }, [
          el('div', { class: 'kachel-wert', text: String(ziele.tageKomplett) }),
          el('div', { class: 'kachel-name', text: 'Tage mit allen 3' }),
        ]),
      ]),
    ]),
  );

  return wurzel;
}

// ---------------------------------------------------------------------------

function baueZeitraumKnopf(app, tage, aktiv) {
  return el('button', {
    text: `${tage} Tage`,
    'aria-pressed': aktiv === tage ? 'true' : 'false',
    onclick: () => { app.statistikZeitraum = tage; app.rendere(); },
  });
}

function baueBalken(name, prozent, wert) {
  return el('div', { class: 'balken' }, [
    el('span', { class: 'balken-name', text: name }),
    el('span', { class: 'balken-spur' }, [el('i', { style: { width: `${prozent}%` } })]),
    el('span', { class: 'balken-wert', text: wert }),
  ]);
}

/** Farbstufe 0-4 fuer die Heatmap. */
function stufeVon(tag) {
  if (tag.zukunft || tag.gesamt === 0 || tag.fertig === 0) return 0;
  if (tag.prozent >= 100) return 4;
  if (tag.prozent >= 70) return 3;
  if (tag.prozent >= 40) return 2;
  return 1;
}
