// Der Tagesabschluss: Ist heute wirklich alles erledigt? Und welcher Satz
// erscheint dann?
//
// "Alles" heisst: jeder abhakbare Block, jede eigene Aufgabe und jedes
// Tagesziel, in dem etwas steht. Reine Funktionen, damit man es testen kann.

import { abhakbareBloecke } from './plan.js';

/**
 * Zaehlt den Tag in seinen vier Teilen.
 * @param {{bloecke:Array, erledigt:object, aufgaben:Array, ziele:Array, workouts:Array}} tag
 */
export function tagesBilanz(tag) {
  const erledigt = tag.erledigt ?? {};

  const bloecke = abhakbareBloecke(tag.bloecke ?? []);
  const aufgaben = tag.aufgaben ?? [];
  const workouts = tag.workouts ?? [];
  const ziele = (tag.ziele ?? []).filter((z) => z.text && z.text.trim());

  const teile = {
    bloecke: { gesamt: bloecke.length, fertig: bloecke.filter((b) => erledigt[b.id]).length },
    aufgaben: { gesamt: aufgaben.length, fertig: aufgaben.filter((a) => a.erledigt).length },
    workouts: { gesamt: workouts.length, fertig: workouts.filter((w) => w.erledigt).length },
    ziele: { gesamt: ziele.length, fertig: ziele.filter((z) => z.erledigt).length },
  };

  const gesamt =
    teile.bloecke.gesamt + teile.aufgaben.gesamt + teile.workouts.gesamt + teile.ziele.gesamt;
  const fertig =
    teile.bloecke.fertig + teile.aufgaben.fertig + teile.workouts.fertig + teile.ziele.fertig;

  return {
    teile,
    gesamt,
    fertig,
    offen: gesamt - fertig,
    prozent: gesamt === 0 ? 0 : Math.round((fertig / gesamt) * 100),
    komplett: gesamt > 0 && fertig === gesamt,
  };
}

/** Kurzform: ist der Tag komplett? */
export function istTagKomplett(tag) {
  return tagesBilanz(tag).komplett;
}

/**
 * Soll die Feier gezeigt werden?
 * Nur wenn der Tag komplett ist und wir an diesem Tag noch nicht gefeiert
 * haben - sonst poppt sie bei jedem Antippen wieder auf.
 */
export function sollFeiern(tag, schonGefeiert) {
  return istTagKomplett(tag) && !schonGefeiert;
}

export const SPRUECHE = [
  { titel: 'Sehr schön!', text: 'Du hast heute alles erreicht, was du dir vorgenommen hast.' },
  { titel: 'Alles abgehakt.', text: 'Kompletter Tag. Den Abend hast du dir verdient.' },
  { titel: 'Sauber durchgezogen!', text: 'Kein offener Punkt mehr. Stark gemacht.' },
  { titel: 'Volle Punktzahl.', text: 'Jeder Block, jede Aufgabe, jedes Ziel - alles erledigt.' },
  { titel: 'Das war ein runder Tag.', text: 'Du hast heute nichts liegen lassen.' },
  { titel: 'Alles geschafft!', text: 'So sieht ein Tag aus, der sitzt.' },
  { titel: 'Stark!', text: 'Du hast deinen Plan heute zu 100 % durchgezogen.' },
  { titel: 'Feierabend.', text: 'Deine Liste ist leer - und zwar richtig leer.' },
];

/**
 * Waehlt einen Spruch. Derselbe Tag bekommt immer denselben Spruch, damit er
 * nicht bei jedem Blick wechselt.
 */
export function spruchFuer(iso) {
  let summe = 0;
  for (let i = 0; i < iso.length; i += 1) summe = (summe * 31 + iso.charCodeAt(i)) >>> 0;
  return SPRUECHE[summe % SPRUECHE.length];
}
