// Tages-Schnappschuesse ("Snapshots").
//
// Problem: Wenn du deinen Wochenplan aenderst, duerfen vergangene Tage sich
// nicht mit aendern - sonst stimmen Statistik und Streaks nicht mehr.
//
// Loesung: Sobald ein Tag zum ersten Mal geoeffnet wird (und er nicht in der
// Zukunft liegt), frieren wir seine Bloecke ein. Ab dann gilt fuer diesen Tag
// nur noch der eingefrorene Plan.

import { wochentagVonIso, tageDazwischen } from './zeit.js';

/**
 * Die Bloecke eines Tages - nur lesend, ohne etwas zu speichern.
 * Gibt es einen Snapshot, gilt der. Sonst der aktuelle Wochenplan.
 */
export function holeTagesplan(zustand, iso) {
  const snapshot = zustand.snapshots?.[iso];
  if (snapshot) return snapshot;
  return zustand.plan?.[wochentagVonIso(iso)] ?? [];
}

/** Liegt dieser Tag in der Zukunft (bezogen auf den heutigen logischen Tag)? */
export function istZukunft(iso, heuteIso) {
  return tageDazwischen(heuteIso, iso) > 0;
}

/**
 * Oeffnet einen Tag: liefert seine Bloecke und - falls noetig - einen neuen
 * Zustand mit frisch angelegtem Snapshot.
 *
 * Zukuenftige Tage bekommen bewusst KEINEN Snapshot, damit Planaenderungen
 * dort noch ankommen.
 *
 * @returns {{zustand: object, bloecke: Array, neuAngelegt: boolean}}
 */
export function oeffneTag(zustand, iso, heuteIso) {
  const vorhanden = zustand.snapshots?.[iso];
  if (vorhanden) return { zustand, bloecke: vorhanden, neuAngelegt: false };

  const bloecke = zustand.plan?.[wochentagVonIso(iso)] ?? [];

  if (istZukunft(iso, heuteIso)) {
    return { zustand, bloecke, neuAngelegt: false };
  }

  // Tiefe Kopie, damit spaetere Planaenderungen den Snapshot nicht beruehren.
  const eingefroren = bloecke.map((b) => ({ ...b }));
  const neuerZustand = {
    ...zustand,
    snapshots: { ...(zustand.snapshots ?? {}), [iso]: eingefroren },
  };
  return { zustand: neuerZustand, bloecke: eingefroren, neuAngelegt: true };
}

/**
 * Frischt den Schnappschuss des heutigen Tages mit dem aktuellen Plan auf.
 *
 * Das wird nach jeder Planaenderung gebraucht: "Aenderungen gelten ab heute".
 * Der heutige Tag ist beim Oeffnen schon eingefroren worden - ohne diesen
 * Schritt wuerde eine Aenderung erst morgen ankommen.
 *
 * Vergangene Tage bleiben unberuehrt. Haekchen haengen an der Block-Kennung
 * und ueberleben deshalb, solange der Block derselbe bleibt.
 */
export function frischeHeuteAuf(zustand, heuteIso) {
  if (!zustand.snapshots?.[heuteIso]) return zustand;

  const ausPlan = zustand.plan?.[wochentagVonIso(heuteIso)] ?? [];
  return {
    ...zustand,
    snapshots: { ...zustand.snapshots, [heuteIso]: ausPlan.map((b) => ({ ...b })) },
  };
}

/**
 * Entfernt Snapshots, die aelter als `tage` Tage sind - damit der Speicher
 * nicht endlos waechst. Standard: 400 Tage (gut ueber ein Jahr).
 */
export function raeumeSnapshotsAuf(zustand, heuteIso, tage = 400) {
  const behalten = {};
  for (const [iso, bloecke] of Object.entries(zustand.snapshots ?? {})) {
    if (tageDazwischen(iso, heuteIso) <= tage) behalten[iso] = bloecke;
  }
  return { ...zustand, snapshots: behalten };
}
