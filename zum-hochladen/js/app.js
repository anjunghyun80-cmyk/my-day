// Startpunkt der App: Zustand laden, Tabs bauen, jede Minute nachsehen,
// was gerade dran ist. Die eigentliche Rechenarbeit steckt in js/logik/*,
// das Aussehen in js/ui/*.

import { el, leere, id } from './ui/dom.js';
import { icon } from './ui/icons.js';
import {
  setzeKategorieFarben,
  setzeThema,
  gespeichertesThema,
  wendeAkzentAn,
  aktualisiereStatusleiste,
} from './ui/thema.js';

import { ladeZustand, speichereZustand, bitteUmDauerhaftenSpeicher } from './speicher.js';
import { logischerTag, tagVerschieben, findeJetztUndNaechstes } from './logik/zeit.js';
import { holeTagesplan, oeffneTag, raeumeSnapshotsAuf } from './logik/snapshot.js';
import { erledigtFuer, zieleFuer } from './logik/zustand.js';
import { aufgabenFuer, raeumeAufgabenAuf } from './logik/aufgaben.js';
import { workoutsAlsAufgaben, raeumeWorkoutLogAuf } from './logik/workout.js';

import { rendereHeute } from './ui/heute.js';
import { rendereWoche } from './ui/woche.js';
import { rendereSport } from './ui/sport.js';
import { rendereStatistik } from './ui/statistik.js';
import { renderePlan } from './ui/planEditor.js';
import { rendereGlowup } from './ui/glowup.js';
import { oeffneEinstellungen } from './ui/einstellungen.js';

import { MAX_ZURUECK, MAX_VOR } from './konfiguration.js';

const TABS = [
  { schluessel: 'heute', name: 'Heute', symbol: 'heute' },
  { schluessel: 'woche', name: 'Woche', symbol: 'woche' },
  { schluessel: 'sport', name: 'Sport', symbol: 'sport' },
  { schluessel: 'statistik', name: 'Zahlen', symbol: 'statistik' },
  { schluessel: 'plan', name: 'Plan', symbol: 'plan' },
  { schluessel: 'glowup', name: 'Glow-up', symbol: 'glowup' },
];

export const app = {
  zustand: ladeZustand(),
  tab: 'heute',
  /** 0 = heute, -1 = gestern, +1 = morgen */
  datumVersatz: 0,
  /** 0 = diese Woche */
  wochenVersatz: 0,
  /** Im Plan-Editor gewaehlter Wochentag (null = heutiger Wochentag) */
  planTag: null,
  /** In der Statistik gewaehlter Zeitraum: 7 oder 30 Tage */
  statistikZeitraum: 7,
  /** Merkt sich, welcher Block zuletzt lief - fuer das Banner */
  letzterJetztBlock: null,
  /** Soll beim naechsten Rendern zum aktuellen Block gescrollt werden? */
  scrollZuJetzt: true,
  /** Im Glow-up-Bereich aufgeklappte Woche (id). undefined = die neueste. */
  glowupOffen: undefined,
};

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

/** Der aktuelle Zeitpunkt - als Funktion, damit Tests sie ersetzen koennten. */
app.jetzt = () => new Date();

/** Der heutige logische Tag (Wechsel um 04:00). */
app.heute = () => logischerTag(app.jetzt());

/** Der gerade angezeigte Tag auf dem Heute-Bildschirm. */
app.datum = () => tagVerschieben(app.heute(), app.datumVersatz);

/**
 * Setzt einen neuen Zustand, speichert ihn und zeichnet neu.
 * @param {object} neu
 * @param {{rendern?:boolean}} optionen
 */
app.aktualisiere = (neu, optionen = {}) => {
  app.zustand = neu;
  speichereZustand(neu);
  if (optionen.rendern !== false) app.rendere();
};

/** Bloecke eines Tages (aus dem Snapshot, sonst aus dem Plan). */
app.bloecke = (iso) => holeTagesplan(app.zustand, iso);

/**
 * Alles, was ein Tag an Abhakbarem hat - so, wie Streak, Statistik und die
 * Feier es brauchen: Bloecke mit Haekchen, eigene Aufgaben und Tagesziele.
 */
app.tagDaten = (iso) => ({
  bloecke: app.bloecke(iso),
  erledigt: erledigtFuer(app.zustand, iso),
  aufgaben: aufgabenFuer(app.zustand, iso),
  workouts: workoutsAlsAufgaben(app.zustand, iso),
  ziele: zieleFuer(app.zustand, iso),
});

/** Die drei Ziele eines Tages. */
app.ziele = (iso) => zieleFuer(app.zustand, iso);

/**
 * Friert den Tagesplan ein, wenn der Tag zum ersten Mal geoeffnet wird.
 * Zeichnet bewusst nicht neu - das macht der Aufrufer.
 */
app.tagOeffnen = (iso) => {
  const { zustand, bloecke, neuAngelegt } = oeffneTag(app.zustand, iso, app.heute());
  if (neuAngelegt) {
    app.zustand = zustand;
    speichereZustand(zustand);
  }
  return bloecke;
};

// ---------------------------------------------------------------------------
// Rueckmeldungen: Toast und Banner
// ---------------------------------------------------------------------------

let toastTimer = null;

app.toast = (text, dauer = 2200) => {
  const knoten = id('toast');
  knoten.textContent = text;
  knoten.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { knoten.hidden = true; }, dauer);
};

let bannerTimer = null;

function zeigeBanner(text) {
  const knoten = id('banner');
  leere(knoten);
  knoten.append(
    icon('glocke', 19),
    el('span', { text }),
    el('button', {
      class: 'banner-zu',
      'aria-label': 'Banner schließen',
      onclick: () => { knoten.hidden = true; },
    }, [icon('kreuz', 17)]),
  );
  knoten.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { knoten.hidden = true; }, 9000);
}

/** Prueft, ob ein neuer Block begonnen hat, und zeigt dann das Banner. */
function pruefeBanner(erstesMal = false) {
  const { aktuell } = findeJetztUndNaechstes(app.bloecke, app.jetzt());
  const jetztId = aktuell?.id ?? null;

  if (!erstesMal && jetztId && jetztId !== app.letzterJetztBlock && app.zustand.einstellungen.bannerAn) {
    zeigeBanner(`Jetzt: ${aktuell.titel}`);
  }
  app.letzterJetztBlock = jetztId;
}

// ---------------------------------------------------------------------------
// Dialog (Einstellungen, Block bearbeiten)
// ---------------------------------------------------------------------------

/**
 * Oeffnet einen Dialog von unten.
 * @param {string} titel
 * @param {(schliessen:Function)=>Node} baueInhalt
 */
app.dialog = (titel, baueInhalt) => {
  const blende = id('blende');
  const schliessen = () => {
    blende.hidden = true;
    leere(blende);
    document.body.style.overflow = '';
  };

  const dialog = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': titel }, [
    el('div', { class: 'griff' }),
    el('div', { class: 'dialog-kopf' }, [
      el('h2', { class: 'dialog-titel', text: titel }),
      el('button', { class: 'rund', 'aria-label': 'Schließen', onclick: schliessen }, [icon('kreuz', 19)]),
    ]),
  ]);

  dialog.append(baueInhalt(schliessen));

  leere(blende);
  blende.append(dialog);
  blende.hidden = false;
  document.body.style.overflow = 'hidden';

  // Tippen auf den dunklen Bereich schliesst den Dialog.
  blende.onclick = (ereignis) => { if (ereignis.target === blende) schliessen(); };
  return schliessen;
};

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------

function rendereTabs() {
  const leiste = id('tabs');
  leere(leiste);

  for (const tab of TABS) {
    leiste.append(
      el(
        'button',
        {
          class: 'tab',
          'aria-current': app.tab === tab.schluessel ? 'page' : null,
          onclick: () => app.geheZu(tab.schluessel),
        },
        [icon(tab.symbol, 21), el('span', { text: tab.name })],
      ),
    );
  }
}

app.rendere = () => {
  rendereTabs();
  const inhalt = id('inhalt');
  leere(inhalt);

  if (app.tab === 'heute') inhalt.append(rendereHeute(app));
  else if (app.tab === 'woche') inhalt.append(rendereWoche(app));
  else if (app.tab === 'sport') inhalt.append(rendereSport(app));
  else if (app.tab === 'statistik') inhalt.append(rendereStatistik(app));
  else if (app.tab === 'plan') inhalt.append(renderePlan(app));
  else if (app.tab === 'glowup') inhalt.append(rendereGlowup(app));
};

/** Wechselt den Tab. */
app.geheZu = (tab) => {
  if (app.tab === tab && tab === 'heute') app.datumVersatz = 0; // nochmal tippen = zurueck zu heute
  app.tab = tab;
  if (tab === 'heute') app.scrollZuJetzt = true;
  window.scrollTo(0, 0);
  app.rendere();
};

/** Oeffnet einen bestimmten Tag auf dem Heute-Bildschirm. */
app.zeigeTag = (iso) => {
  const versatz = Math.round((new Date(iso) - new Date(app.heute())) / 86400000);
  app.datumVersatz = Math.max(-MAX_ZURUECK, Math.min(MAX_VOR, versatz));
  app.tab = 'heute';
  app.scrollZuJetzt = app.datumVersatz === 0;
  window.scrollTo(0, 0);
  app.rendere();
};

app.oeffneEinstellungen = () => oeffneEinstellungen(app);

// ---------------------------------------------------------------------------
// Minutentakt
// ---------------------------------------------------------------------------

function starteTakt() {
  // Genau zur naechsten vollen Minute aufwachen.
  const ms = (60 - app.jetzt().getSeconds()) * 1000 + 100;
  setTimeout(() => {
    takt();
    starteTakt();
  }, ms);
}

function takt() {
  pruefeBanner();

  // Nicht neu zeichnen, wenn gerade jemand tippt - sonst springt der Fokus
  // mitten im Wort aus dem Textfeld. Auch nicht, wenn ein Dialog offen ist.
  const aktiv = document.activeElement;
  const tippt = aktiv && (aktiv.tagName === 'INPUT' || aktiv.tagName === 'TEXTAREA');
  if (tippt || !id('blende').hidden) return;

  // Nur die Bildschirme neu zeichnen, auf denen die Uhrzeit sichtbar ist.
  if (app.tab === 'heute' || app.tab === 'woche') app.rendere();
}

// ---------------------------------------------------------------------------
// Fremde Abzeichen vom Hoster
// ---------------------------------------------------------------------------

/**
 * Kostenlose Hoster blenden gern unten rechts ein eigenes Abzeichen ein
 * ("Powered by …"). Es liegt mit hoechstem z-index ueber allem - genau da,
 * wo unsere Tab-Leiste sitzt.
 *
 * Wir entfernen es nicht, das waere gegen die Bedingungen des Gratis-Tarifs.
 * Stattdessen schieben wir es ein Stueck nach oben, ueber die Tab-Leiste:
 * Es bleibt voll sichtbar, die Tab-Leiste sitzt weiter sauber ganz unten,
 * und der Inhalt bekommt unten etwas mehr Luft.
 */
function beobachteFremdesAbzeichen() {
  const messen = () => {
    const abzeichen = [...document.body.children].find(
      (e) =>
        e.tagName === 'IFRAME' &&
        !['banner', 'toast', 'inhalt', 'tabs', 'blende'].includes(e.id),
    );

    if (!abzeichen) {
      document.documentElement.style.setProperty('--fremd-abzeichen', '0px');
      return;
    }

    const rechteck = abzeichen.getBoundingClientRect();
    if (rechteck.height === 0) return;

    // Sitzt es unten, wo unsere Tab-Leiste ist? Dann anheben.
    const tabLeiste = id('tabs').getBoundingClientRect();
    if (rechteck.bottom > tabLeiste.top) {
      abzeichen.style.setProperty(
        'bottom',
        `calc(env(safe-area-inset-bottom, 0px) + ${Math.ceil(tabLeiste.height)}px + 6px)`,
        'important',
      );
      abzeichen.style.setProperty('top', 'auto', 'important');
    }

    // Der Inhalt braucht unten Platz, damit die letzte Karte nicht
    // dauerhaft unter dem Abzeichen liegt.
    document.documentElement.style.setProperty(
      '--fremd-abzeichen',
      `${Math.ceil(rechteck.height)}px`,
    );
  };

  messen();

  // Das Abzeichen wird oft erst nach dem Laden eingefuegt - also nachfassen.
  const beobachter = new MutationObserver(messen);
  beobachter.observe(document.body, { childList: true });
  window.addEventListener('resize', messen);
  setTimeout(() => beobachter.disconnect(), 15000);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function start() {
  // Farbthema: die Wahl steht schon am <html>-Element (siehe index.html),
  // hier stellen wir nur sicher, dass sie gueltig ist.
  setzeThema(gespeichertesThema());
  setzeKategorieFarben();
  wendeAkzentAn();
  aktualisiereStatusleiste();

  // Alte Schnappschuesse und Aufgabenlisten wegraeumen.
  app.zustand = raeumeSnapshotsAuf(app.zustand, app.heute());
  app.zustand = raeumeAufgabenAuf(app.zustand, app.heute());
  app.zustand = raeumeWorkoutLogAuf(app.zustand, app.heute());

  // Den heutigen Tag gleich einfrieren.
  app.tagOeffnen(app.heute());

  pruefeBanner(true);
  app.rendere();
  starteTakt();
  beobachteFremdesAbzeichen();

  // Kommt die App aus dem Hintergrund zurueck: alles auffrischen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      app.tagOeffnen(app.heute());
      pruefeBanner(true);
      app.rendere();
    }
  });

  bitteUmDauerhaftenSpeicher();

  // Service Worker fuer den Offline-Betrieb.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((fehler) => {
        console.warn('Service Worker liess sich nicht anmelden:', fehler);
      });
    });
  }
}

start();
