// Winzige Helfer, um Elemente zu bauen - damit wir kein Framework brauchen.
// Texte werden immer ueber textContent gesetzt, nie ueber innerHTML.
// So kann ein Blocktitel niemals HTML einschleusen.

/**
 * Baut ein Element.
 * el('button', { class: 'knopf', text: 'Los', onclick: fn }, [kind1, kind2])
 */
export function el(tag, attribute = {}, kinder = []) {
  const knoten = document.createElement(tag);

  for (const [name, wert] of Object.entries(attribute)) {
    if (wert === null || wert === undefined || wert === false) continue;

    if (name === 'class') knoten.className = wert;
    else if (name === 'text') knoten.textContent = wert;
    else if (name === 'dataset') Object.assign(knoten.dataset, wert);
    else if (name === 'style') {
      // CSS-Variablen ("--fc") gehen nur ueber setProperty.
      for (const [eigenschaft, inhalt] of Object.entries(wert)) {
        if (eigenschaft.startsWith('--')) knoten.style.setProperty(eigenschaft, inhalt);
        else knoten.style[eigenschaft] = inhalt;
      }
    }
    else if (name.startsWith('on') && typeof wert === 'function') {
      knoten.addEventListener(name.slice(2).toLowerCase(), wert);
    } else knoten.setAttribute(name, wert === true ? '' : String(wert));
  }

  for (const kind of [].concat(kinder)) {
    if (kind === null || kind === undefined || kind === false) continue;
    knoten.append(typeof kind === 'string' || typeof kind === 'number' ? String(kind) : kind);
  }

  return knoten;
}

/** Leert ein Element. */
export function leere(knoten) {
  while (knoten.firstChild) knoten.removeChild(knoten.firstChild);
}

/** Kurzform fuer document.getElementById. */
export function id(name) {
  return document.getElementById(name);
}

/** Baut ein SVG-Element (fuer den Fortschrittsring). */
export function svgEl(tag, attribute = {}) {
  const knoten = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, wert] of Object.entries(attribute)) {
    if (wert === null || wert === undefined) continue;
    knoten.setAttribute(name, String(wert));
  }
  return knoten;
}

/** Will die Nutzerin oder der Nutzer weniger Bewegung? */
export function wenigerBewegung() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
