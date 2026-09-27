// Dateien herausgeben und einlesen.
//
// Auf dem iPhone ist das im Home-Bildschirm-Modus (Vollbild) heikel:
// Ein normaler Download landet dort leicht im Nichts. Kann der Browser
// Dateien teilen (navigator.share mit files), nehmen wir das - dann kommt
// das iOS-Teilen-Menue, und du waehlst "In Kalender sichern" bzw. "Sichern in
// Dateien". Sonst faellt die App auf einen normalen Download zurueck.

/** Laeuft die App gerade als Home-Bildschirm-App im Vollbild? */
export function istStandalone() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/** Kann dieser Browser echte Dateien teilen? */
export function kannDateienTeilen(datei) {
  try {
    return Boolean(navigator.canShare && navigator.canShare({ files: [datei] }));
  } catch {
    return false;
  }
}

/**
 * Gibt eine Datei heraus: erst Teilen versuchen, sonst herunterladen.
 * @returns {Promise<'geteilt'|'geladen'|'abgebrochen'>}
 */
export async function gibDateiHeraus(name, mimeTyp, inhalt, titel = name) {
  const datei = new File([inhalt], name, { type: mimeTyp });

  if (kannDateienTeilen(datei)) {
    try {
      await navigator.share({ files: [datei], title: titel });
      return 'geteilt';
    } catch (fehler) {
      // "AbortError" heisst: Teilen-Menue wurde weggewischt. Alles gut.
      if (fehler?.name === 'AbortError') return 'abgebrochen';
      // Sonst weiter zum Download-Weg.
    }
  }

  lade(name, mimeTyp, inhalt);
  return 'geladen';
}

/** Klassischer Download ueber einen unsichtbaren Link. */
function lade(name, mimeTyp, inhalt) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: mimeTyp }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  // Etwas warten, damit Safari den Download noch starten kann.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Laesst eine Datei auswaehlen und gibt ihren Text zurueck.
 * @returns {Promise<string|null>} null, wenn nichts gewaehlt wurde
 */
export function leseDateiAus(akzeptiert = '.json,application/json') {
  return new Promise((fertig) => {
    const eingabe = document.createElement('input');
    eingabe.type = 'file';
    eingabe.accept = akzeptiert;
    eingabe.style.position = 'fixed';
    eingabe.style.left = '-9999px';

    eingabe.addEventListener('change', async () => {
      const datei = eingabe.files?.[0];
      eingabe.remove();
      if (!datei) return fertig(null);
      try {
        fertig(await datei.text());
      } catch {
        fertig(null);
      }
    });

    // Bricht die Auswahl ab, bekommen wir kein Ereignis - deshalb raeumen
    // wir spaetestens beim naechsten Fokus auf.
    window.addEventListener(
      'focus',
      () => setTimeout(() => { if (!eingabe.files?.length) { eingabe.remove(); fertig(null); } }, 800),
      { once: true },
    );

    document.body.append(eingabe);
    eingabe.click();
  });
}
