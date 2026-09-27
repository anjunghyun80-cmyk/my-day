// Der Plan-Bildschirm: Wochentag waehlen, Bloecke anlegen, aendern, loeschen,
// auf andere Tage kopieren und den Standardplan wiederherstellen.
//
// Wichtig: Alle Aenderungen gelten ab heute. Vergangene Tage haben ihren
// eigenen Schnappschuss (siehe js/logik/snapshot.js) und bleiben, wie sie waren.

import { el, leere } from './dom.js';
import { icon } from './icons.js';

import {
  zuMinuten,
  zuText,
  zuRohText,
  wochentagVonIso,
  formatiereDauer,
  TAG_MIN,
} from '../logik/zeit.js';
import {
  neuerBlock,
  pruefeBlock,
  findeLuecken,
  kopiereAufTage,
  speichereBlock,
  loescheBlock,
  baueStandardplan,
} from '../logik/plan.js';
import { merkePlanAenderung, kalenderVeraltet } from '../logik/zustand.js';
import { frischeHeuteAuf } from '../logik/snapshot.js';
import { KATEGORIEN, KATEGORIE_SCHLUESSEL, kategorieAbhakbar, kategorieKurz } from '../daten/kategorien.js';
import { WOCHENTAGE, WOCHENTAG_NAMEN, WOCHENTAG_KURZ } from '../daten/standardplan.js';

/**
 * Speichert einen geaenderten Wochenplan.
 *
 * Drei Dinge passieren hier immer zusammen:
 * 1. der neue Plan wird uebernommen,
 * 2. der heutige Tag wird aufgefrischt (sonst gaelte die Aenderung erst morgen),
 * 3. wir merken uns die Aenderung fuer den Hinweis "Kalender neu exportieren".
 */
function speicherePlan(app, neuerPlan) {
  let zustand = { ...app.zustand, plan: neuerPlan };
  zustand = frischeHeuteAuf(zustand, app.heute());
  app.aktualisiere(merkePlanAenderung(zustand));
}

export function renderePlan(app) {
  const tag = app.planTag ?? wochentagVonIso(app.heute());
  app.planTag = tag;
  const bloecke = app.zustand.plan[tag] ?? [];
  const wurzel = document.createDocumentFragment();

  wurzel.append(
    el('header', { class: 'kopf' }, [
      el('div', {}, [
        el('h1', { class: 'kopf-titel', text: 'Plan' }),
        el('div', { class: 'kopf-unter', text: `${WOCHENTAG_NAMEN[tag]} · ${bloecke.length} Blöcke` }),
      ]),
      el(
        'button',
        { class: 'rund', 'aria-label': 'Einstellungen', onclick: () => app.oeffneEinstellungen() },
        [icon('einstellungen', 21)],
      ),
    ]),
  );

  // Wochentag waehlen
  const tagwahl = el('div', { class: 'tagwahl' });
  for (const t of WOCHENTAGE) {
    tagwahl.append(
      el('button', {
        text: WOCHENTAG_KURZ[t],
        'aria-pressed': t === tag ? 'true' : 'false',
        onclick: () => { app.planTag = t; app.rendere(); },
      }),
    );
  }
  wurzel.append(tagwahl);

  // Hinweis: Kalender neu exportieren
  if (kalenderVeraltet(app.zustand)) {
    wurzel.append(
      el('div', { class: 'hinweis' }, [
        icon('glocke', 17),
        el('div', {}, [
          el('div', { text: 'Du hast den Plan geändert – exportiere den Kalender neu.' }),
          el('button', {
            class: 'knopf',
            style: { marginTop: '10px' },
            text: 'Zu den Einstellungen',
            onclick: () => app.oeffneEinstellungen(),
          }),
        ]),
      ]),
    );
  }

  // Hinweis: Lücken
  const luecken = findeLuecken(bloecke);
  if (luecken.length > 0) {
    wurzel.append(
      el('div', { class: 'hinweis ruhig' }, [
        icon('warnung', 17),
        el('div', {
          text:
            `${luecken.length === 1 ? 'Lücke' : 'Lücken'}: ` +
            luecken
              .map(
                (l) =>
                  `${zuText(l.vonMin)}–${zuText(l.bisMin)} (${formatiereDauer(l.bisMin - l.vonMin)})`,
              )
              .join(', '),
        }),
      ]),
    );
  }

  // Blockliste
  const karte = el('section', { class: 'karte eng' });

  if (bloecke.length === 0) {
    karte.append(
      el('div', { class: 'leer' }, [
        el('div', { class: 'leer-zeichen' }, [icon('plan', 22)]),
        el('div', { class: 'leer-titel', text: 'Noch nichts geplant' }),
        el('div', { text: 'Leg unten deinen ersten Block an.' }),
      ]),
    );
  }

  for (const block of bloecke) {
    karte.append(
      el('div', { class: 'plan-zeile' }, [
        el(
          'div',
          {
            class: 'block',
            dataset: {
              kat: block.kategorie,
              gestreift: KATEGORIEN[block.kategorie]?.gestreift ? 'ja' : 'nein',
            },
          },
          [
            el('div', { class: 'block-zeit' }, [
              el('div', { text: block.start }),
              el('div', { class: 'bis', text: block.ende }),
            ]),
            el('div', { class: 'block-mitte' }, [
              el('div', { class: 'block-titel', text: block.titel }),
              el('div', { class: 'block-notiz' }, [
                el('span', { text: kategorieKurz(block.kategorie) }),
                block.abhakbar ? el('span', { text: ' · abhakbar' }) : null,
                block.erinnerung ? el('span', { text: ' · Erinnerung' }) : null,
              ]),
            ]),
          ],
        ),
        el(
          'button',
          {
            class: 'werkzeug',
            'aria-label': `${block.titel} bearbeiten`,
            onclick: () => oeffneBlockDialog(app, tag, block),
          },
          [icon('stift', 17)],
        ),
      ]),
    );
  }

  wurzel.append(karte);

  // Aktionen
  wurzel.append(
    el('section', { class: 'karte' }, [
      el(
        'button',
        {
          class: 'knopf akzent',
          style: { marginBottom: '8px' },
          onclick: () => oeffneBlockDialog(app, tag, null),
        },
        [icon('plus', 18), el('span', { text: 'Block hinzufügen' })],
      ),
      el(
        'button',
        {
          class: 'knopf',
          style: { marginBottom: '8px' },
          onclick: () => oeffneKopierDialog(app, tag),
        },
        [icon('kopieren', 18), el('span', { text: 'Auf andere Tage kopieren' })],
      ),
      el('button', { class: 'knopf gefahr', onclick: () => bestaetigeZuruecksetzen(app) }, [
        el('span', { text: 'Auf Standardplan zurücksetzen' }),
      ]),
    ]),
  );

  wurzel.append(
    el('div', { class: 'hinweis ruhig' }, [
      icon('info', 17),
      el('div', {
        text: 'Änderungen gelten ab heute. Vergangene Tage behalten ihren Plan, damit die Statistik stimmt.',
      }),
    ]),
  );

  return wurzel;
}

// ===========================================================================
// Block anlegen / bearbeiten
// ===========================================================================

/**
 * Zerlegt eine Minutenangabe in Zeitfeld und "heute / morgen frueh".
 * 1740 ("29:00") wird zu { zeit: "05:00", naechsterTag: true }.
 */
function zerlegeZeit(minuten) {
  return { zeit: zuText(minuten), naechsterTag: minuten >= TAG_MIN };
}

function oeffneBlockDialog(app, tag, block) {
  const istNeu = !block;
  const vorlage = block ?? neuerBlock({ start: '15:00', ende: '16:00', kategorie: 'frei', titel: '' });

  const startTeile = zerlegeZeit(zuMinuten(vorlage.start));
  const endeTeile = zerlegeZeit(zuMinuten(vorlage.ende));

  app.dialog(istNeu ? 'Neuer Block' : 'Block bearbeiten', (schliessen) => {
    const form = el('div', {});
    const fehlerZeile = el('div', { class: 'fehler', hidden: true });

    const startFeld = el('input', { type: 'time', value: startTeile.zeit, step: 300 });
    const startTag = baueTagAuswahl(startTeile.naechsterTag);
    const endeFeld = el('input', { type: 'time', value: endeTeile.zeit, step: 300 });
    const endeTag = baueTagAuswahl(endeTeile.naechsterTag);

    const titelFeld = el('input', { type: 'text', value: vorlage.titel, placeholder: 'z. B. Joggen' });
    const notizFeld = el('textarea', { placeholder: 'Notiz (freiwillig)' });
    notizFeld.value = vorlage.notiz ?? '';

    const katFeld = el('select', {});
    for (const k of KATEGORIE_SCHLUESSEL) {
      katFeld.append(
        el('option', { value: k, text: KATEGORIEN[k].name, selected: k === vorlage.kategorie }),
      );
    }

    const abhakbarSchalter = baueSchalter(vorlage.abhakbar);
    const erinnerungSchalter = baueSchalter(vorlage.erinnerung);

    // Wechselt man die Kategorie, schlaegt die App "abhakbar" passend vor.
    katFeld.addEventListener('change', () => {
      abhakbarSchalter.setAttribute(
        'aria-pressed',
        kategorieAbhakbar(katFeld.value) ? 'true' : 'false',
      );
    });

    form.append(
      fehlerZeile,
      el('div', { class: 'feld' }, [el('label', { text: 'Titel' }), titelFeld]),
      el('div', { class: 'feld-paar' }, [
        el('div', { class: 'feld' }, [el('label', { text: 'Start' }), startFeld, el('div', { style: { height: '8px' } }), startTag]),
        el('div', { class: 'feld' }, [el('label', { text: 'Ende' }), endeFeld, el('div', { style: { height: '8px' } }), endeTag]),
      ]),
      el('div', { class: 'feld' }, [el('label', { text: 'Kategorie' }), katFeld]),
      el('div', { class: 'feld' }, [el('label', { text: 'Notiz' }), notizFeld]),
      el('div', { class: 'schalterzeile' }, [
        el('span', { class: 'schalter-text' }, [
          el('div', { class: 'schalter-name', text: 'Abhakbar' }),
          el('div', { class: 'schalter-hilfe', text: 'Zählt für Fortschritt und Streak mit' }),
        ]),
        abhakbarSchalter,
      ]),
      el('div', { class: 'schalterzeile' }, [
        el('span', { class: 'schalter-text' }, [
          el('div', { class: 'schalter-name', text: 'Erinnerung' }),
          el('div', { class: 'schalter-hilfe', text: 'Kommt in die Kalender-Datei' }),
        ]),
        erinnerungSchalter,
      ]),
    );

    const speichern = () => {
      let startMin;
      let endeMin;
      try {
        startMin = zuMinuten(startFeld.value) + (startTag.value === '1' ? TAG_MIN : 0);
        endeMin = zuMinuten(endeFeld.value) + (endeTag.value === '1' ? TAG_MIN : 0);
      } catch {
        zeigeFehler(fehlerZeile, 'Bitte gib gültige Uhrzeiten an.');
        return;
      }

      const entwurf = {
        ...vorlage,
        start: zuRohText(startMin),
        ende: zuRohText(endeMin),
        titel: titelFeld.value.trim(),
        notiz: notizFeld.value.trim(),
        kategorie: katFeld.value,
        abhakbar: abhakbarSchalter.getAttribute('aria-pressed') === 'true',
        erinnerung: erinnerungSchalter.getAttribute('aria-pressed') === 'true',
      };

      const fehler = pruefeBlock(entwurf, app.zustand.plan[tag] ?? []);
      if (fehler) { zeigeFehler(fehlerZeile, fehler); return; }

      speicherePlan(app, speichereBlock(app.zustand.plan, tag, entwurf));
      schliessen();
      app.toast(istNeu ? 'Block angelegt' : 'Block gespeichert');
    };

    form.append(
      el('button', {
        class: 'knopf akzent gross',
        style: { marginTop: '18px' },
        text: 'Speichern',
        onclick: speichern,
      }),
    );

    if (!istNeu) {
      form.append(
        el(
          'button',
          {
            class: 'knopf gefahr',
            style: { marginTop: '8px' },
            onclick: () => {
              speicherePlan(app, loescheBlock(app.zustand.plan, tag, vorlage.id));
              schliessen();
              app.toast('Block gelöscht');
            },
          },
          [icon('muell', 18), el('span', { text: 'Diesen Block löschen' })],
        ),
      );
    }

    return form;
  });
}

function zeigeFehler(knoten, text) {
  leere(knoten);
  knoten.append(icon('warnung', 17), el('div', { text }));
  knoten.hidden = false;
}

function baueTagAuswahl(istNaechsterTag) {
  return el('select', { 'aria-label': 'Tag' }, [
    el('option', { value: '0', text: 'am selben Tag', selected: !istNaechsterTag }),
    el('option', { value: '1', text: 'morgen früh', selected: istNaechsterTag }),
  ]);
}

function baueSchalter(an) {
  const schalter = el('button', {
    class: 'schalter',
    role: 'switch',
    'aria-pressed': an ? 'true' : 'false',
  });
  schalter.addEventListener('click', () => {
    schalter.setAttribute(
      'aria-pressed',
      schalter.getAttribute('aria-pressed') !== 'true' ? 'true' : 'false',
    );
  });
  return schalter;
}

// ===========================================================================
// Auf andere Tage kopieren
// ===========================================================================

function oeffneKopierDialog(app, vonTag) {
  const bloecke = app.zustand.plan[vonTag] ?? [];

  app.dialog(`${WOCHENTAG_NAMEN[vonTag]} kopieren`, (schliessen) => {
    const form = el('div', {});
    const gewaehlteBloecke = new Set(bloecke.map((b) => b.id));
    const zieltage = new Set();

    form.append(
      el('div', { class: 'karte-titel', style: { marginBottom: '10px' }, text: '1. Welche Blöcke?' }),
      el('div', { class: 'knopf-reihe', style: { marginBottom: '10px' } }, [
        el('button', {
          class: 'knopf rand',
          text: 'Alle',
          onclick: () => { bloecke.forEach((b) => gewaehlteBloecke.add(b.id)); zeichneBloecke(); },
        }),
        el('button', {
          class: 'knopf rand',
          text: 'Keine',
          onclick: () => { gewaehlteBloecke.clear(); zeichneBloecke(); },
        }),
      ]),
    );

    const blockListe = el('div', {
      style: { maxHeight: '36vh', overflowY: 'auto', marginBottom: '20px' },
    });
    form.append(blockListe);

    function zeichneBloecke() {
      leere(blockListe);
      for (const block of bloecke) {
        const an = gewaehlteBloecke.has(block.id);
        const kaestchen = el('span', { class: `kaestchen${an ? ' an' : ''}` }, [icon('haken', 14)]);

        blockListe.append(
          el(
            'button',
            {
              class: 'zeile',
              style: { width: '100%' },
              'aria-pressed': an ? 'true' : 'false',
              onclick: () => {
                if (gewaehlteBloecke.has(block.id)) gewaehlteBloecke.delete(block.id);
                else gewaehlteBloecke.add(block.id);
                zeichneBloecke();
              },
            },
            [
              el('span', { class: 'tippziel' }, [kaestchen]),
              el('span', { class: 'zeile-text' }, [
                el('div', { text: block.titel }),
                el('div', { class: 'block-notiz', text: `${block.start}–${block.ende}` }),
              ]),
            ],
          ),
        );
      }
    }
    zeichneBloecke();

    form.append(
      el('div', { class: 'karte-titel', style: { marginBottom: '10px' }, text: '2. Auf welche Tage?' }),
    );

    const tagKaesten = el('div', { class: 'kaesten', style: { marginBottom: '14px' } });
    for (const t of WOCHENTAGE) {
      if (t === vonTag) continue;
      const knopf = el('button', {
        text: WOCHENTAG_KURZ[t],
        'aria-pressed': 'false',
        onclick: () => {
          const an = knopf.getAttribute('aria-pressed') !== 'true';
          knopf.setAttribute('aria-pressed', an ? 'true' : 'false');
          if (an) zieltage.add(t); else zieltage.delete(t);
        },
      });
      tagKaesten.append(knopf);
    }
    form.append(tagKaesten);

    form.append(
      el('div', { class: 'hinweis ruhig' }, [
        icon('info', 17),
        el('div', { text: 'Blöcke, die zur gleichen Zeit auf dem Zieltag liegen, werden ersetzt.' }),
      ]),
      el('button', {
        class: 'knopf akzent gross',
        text: 'Kopieren',
        onclick: () => {
          if (zieltage.size === 0) { app.toast('Wähle mindestens einen Tag.'); return; }
          if (gewaehlteBloecke.size === 0) { app.toast('Wähle mindestens einen Block.'); return; }

          const auswahl = bloecke.filter((b) => gewaehlteBloecke.has(b.id));
          speicherePlan(app, kopiereAufTage(app.zustand.plan, auswahl, [...zieltage]));
          schliessen();
          app.toast(`Auf ${zieltage.size} ${zieltage.size === 1 ? 'Tag' : 'Tage'} kopiert`);
        },
      }),
    );

    return form;
  });
}

// ===========================================================================
// Zuruecksetzen
// ===========================================================================

function bestaetigeZuruecksetzen(app) {
  app.dialog('Plan zurücksetzen?', (schliessen) =>
    el('div', {}, [
      el('p', {
        text:
          'Der komplette Wochenplan wird auf den Standardplan zurückgesetzt. ' +
          'Vergangene Tage, deine Aufgaben, Ziele und die Statistik bleiben erhalten – ' +
          'nur die Häkchen von heute musst du neu setzen, weil der heutige Tag neu aufgebaut wird.',
      }),
      el('div', { class: 'knopf-reihe', style: { marginTop: '18px' } }, [
        el('button', { class: 'knopf rand', text: 'Abbrechen', onclick: schliessen }),
        el('button', {
          class: 'knopf gefahr',
          text: 'Zurücksetzen',
          onclick: () => {
            speicherePlan(app, baueStandardplan());
            schliessen();
            app.toast('Standardplan wiederhergestellt');
          },
        }),
      ]),
    ]),
  );
}
