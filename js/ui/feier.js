// Die Feier, wenn ein Tag komplett abgehakt ist.
//
// Zwei Teile: herunterfallende Schnipsel und eine Karte mit einem Satz.
// Wer im System "Bewegung reduzieren" eingeschaltet hat, bekommt nur die
// Karte - das Konfetti blendet das CSS dann aus.

import { el, wenigerBewegung } from './dom.js';
import { icon } from './icons.js';
import { spruchFuer } from '../logik/tagesabschluss.js';

/** Farben der Schnipsel: die gewaehlte Akzentfarbe plus Weiss und Grautoene. */
const SCHNIPSELFARBEN = [
  'var(--akzent)',
  'var(--akzent-text)',
  'var(--heat-3)',
  '#FFFFFF',
  '#C3CBD6',
  'var(--akzent)',
];

/**
 * Zeigt die Feier an.
 * @param {string} iso        welcher Tag (bestimmt den Spruch)
 * @param {object} bilanz     Ergebnis von tagesBilanz()
 * @param {Function} beiSchliessen
 */
export function zeigeFeier(iso, bilanz, beiSchliessen = () => {}) {
  const spruch = spruchFuer(iso);

  const konfetti = wenigerBewegung() ? null : baueKonfetti();
  if (konfetti) document.body.append(konfetti);

  const overlay = el('div', { class: 'feier', role: 'dialog', 'aria-modal': 'true' });

  const schliessen = () => {
    overlay.remove();
    konfetti?.remove();
    document.body.style.overflow = '';
    beiSchliessen();
  };

  const kreis = el('div', { class: 'feier-kreis' }, [icon('haken', 40)]);

  const zahlen = el('div', { class: 'feier-zahlen' });
  if (bilanz.teile.bloecke.gesamt > 0) {
    zahlen.append(baueZahl(bilanz.teile.bloecke.gesamt, 'Blöcke'));
  }
  if (bilanz.teile.aufgaben.gesamt > 0) {
    zahlen.append(baueZahl(bilanz.teile.aufgaben.gesamt, 'Aufgaben'));
  }
  if (bilanz.teile.ziele.gesamt > 0) {
    zahlen.append(baueZahl(bilanz.teile.ziele.gesamt, 'Ziele'));
  }

  overlay.append(
    el('div', { class: 'feier-karte' }, [
      kreis,
      el('h2', { class: 'feier-titel', text: spruch.titel }),
      el('p', { class: 'feier-text', text: spruch.text }),
      zahlen.children.length > 0 ? zahlen : null,
      el('button', { class: 'knopf akzent gross', text: 'Weiter', onclick: schliessen }),
    ]),
  );

  // Tippen neben die Karte schliesst auch.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) schliessen();
  });

  document.body.style.overflow = 'hidden';
  document.body.append(overlay);

  // Der Weiter-Knopf bekommt den Fokus, damit man auch mit Tastatur weiterkommt.
  overlay.querySelector('.knopf')?.focus({ preventScroll: true });

  return schliessen;
}

function baueZahl(wert, name) {
  return el('div', { class: 'feier-zahl' }, [
    el('b', { text: String(wert) }),
    el('span', { text: name }),
  ]);
}

/** Baut 44 Schnipsel mit zufaelliger Position, Farbe und Fallzeit. */
function baueKonfetti(anzahl = 44) {
  const huelle = el('div', { class: 'konfetti', 'aria-hidden': 'true' });

  for (let i = 0; i < anzahl; i += 1) {
    const dauer = 2.4 + Math.random() * 1.8;
    huelle.append(
      el('i', {
        class: 'schnipsel',
        style: {
          left: `${Math.random() * 100}%`,
          background: SCHNIPSELFARBEN[i % SCHNIPSELFARBEN.length],
          width: `${5 + Math.random() * 5}px`,
          height: `${9 + Math.random() * 8}px`,
          animationDuration: `${dauer}s`,
          animationDelay: `${Math.random() * 0.9}s`,
        },
      }),
    );
  }

  // Nach der laengsten Animation wieder aufraeumen.
  setTimeout(() => huelle.remove(), 6000);
  return huelle;
}

/**
 * Kleine Variante fuer zwischendurch: ein paar Schnipsel ohne Overlay,
 * z. B. wenn alle eigenen Aufgaben (aber noch nicht der ganze Tag) fertig sind.
 */
export function kleineFeier() {
  if (wenigerBewegung()) return;
  document.body.append(baueKonfetti(16));
}
