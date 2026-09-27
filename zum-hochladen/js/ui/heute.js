// Der Heute-Bildschirm.
//
// Reihenfolge von oben nach unten - bewusst nach Wichtigkeit sortiert:
//   1. Fortschritt des Tages (eine Startnummer mit Prozent, ein Balken)
//   2. Was gerade laeuft
//   3. Eigene Aufgaben (anlegen, abhaken, loeschen)
//   4. Die drei Tagesziele
//   5. Der komplette Tagesablauf
//
// Beim Abhaken wird NICHT der ganze Bildschirm neu gezeichnet. Das wuerde die
// Scrollposition zerstoeren und die Animation schlucken. Stattdessen frischen
// wir gezielt die betroffenen Stellen auf.

import { el, leere, wenigerBewegung } from './dom.js';
import { icon } from './icons.js';
import { zeigeFeier } from './feier.js';

import {
  zuMinuten,
  zuText,
  blockStart,
  blockEnde,
  minutenImLogischenTag,
  findeJetztUndNaechstes,
  restzeitMinuten,
  formatiereDauer,
  formatiereDatumLang,
  tagVerschieben,
} from '../logik/zeit.js';
import { berechneTagesStreak } from '../logik/streak.js';
import { tagesBilanz, sollFeiern } from '../logik/tagesabschluss.js';
import {
  istErledigt,
  schalteErledigt,
  setzeZiel,
  autoAbhakenZieleBlock,
  uebernehmeOffeneZiele,
  zieleFuer,
  schonGefeiert,
  markiereGefeiert,
} from '../logik/zustand.js';
import {
  aufgabenFuer,
  fuegeAufgabeHinzu,
  schalteAufgabe,
  loescheAufgabe,
  benenneAufgabeUm,
  loescheErledigte,
  uebernimmOffeneAufgaben,
  offeneVonGestern,
} from '../logik/aufgaben.js';
import { workoutsFuerTag, istWorkoutErledigt, schalteWorkout } from '../logik/workout.js';
import { kategorieKurz, KATEGORIEN } from '../daten/kategorien.js';
import { MAX_ZURUECK, MAX_VOR, RUECKBLICK_TAGE } from '../konfiguration.js';

export function rendereHeute(app) {
  const iso = app.datum();
  const heuteIso = app.heute();
  const versatz = app.datumVersatz;
  const bloecke = app.tagOeffnen(iso);
  const istHeute = versatz === 0;
  const istZukunft = versatz > 0;
  const darfAbhaken = !istZukunft;

  const wurzel = document.createDocumentFragment();

  /** Alles, was dieser Tag an Zaehlbarem hat: Bloecke, Aufgaben, Sport, Ziele. */
  const holeBilanz = () => tagesBilanz(app.tagDaten(iso));

  // ------------------------------------------------------------------ Kopf
  wurzel.append(
    el('header', { class: 'kopf' }, [
      el('div', {}, [
        el('h1', { class: 'kopf-titel', text: tagName(versatz) }),
        el('div', { class: 'kopf-unter', text: kopfUnterzeile(app, iso, istHeute) }),
      ]),
      el(
        'button',
        { class: 'rund', 'aria-label': 'Einstellungen', onclick: () => app.oeffneEinstellungen() },
        [icon('einstellungen', 21)],
      ),
    ]),
  );

  // --------------------------------------------------------- Tag wechseln
  const mitte = el('div', { class: 'tagleiste-mitte' }, [
    el('span', { text: formatiereDatumLang(iso) }),
    el('small', { text: istHeute ? `${bloecke.length} Blöcke geplant` : 'Zurück zu heute' }),
  ]);
  mitte.addEventListener('click', () => {
    if (app.datumVersatz !== 0) {
      app.datumVersatz = 0;
      app.scrollZuJetzt = true;
      app.rendere();
    }
  });

  wurzel.append(
    el('div', { class: 'tagleiste' }, [
      el(
        'button',
        {
          class: 'pfeil',
          'aria-label': 'Ein Tag zurück',
          disabled: versatz <= -MAX_ZURUECK,
          onclick: () => { app.datumVersatz -= 1; app.scrollZuJetzt = false; app.rendere(); },
        },
        [icon('links', 19)],
      ),
      mitte,
      el(
        'button',
        {
          class: 'pfeil',
          'aria-label': 'Ein Tag vor',
          disabled: versatz >= MAX_VOR,
          onclick: () => { app.datumVersatz += 1; app.scrollZuJetzt = false; app.rendere(); },
        },
        [icon('rechts', 19)],
      ),
    ]),
  );

  // ----------------------------------------------------------- Fortschritt
  // Wie eine Startnummer beim Lauf: oben ein Band, darunter gross die Prozent.
  const nummerZahl = el('span', {});
  const nummer = el('div', { class: 'startnummer', role: 'img' }, [
    el('span', { class: 'startnummer-band', text: istHeute ? 'Heute' : 'Tag' }),
    el('span', { class: 'startnummer-zahl' }, [nummerZahl, el('small', { text: '%' })]),
  ]);
  const balkenWert = el('i', { style: { width: '0%' } });
  const fortschrittGross = el('div', { class: 'fortschritt-gross' });
  const fortschrittKlein = el('div', { class: 'fortschritt-klein' });

  const streak = berechneTagesStreak(
    (tagIso) => app.tagDaten(tagIso),
    heuteIso,
    app.zustand.einstellungen.streakSchwelle,
    RUECKBLICK_TAGE,
  );

  const streakStelle = el('div', {});

  wurzel.append(
    el('section', { class: 'karte' }, [
      el('div', { class: 'fortschritt' }, [
        nummer,
        el('div', { class: 'fortschritt-text' }, [fortschrittGross, fortschrittKlein, streakStelle]),
      ]),
      el('div', { class: 'fortschritt-balken', 'aria-hidden': 'true' }, [balkenWert]),
    ]),
  );

  if (streak.aktuell > 0) {
    streakStelle.append(
      el('span', { class: 'chip' }, [
        icon('flamme', 13),
        el('span', { text: `${streak.aktuell} ${streak.aktuell === 1 ? 'Tag' : 'Tage'} in Folge` }),
      ]),
    );
  } else {
    streakStelle.append(
      el('div', { class: 'fortschritt-klein', style: { marginTop: '6px' } }, [
        'Noch keine Serie – heute ist ein guter Start.',
      ]),
    );
  }

  // ------------------------------------------------------------ Jetzt-Karte
  const jetztStelle = el('div', {});
  wurzel.append(jetztStelle);

  // --------------------------------------------------------------- Aufgaben
  const aufgabenKarte = el('section', { class: 'karte' });
  const aufgabenListe = el('div', {});
  const aufgabenZaehler = el('span', { class: 'karte-zaehler' });
  wurzel.append(aufgabenKarte);

  // ------------------------------------------------------------------ Sport
  const sportKarte = el('section', { class: 'karte' });
  const sportZaehler = el('span', { class: 'karte-zaehler' });
  wurzel.append(sportKarte);

  // ----------------------------------------------------------------- Ziele
  const zieleKarte = el('section', { class: 'karte' });
  wurzel.append(zieleKarte);

  // ------------------------------------------------------------- Zeitleiste
  const leiste = el('div', { class: 'leiste' });
  const blockZaehler = el('span', { class: 'karte-zaehler' });

  wurzel.append(
    el('section', { class: 'karte' }, [
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: 'Tagesablauf' }),
        blockZaehler,
      ]),
      bloecke.length === 0
        ? el('div', { class: 'leer' }, [
            el('div', { class: 'leer-zeichen' }, [icon('woche', 22)]),
            el('div', { class: 'leer-titel', text: 'Nichts geplant' }),
            el('div', { text: 'Für diesen Tag steht kein Block im Plan.' }),
          ])
        : leiste,
    ]),
  );

  const blockKnoten = new Map();
  for (const block of bloecke) {
    const knoten = baueBlockZeile(block, darfAbhaken, (b, element) => {
      app.aktualisiere(schalteErledigt(app.zustand, iso, b.id), { rendern: false });
      hupfen(element.querySelector('.kaestchen'));
      frischeAlles();
    });
    blockKnoten.set(block.id, knoten);
    leiste.append(knoten);
  }

  // =========================================================================
  // Auffrischen ohne Neuzeichnen des ganzen Bildschirms
  // =========================================================================

  function frischeFortschritt() {
    const b = holeBilanz();
    nummerZahl.textContent = String(b.prozent);
    balkenWert.style.width = `${b.prozent}%`;
    nummer.setAttribute('aria-label', `${b.prozent} Prozent – ${b.fertig} von ${b.gesamt} erledigt`);

    fortschrittGross.textContent =
      b.gesamt === 0 ? 'Nichts abzuhaken' : `${b.fertig} von ${b.gesamt} erledigt`;

    fortschrittKlein.textContent =
      b.gesamt === 0
        ? 'Ein Tag ganz ohne Pflichten.'
        : b.komplett
          ? 'Alles erledigt. Stark!'
          : `Noch ${b.offen} offen`;

    blockZaehler.textContent = `${b.teile.bloecke.fertig}/${b.teile.bloecke.gesamt}`;
    blockZaehler.hidden = b.teile.bloecke.gesamt === 0;
    aufgabenZaehler.textContent = `${b.teile.aufgaben.fertig}/${b.teile.aufgaben.gesamt}`;
    aufgabenZaehler.hidden = b.teile.aufgaben.gesamt === 0;
    sportZaehler.textContent = `${b.teile.workouts.fertig}/${b.teile.workouts.gesamt}`;
  }

  /** Die Trainings, die heute anstehen - nur wenn es welche gibt. */
  function baueSportKarte() {
    leere(sportKarte);
    const heuteWorkouts = workoutsFuerTag(app.zustand, iso);

    if (heuteWorkouts.length === 0) {
      sportKarte.hidden = true;
      return;
    }
    sportKarte.hidden = false;

    sportKarte.append(
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: 'Sport' }),
        sportZaehler,
      ]),
    );

    for (const w of heuteWorkouts) {
      const fertig = istWorkoutErledigt(app.zustand, iso, w.id);
      const zeile = el('div', { class: `zeile${fertig ? ' erledigt' : ''}`, dataset: { art: w.art } });
      const kaestchen = el('span', { class: `kaestchen${fertig ? ' an' : ''}` }, [icon('haken', 15)]);

      const schalter = el(
        'button',
        {
          class: 'tippziel',
          'aria-label': `${w.name} abhaken`,
          'aria-pressed': fertig ? 'true' : 'false',
          disabled: !darfAbhaken,
          onclick: () => {
            const jetztAn = !kaestchen.classList.contains('an');
            kaestchen.classList.toggle('an', jetztAn);
            zeile.classList.toggle('erledigt', jetztAn);
            schalter.setAttribute('aria-pressed', jetztAn ? 'true' : 'false');
            hupfen(kaestchen);
            app.aktualisiere(schalteWorkout(app.zustand, iso, w.id), { rendern: false });
            frischeAlles();
          },
        },
        [kaestchen],
      );

      zeile.append(
        schalter,
        el('span', { class: 'zeile-text' }, [
          el('div', { text: w.name }),
          el('div', { class: 'block-notiz' }, [
            el('span', {
              text: `${zuText(zuMinuten(w.start))}–${zuText(zuMinuten(w.ende))}`,
            }),
            w.saetze > 0 && w.wiederholungen > 0
              ? el('span', { text: ` · ${w.saetze}×${w.wiederholungen}` })
              : null,
          ]),
        ]),
      );

      sportKarte.append(zeile);
    }
  }

  function frischeJetzt() {
    leere(jetztStelle);
    if (istHeute) jetztStelle.append(baueJetztKarte(app, frischeAlles));
    else jetztStelle.append(baueTagHinweis(versatz));
  }

  function frischeBloecke() {
    for (const block of bloecke) {
      const knoten = blockKnoten.get(block.id);
      if (knoten) setzeBlockZustand(app, iso, block, knoten);
    }
  }

  /** Prueft, ob der Tag gerade komplett geworden ist, und feiert dann. */
  function pruefeFeier() {
    if (!sollFeiern(app.tagDaten(iso), schonGefeiert(app.zustand, iso))) return;
    const b = holeBilanz();
    app.aktualisiere(markiereGefeiert(app.zustand, iso), { rendern: false });
    zeigeFeier(iso, b);
  }

  function frischeAlles() {
    frischeFortschritt();
    frischeJetzt();
    frischeBloecke();
    pruefeFeier();
  }

  // --------------------------------------------------- Aufgaben zeichnen
  function zeichneAufgaben() {
    leere(aufgabenListe);
    const liste = aufgabenFuer(app.zustand, iso);

    if (liste.length === 0) {
      // Bewusst schlicht: eine Zeile statt einer grossen leeren Flaeche.
      aufgabenListe.append(
        el('div', { class: 'leer-zeile' }, [
          icon('liste', 17),
          el('span', { text: 'Noch nichts eingetragen' }),
        ]),
      );
      return;
    }

    for (const aufgabe of liste) {
      const zeile = el('div', { class: `zeile${aufgabe.erledigt ? ' erledigt' : ''}` });

      const kaestchen = el('span', { class: `kaestchen${aufgabe.erledigt ? ' an' : ''}` }, [
        icon('haken', 15),
      ]);

      const schalter = el(
        'button',
        {
          class: 'tippziel',
          'aria-label': `"${aufgabe.text}" abhaken`,
          'aria-pressed': aufgabe.erledigt ? 'true' : 'false',
          onclick: () => {
            const jetztAn = !kaestchen.classList.contains('an');
            kaestchen.classList.toggle('an', jetztAn);
            zeile.classList.toggle('erledigt', jetztAn);
            schalter.setAttribute('aria-pressed', jetztAn ? 'true' : 'false');
            hupfen(kaestchen);
            app.aktualisiere(schalteAufgabe(app.zustand, iso, aufgabe.id), { rendern: false });
            frischeAlles();
          },
        },
        [kaestchen],
      );

      const feld = baueTextfeld({ wert: aufgabe.text, label: 'Aufgabe bearbeiten' });
      feld.addEventListener('change', () => {
        const neu = feld.value.trim();
        if (!neu) { feld.value = aufgabe.text; return; }
        app.aktualisiere(benenneAufgabeUm(app.zustand, iso, aufgabe.id, neu), { rendern: false });
      });

      const weg = el(
        'button',
        {
          class: 'zeile-weg',
          'aria-label': `"${aufgabe.text}" löschen`,
          onclick: () => {
            app.aktualisiere(loescheAufgabe(app.zustand, iso, aufgabe.id), { rendern: false });
            zeichneAufgaben();
            frischeAlles();
            app.toast('Aufgabe gelöscht');
          },
        },
        [icon('muell', 17)],
      );

      zeile.append(schalter, feld, weg);
      aufgabenListe.append(zeile);
    }
  }

  function baueAufgabenKarte() {
    leere(aufgabenKarte);

    aufgabenKarte.append(
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: 'Meine Aufgaben' }),
        aufgabenZaehler,
      ]),
      aufgabenListe,
    );

    if (darfAbhaken) {
      // Neue Aufgabe anlegen
      const eingabe = el('input', {
        type: 'text',
        placeholder: 'Neue Aufgabe …',
        'aria-label': 'Neue Aufgabe',
        enterkeyhint: 'done',
        maxlength: '120',
      });

      const anlegen = () => {
        const { zustand, fehler } = fuegeAufgabeHinzu(app.zustand, iso, eingabe.value);
        if (fehler) { app.toast(fehler); return; }
        app.aktualisiere(zustand, { rendern: false });
        eingabe.value = '';
        zeichneAufgaben();
        frischeFortschritt();
        // Fokus bleibt im Feld, damit man mehrere hintereinander tippen kann.
        eingabe.focus({ preventScroll: true });
      };

      eingabe.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); anlegen(); }
      });

      aufgabenKarte.append(
        el('div', { class: 'neu' }, [
          eingabe,
          el('button', { class: 'neu-knopf', 'aria-label': 'Aufgabe hinzufügen', onclick: anlegen }, [
            icon('plus', 20),
          ]),
        ]),
      );

      // Offene Aufgaben von gestern holen
      const offen = offeneVonGestern(app.zustand, iso);
      if (offen.length > 0) {
        aufgabenKarte.append(
          el(
            'button',
            {
              class: 'knopf rand',
              style: { marginTop: '10px' },
              onclick: () => {
                const { zustand, uebernommen } = uebernimmOffeneAufgaben(
                  app.zustand,
                  tagVerschieben(iso, -1),
                  iso,
                );
                app.aktualisiere(zustand, { rendern: false });
                baueAufgabenKarte();
                zeichneAufgaben();
                frischeAlles();
                app.toast(`${uebernommen} von gestern übernommen`);
              },
            },
            [
              icon('links', 17),
              el('span', { text: `${offen.length} offene ${offen.length === 1 ? 'Aufgabe' : 'Aufgaben'} von gestern holen` }),
            ],
          ),
        );
      }

      // Erledigte aufräumen
      const erledigteAnzahl = aufgabenFuer(app.zustand, iso).filter((a) => a.erledigt).length;
      if (erledigteAnzahl >= 2) {
        aufgabenKarte.append(
          el(
            'button',
            {
              class: 'knopf rand',
              style: { marginTop: '8px' },
              onclick: () => {
                const { zustand, entfernt } = loescheErledigte(app.zustand, iso);
                app.aktualisiere(zustand, { rendern: false });
                baueAufgabenKarte();
                zeichneAufgaben();
                frischeAlles();
                app.toast(`${entfernt} erledigte Aufgaben entfernt`);
              },
            },
            [icon('muell', 17), el('span', { text: `${erledigteAnzahl} erledigte aufräumen` })],
          ),
        );
      }
    }

    zeichneAufgaben();
  }

  // ------------------------------------------------------- Ziele zeichnen
  function baueZieleKarte() {
    leere(zieleKarte);

    zieleKarte.append(
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: 'Meine 3 Tagesziele' }),
        el('span', { class: 'karte-zaehler', text: zieleZaehler(app, iso) }),
      ]),
    );

    const planBloecke = app.bloecke(iso);

    zieleFuer(app.zustand, iso).forEach((ziel, index) => {
      const zeile = el('div', { class: `zeile${ziel.erledigt ? ' erledigt' : ''}` });

      const kaestchen = el('span', { class: `kaestchen${ziel.erledigt ? ' an' : ''}` }, [
        icon('haken', 15),
      ]);

      const feld = baueTextfeld({
        wert: ziel.text,
        platzhalter: `Ziel ${index + 1}`,
        label: `Tagesziel ${index + 1}`,
      });

      /** Speichert eine Aenderung und hakt ggf. den Zielblock automatisch ab. */
      const speichere = (teil) => {
        let neu = setzeZiel(app.zustand, iso, index, teil);
        neu = autoAbhakenZieleBlock(neu, iso, planBloecke);
        app.aktualisiere(neu, { rendern: false });
      };

      const schalter = el(
        'button',
        {
          class: 'tippziel',
          'aria-label': `Ziel ${index + 1} abhaken`,
          'aria-pressed': ziel.erledigt ? 'true' : 'false',
          onclick: () => {
            if (!feld.value.trim()) { feld.focus(); return; }
            const jetztAn = !kaestchen.classList.contains('an');
            kaestchen.classList.toggle('an', jetztAn);
            zeile.classList.toggle('erledigt', jetztAn);
            schalter.setAttribute('aria-pressed', jetztAn ? 'true' : 'false');
            hupfen(kaestchen);
            speichere({ erledigt: jetztAn });
            frischeAlles();
          },
        },
        [kaestchen],
      );

      // Beim Tippen nur speichern - sonst springt der Fokus weg.
      feld.addEventListener('input', () => speichere({ text: feld.value }));
      feld.addEventListener('change', () => { speichere({ text: feld.value }); frischeAlles(); });

      zeile.append(schalter, feld);
      zieleKarte.append(zeile);
    });

    const gestern = tagVerschieben(iso, -1);
    const offenGestern = zieleFuer(app.zustand, gestern).filter((z) => z.text.trim() && !z.erledigt);

    if (darfAbhaken && offenGestern.length > 0) {
      zieleKarte.append(
        el(
          'button',
          {
            class: 'knopf rand',
            style: { marginTop: '10px' },
            onclick: () => {
              const { zustand, uebernommen } = uebernehmeOffeneZiele(app.zustand, gestern, iso);
              if (uebernommen === 0) { app.toast('Es ist kein Platz mehr frei.'); return; }
              app.aktualisiere(zustand, { rendern: false });
              baueZieleKarte();
              frischeAlles();
              app.toast(`${uebernommen} ${uebernommen === 1 ? 'Ziel' : 'Ziele'} übernommen`);
            },
          },
          [
            icon('links', 17),
            el('span', { text: `${offenGestern.length} offene von gestern holen` }),
          ],
        ),
      );
    }
  }

  // ------------------------------------------------------------------ Start
  baueAufgabenKarte();
  baueSportKarte();
  baueZieleKarte();
  frischeFortschritt();
  frischeJetzt();
  frischeBloecke();

  // Beim Oeffnen zum aktuellen Block scrollen.
  if (istHeute && app.scrollZuJetzt) {
    app.scrollZuJetzt = false;
    const { aktuell } = findeJetztUndNaechstes(app.bloecke, app.jetzt());
    const ziel = aktuell ? blockKnoten.get(aktuell.id) : null;
    if (ziel) {
      requestAnimationFrame(() =>
        ziel.scrollIntoView({
          block: 'center',
          behavior: wenigerBewegung() ? 'auto' : 'smooth',
        }),
      );
    }
  }

  return wurzel;
}

// ===========================================================================
// Bausteine
// ===========================================================================

function tagName(versatz) {
  if (versatz === 0) return 'Heute';
  if (versatz === -1) return 'Gestern';
  if (versatz === 1) return 'Morgen';
  if (versatz < 0) return `Vor ${-versatz} Tagen`;
  return `In ${versatz} Tagen`;
}

function kopfUnterzeile(app, iso, istHeute) {
  if (!istHeute) return formatiereDatumLang(iso);
  const uhr = app.jetzt();
  return `${String(uhr.getHours()).padStart(2, '0')}:${String(uhr.getMinutes()).padStart(2, '0')} Uhr`;
}

function zieleZaehler(app, iso) {
  const ziele = zieleFuer(app.zustand, iso).filter((z) => z.text.trim());
  return `${ziele.filter((z) => z.erledigt).length}/${ziele.length || 3}`;
}

/**
 * Ein Textfeld, das mit dem Inhalt mitwaechst.
 *
 * Ein normales <input> schneidet lange Texte ab - fuer eine Aufgabenliste
 * ist das schlecht. Deshalb ein <textarea>, dessen Hoehe wir selbst setzen.
 * Enter bedeutet hier "fertig", nicht "neue Zeile".
 */
function baueTextfeld({ wert = '', platzhalter = '', label = '' } = {}) {
  const feld = el('textarea', {
    rows: 1,
    placeholder: platzhalter,
    'aria-label': label,
    enterkeyhint: 'done',
    maxlength: '120',
  });
  feld.value = wert;

  const passeHoeheAn = () => {
    feld.style.height = 'auto';
    feld.style.height = `${feld.scrollHeight}px`;
  };

  feld.addEventListener('input', passeHoeheAn);
  feld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); feld.blur(); }
  });

  // Beim ersten Zeichnen steht das Feld noch nicht im Dokument und hat
  // scrollHeight 0 - deshalb im naechsten Frame nachmessen.
  requestAnimationFrame(passeHoeheAn);

  return feld;
}

/** Kleine Sprunganimation am Kaestchen. */
function hupfen(kaestchen) {
  if (!kaestchen || wenigerBewegung()) return;
  kaestchen.classList.remove('hupft');
  void kaestchen.offsetWidth; // erzwingt den Neustart der Animation
  kaestchen.classList.add('hupft');
}

/** Hinweis statt "Jetzt"-Karte, wenn man einen anderen Tag anschaut. */
function baueTagHinweis(versatz) {
  const zukunft = versatz > 0;
  return el('div', { class: 'hinweis ruhig' }, [
    icon(zukunft ? 'uhr' : 'info', 17),
    el('div', {
      text: zukunft
        ? 'Ein kommender Tag. Abhaken kannst du, sobald er da ist.'
        : 'Vergangener Tag. Du kannst hier noch nachtragen.',
    }),
  ]);
}

/** Die grosse Karte mit dem laufenden Block. */
function baueJetztKarte(app, beiAenderung) {
  const { aktuell, aktuellTag, naechster, naechsterTag, minuten } = findeJetztUndNaechstes(
    app.bloecke,
    app.jetzt(),
  );

  if (!aktuell) {
    return el('section', { class: 'jetzt' }, [
      el('div', { class: 'jetzt-marke' }, [el('i', { class: 'jetzt-punkt' }), 'Jetzt']),
      el('div', { class: 'jetzt-titel', text: 'Nichts geplant' }),
      naechster
        ? el('div', { class: 'jetzt-naechstes' }, [
            'Als Nächstes: ',
            el('b', { text: `${zuText(zuMinuten(naechster.start))} ${naechster.titel}` }),
          ])
        : null,
    ]);
  }

  // Der laufende Block kann aus dem Vortag stammen (zwischen 04:00 und 05:00).
  const eigeneMinuten = aktuellTag === app.heute() ? minuten : minuten + 1440;
  const start = blockStart(aktuell);
  const ende = blockEnde(aktuell);
  const anteil = Math.min(100, Math.max(0, ((eigeneMinuten - start) / (ende - start)) * 100));
  const rest = restzeitMinuten(aktuell, eigeneMinuten);
  const fertig = istErledigt(app.zustand, aktuellTag, aktuell.id);

  const karte = el('section', { class: 'jetzt' }, [
    el('div', { class: 'jetzt-marke' }, [el('i', { class: 'jetzt-punkt' }), 'Jetzt']),
    el('h2', { class: 'jetzt-titel', text: aktuell.titel }),
    el('div', {
      class: 'jetzt-zeit',
      text: `${zuText(start)}–${zuText(ende)} · noch ${formatiereDauer(rest)}`,
    }),
    aktuell.notiz ? el('div', { class: 'jetzt-notiz', text: aktuell.notiz }) : null,
    el('div', { class: 'jetzt-balken' }, [el('i', { style: { width: `${anteil}%` } })]),
  ]);

  if (aktuell.abhakbar) {
    const kaestchen = el('span', { class: `kaestchen${fertig ? ' an' : ''}` }, [icon('haken', 15)]);
    karte.append(
      el(
        'button',
        {
          class: `knopf gross ${fertig ? 'fertig' : 'akzent'}`,
          onclick: () => {
            app.aktualisiere(schalteErledigt(app.zustand, aktuellTag, aktuell.id), { rendern: false });
            beiAenderung();
          },
        },
        [
          fertig ? icon('haken', 19) : kaestchen,
          el('span', { text: fertig ? 'Erledigt – nochmal tippen zum Zurücknehmen' : 'Als erledigt markieren' }),
        ],
      ),
    );
  } else {
    karte.append(
      el('div', { class: 'hinweis ruhig', style: { marginBottom: '0' } }, [
        icon('info', 17),
        el('div', { text: `${KATEGORIEN[aktuell.kategorie]?.name ?? ''} – hier gibt es nichts abzuhaken.` }),
      ]),
    );
  }

  if (naechster) {
    const amFolgetag = naechsterTag !== app.heute();
    karte.append(
      el('div', { class: 'jetzt-naechstes' }, [
        'Als Nächstes: ',
        el('b', { text: `${zuText(zuMinuten(naechster.start))} ${naechster.titel}` }),
        amFolgetag ? ' (morgen)' : '',
      ]),
    );
  }

  return karte;
}

/** Eine Zeile der Zeitleiste. */
function baueBlockZeile(block, darfAbhaken, beiTipp) {
  const gestreift = KATEGORIEN[block.kategorie]?.gestreift ? 'ja' : 'nein';

  const zeile = el('div', {
    class: 'block',
    dataset: { kat: block.kategorie, gestreift, id: block.id },
  });

  zeile.append(
    el('div', { class: 'block-zeit' }, [
      el('div', { text: zuText(blockStart(block)) }),
      el('div', { class: 'bis', text: zuText(blockEnde(block)) }),
    ]),
    el('div', { class: 'block-mitte' }, [
      el('div', { class: 'block-titel', text: block.titel }),
      block.notiz ? el('div', { class: 'block-notiz', text: block.notiz }) : null,
    ]),
  );

  if (block.abhakbar && darfAbhaken) {
    const kaestchen = el('span', { class: 'kaestchen' }, [icon('haken', 15)]);
    zeile.append(el('span', { class: 'tippziel' }, [kaestchen]));
    zeile.setAttribute('role', 'button');
    zeile.setAttribute('tabindex', '0');
    zeile.addEventListener('click', () => beiTipp(block, zeile));
    zeile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beiTipp(block, zeile); }
    });
  } else {
    zeile.append(el('span', { class: 'block-schild', text: kategorieKurz(block.kategorie) }));
  }

  return zeile;
}

/** Setzt die Zustandsklassen einer Blockzeile (erledigt / jetzt / verpasst). */
function setzeBlockZustand(app, iso, block, knoten) {
  const fertig = istErledigt(app.zustand, iso, block.id);
  const heuteIso = app.heute();
  const jetztMin = minutenImLogischenTag(app.jetzt());

  let vorbei = false;
  if (iso < heuteIso) vorbei = true;
  else if (iso === heuteIso) vorbei = blockEnde(block) <= jetztMin;

  const laeuft = iso === heuteIso && blockStart(block) <= jetztMin && jetztMin < blockEnde(block);

  knoten.classList.toggle('erledigt', fertig);
  knoten.classList.toggle('jetzt-block', laeuft);
  knoten.classList.toggle('verpasst', vorbei && block.abhakbar && !fertig);

  const kaestchen = knoten.querySelector('.kaestchen');
  if (kaestchen) {
    kaestchen.classList.toggle('an', fertig);
    knoten.setAttribute('aria-pressed', fertig ? 'true' : 'false');
    knoten.setAttribute(
      'aria-label',
      `${block.titel}, ${zuText(blockStart(block))} bis ${zuText(blockEnde(block))}, ${
        fertig ? 'erledigt' : 'offen'
      }`,
    );
  }
}
