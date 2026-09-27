# Mein Tag

Meine persönliche Tagesplan- und Abhak-App fürs iPhone.

Sie zeigt, **was gerade dran ist** und **was als Nächstes kommt**. Ich hake Blöcke ab,
lege eigene Aufgaben an, schreibe mir drei Tagesziele auf und sehe in der Statistik
meine Streaks. Wenn ich alles geschafft habe, feiert die App kurz mit.
Alles läuft auf meinem Gerät – ohne Anmeldung, ohne Server, ohne Internet.

**Aussehen:** wie eine Startnummer beim Laufen – klare Kanten, schmale kräftige
Überschriften, dunkel voreingestellt, mit Orange als Akzentfarbe.
Unter *Einstellungen → Aussehen* kann ich auf Hell oder „System" umstellen und
**jede beliebige Akzentfarbe** wählen. Die ganze App färbt sich sofort um.

---

## Inhalt

1. [App lokal starten](#1-app-lokal-starten)
2. [Tests laufen lassen](#2-tests-laufen-lassen)
3. [Kostenlos veröffentlichen](#3-kostenlos-veröffentlichen)
4. [Auf dem iPhone installieren](#4-auf-dem-iphone-installieren)
5. [Kalender-Erinnerungen importieren](#5-kalender-erinnerungen-importieren)
6. [Backup machen](#6-backup-machen)
7. [Wie der Code aufgebaut ist](#7-wie-der-code-aufgebaut-ist)
8. [Drei Regeln, die man kennen muss](#8-drei-regeln-die-man-kennen-muss)
9. [Echte Push-Benachrichtigungen?](#9-echte-push-benachrichtigungen)

---

## Was die App kann

| Bereich | Was geht |
|---|---|
| **Heute** | Fortschritt als Startnummer mit Balken, laufender Block groß, eigene Aufgaben anlegen/abhaken/löschen, 3 Tagesziele, kompletter Tagesablauf. Mit den Pfeilen 7 Tage zurück und vor. |
| **Aufgaben** | Eigene To-dos pro Tag: unten eintippen, mit ⊕ oder Enter anlegen. Antippen des Kästchens hakt ab, der Papierkorb löscht. Offene Aufgaben von gestern lassen sich holen, erledigte auf einmal aufräumen. |
| **Feier** | Sind alle Blöcke, Aufgaben und Ziele eines Tages erledigt, kommen Konfetti und ein Spruch – einmal pro Tag. |
| **Woche** | Mo–So als Karten zum Durchwischen, mit Prozentbalken pro Tag. |
| **Sport** | Mein Trainingsplan: was, an welchen Tagen, von wann bis wann, Sätze × Wiederholungen. Heute anstehende Einheiten hake ich hier oder auf „Heute" ab. Dazu: Serie je Training und Quote der letzten 7 Tage. |
| **Zahlen** | Tages-Streak, Gewohnheits-Streaks, Quoten nach Kategorie und Wochentag, Heatmap über 12 Wochen. |
| **Plan** | Wochenplan bearbeiten: Blöcke anlegen, ändern, löschen, auf andere Tage kopieren, zurücksetzen. |
| **Glow-up** | King Henrys 90-Tage-Lock-in Woche für Woche: Thema, Zahlen, seine Aufgabe und eine realistische Version für mich. Neue Wochen (6–13) füge ich selbst hinzu – YouTube-Link und Transkript einfügen, die App schlägt Zahlen und Thema vor. |

### Eine neue Glow-up-Woche eintragen

1. Tab **Glow-up** → **„Woche … hinzufügen"** (oder ein gestreiftes Feld im Streifen oben antippen).
2. Den **YouTube-Link** einfügen. Die App zeigt das Vorschaubild und holt den Titel.
   Aus dem Titel („WEEK 6 *SKINCARE*") erkennt sie Woche und Thema.
3. Das **Transkript** einfügen: auf YouTube unter dem Video „…mehr" → „Transkript
   anzeigen" → alles markieren und kopieren. Beim Einfügen schlägt die App
   Kilometer, Rad- und Cardio-Stunden, Gewicht, Thema und die Kapitel vor.
4. Kurz prüfen, „Deine realistische Version" anpassen, **Speichern**.

Die Vorschläge sind nur geschätzt – was man selbst eingetragen hat, überschreibt
die App nie. Eigene Wochen lassen sich später bearbeiten und löschen und stecken
im Backup.

> Für Titel und Vorschaubild fragt die App bei YouTube nach (nur wenn du einen
> Link einfügst). Ohne Internet klappt alles andere trotzdem – dann trägst du
> den Titel eben selbst ein.

---

## 1. App lokal starten

Du brauchst **Node.js** (Version 18 oder neuer). Dann im Projektordner:

```bash
node werkzeuge/server.mjs
```

Danach im Browser **http://localhost:8080** öffnen.

> **Warum ein Server?**
> Wenn du `index.html` einfach doppelklickst, öffnet der Browser sie als `file://`.
> ES-Module und der Service Worker sind dort aus Sicherheitsgründen gesperrt –
> die App bliebe weiß. Ein Server löst das. Der hier ist winzig und hat
> keine Abhängigkeiten.

Anderer Port gefällig?

```bash
node werkzeuge/server.mjs 3000
```

### Auf dem iPhone im gleichen WLAN testen

Finde die lokale IP deines Rechners (Windows: `ipconfig`, Mac: `ifconfig`) und
rufe auf dem iPhone z. B. `http://192.168.1.42:8080` auf.
Das Abhaken funktioniert dort schon – der **Service Worker und damit der
Offline-Betrieb brauchen aber HTTPS** (Ausnahme ist nur `localhost`).
Zum echten Testen also erst veröffentlichen, siehe Schritt 3.

---

## 2. Tests laufen lassen

Die ganze Rechenlogik – Zeit, Streaks, Snapshots, Kalender-Export – ist mit dem
eingebauten Testrunner von Node abgedeckt:

```bash
node --test "test/*.test.js"
```

Oder kürzer:

```bash
npm test
```

Erwartete Ausgabe am Ende: `pass 132`, `fail 0`.

Was getestet wird:

| Datei | Prüft |
|---|---|
| `test/zeit.test.js` | aktueller & nächster Block, Tageswechsel um 04:00, Blöcke nach Mitternacht |
| `test/plan.test.js` | Standardplan, Vorlagen, Überschneidungen, Lücken, Kopieren |
| `test/snapshot.test.js` | Planänderungen verändern keine vergangenen Tage |
| `test/streak.test.js` | Tages- und Gewohnheits-Streaks |
| `test/statistik.test.js` | Quoten, Heatmap, Tagesziele |
| `test/ics.test.js` | Kalender-Datei: Serie, Alarm, Zeitzone, Umlaute |
| `test/zustand.test.js` | Häkchen, Tagesziele, Einstellungen, Backup |
| `test/aufgaben.test.js` | eigene Aufgaben anlegen, abhaken, umbenennen, löschen, übernehmen |
| `test/tagesabschluss.test.js` | „Ist der Tag komplett?" und die Sprüche der Feier |
| `test/workout.test.js` | Trainingsplan: anlegen, prüfen, abhaken, Serie, Wochenbilanz |
| `test/farbe.test.js` | Akzentfarbe: Kontrast, Anpassen zu heller/dunkler Farben, jede Vorlage lesbar |
| `test/glowup.test.js` | Glow-up-Wochen anlegen/löschen, YouTube-Links, Transkript auswerten |

---

## 3. Kostenlos veröffentlichen

Für den Offline-Betrieb (Service Worker) brauchst du **HTTPS**. Beide Wege hier
sind kostenlos und liefern HTTPS automatisch.

### Weg A: GitHub Pages (empfohlen, weil du Änderungen später einfach nachschieben kannst)

1. Auf [github.com](https://github.com) ein neues, **öffentliches** Repository anlegen,
   z. B. `mein-tag`.
2. Den Inhalt dieses Ordners hochladen. Entweder über „Add file → Upload files"
   im Browser, oder mit Git:

   ```bash
   git init
   git add .
   git commit -m "Mein Tag"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/mein-tag.git
   git push -u origin main
   ```

3. Im Repository auf **Settings → Pages** gehen.
4. Bei „Source" **Deploy from a branch** wählen, Branch `main`, Ordner `/ (root)`.
   Speichern.
5. Nach ein paar Minuten läuft die App unter
   `https://DEIN-NAME.github.io/mein-tag/`.

> Alle Pfade in der App sind relativ (`./js/...`), deshalb funktioniert sie auch
> in einem Unterordner wie `/mein-tag/`.

### Weg B: Netlify Drop (am schnellsten, ganz ohne Konto zum Ausprobieren)

1. [app.netlify.com/drop](https://app.netlify.com/drop) öffnen.
2. Den kompletten Projektordner ins Fenster ziehen.
3. Fertig – du bekommst sofort eine HTTPS-Adresse.

Ohne Konto ist der Link nur vorläufig. Mit einem kostenlosen Konto bleibt er dauerhaft.

### Nach einem Update

Der Service Worker liefert die App aus dem Zwischenspeicher und holt neue
Dateien im Hintergrund nach. Nach einem Update siehst du die neue Fassung also
**beim übernächsten Start**. Willst du das sofort, erhöhe in `sw.js` oben die Zeile:

```js
const CACHE_NAME = 'mein-tag-v2';   // -> 'mein-tag-v3'
```

---

## 4. Auf dem iPhone installieren

1. Die veröffentlichte Adresse in **Safari** öffnen (nicht in Chrome – nur Safari
   kann auf iOS zum Home-Bildschirm hinzufügen).
2. Unten auf das **Teilen-Symbol** tippen (Quadrat mit Pfeil nach oben).
3. Nach unten scrollen zu **„Zum Home-Bildschirm"**.
4. Namen bestätigen, **„Hinzufügen"** tippen.

Ab jetzt startet die App im Vollbild, ohne Safari-Leisten, mit eigenem Icon.
Öffne sie einmal mit Internet, damit der Service Worker alle Dateien
zwischenspeichern kann – danach läuft sie auch im Flugmodus.

> **Wichtig:** Deine Daten (Häkchen, Ziele, Plan) liegen in der App auf dem
> Home-Bildschirm getrennt von den Daten in Safari. Fang also am besten gleich in
> der installierten App an – oder mach vorher ein Backup und lies es dort wieder ein.

---

## 5. Kalender-Erinnerungen importieren

Eine Web-App kann dir auf dem iPhone **nichts schicken, solange sie geschlossen
ist**. Der Apple-Kalender kann das sehr wohl. Deshalb gibt die App alle Blöcke mit
„Erinnerung = ja" als Kalender-Datei aus.

1. In der App auf das **Zahnrad** tippen.
2. Unter *Erinnerungen* die Vorlaufzeit einstellen (Standard: **5 Minuten** vorher).
3. Auf **„Erinnerungen in Kalender übernehmen"** tippen.
4. Es öffnet sich das iOS-Teilen-Menü → **Kalender** wählen.
   (Klappt das nicht, wird die Datei geladen – dann in „Dateien" antippen.)
5. Auf **„Alle hinzufügen"** tippen.

Du bekommst 21 wöchentlich wiederkehrende Termine:

- Hausaufgaben 14:00 (Mo–Fr)
- Joggen 16:00 (Mo, Di, Fr)
- alle Wege zu den Kursen (Orchester, Badminton, Cello, Programmierschule,
  Leichtathletik, Düsseldorf)
- Bettfertig machen 20:30 (So–Fr) bzw. 21:30 (Sa)

Alle Termine heißen **„… · Mein Tag"**. So findest du sie im Kalender sofort
wieder und kannst sie im Zweifel alle zusammen löschen.

**Nach einer Planänderung** zeigt die App den Hinweis *„Kalender neu exportieren"*.
Weil jeder Termin eine feste Kennung hat, **aktualisiert** ein neuer Import die
alten Termine – es entstehen keine Dubletten.

> **Fürs Aufstehen um 05:00 nimm den iPhone-Wecker**, nicht den Kalender.
> Der Wecker klingelt auch im Lautlos-Modus und im Fokus „Schlafen".

Solange die App geöffnet ist, zeigt sie beim Start eines Blocks zusätzlich ein
Banner („Jetzt: Joggen"). Das kannst du in den Einstellungen abschalten.

---

## 6. Backup machen

Deine Daten liegen **nur auf diesem einen Gerät**. Wenn du die App löschst oder
das iPhone wechselst, sind sie weg. Deshalb ab und zu:

**Sichern:** Zahnrad → *Backup* → **„Backup exportieren"** → in „Dateien" oder
iCloud sichern. Die Datei heißt z. B. `mein-tag-backup-2026-09-20.json`.
Darin stehen Plan, Häkchen, Aufgaben, Ziele und Einstellungen.

**Zurückholen:** Zahnrad → *Backup* → **„Backup importieren"** → Datei auswählen.
Das überschreibt alles, was gerade in der App steht.

> Die Wahl zwischen Dunkel und Hell und die Akzentfarbe stecken **nicht** im
> Backup – das sind Einstellungen dieses Geräts, keine Daten.
> Deine selbst eingetragenen Glow-up-Wochen sind dagegen drin.

Die Datei ist normales JSON – du kannst sie in jedem Texteditor öffnen und
nachsehen, was drinsteht.

---

## 7. Wie der Code aufgebaut ist

```
mein-tag/
├── index.html                Grundgerüst (bewusst fast leer, alles kommt aus JS)
├── manifest.webmanifest      macht die Seite installierbar
├── sw.js                     Service Worker: speichert alle Dateien für offline
├── css/stil.css              Aussehen, hell und dunkel
│
├── js/
│   ├── app.js                Start, Tab-Wechsel, Minutentakt, Dialoge
│   ├── konfiguration.js      ein paar feste Werte
│   ├── speicher.js           laden/speichern im localStorage
│   ├── dateien.js            Dateien teilen oder herunterladen
│   │
│   ├── daten/
│   │   ├── kategorien.js     Farben und „abhakbar ja/nein" je Kategorie
│   │   ├── standardplan.js   mein Wochenplan als Rohdaten
│   │   └── glowup.js         King Henrys Serie: Wochen 0–5, Themen, Ausblick
│   │
│   ├── logik/                ← reine Funktionen, kein Browser nötig
│   │   ├── zeit.js           HH:MM, „29:00", 04:00-Grenze, jetzt/nächster Block
│   │   ├── plan.js           Vorlagen auflösen, Überschneidungen, Lücken
│   │   ├── snapshot.js       Tagespläne einfrieren
│   │   ├── aufgaben.js       eigene Aufgaben pro Tag
│   │   ├── workout.js        Trainingsplan und Sport-Auswertung
│   │   ├── tagesabschluss.js „Ist heute alles erledigt?" + die Sprüche
│   │   ├── streak.js         Tages- und Gewohnheits-Streaks
│   │   ├── statistik.js      Quoten, Heatmap
│   │   ├── ics.js            Kalender-Datei bauen
│   │   ├── backup.js         Export/Import
│   │   ├── farbe.js          aus EINER Akzentfarbe alle lesbaren Farbtöne rechnen
│   │   ├── glowup.js         Glow-up-Wochen, YouTube-Links, Transkript auswerten
│   │   └── zustand.js        alles, was gespeichert wird
│   │
│   └── ui/                   ← alles, was Elemente auf den Bildschirm bringt
│       ├── dom.js            winzige Hilfe statt Framework
│       ├── icons.js          Symbole als Inline-SVG
│       ├── thema.js          Farben als CSS-Variablen, hell/dunkel, Akzentfarbe
│       ├── feier.js          Konfetti und Glückwunschkarte
│       ├── heute.js          Heute-Bildschirm
│       ├── woche.js          Wochenübersicht
│       ├── sport.js          Trainingsplan
│       ├── statistik.js      Statistik-Bildschirm
│       ├── planEditor.js     Plan bearbeiten
│       ├── glowup.js         Glow-up-Bildschirm und „Woche hinzufügen"
│       └── einstellungen.js  Aussehen, Kalender-Export, Backup
│
├── icons/                    App-Icons (mit werkzeuge/icon-erzeugen.mjs gebaut)
├── test/                     Tests für den ganzen logik/-Ordner
└── werkzeuge/
    ├── server.mjs            der kleine Entwicklungsserver
    └── icon-erzeugen.mjs     baut die PNG-Icons neu
```

**Die wichtigste Trennung:** Alles in `js/logik/` kennt weder `document` noch
`window`. Das sind nur Funktionen, die Werte hineinbekommen und Werte
zurückgeben. Genau deshalb lässt sich der Ordner mit `node --test` prüfen,
ohne dass ein Browser läuft. Alles in `js/ui/` darf den Bildschirm anfassen,
rechnet aber selbst nichts aus.

**Der Zustand wird nie verändert, sondern neu gebaut.** Statt
`zustand.erledigt[tag][id] = true` gibt `setzeErledigt(...)` ein *neues* Objekt
zurück. Das macht Fehler unwahrscheinlicher und die Tests einfach.

**Farben stehen an genau einer Stelle.** Die Grundfarben (Schwarz, Grau, Weiß)
sind CSS-Variablen ganz oben in `css/stil.css`, einmal für dunkel und einmal
für hell. Die Akzentfarbe wählt man in den Einstellungen; `js/logik/farbe.js`
rechnet daraus alle Töne aus (für Knöpfe, Schrift, Hintergründe, Heatmap) und
prüft dabei den Kontrast – ist eine Farbe zu hell oder zu dunkel, wird sie so
weit angepasst, dass alles lesbar bleibt. Die Farbe jeder Kategorie steht in
`js/daten/kategorien.js`, die der Glow-up-Themen in `js/daten/glowup.js`;
`js/ui/thema.js` baut daraus beim Start kleine Stylesheets. Willst du z. B.
Sport in einer anderen Farbe, änderst du genau eine Zeile.

**Ecken bleiben spitz.** Die Rundungen stehen als `--r-gross`, `--r` und
`--r-klein` oben in `css/stil.css` (4, 3 und 2 Pixel). Überschriften und große
Zahlen nutzen eine schmale Schrift, die schon auf dem Gerät ist (auf dem iPhone
Avenir Next Condensed, auf Windows Bahnschrift) – deshalb braucht die App keine
Schrift aus dem Internet und bleibt offline vollständig.

Blöcke haben bewusst **keine farbige Fläche**, sondern nur einen 3px-Strich
links. Acht bunte Kacheln nebeneinander machen eine Liste unruhig; ein
schmaler Strich reicht völlig, um die Kategorie zu erkennen.

Icon ändern? Farben und Form stehen oben in `werkzeuge/icon-erzeugen.mjs`:

```bash
node werkzeuge/icon-erzeugen.mjs
```

---

## 8. Drei Regeln, die man kennen muss

### Der Tag wechselt um 04:00, nicht um Mitternacht

Wenn du um 00:30 Uhr noch etwas abhakst, zählt es für den **Vortag** – denn
gefühlt ist das noch derselbe Tag. Erst ab 04:00 Uhr beginnt der neue.

Deshalb gibt es im Plan auch Zeiten wie `29:00`: das bedeutet **05:00 Uhr am
nächsten Morgen**. Der Schlafblock von 21:00 bis 29:00 läuft also durch die
Nacht bis zum Aufstehen.

Im Code: `logischerTag()` und `minutenImLogischenTag()` in `js/logik/zeit.js`.

### Vergangene Tage sind eingefroren

Sobald du einen Tag zum ersten Mal öffnest, speichert die App seinen Plan als
**Schnappschuss**. Änderst du später deinen Wochenplan, bleiben vergangene Tage
genau so, wie sie damals waren – sonst würden Statistik und Streaks im
Nachhinein falsch.

Der **heutige** Tag wird nach einer Planänderung automatisch aufgefrischt
(„Änderungen gelten ab heute"). Deine Häkchen bleiben dabei erhalten, weil sie
an der Kennung des Blocks hängen.

Im Code: `js/logik/snapshot.js`.

### Der Fortschritt zählt drei Dinge zusammen

Der große Ring oben zählt **Blöcke + Aufgaben + Sport + Tagesziele**:

- jeder Block im Plan, dessen Kategorie abhakbar ist (also nicht Freizeit,
  Unterwegs oder Schlafen),
- jede eigene Aufgabe des Tages,
- jede Trainingseinheit, die heute im Sport-Plan steht,
- jedes Tagesziel, **in dem etwas steht** (leere Felder zählen nicht mit).

Dieselbe Rechnung entscheidet, ob ein Tag für die Streak zählt, und ob die
Feier kommt. Wenn du also eine Aufgabe anlegst, fällt der Prozentwert erst mal –
das ist richtig so, die Arbeit ist ja noch offen.

Im Code: `js/logik/tagesabschluss.js`.

---

## 9. Echte Push-Benachrichtigungen?

**Gebaut ist das bewusst nicht.** Hier steht, was es bräuchte:

Seit **iOS 16.4** kann eine Web-App echte Push-Benachrichtigungen empfangen –
aber nur, wenn sie auf dem Home-Bildschirm installiert ist, und nur, wenn ein
**Server** sie losschickt. Die App selbst kann sich nicht selbst wecken.

Was dazugehören würde:

| Teil | Aufwand | Kosten |
|---|---|---|
| Kleiner Server, der nach Zeitplan Pushes schickt (z. B. Cloudflare Workers mit Cron) | ca. 150–250 Zeilen Code | kostenlos im Gratis-Tarif (100 000 Aufrufe/Tag) |
| VAPID-Schlüsselpaar erzeugen und sicher ablegen | einmalig, ~15 Minuten | – |
| In der App: Erlaubnis abfragen, Abo an den Server schicken | ca. 80 Zeilen | – |
| Dein Wochenplan muss auf den Server hochgeladen werden | – | **deine Daten liegen dann nicht mehr nur auf dem iPhone** |

Der letzte Punkt ist der eigentliche Haken: Damit ein Server dich pünktlich
erinnern kann, muss er deinen Stundenplan kennen. Das widerspricht der Idee
„alles bleibt auf meinem Gerät".

**Der Kalender-Export macht dasselbe ohne Server, ohne Konto und ohne Kosten** –
deshalb ist er hier der Hauptweg. Wenn du Push trotzdem willst, sag Bescheid.
