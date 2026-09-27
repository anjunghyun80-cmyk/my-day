// Der Sport-Bildschirm: mein Trainingsplan.
//
// Oben steht, was heute ansteht (zum Abhaken), darunter der komplette
// Wochenplan und eine kurze Auswertung.

import { el, leere } from './dom.js';
import { icon } from './icons.js';

import {
  WORKOUT_ARTEN,
  ARTEN_SCHLUESSEL,
  artName,
  neuesWorkout,
  pruefeWorkout,
  alleWorkouts,
  sortiereWorkouts,
  workoutsFuerTag,
  speichereWorkout,
  loescheWorkout,
  schalteWorkout,
  istWorkoutErledigt,
  workoutDauer,
  workoutBilanz,
  workoutStreak,
  minutenProWoche,
  vorschlaegeAusPlan,
} from '../logik/workout.js';
import { formatiereDauer, zuText, zuMinuten } from '../logik/zeit.js';
import { WOCHENTAGE, WOCHENTAG_KURZ, WOCHENTAG_NAMEN } from '../daten/standardplan.js';

export function rendereSport(app) {
  const heuteIso = app.heute();
  const wurzel = document.createDocumentFragment();
  const liste = sortiereWorkouts(alleWorkouts(app.zustand));

  wurzel.append(
    el('header', { class: 'kopf' }, [
      el('div', {}, [
        el('h1', { class: 'kopf-titel', text: 'Sport' }),
        el('div', {
          class: 'kopf-unter',
          text:
            liste.length === 0
              ? 'Noch kein Training angelegt'
              : `${liste.length} ${liste.length === 1 ? 'Training' : 'Trainings'} · ${formatiereDauer(minutenProWoche(app.zustand))} pro Woche`,
        }),
      ]),
      el(
        'button',
        { class: 'rund', 'aria-label': 'Einstellungen', onclick: () => app.oeffneEinstellungen() },
        [icon('einstellungen', 21)],
      ),
    ]),
  );

  // ------------------------------------------------------------ Leerer Start
  if (liste.length === 0) {
    const vorschlaege = vorschlaegeAusPlan(app.zustand.plan);

    wurzel.append(
      el('section', { class: 'karte' }, [
        el('div', { class: 'leer' }, [
          el('div', { class: 'leer-zeichen' }, [icon('sport', 22)]),
          el('div', { class: 'leer-titel', text: 'Dein Trainingsplan' }),
          el('div', {
            text: 'Trag ein, was du machst, an welchen Tagen und von wann bis wann. Danach hakst du hier ab.',
          }),
        ]),
        el(
          'button',
          {
            class: 'knopf akzent',
            style: { marginBottom: '8px' },
            onclick: () => oeffneWorkoutDialog(app, null),
          },
          [icon('plus', 18), el('span', { text: 'Training hinzufügen' })],
        ),
        vorschlaege.length > 0
          ? el(
              'button',
              {
                class: 'knopf rand',
                onclick: () => {
                  let zustand = app.zustand;
                  for (const w of vorschlaege) zustand = speichereWorkout(zustand, w);
                  app.aktualisiere(zustand);
                  app.toast(`${vorschlaege.length} aus dem Wochenplan übernommen`);
                },
              },
              [
                icon('kopieren', 18),
                el('span', { text: `Aus Wochenplan übernehmen (${vorschlaege.length})` }),
              ],
            )
          : null,
      ]),
    );
    return wurzel;
  }

  // ---------------------------------------------------------------- Heute
  const heute = workoutsFuerTag(app.zustand, heuteIso);

  if (heute.length > 0) {
    const karte = el('section', { class: 'karte' });
    const fertig = heute.filter((w) => istWorkoutErledigt(app.zustand, heuteIso, w.id)).length;

    karte.append(
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: 'Heute' }),
        el('span', { class: 'karte-zaehler', text: `${fertig}/${heute.length}` }),
      ]),
    );

    for (const w of heute) {
      karte.append(baueHeuteZeile(app, heuteIso, w, () => app.rendere()));
    }
    wurzel.append(karte);
  } else {
    wurzel.append(
      el('div', { class: 'hinweis ruhig' }, [
        icon('info', 17),
        el('div', { text: 'Heute steht kein Training im Plan. Ruhetag.' }),
      ]),
    );
  }

  // ------------------------------------------------------------ Diese Woche
  const bilanz = workoutBilanz(app.zustand, heuteIso, 7);

  wurzel.append(
    el('section', { class: 'karte' }, [
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: 'Letzte 7 Tage' }),
      ]),
      el('div', { class: 'kacheln' }, [
        el('div', { class: 'kachel' }, [
          el('div', { class: 'kachel-wert akzent', text: `${bilanz.gemacht}` }),
          el('div', { class: 'kachel-name', text: `von ${bilanz.geplant} Einheiten` }),
        ]),
        el('div', { class: 'kachel' }, [
          el('div', { class: 'kachel-wert', text: formatiereDauer(bilanz.minutenGemacht) }),
          el('div', { class: 'kachel-name', text: 'trainiert' }),
        ]),
      ]),
    ]),
  );

  // -------------------------------------------------------------- Mein Plan
  const planKarte = el('section', { class: 'karte eng' });
  planKarte.append(
    el('div', { class: 'karte-kopf', style: { padding: '4px 4px 0' } }, [
      el('span', { class: 'karte-titel', text: 'Mein Trainingsplan' }),
    ]),
  );

  for (const w of liste) {
    const streak = workoutStreak(app.zustand, heuteIso, w.id);
    planKarte.append(
      el('div', { class: 'plan-zeile' }, [
        el('div', { class: 'block', dataset: { art: w.art } }, [
          el('div', { class: 'block-zeit' }, [
            el('div', { text: zuText(zuMinuten(w.start)) }),
            el('div', { class: 'bis', text: zuText(zuMinuten(w.ende)) }),
          ]),
          el('div', { class: 'block-mitte' }, [
            el('div', { class: 'block-titel', text: w.name }),
            el('div', { class: 'block-notiz' }, [
              el('span', { text: tageText(w.tage) }),
              el('span', { text: ` · ${artName(w.art)}` }),
              w.saetze > 0 && w.wiederholungen > 0
                ? el('span', { text: ` · ${w.saetze}×${w.wiederholungen}` })
                : null,
            ]),
          ]),
          streak > 1
            ? el('span', { class: 'block-schild' }, [icon('flamme', 13), el('span', { text: String(streak) })])
            : null,
        ]),
        el(
          'button',
          {
            class: 'werkzeug',
            'aria-label': `${w.name} bearbeiten`,
            onclick: () => oeffneWorkoutDialog(app, w),
          },
          [icon('stift', 17)],
        ),
      ]),
    );
  }

  wurzel.append(planKarte);

  // ----------------------------------------------------------- Je Training
  if (bilanz.proWorkout.length > 0) {
    const quoteKarte = el('section', { class: 'karte' }, [
      el('div', { class: 'karte-kopf' }, [
        el('span', { class: 'karte-titel', text: 'Wie treu bin ich?' }),
      ]),
    ]);

    for (const eintrag of bilanz.proWorkout) {
      const prozent = Math.round((eintrag.gemacht / eintrag.geplant) * 100);
      quoteKarte.append(
        el('div', { class: 'balken' }, [
          el('span', { class: 'balken-name', text: eintrag.workout.name }),
          el('span', { class: 'balken-spur' }, [el('i', { style: { width: `${prozent}%` } })]),
          el('span', { class: 'balken-wert', text: `${eintrag.gemacht}/${eintrag.geplant}` }),
        ]),
      );
    }
    wurzel.append(quoteKarte);
  }

  // ---------------------------------------------------------------- Aktion
  wurzel.append(
    el('section', { class: 'karte' }, [
      el('button', { class: 'knopf akzent', onclick: () => oeffneWorkoutDialog(app, null) }, [
        icon('plus', 18),
        el('span', { text: 'Training hinzufügen' }),
      ]),
    ]),
  );

  return wurzel;
}

// ---------------------------------------------------------------------------

/** "Mo, Mi, Fr" bzw. "täglich" */
export function tageText(tage) {
  if (tage.length === 7) return 'täglich';
  const sortiert = WOCHENTAGE.filter((t) => tage.includes(t));
  return sortiert.map((t) => WOCHENTAG_KURZ[t]).join(', ');
}

/** Eine abhakbare Zeile fuer den heutigen Tag. */
function baueHeuteZeile(app, iso, workout, beiAenderung) {
  const fertig = istWorkoutErledigt(app.zustand, iso, workout.id);
  const zeile = el('div', { class: `zeile${fertig ? ' erledigt' : ''}` });

  const kaestchen = el('span', { class: `kaestchen${fertig ? ' an' : ''}` }, [icon('haken', 15)]);

  const schalter = el(
    'button',
    {
      class: 'tippziel',
      'aria-label': `${workout.name} abhaken`,
      'aria-pressed': fertig ? 'true' : 'false',
      onclick: () => {
        app.aktualisiere(schalteWorkout(app.zustand, iso, workout.id), { rendern: false });
        beiAenderung();
      },
    },
    [kaestchen],
  );

  zeile.append(
    schalter,
    el('span', { class: 'zeile-text' }, [
      el('div', { text: workout.name }),
      el('div', { class: 'block-notiz' }, [
        el('span', {
          text: `${zuText(zuMinuten(workout.start))}–${zuText(zuMinuten(workout.ende))} · ${formatiereDauer(workoutDauer(workout))}`,
        }),
        workout.saetze > 0 && workout.wiederholungen > 0
          ? el('span', { text: ` · ${workout.saetze}×${workout.wiederholungen}` })
          : null,
      ]),
    ]),
  );

  return zeile;
}

// ===========================================================================
// Training anlegen / bearbeiten
// ===========================================================================

function oeffneWorkoutDialog(app, workout) {
  const istNeu = !workout;
  const vorlage = workout ?? neuesWorkout({ tage: [] });

  app.dialog(istNeu ? 'Neues Training' : 'Training bearbeiten', (schliessen) => {
    const form = el('div', {});
    const fehlerZeile = el('div', { class: 'fehler', hidden: true });

    const nameFeld = el('input', {
      type: 'text',
      value: vorlage.name,
      placeholder: 'z. B. Krafttraining Oberkörper',
    });

    const artFeld = el('select', {});
    for (const a of ARTEN_SCHLUESSEL) {
      artFeld.append(
        el('option', { value: a, text: WORKOUT_ARTEN[a].name, selected: a === vorlage.art }),
      );
    }

    // Wochentage
    const gewaehlteTage = new Set(vorlage.tage);
    const tagKaesten = el('div', { class: 'kaesten' });
    const haeufigkeit = el('div', { class: 'feld-hilfe' });

    const zeigeHaeufigkeit = () => {
      const n = gewaehlteTage.size;
      haeufigkeit.textContent =
        n === 0 ? 'Noch kein Tag gewählt.' : `${n}× pro Woche (${tageText([...gewaehlteTage])})`;
    };

    for (const t of WOCHENTAGE) {
      const an = gewaehlteTage.has(t);
      const knopf = el('button', {
        text: WOCHENTAG_KURZ[t],
        'aria-label': WOCHENTAG_NAMEN[t],
        'aria-pressed': an ? 'true' : 'false',
        onclick: () => {
          const jetztAn = knopf.getAttribute('aria-pressed') !== 'true';
          knopf.setAttribute('aria-pressed', jetztAn ? 'true' : 'false');
          if (jetztAn) gewaehlteTage.add(t);
          else gewaehlteTage.delete(t);
          zeigeHaeufigkeit();
        },
      });
      tagKaesten.append(knopf);
    }
    zeigeHaeufigkeit();

    const startFeld = el('input', { type: 'time', value: zuText(zuMinuten(vorlage.start)), step: 300 });
    const endeFeld = el('input', { type: 'time', value: zuText(zuMinuten(vorlage.ende)), step: 300 });

    const saetzeFeld = el('input', {
      type: 'number', min: '0', max: '20', inputmode: 'numeric',
      value: String(vorlage.saetze || ''), placeholder: '–',
    });
    const wdhFeld = el('input', {
      type: 'number', min: '0', max: '200', inputmode: 'numeric',
      value: String(vorlage.wiederholungen || ''), placeholder: '–',
    });

    const notizFeld = el('textarea', { placeholder: 'Übungen, Gewicht, Strecke … (freiwillig)' });
    notizFeld.value = vorlage.notiz ?? '';

    form.append(
      fehlerZeile,
      el('div', { class: 'feld' }, [el('label', { text: 'Was machst du?' }), nameFeld]),
      el('div', { class: 'feld' }, [el('label', { text: 'Art' }), artFeld]),
      el('div', { class: 'feld' }, [
        el('label', { text: 'An welchen Tagen?' }),
        tagKaesten,
        haeufigkeit,
      ]),
      el('div', { class: 'feld-paar' }, [
        el('div', { class: 'feld' }, [el('label', { text: 'Von' }), startFeld]),
        el('div', { class: 'feld' }, [el('label', { text: 'Bis' }), endeFeld]),
      ]),
      el('div', { class: 'feld-paar' }, [
        el('div', { class: 'feld' }, [el('label', { text: 'Sätze' }), saetzeFeld]),
        el('div', { class: 'feld' }, [el('label', { text: 'Wiederholungen' }), wdhFeld]),
      ]),
      el('div', { class: 'feld' }, [el('label', { text: 'Notiz' }), notizFeld]),
    );

    const speichern = () => {
      const entwurf = neuesWorkout({
        ...vorlage,
        name: nameFeld.value.trim(),
        art: artFeld.value,
        tage: WOCHENTAGE.filter((t) => gewaehlteTage.has(t)),
        start: startFeld.value || '00:00',
        ende: endeFeld.value || '00:00',
        saetze: Number(saetzeFeld.value) || 0,
        wiederholungen: Number(wdhFeld.value) || 0,
        notiz: notizFeld.value.trim(),
      });

      const fehler = pruefeWorkout(entwurf);
      if (fehler) {
        leere(fehlerZeile);
        fehlerZeile.append(icon('warnung', 17), el('div', { text: fehler }));
        fehlerZeile.hidden = false;
        return;
      }

      app.aktualisiere(speichereWorkout(app.zustand, entwurf));
      schliessen();
      app.toast(istNeu ? 'Training angelegt' : 'Training gespeichert');
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
              app.aktualisiere(loescheWorkout(app.zustand, vorlage.id));
              schliessen();
              app.toast('Training gelöscht');
            },
          },
          [icon('muell', 18), el('span', { text: 'Dieses Training löschen' })],
        ),
      );
    }

    return form;
  });
}
