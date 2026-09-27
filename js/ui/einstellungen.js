// Die Einstellungen, als Dialog von unten.
// Hier liegen auch Aussehen, Kalender-Export und Backup.

import { el } from './dom.js';
import { icon } from './icons.js';
import {
  THEMEN,
  gespeichertesThema,
  setzeThema,
  gespeicherterAkzent,
  setzeAkzent,
} from './thema.js';
import { AKZENT_VORLAGEN, schriftAuf } from '../logik/farbe.js';

import { erzeugeIcs, icsDateiname, erinnerungsBloecke, KALENDER_MARKE } from '../logik/ics.js';
import { erzeugeBackup, backupDateiname, leseBackup } from '../logik/backup.js';
import {
  setzeEinstellung,
  merkeKalenderExport,
  kalenderVeraltet,
  leererZustand,
} from '../logik/zustand.js';
import { gibDateiHeraus, leseDateiAus, istStandalone } from '../dateien.js';
import { loescheAlles } from '../speicher.js';

export function oeffneEinstellungen(app) {
  app.dialog('Einstellungen', (schliessen) => {
    const form = el('div', {});

    form.append(
      baueAussehen(app),
      baueErinnerungen(app),
      baueStreak(app),
      baueBackup(app, schliessen),
      baueInfo(),
      el('button', {
        class: 'knopf gefahr',
        style: { marginTop: '12px' },
        text: 'Alle Daten löschen',
        onclick: () => bestaetigeLoeschen(app),
      }),
    );

    return form;
  });
}

// ---------------------------------------------------------------------------
// Aussehen
// ---------------------------------------------------------------------------

function baueAussehen(app) {
  const karte = el('section', { class: 'karte' }, [
    el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Aussehen' })]),
  ]);

  const aktuell = gespeichertesThema();
  const symbole = { dunkel: 'mond', hell: 'sonne', system: 'bildschirm' };

  const segmente = el('div', { class: 'segmente' });

  for (const thema of THEMEN) {
    const knopf = el(
      'button',
      {
        style: { fontSize: '13px', gap: '6px' },
        'aria-pressed': thema.wert === aktuell ? 'true' : 'false',
        onclick: () => {
          setzeThema(thema.wert);
          for (const b of segmente.children) b.setAttribute('aria-pressed', 'false');
          knopf.setAttribute('aria-pressed', 'true');
        },
      },
      [icon(symbole[thema.wert], 16), el('span', { text: thema.name })],
    );
    // Symbol und Text nebeneinander zentrieren
    knopf.style.display = 'inline-flex';
    knopf.style.alignItems = 'center';
    knopf.style.justifyContent = 'center';
    segmente.append(knopf);
  }

  karte.append(
    segmente,
    el('div', {
      class: 'feld-hilfe',
      text: 'Die App startet dunkel. „System" folgt der Einstellung deines iPhones.',
    }),
    baueFarbwahl(),
  );

  return karte;
}

/**
 * Die Akzentfarbe: neun Vorschlaege plus ein Feld fuer jede beliebige Farbe.
 * Die App faerbt sich sofort um - Knoepfe, Haekchen, Balken, Heatmap.
 * Ist eine Farbe zu hell oder zu dunkel fuer den Hintergrund, passt
 * js/logik/farbe.js sie automatisch so an, dass alles lesbar bleibt.
 */
function baueFarbwahl() {
  let aktuell = gespeicherterAkzent();
  const gitter = el('div', { class: 'farbwahl', role: 'group', 'aria-label': 'Akzentfarbe' });
  const nameText = el('b', {});
  const hexText = el('code', {});

  const vorlageZu = (hex) => AKZENT_VORLAGEN.find((v) => v.farbe === hex);

  const markiere = () => {
    for (const knopf of gitter.children) {
      const passt = knopf.dataset.farbe === aktuell || (knopf.dataset.eigene === 'ja' && !vorlageZu(aktuell));
      knopf.setAttribute('aria-pressed', passt ? 'true' : 'false');
    }
    eigenesFeld.style.setProperty('--farbe', aktuell);
    eigenesFeld.style.setProperty('--auf-farbe', schriftAuf(aktuell));
    nameText.textContent = vorlageZu(aktuell)?.name ?? 'Eigene Farbe';
    hexText.textContent = aktuell;
  };

  const waehle = (hex) => {
    aktuell = setzeAkzent(hex);
    markiere();
  };

  for (const vorlage of AKZENT_VORLAGEN) {
    const knopf = el(
      'button',
      {
        class: 'farbfeld',
        dataset: { farbe: vorlage.farbe },
        'aria-label': vorlage.name,
        title: vorlage.name,
        style: { '--farbe': vorlage.farbe, '--auf-farbe': schriftAuf(vorlage.farbe) },
        onclick: () => waehle(vorlage.farbe),
      },
      [icon('haken', 20)],
    );
    gitter.append(knopf);
  }

  // Jede Farbe, die es gibt: der Farbwaehler des Systems.
  const waehler = el('input', { type: 'color', value: aktuell, 'aria-label': 'Eigene Farbe wählen' });
  waehler.addEventListener('input', () => waehle(waehler.value));
  const eigenesFeld = el(
    'label',
    { class: 'farbfeld eigene', dataset: { eigene: 'ja' }, title: 'Eigene Farbe' },
    [icon('plus', 20), waehler],
  );
  // Das Feld verhaelt sich fuer markiere() wie ein Knopf.
  gitter.append(eigenesFeld);

  markiere();

  return el('div', { style: { marginTop: '20px' } }, [
    el('div', { class: 'karte-titel', style: { marginBottom: '10px' }, text: 'Akzentfarbe' }),
    gitter,
    el('div', { class: 'farbwahl-name' }, [el('span', {}, ['Gewählt: ', nameText]), hexText]),
    el('div', { class: 'vorschau', 'aria-hidden': 'true' }, [
      el('span', { class: 'kaestchen an' }, [icon('haken', 15)]),
      el('span', { class: 'chip' }, [icon('flamme', 13), el('span', { text: '5 Tage' })]),
      el('span', { class: 'knopf akzent klein', text: 'Knopf' }),
    ]),
    el('div', {
      class: 'feld-hilfe',
      text: 'Jede Farbe geht. Ist sie zu hell oder zu dunkel, passt die App sie so an, dass alles gut lesbar bleibt.',
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Erinnerungen
// ---------------------------------------------------------------------------

function baueErinnerungen(app) {
  const karte = el('section', { class: 'karte' }, [
    el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Erinnerungen' })]),
  ]);

  const anzahl = erinnerungsBloecke(app.zustand.plan).length;

  karte.append(
    el('p', {
      class: 'schalter-hilfe',
      style: { marginTop: '0', marginBottom: '14px' },
      text:
        'Eine Web-App kann dir auf dem iPhone nichts schicken, wenn sie geschlossen ist. ' +
        `Deshalb legt „Mein Tag" ${anzahl} Termine in deinen Apple-Kalender – der erinnert dich zuverlässig.`,
    }),
  );

  // Vorlaufzeit
  const vorlaufFeld = el('input', {
    type: 'number',
    min: '0',
    max: '60',
    step: '1',
    inputmode: 'numeric',
    value: String(app.zustand.einstellungen.vorlaufMinuten),
  });
  vorlaufFeld.addEventListener('change', () => {
    const wert = Math.max(0, Math.min(60, Number(vorlaufFeld.value) || 0));
    vorlaufFeld.value = String(wert);
    app.aktualisiere(setzeEinstellung(app.zustand, 'vorlaufMinuten', wert), { rendern: false });
    app.toast(`Erinnerung ${wert} Minuten vorher`);
  });

  karte.append(
    el('div', { class: 'feld' }, [el('label', { text: 'Wie viele Minuten vorher?' }), vorlaufFeld]),
  );

  if (kalenderVeraltet(app.zustand)) {
    karte.append(
      el('div', { class: 'hinweis' }, [
        icon('glocke', 17),
        el('div', { text: 'Du hast den Plan geändert – exportiere den Kalender neu.' }),
      ]),
    );
  }

  karte.append(
    el(
      'button',
      {
        class: 'knopf akzent',
        onclick: async (ereignis) => {
          const knopf = ereignis.currentTarget;
          knopf.disabled = true;
          try {
            const text = erzeugeIcs(app.zustand.plan, {
              vorlaufMinuten: app.zustand.einstellungen.vorlaufMinuten,
            });
            const weg = await gibDateiHeraus(
              icsDateiname(),
              'text/calendar;charset=utf-8',
              text,
              `${KALENDER_MARKE} – Erinnerungen`,
            );
            if (weg === 'abgebrochen') return;
            app.aktualisiere(merkeKalenderExport(app.zustand), { rendern: false });
            app.toast(
              weg === 'geteilt'
                ? 'Wähle „In Kalender sichern"'
                : 'Datei geladen – öffne sie zum Importieren',
              3200,
            );
          } finally {
            knopf.disabled = false;
          }
        },
      },
      [icon('teilen', 18), el('span', { text: 'Erinnerungen in Kalender übernehmen' })],
    ),
  );

  karte.append(
    el('details', { style: { marginTop: '12px' } }, [
      el('summary', { class: 'schalter-hilfe', text: 'So importierst du die Datei' }),
      el('ol', { class: 'schalter-hilfe', style: { paddingLeft: '18px', lineHeight: '1.7' } }, [
        el('li', {
          text: istStandalone()
            ? 'Tippe oben auf den Knopf – das Teilen-Menü geht auf.'
            : 'Tippe oben auf den Knopf. Safari lädt die Datei oder zeigt das Teilen-Menü.',
        }),
        el('li', { text: 'Wähle „Kalender" bzw. öffne die geladene Datei.' }),
        el('li', { text: 'Tippe auf „Alle hinzufügen".' }),
        el('li', { text: `Alle Termine heißen „… · ${KALENDER_MARKE}" – so findest du sie wieder.` }),
      ]),
    ]),
  );

  // Banner
  karte.append(
    el('div', { class: 'schalterzeile', style: { marginTop: '8px' } }, [
      el('span', { class: 'schalter-text' }, [
        el('div', { class: 'schalter-name', text: 'Banner in der App' }),
        el('div', { class: 'schalter-hilfe', text: '„Jetzt: Joggen", solange die App offen ist' }),
      ]),
      baueSchalter(app.zustand.einstellungen.bannerAn, (an) => {
        app.aktualisiere(setzeEinstellung(app.zustand, 'bannerAn', an), { rendern: false });
      }),
    ]),
  );

  karte.append(
    el('div', { class: 'hinweis ruhig', style: { marginTop: '14px', marginBottom: '0' } }, [
      icon('info', 17),
      el('div', {
        text: 'Fürs Aufstehen um 05:00 nimm lieber den iPhone-Wecker. Der klingelt auch im Lautlos-Modus.',
      }),
    ]),
  );

  return karte;
}

// ---------------------------------------------------------------------------
// Streak-Schwelle
// ---------------------------------------------------------------------------

function baueStreak(app) {
  const wert = el('span', {
    class: 'habit-zahl',
    text: `${app.zustand.einstellungen.streakSchwelle} %`,
  });

  const regler = el('input', {
    class: 'regler',
    type: 'range',
    min: '50',
    max: '100',
    step: '5',
    value: String(app.zustand.einstellungen.streakSchwelle),
    'aria-label': 'Streak-Schwelle in Prozent',
  });

  regler.addEventListener('input', () => { wert.textContent = `${regler.value} %`; });
  regler.addEventListener('change', () => {
    app.aktualisiere(setzeEinstellung(app.zustand, 'streakSchwelle', Number(regler.value)));
  });

  return el('section', { class: 'karte' }, [
    el('div', { class: 'karte-kopf' }, [
      el('span', { class: 'karte-titel', text: 'Streak-Schwelle' }),
      wert,
    ]),
    el('div', {
      class: 'schalter-hilfe',
      style: { marginBottom: '4px' },
      text: 'Ab diesem Anteil zählt ein Tag als geschafft.',
    }),
    regler,
  ]);
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

function baueBackup(app, schliessen) {
  return el('section', { class: 'karte' }, [
    el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Backup' })]),
    el('p', {
      class: 'schalter-hilfe',
      style: { marginTop: '0', marginBottom: '14px' },
      text: 'Alles liegt nur auf diesem Gerät. Sichere dir ab und zu eine Kopie.',
    }),
    el(
      'button',
      {
        class: 'knopf',
        style: { marginBottom: '8px' },
        onclick: async () => {
          const weg = await gibDateiHeraus(
            backupDateiname(),
            'application/json',
            erzeugeBackup(app.zustand),
            'Mein Tag – Backup',
          );
          if (weg !== 'abgebrochen') app.toast('Backup erstellt');
        },
      },
      [icon('teilen', 18), el('span', { text: 'Backup exportieren' })],
    ),
    el(
      'button',
      {
        class: 'knopf',
        onclick: async () => {
          const text = await leseDateiAus();
          if (!text) return;
          const ergebnis = leseBackup(text);
          if (!ergebnis.ok) { app.toast(ergebnis.fehler, 3500); return; }
          app.aktualisiere(ergebnis.zustand);
          schliessen();
          app.toast('Backup eingelesen');
        },
      },
      [icon('kopieren', 18), el('span', { text: 'Backup importieren' })],
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Info
// ---------------------------------------------------------------------------

function baueInfo() {
  const karte = el('section', { class: 'karte' }, [
    el('div', { class: 'karte-kopf' }, [el('span', { class: 'karte-titel', text: 'Über die App' })]),
    el('p', {
      class: 'schalter-hilfe',
      style: { marginTop: '0' },
      text:
        'Mein Tag läuft komplett auf deinem Gerät: keine Anmeldung, kein Server, kein Tracking. ' +
        'Auch ohne Internet funktioniert alles.',
    }),
  ]);

  if (!istStandalone()) {
    karte.append(
      el('div', { class: 'hinweis ruhig', style: { marginTop: '12px', marginBottom: '0' } }, [
        icon('info', 17),
        el('div', {
          text: 'Tipp: Safari → Teilen → „Zum Home-Bildschirm". Dann startet die App im Vollbild.',
        }),
      ]),
    );
  }

  return karte;
}

// ---------------------------------------------------------------------------
// Alles loeschen
// ---------------------------------------------------------------------------

function bestaetigeLoeschen(app) {
  app.dialog('Wirklich alles löschen?', (schliessen) =>
    el('div', {}, [
      el('div', { class: 'hinweis' }, [
        icon('warnung', 17),
        el('div', {
          text:
            'Häkchen, Aufgaben, Ziele, Statistik und dein bearbeiteter Plan werden gelöscht. ' +
            'Das lässt sich nicht rückgängig machen – mach vorher ein Backup!',
        }),
      ]),
      el('div', { class: 'knopf-reihe', style: { marginTop: '18px' } }, [
        // Abbrechen führt zurück in die Einstellungen.
        el('button', {
          class: 'knopf rand',
          text: 'Abbrechen',
          onclick: () => oeffneEinstellungen(app),
        }),
        el('button', {
          class: 'knopf gefahr',
          text: 'Ja, löschen',
          onclick: () => {
            loescheAlles();
            app.datumVersatz = 0;
            app.wochenVersatz = 0;
            app.planTag = null;
            app.aktualisiere(leererZustand());
            schliessen();
            app.toast('Alles gelöscht');
          },
        }),
      ]),
    ]),
  );
}

// ---------------------------------------------------------------------------

function baueSchalter(an, beiAenderung) {
  const schalter = el('button', {
    class: 'schalter',
    role: 'switch',
    'aria-pressed': an ? 'true' : 'false',
  });
  schalter.addEventListener('click', () => {
    const neu = schalter.getAttribute('aria-pressed') !== 'true';
    schalter.setAttribute('aria-pressed', neu ? 'true' : 'false');
    beiAenderung(neu);
  });
  return schalter;
}
