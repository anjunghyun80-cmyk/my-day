// Der Wochen-Bildschirm: Montag bis Sonntag.
//
// Auf 390 px Breite waeren sieben Spalten nebeneinander unlesbar. Deshalb
// liegen die Tage in einem horizontalen Streifen mit Einrast-Punkten
// ("scroll snap") - du wischst also von Tag zu Tag.

import { el, wenigerBewegung } from './dom.js';
import { icon } from './icons.js';

import {
  zuText,
  blockStart,
  blockEnde,
  montagDerWoche,
  tagVerschieben,
  formatiereDatumKurz,
  minutenImLogischenTag,
} from '../logik/zeit.js';
import { tagesBilanz } from '../logik/tagesabschluss.js';
import { WOCHENTAG_NAMEN, WOCHENTAGE } from '../daten/standardplan.js';
import { KATEGORIEN } from '../daten/kategorien.js';

export function rendereWoche(app) {
  const heuteIso = app.heute();
  const montag = tagVerschieben(montagDerWoche(heuteIso), app.wochenVersatz * 7);
  const wurzel = document.createDocumentFragment();

  wurzel.append(
    el('header', { class: 'kopf' }, [
      el('div', {}, [
        el('h1', { class: 'kopf-titel', text: wochenName(app.wochenVersatz) }),
        el('div', {
          class: 'kopf-unter',
          text: `${formatiereDatumKurz(montag)} – ${formatiereDatumKurz(tagVerschieben(montag, 6))}`,
        }),
      ]),
      el(
        'button',
        { class: 'rund', 'aria-label': 'Einstellungen', onclick: () => app.oeffneEinstellungen() },
        [icon('einstellungen', 21)],
      ),
    ]),
  );

  // Woche wechseln
  wurzel.append(
    el('div', { class: 'tagleiste' }, [
      el(
        'button',
        {
          class: 'pfeil',
          'aria-label': 'Eine Woche zurück',
          disabled: app.wochenVersatz <= -12,
          onclick: () => { app.wochenVersatz -= 1; app.rendere(); },
        },
        [icon('links', 19)],
      ),
      el('div', { class: 'tagleiste-mitte' }, [
        el('span', { text: 'Wische zwischen den Tagen' }),
        el('small', { text: 'Tippe auf einen Tag, um ihn zu öffnen' }),
      ]),
      el(
        'button',
        {
          class: 'pfeil',
          'aria-label': 'Eine Woche vor',
          disabled: app.wochenVersatz >= 4,
          onclick: () => { app.wochenVersatz += 1; app.rendere(); },
        },
        [icon('rechts', 19)],
      ),
    ]),
  );

  const streifen = el('div', { class: 'woche-streifen' });
  const punkte = el('div', { class: 'punkte' });
  let heuteSpalte = null;

  WOCHENTAGE.forEach((tag, index) => {
    const iso = tagVerschieben(montag, index);
    const istHeute = iso === heuteIso;
    const bloecke = app.bloecke(iso);
    const erledigt = app.zustand.erledigt[iso] ?? {};
    const bilanz = tagesBilanz(app.tagDaten(iso));
    const vergangen = iso <= heuteIso;

    const spalte = el('section', { class: `woche-spalte${istHeute ? ' ist-heute' : ''}` });

    spalte.append(
      el(
        'button',
        {
          class: 'woche-kopf',
          onclick: () => app.zeigeTag(iso),
          'aria-label': `${WOCHENTAG_NAMEN[tag]}, ${formatiereDatumKurz(iso)} öffnen`,
        },
        [
          el('span', {}, [
            el('div', { class: 'woche-tag', text: WOCHENTAG_NAMEN[tag] }),
            el('div', { class: 'woche-datum', text: formatiereDatumKurz(iso) }),
          ]),
          vergangen && bilanz.gesamt > 0
            ? el('span', {
                class: `woche-quote${bilanz.fertig === 0 ? ' leer' : ''}`,
                text: `${bilanz.prozent} %`,
              })
            : null,
        ],
      ),
    );

    // Ein feiner Balken zeigt den Fortschritt auf einen Blick.
    if (vergangen && bilanz.gesamt > 0) {
      spalte.append(
        el('div', { class: 'woche-balken' }, [el('i', { style: { width: `${bilanz.prozent}%` } })]),
      );
    }

    const jetztMin = minutenImLogischenTag(app.jetzt());
    const liste = el('div', { class: 'woche-liste' });

    for (const block of bloecke) {
      const laeuft = istHeute && blockStart(block) <= jetztMin && jetztMin < blockEnde(block);
      liste.append(
        el(
          'div',
          {
            class: `woche-block${laeuft ? ' laeuft' : ''}`,
            dataset: {
              kat: block.kategorie,
              gestreift: KATEGORIEN[block.kategorie]?.gestreift ? 'ja' : 'nein',
            },
          },
          [
            el('span', { class: 'wz', text: zuText(blockStart(block)) }),
            el('span', { class: 'wt', text: block.titel }),
            block.abhakbar && erledigt[block.id]
              ? el('span', { class: 'wh' }, [icon('haken', 13)])
              : null,
          ],
        ),
      );
    }

    spalte.append(liste);
    if (istHeute) heuteSpalte = spalte;

    streifen.append(spalte);
    punkte.append(el('span', { class: `punkt${istHeute ? ' aktiv' : ''}` }));
  });

  wurzel.append(streifen, punkte);

  // Beim Oeffnen gleich beim heutigen Tag stehen.
  if (heuteSpalte) {
    requestAnimationFrame(() => {
      streifen.scrollTo({
        left: heuteSpalte.offsetLeft - streifen.offsetLeft - 8,
        behavior: wenigerBewegung() ? 'auto' : 'smooth',
      });
    });
  }

  // Die Punkte zeigen, wo man gerade ist.
  streifen.addEventListener('scroll', () => {
    const mitte = streifen.scrollLeft + streifen.clientWidth / 2;
    let naechste = 0;
    let bester = Infinity;
    [...streifen.children].forEach((spalte, i) => {
      const abstand = Math.abs(
        spalte.offsetLeft + spalte.offsetWidth / 2 - streifen.offsetLeft - mitte,
      );
      if (abstand < bester) { bester = abstand; naechste = i; }
    });
    [...punkte.children].forEach((p, i) => p.classList.toggle('aktiv', i === naechste));
  });

  return wurzel;
}

function wochenName(versatz) {
  if (versatz === 0) return 'Diese Woche';
  if (versatz === -1) return 'Letzte Woche';
  if (versatz === 1) return 'Nächste Woche';
  if (versatz < 0) return `Vor ${-versatz} Wochen`;
  return `In ${versatz} Wochen`;
}
