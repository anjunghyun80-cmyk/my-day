// Ein paar feste Werte, die an mehreren Stellen gebraucht werden.
// Eigenes Modul, damit sich app.js und die Bildschirme nicht gegenseitig
// importieren muessen.

/** Wie viele Tage darf man auf dem Heute-Bildschirm zurueckblaettern? */
export const MAX_ZURUECK = 7;

/** Wie viele Tage nach vorne? */
export const MAX_VOR = 7;

/** Wie weit schauen Statistik und Streaks zurueck? */
export const RUECKBLICK_TAGE = 180;

/** Wie viele Wochen zeigt die Heatmap? */
export const HEATMAP_WOCHEN = 12;
